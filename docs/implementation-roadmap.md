# ILMOFAHM — Implementation Roadmap

**Status:** Active  
**Last updated:** 2026-10-21

This roadmap replaces the older milestone labels (M0–M6) for day-to-day delivery sequencing. It aligns with the school registration-to-login first release. Existing docs under `docs/02-module-roadmap.md` remain historical context for broader academic modules.

## Product mission

Build a secure, multilingual school management SaaS. The first usable release must demonstrate the complete **school registration → platform approval → provisioning → owner activation → school setup → school portal login** journey. Do not start by building every academic module.

## Confirmed decisions

| Area | Decision |
| --- | --- |
| Product | ILMOFAHM — one web application |
| Stack | Next.js App Router + TypeScript + Tailwind; Supabase Auth + PostgreSQL |
| Tenancy | Shared-table, multi-tenant; **school-based** terminology in the target schema |
| Language | English first; architecture prepared for Urdu, Arabic, and RTL |
| Billing | Manual subscription/payment management first; online gateways deferred |
| Data | Clean school-based schema via versioned migrations; do not preserve old org records as a requirement |
| Safety | No uncontrolled production DB resets; confirm environment before destructive ops |

## Delivery sequence

| Phase | Objective | Exit gate |
| --- | --- | --- |
| **0** | Repository inspection, baseline checks, clean-DB strategy docs | Structure understood; checks documented; docs present |
| **1** | Presentable public website (static content) | All public pages render without auth or unfinished tables |
| **2** | Fresh school-based onboarding schema + RLS | Clean init from migrations; onboarding tables only |
| **3** | Platform administrator authentication | Operators authorized from DB; bootstrap controlled |
| **4** | Public school registration → `school_applications` | Valid applications stored; public cannot approve |
| **5** | Platform application review and approval | Status transitions + audit; unauthorized denied |
| **6** | School provisioning (transactional, idempotent) | At most one school per application |
| **7** | Owner invitation and account activation | Secure token; correct membership only |
| **8** | School setup + administrator login | End-to-end onboarding works |
| **9** | Platform dashboard + manual subscriptions | Plans/payments auditable; no payment gateways |
| **10** | School roles and user management | Permission matrix enforced server-side |
| **11** | Academic and school management modules | Incremental; tenant isolation on every table |
| **12** | Localization and editable content | English + documented i18n/RTL path |
| **13** | Security and testing hardening | Cross-school isolation tests pass |
| **14** | Production deployment | Smoke-tested onboarding; migrations reviewed |

## Working rules

1. Implement one phase; verify; then proceed.
2. Inspect before rewriting — reuse working Auth, shell, Supabase helpers, and CI.
3. Authorization is server-side and/or RLS — never UI-only.
4. No fake success states for failed or missing backends.
5. Update `docs/implementation-status.md` after every completed phase.

## First-release end-to-end acceptance

Visitor applies → operator reviews/approves → school + campus provisioned → owner activates → setup completes → school dashboard with tenant isolation. Must exercise real DB operations and authorization, not only navigation.
