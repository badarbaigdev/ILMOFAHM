# Supabase local workflow (ILM-SETUP-003)

SQL migrations under `supabase/migrations/` are the **only** schema source of truth. Do not treat Supabase dashboard edits as durable schema changes.

## Prerequisites

1. **Docker Desktop** (or Docker Engine + Compose) running.
2. **Supabase CLI** installed and on your `PATH`.

Install the CLI with one of:

```bash
# npm (global)
npm install -g supabase

# or Homebrew
brew install supabase/tap/supabase

# or see https://supabase.com/docs/guides/cli/getting-started
```

Confirm:

```bash
docker version
supabase --version
```

No remote Supabase project, production credentials, or dashboard login is required for local bootstrap.

## Directory layout

```text
supabase/
├── config.toml          # Local stack settings (committed)
├── seed.sql             # Synthetic local seed only
├── migrations/          # Ordered timestamped SQL migrations
└── tests/               # SQL / RLS policy tests (filled as tables land)
```

Local runtime state is gitignored: `supabase/.temp/`, `supabase/.branches/`, `supabase/.env`.

## Start local Supabase from zero

From the **repository root**:

```bash
supabase start
```

This pulls images (first run), starts Postgres/Auth/Storage/Studio, and applies every file in `supabase/migrations/` in filename order.

Useful URLs after start (defaults from `config.toml`):

| Service | URL |
|---|---|
| API (PostgREST / Auth gateway) | http://127.0.0.1:54321 |
| Database | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio | http://127.0.0.1:54323 |
| Local SMTP / Mailpit (email) | http://127.0.0.1:54324 |

Print local keys and URLs (demo keys only — never production):

```bash
supabase status
supabase status -o env
```

Stop services:

```bash
supabase stop
```

## Reset database and re-apply all migrations

Destroys local DB data, re-applies migrations from zero, then runs `seed.sql`:

```bash
supabase db reset
```

Use this whenever you need to prove a clean migrate path before merging schema work.

## Creating a new migration

Convention: `YYYYMMDDHHMMSS_short_snake_description.sql`

```bash
# Prefer the CLI so timestamps stay consistent
supabase migration new short_snake_description
```

Or add a file manually under `supabase/migrations/` using a UTC timestamp prefix that sorts after existing files.

Guidelines:

- One concern per migration when practical.
- Include constraints, indexes, grants, and RLS with the tables they protect (starting in M1).
- Never rewrite a migration that has already been applied on a shared environment; add a new forward migration instead.
- Keep seed data synthetic. Do not load real student/guardian records.

## Applying migrations without a full reset

While local services are running:

```bash
supabase migration up
# or, depending on CLI version:
supabase db push --local
```

Prefer `supabase db reset` for review evidence that the full history applies cleanly.

## SQL / RLS tests

Place policy tests under `supabase/tests/` as tenant tables are introduced (M1+). Until then the folder holds conventions only. See `tests/README.md`.

Example future command (once tests exist):

```bash
supabase test db
```

## What this issue does **not** include

- Application Auth/SSR clients and env validation → **ILM-SETUP-004**
- Tenant schema (`organizations`, memberships, …) → **ILM-PLAT-001+**
- Linking a hosted Supabase project or storing production secrets

## Troubleshooting

| Symptom | Likely fix |
|---|---|
| `docker: command not found` | Install Docker Engine or Docker Desktop, start it, then retry |
| `permission denied` on `/var/run/docker.sock` | Your user is not allowed to talk to the Docker daemon (common on Linux). Fix below |
| Port already in use | Stop the other process or change ports in `config.toml`, then restart |
| Migration history drift | `supabase db reset` locally; never edit applied migration files |
| Tempted to “quick fix” in Studio | Capture the change as a new SQL migration instead |
| `[inbucket] is deprecated` | Use `[local_smtp]` in `config.toml` (already set for this repo) |

### Docker socket permission denied (Linux)

Your Linux user must be in the `docker` group **and** the Docker daemon must be running. `sudo` must succeed for the one-time setup.

```bash
# 1) Authenticate sudo (fix password if needed), then start Docker
sudo systemctl enable --now docker

# 2) Add your user to the docker group (once)
sudo usermod -aG docker "$USER"

# 3) Apply the new group — pick ONE:
#    A) fully log out of the desktop session and log back in (most reliable)
#    B) open a brand-new terminal and confirm:  groups | grep docker
#    C) if available:  newgrp docker
#    D) one-shot without newgrp:
sg docker -c 'docker info && ./scripts/supabase-local.sh start && ./scripts/supabase-local.sh reset'

# 4) After group membership shows up in `groups`, normally:
docker info
./scripts/supabase-local.sh start
./scripts/supabase-local.sh reset
```

Notes:

- If `sudo` says “Authentication failed”, none of the setup ran — fix the password / auth first, then repeat.
- Do **not** use `sudo supabase start` long-term; that creates root-owned containers/files.
- `newgrp` may be missing on some Ubuntu installs (`util-linux-extra`). Prefer logout/login or `sg docker -c '…'`.
