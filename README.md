# duckwake.github.io

The website of DuckWake, https://duckwake.github.io: the home page, About and the docs. It is built with
[Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

| Path | What |
| --- | --- |
| `src/content/docs/index.mdx`, `about.md` | The home page and About |
| `src/content/docs/docs/start/` | Install, Quick start, Concepts: written here |
| `scripts/sync-docs.mjs` | Copies the user docs (`docs/*.md` but `internals.md` and `testing.md`, `dbt/README.md`, `CHANGELOG.md`) from duckwake/duckwake at build time; they are written and reviewed there, next to the code. The design documents, internals and testing notes stay on GitHub, for people working on DuckWake itself |
| `src/styles/brand.css`, `src/assets/`, `public/` | The brand on the site: colours, fonts, logos, icons |
| `src/components/motion/`, `src/scripts/motion/`, `src/styles/motion.css` | The animated scenes of the engine, built with [Motion](https://motion.dev): one epoch (`EngineFlow`), a worker killed mid-epoch (`ExactlyOnce`), watermarks and late events (`Watermark`), failover and rebalancing (`Failover`), a view over a lake table's change feed (`ChangeFeed`), and the hero's live table. They are on the home page and Concepts; see below |
| `public/extensions/` | The DuckDB extension repository, filled by duckwake/duckwake's release workflow |
| `brand/` | The brand kit and its guidelines (`brand/GUIDELINES.md`); not published |

## Build

Node 22 or newer, and a checkout of duckwake/duckwake next to this repository (or `DUCKWAKE_REPO=path`):

```sh
npm ci
npm run dev        # http://localhost:4321, with the docs synced first
npm run build      # into dist/; fails on a broken internal link
```

## Animated scenes

Each scene is an Astro component that renders a complete still frame, plus a script that tells its story in
cycles through `src/scripts/motion/scene.ts`. That runtime plays a scene only while a third of it is on screen,
pauses it with its button, and does not start it for a reader who asks for reduced motion (the button still plays
it). Without JavaScript the still frame and the caption carry the meaning. The stage is hidden from screen readers
and the caption says in words what it shows. To put a scene on a page, import it in an `.mdx` file:

```mdx
import EngineFlow from '../../../../components/motion/EngineFlow.astro';

<EngineFlow />
```

Every claim a scene makes is the engine's behaviour: the watermark rule, `--lease-timeout`, rebalancing and what
an epoch commits are taken from duckwake/duckwake's code and docs (`watermark-data.ts`, `failover-data.ts` and `changefeed-data.ts` say where). When that behaviour
changes, change the scene with it.

## Deploy

`.github/workflows/pages.yml` builds every pull request, and on `main` deploys to GitHub Pages: on each push,
once a day, and on demand (Actions → pages → Run workflow), so docs changed in duckwake/duckwake appear here.
