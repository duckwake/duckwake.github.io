// Copies the reference docs from a checkout of duckwake/duckwake into the site, so the docs pages always match
// the code they describe. The code repository stays the one place those docs are written and reviewed.
//
//   DUCKWAKE_REPO=../duckwake node scripts/sync-docs.mjs     (default: ./duckwake, then ../duckwake)
//
// For each file: the first `# Heading` becomes the page title, an edit link points at the file in the code
// repository, and relative links are rewritten. A link to another synced file becomes its page on the site;
// a link to anything else in the repository (a script, the dbt example) becomes its GitHub URL. Links inside
// code blocks are left alone. The build's link validator then fails on any link that leads nowhere.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const GITHUB = 'https://github.com/duckwake/duckwake';
const CONTENT = 'src/content/docs';

const repo = [process.env.DUCKWAKE_REPO, 'duckwake', '../duckwake'].find(
  (p) => p && existsSync(path.join(p, 'docs', 'sql.md')),
);
if (!repo) {
  console.error('sync-docs: no checkout of duckwake/duckwake found. Clone it next to this repository, or set DUCKWAKE_REPO.');
  process.exit(1);
}

// Code repository path -> site path (under src/content/docs, without .md).
const pages = {
  'docs/sql.md': 'docs/reference/sql',
  'docs/cli.md': 'docs/reference/cli',
  'docs/server.md': 'docs/reference/server',
  'docs/extension.md': 'docs/reference/extension',
  'docs/alerts.md': 'docs/operations/alerts',
  'docs/performance.md': 'docs/operations/performance',
  'docs/roadmap.md': 'docs/project/roadmap',
  'docs/releasing.md': 'docs/project/releasing',
  'docs/testing.md': 'docs/project/testing',
  'docs/internals.md': 'docs/project/internals',
  'CHANGELOG.md': 'docs/project/changelog',
  'dbt/README.md': 'docs/guides/dbt',
  'docs/design/README.md': 'docs/design',
};
for (const f of readdirSync(path.join(repo, 'docs/design'))) {
  if (f.endsWith('.md') && f !== 'README.md') pages[`docs/design/${f}`] = `docs/design/${f.slice(0, -3)}`;
}
// The one line under each page's title (src/components/PageTitle.astro), and the page's search summary.
const descriptions = {
  'docs/sql.md': 'Every duckwake_* function: sources, views, their lifecycle, inspection, and the aggregates a view can use.',
  'docs/cli.md': 'The duckwake command line: a command per SQL function, the worker, a test producer and the playground.',
  'docs/server.md': 'Run duckwaked: a worker plus the SQL functions over Quack, with tokens, metrics and supervision.',
  'docs/extension.md': 'LOAD duckwake in your own DuckDB 2.0: the same functions and a worker in that process.',
  'docs/alerts.md': 'The metrics a worker exports, the Prometheus alerts and Grafana dashboard, and what to do when each fires.',
  'docs/performance.md': 'The four worker flags for parallel and pipelined epochs, and what they measured.',
  'docs/roadmap.md': 'What is built, and what stands between DuckWake and production.',
  'docs/releasing.md': 'Versions, what a release publishes, and how to make one.',
  'docs/testing.md': 'What the test suites verify, and how to run them.',
  'docs/internals.md': 'How the code maps to the design: the view compiler, circuits, state, and the known gaps.',
  'CHANGELOG.md': 'Every notable change, release by release.',
  'dbt/README.md': 'Kafka sources and streaming views as dbt models, with dbt-duckdb.',
  'docs/design/README.md': 'The reasoning behind the engine, with comparisons to other streaming engines.',
};

// Folders copied next to the pages that use them (their images keep their relative paths).
const assets = { 'docs/design/images': 'docs/design/images' };

// The generated tree is rebuilt from scratch, so a page removed upstream disappears here too.
for (const dir of ['docs/reference', 'docs/operations', 'docs/project', 'docs/design']) {
  rmSync(path.join(CONTENT, dir), { recursive: true, force: true });
}
rmSync(path.join(CONTENT, 'docs/guides/dbt.md'), { force: true });

const urlOf = (site) => `/${site}/`;

function rewrite(target, from) {
  if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) return target; // absolute URL, anchor or site path
  const [file, anchor = ''] = target.split('#');
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(from), file)).replace(/\/$/, '');
  const hash = anchor ? `#${anchor}` : '';
  if (pages[resolved]) return urlOf(pages[resolved]) + hash;
  if (pages[`${resolved}/README.md`]) return urlOf(pages[`${resolved}/README.md`]) + hash;
  for (const [src, dst] of Object.entries(assets)) {
    if (resolved.startsWith(`${src}/`)) {
      // Relative to the page being written, which sits at pages[from] + '.md'.
      return path.posix.relative(path.posix.dirname(pages[from]), dst + resolved.slice(src.length));
    }
  }
  const onDisk = path.join(repo, resolved);
  if (existsSync(onDisk)) {
    return `${GITHUB}/${statSync(onDisk).isDirectory() ? 'tree' : 'blob'}/main/${resolved}${hash}`;
  }
  return target; // the link validator reports it
}

function convert(text, from) {
  const lines = text.split('\n');
  const h1 = lines.findIndex((l) => l.startsWith('# '));
  if (h1 === -1) throw new Error(`${from}: no "# Title" heading`);
  const title = lines[h1].slice(2).replace(/`/g, '').trim();
  lines.splice(h1, 1);
  let fence = null;
  const body = lines.map((line) => {
    const m = line.match(/^\s*(```+|~~~+)/);
    if (m) {
      if (!fence) fence = m[1];
      else if (m[1].startsWith(fence)) fence = null;
      return line;
    }
    if (fence) return line;
    return line.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\))/g, (_, open, target, close) => open + rewrite(target, from) + close);
  });
  const front = ['---', `title: ${JSON.stringify(title)}`];
  if (descriptions[from]) front.push(`description: ${JSON.stringify(descriptions[from])}`);
  front.push(`editUrl: ${JSON.stringify(`${GITHUB}/edit/main/${from}`)}`, '---', '');
  return front.concat(body).join('\n').replace(/\n{3,}/g, '\n\n');
}

for (const [from, to] of Object.entries(pages)) {
  const out = path.join(CONTENT, from === 'docs/design/README.md' ? `${to}/index.md` : `${to}.md`);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, convert(readFileSync(path.join(repo, from), 'utf8'), from));
}
for (const [from, to] of Object.entries(assets)) {
  cpSync(path.join(repo, from), path.join(CONTENT, to), { recursive: true });
}

let commit = 'unknown';
try {
  commit = execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {}
console.log(`sync-docs: ${Object.keys(pages).length} pages from ${repo} at ${commit}`);
