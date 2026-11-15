# duckwake.github.io

The website of DuckWake, https://duckwake.github.io: the home page, About and the docs. It is built with
[Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

| Path | What |
| --- | --- |
| `src/content/docs/index.mdx`, `about.md` | The home page and About |
| `src/content/docs/docs/start/` | Install, Quick start, Concepts: written here |
| `scripts/sync-docs.mjs` | Copies the reference docs (`docs/*.md`, `dbt/README.md`, `CHANGELOG.md`, `docs/design/`) from duckwake/duckwake at build time; they are written and reviewed there, next to the code |
| `src/styles/brand.css`, `src/assets/`, `public/` | The brand on the site: colours, fonts, logos, icons |
| `public/extensions/` | The DuckDB extension repository, filled by duckwake/duckwake's release workflow |
| `brand/` | The brand kit and its guidelines (`brand/GUIDELINES.md`); not published |

## Build

Node 22 or newer, and a checkout of duckwake/duckwake next to this repository (or `DUCKWAKE_REPO=path`):

```sh
npm ci
npm run dev        # http://localhost:4321, with the docs synced first
npm run build      # into dist/; fails on a broken internal link
```

`.github/workflows/pages.yml` builds every pull request, and on `main` deploys to GitHub Pages: on each push,
once a day, and on demand (Actions → pages → Run workflow), so docs changed in duckwake/duckwake appear here.
