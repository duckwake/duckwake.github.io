---
title: Install
description: What DuckWake needs, how to build it, and what each release publishes.
---

DuckWake keeps DuckLake tables up to date from Kafka. To run it you need three things next to it:

| Piece | What it is | In the quick start |
| --- | --- | --- |
| A DuckLake catalog | The database that holds the lake's metadata and DuckWake's control tables | PostgreSQL, from `docker compose` |
| A data path | Where the lake's Parquet files go: a local folder or S3 | `.lake/data/` |
| Kafka | The topics your views read; any Kafka-compatible broker | Redpanda, from `docker compose` |

You talk to DuckWake from the DuckDB 2.0 CLI (or any DuckDB client), with the dbt package, or with the
`duckwake` CLI.

## Build from source

You need Rust (stable) and, for the test stack, Docker.

```sh
git clone https://github.com/duckwake/duckwake.git
cd duckwake
cargo build --release          # the first build compiles DuckDB (about 6 minutes)
```

This builds two binaries in `target/release/`:

- `duckwaked`, the server: a worker plus the `duckwake_*` SQL functions over Quack, with Prometheus metrics.
  See [Server](/docs/reference/server/).
- `duckwake`, the CLI: a command per function, the worker (`duckwake run`), a test event producer and the
  playground. See [CLI and playground](/docs/reference/cli/).

The extension, for `LOAD duckwake` in your own DuckDB 2.0, is built and laid out as an extension repository by
`scripts/package_extension.sh`. See [Extension](/docs/reference/extension/).

## Releases

Each `v*` release of [duckwake/duckwake](https://github.com/duckwake/duckwake/releases) publishes:

- `duckwake` and `duckwaked` for Linux (amd64, arm64; glibc 2.39 or newer) and macOS (arm64, amd64), with
  `SHA256SUMS`;
- the extension as a DuckDB extension repository, for `INSTALL duckwake FROM '<url>'`;
- the `duckwaked` image for amd64 and arm64, `ghcr.io/duckwake/duckwake:<version>`.

Until the first release with downloads is out, build from source as above. Verify a download with
`sha256sum -c SHA256SUMS --ignore-missing`. Versions and what an upgrade needs are in
[Releases](/docs/project/releasing/) and the [changelog](/docs/project/changelog/).

The extension is not signed yet, so DuckDB must run with `-unsigned` (or
`SET allow_unsigned_extensions = true`) to load it.

## Next

Run the stack and your first view: [Quick start](/docs/start/quick-start/).
