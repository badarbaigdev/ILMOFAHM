#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), '..');
const csvPath = path.join(root, 'docs', 'backlog.csv');
const doCreate = process.argv.includes('--create');
const dryRun = !doCreate || process.argv.includes('--dry-run');
const token = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;

function parseCsv(text) {
  const records = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); if (row.some((v) => v.trim())) records.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); records.push(row); }
  const [header, ...data] = records;
  return data.map((values) => Object.fromEntries(header.map((key, i) => [key, values[i] ?? ''])));
}

const colors = {
  'type:epic': '5319e7', 'type:task': '1d76db', 'type:bug': 'd73a4a', 'type:security': 'b60205', 'type:decision': 'fbca04',
  'priority:P0': 'b60205', 'priority:P1': 'fbca04', 'priority:P2': '0e8a16',
  'module:setup': 'c5def5', 'module:platform': 'c5def5', 'module:organization': 'c5def5', 'module:students': 'c5def5',
  'module:attendance': 'c5def5', 'module:fees': 'c5def5', 'module:examinations': 'c5def5', 'module:launch': 'c5def5'
};
const typeLabel = (type) => ({ epic: 'type:epic', task: 'type:task', bug: 'type:bug', security: 'type:security', decision: 'type:decision' }[type] ?? 'type:task');
const moduleLabel = (module) => `module:${module}`;

async function api(endpoint, options = {}) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {})
    }
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(`GitHub API ${options.method ?? 'GET'} ${endpoint} failed (${response.status}): ${JSON.stringify(body)}`);
  return body;
}

if (!fs.existsSync(csvPath)) throw new Error(`Missing backlog: ${csvPath}`);
const items = parseCsv(fs.readFileSync(csvPath, 'utf8'));
console.log(`${dryRun ? 'DRY RUN' : 'CREATE MODE'}: ${items.length} backlog items for ${owner && repo ? `${owner}/${repo}` : 'repository not yet specified'}`);
for (const item of items) console.log(`${item.id} | ${item.milestone} | ${item.priority} | ${item.title}`);
if (dryRun) {
  console.log('\nNo GitHub changes made. To create, set GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO and rerun with --create.');
  process.exit(0);
}
if (!token || !owner || !repo) throw new Error('Set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO before --create.');

const repoPath = `/repos/${owner}/${repo}`;
const existingLabels = await api(`${repoPath}/labels?per_page=100`);
const labelNames = new Set(existingLabels.map((label) => label.name));
for (const [name, color] of Object.entries(colors)) {
  if (labelNames.has(name)) continue;
  await api(`${repoPath}/labels`, { method: 'POST', body: JSON.stringify({ name, color, description: `ILMOFAHM tracking label: ${name}` }) });
  console.log(`Created label: ${name}`);
}

const milestoneNames = [...new Set(items.map((item) => item.milestone))];
const existingMilestones = await api(`${repoPath}/milestones?state=all&per_page=100`);
const milestoneMap = new Map(existingMilestones.map((m) => [m.title, m.number]));
for (const title of milestoneNames) {
  if (milestoneMap.has(title)) continue;
  const created = await api(`${repoPath}/milestones`, { method: 'POST', body: JSON.stringify({ title, description: `Delivery milestone for ILMOFAHM: ${title}. See docs/02-module-roadmap.md.` }) });
  milestoneMap.set(title, created.number);
  console.log(`Created milestone: ${title}`);
}

const existingIssues = await api(`${repoPath}/issues?state=all&per_page=100`);
const existingTitles = new Set(existingIssues.filter((i) => !i.pull_request).map((i) => i.title));
for (const item of items) {
  const title = `[${item.id}] ${item.title}`;
  if (existingTitles.has(title)) { console.log(`Skipped existing: ${title}`); continue; }
  const criteria = item.acceptance_criteria.split('|').filter(Boolean).map((c) => `- [ ] ${c}`).join('\n');
  const body = [
    `**Backlog ID:** ${item.id}`,
    `**Module:** ${item.module}`,
    `**Priority:** ${item.priority}`,
    `**Estimate:** ${item.estimate}`,
    `**Dependencies:** ${item.depends_on || 'None recorded'}`,
    '', '## Goal', item.title, '', '## Acceptance criteria', criteria,
    '', '## Implementation notes',
    '- Read the relevant docs and `.cursor/rules/ilmofahm-project.mdc` before coding.',
    '- Include tests for authorization denials and cross-tenant access where relevant.',
    '- Use SQL migrations for database changes; do not change production directly.',
    '- Update docs and provide actual verification results in the PR.'
  ].join('\n');
  const labels = [typeLabel(item.type), `priority:${item.priority}`, moduleLabel(item.module)];
  const issue = await api(`${repoPath}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels, milestone: milestoneMap.get(item.milestone) })
  });
  existingTitles.add(title);
  console.log(`Created #${issue.number}: ${title}`);
}
console.log('Backlog creation complete. Review the GitHub Project board and assign owners before implementation.');
