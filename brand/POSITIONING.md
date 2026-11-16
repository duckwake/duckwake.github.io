# DuckWake: positioning and messaging

Version 1.0, 2026-11-16. Review on 2027-02-16 or after P3 (the production soak), whichever comes first.
Built with April Dunford's positioning sequence (alternatives, unique attributes, value, best-fit customer,
category), then every pillar stress-tested and every home page claim checked against the duckwake repository.
Copy on the website, in the README and in talks should use this language; when the product changes, change this
file first.

## The core idea

> **For data engineers who keep their data in DuckDB and DuckLake and need tables fresher than the nightly
> batch, DuckWake is the streaming SQL engine that maintains your views as DuckLake tables, exactly once and
> checkable, unlike streaming databases and Flink, which keep results in another system you have to run.**

No competitor can say this honestly: their results live in their own storage, and none of them check a view
against its query run as one batch.

## Who it is for

**Primary buyer.** A data or analytics engineer at a small or mid-size company that already keeps its data in
DuckDB and DuckLake and has events in Kafka. **Trigger:** someone asks for a dashboard or table fresher than the
nightly batch, and the engineer does not want to stand up a streaming system to provide it.

**Market state: M2, kinetic.** These buyers already solve the problem, badly: scheduled batch jobs, or consumer
scripts they wrote themselves. The message redirects that effort; it does not create demand.

## The alternatives

| Alternative | Does well | Fails at | The buyer must believe |
| --- | --- | --- | --- |
| Streaming databases (RisingWave, Materialize, Timeplus) | Mature, rich SQL including stream–stream joins, managed cloud | Results live in their system, not the DuckDB lake; another system to run and pay for | "A second database is worth it for freshness" |
| Flink and managed Flink | Very large scale, wide ecosystem, any sink | A JVM cluster to operate; writing to DuckLake is not native; exactly once depends on the sink | "Our scale needs a Flink team" |
| Batch on a schedule (dbt or SQL jobs on cron or Airflow): the status quo | Simple, already there, SQL | Only as fresh as the schedule; full recomputes; a half-done run can drop or repeat rows | "An hour behind is fine" |
| Consumer code written in-house | Flexible, cheap at first | State, late data, failover and exactly once are hard; no way to prove the output | "Our case is simple" |
| Do nothing | Free | Decisions on yesterday's numbers | "Nobody needs it faster" |

**The gap.** For data engineers who need their DuckDB tables fresh within seconds and correct to the event,
alternatives fail because they either keep results in another system you have to run, or trade freshness or
correctness for simplicity, and DuckWake addresses this with SQL views maintained directly as DuckLake tables,
committed exactly once per epoch next to DuckDB, and checked with `duckwake_verify`.

**Category:** streaming SQL for DuckLake. Not a "streaming database": DuckWake stores and serves nothing of its
own; the data stays in your lake.

## Narrative

Teams that moved their analytics to DuckDB got a fast, simple stack: SQL, files in a lake, no warehouse to run.
Then someone asks for numbers from the last five minutes, not from last night. The usual answers bring back what
DuckDB let them leave behind: a streaming database or a Flink cluster with its own storage, its own operations
and its own copy of the data, or a scheduled job that is only as fresh as its schedule and can drop or repeat rows
when a run fails halfway. DuckLake changes what is possible: a table can now be updated in one transaction, with
its history kept, on storage the team already has. So the freshest data does not need to live anywhere else.
DuckWake keeps a SQL view's table in the lake current as events arrive from Kafka. Each step commits the new rows,
the view's state and the Kafka offsets together, so a crash never loses or repeats an event, and `duckwake_verify`
checks the table against its query run as one batch. It runs as a DuckDB extension, a CLI or a small server, next
to the DuckDB the team already uses.

## Core lines

| Use | Text |
| --- | --- |
| Tagline (6 words) | Real-time DuckLake tables, exactly once. |
| One-liner | DuckWake keeps SQL views over Kafka as DuckLake tables, updated every few seconds and exactly once, with no streaming cluster to run. |
| Elevator pitch | DuckWake is an open-source streaming SQL engine for DuckLake. Write a view in SQL or as a dbt model; DuckWake keeps its table in your lake current as events arrive from Kafka. Every few seconds it commits rows, state and offsets in one transaction, so nothing is lost or counted twice, and duckwake_verify checks it. It runs next to DuckDB, not as another cluster. |
| Boilerplate | DuckWake is an open-source (MIT) streaming SQL engine for DuckDB and DuckLake. It maintains SQL views over Kafka topics, lake tables and other views as DuckLake tables, updated every few seconds and exactly once: each epoch commits rows, operator state and source offsets in a single DuckLake transaction. Views are written in SQL or as dbt models, read by any DuckDB client, and checked with duckwake_verify against a batch recomputation. DuckWake runs as a DuckDB extension, a CLI or a server, with a PostgreSQL catalog and local or S3 storage. |

## Pillars

Each pillar passed the four-question stress test (true, relevant, unique, sustainable). "Relevant" rests on the
buyer hypothesis above until customer evidence exists (see Validation).

1. **Your lake is the result.** Each view is a DuckLake table that dashboards, notebooks and dbt read with plain
   SQL. There is no second database to query, secure or pay for. *Proof:* view tables in `lake.<schema>`
   (docs/sql.md); views read other views and lake tables through their change feed (CHANGELOG 0.2.0); views as dbt
   models (dbt/README.md).
2. **Exactly once, and you can check it.** Rows, state and offsets commit in one DuckLake transaction per epoch,
   so a crash replays that epoch instead of losing or repeating rows; `duckwake_verify` compares the table with a
   batch run of its query. *Proof:* "one DuckLake transaction per epoch, exactly-once output" (docs/roadmap.md);
   `duckwake_verify` (docs/sql.md); scripts/crash_test.sh kills the worker with `kill -9` and aborts it inside the
   transaction, then verifies every view, on every pull request.
3. **Nothing new to run.** Workers run next to DuckDB, as an extension, a CLI or a server, and coordinate through
   the lake's catalog: no coordinator service, no separate state store. *Proof:* the three ways to run it
   (README); failover and rebalancing through heartbeats and leases in the lake (scripts/failover_test.sh,
   scripts/rebalance_test.sh); Prometheus metrics and alert rules with tests (deploy/).

**Supporting proof, not headlines:** views in SQL or dbt (3/4: Materialize and RisingWave also have dbt
adapters); failover, limits and metrics (3/4: competitors have them too); throughput (2/4: not unique, not
sustainable as a claim).

## Home page copy

Checked claim by claim against the repository on 2026-11-16.

- **Hero:** Real-time DuckLake tables, exactly once.
- **Subhead:** Write a view in SQL. DuckWake updates it from Kafka every few seconds, with no streaming cluster to
  run.
- **Pillars:** the three above, one sentence each.
- **Calls to action:** Run the quick start (primary), Star on GitHub (secondary).
- **Proof strip, option A:** CI kills workers mid-commit, then checks every view with duckwake_verify.
- **Proof strip, option B:** 108k events/s on one view · 327 ms median commit with 16 views at 20k events/s. Always
  with: one worker on a MacBook (Apple Silicon, 10 cores), the four worker flags on.

### Claims audit

| # | Claim | Type | Proof | Status |
| --- | --- | --- | --- | --- |
| 1 | Real-time DuckLake tables | Mechanism | Epochs every 10 s by default, `epoch_interval` down to seconds (docs/sql.md) | Ship, with "every few seconds" in the subhead |
| 2 | Exactly once | Mechanism | One transaction per epoch (docs/roadmap.md); crash suite with kill -9 and aborts mid-transaction, then verify | Ship |
| 3 | No streaming cluster to run | Comparison | Runs as extension, CLI or server; needs a PostgreSQL catalog and Kafka | Ship |
| 4 | Each view is a DuckLake table read with plain SQL | Mechanism | docs/sql.md | Ship |
| 5 | Rows, state and offsets commit together; verify compares with a batch run | Mechanism | docs/roadmap.md, docs/sql.md | Ship |
| 6 | Coordinate through the lake: "no cluster" | Mechanism | Workers use heartbeats and leases in the lake's catalog | Fixed: "no coordinator service", since several workers can run |
| 7 | "Every test suite ends with duckwake_verify" | Mechanism | False as written: the monitoring, throughput and soak suites do not verify | Fixed: "CI kills workers mid-commit, then checks every view" |
| 8 | 108k events/s, 327 ms commit | Performance | docs/performance.md, one MacBook run, all four worker flags on (off by default) | Fixed: machine and flags always stated |
| 9 | MIT licensed | Fact | LICENSE | Ship |

## Language

**Use:** DuckLake tables · exactly once · every few seconds · next to DuckDB · duckwake_verify · no streaming
cluster · views in SQL or dbt.

**Do not use:**

| Phrase | Why |
| --- | --- |
| streaming database | Wrong category: DuckWake keeps no data of its own |
| production-grade, battle-tested | No production evidence until P3 |
| any SQL, full SQL | No stream–stream joins yet |
| sub-second, zero latency | Epochs are seconds |
| Flink killer | Invites a scale comparison DuckWake loses |
| real-time analytics platform | Generic: every competitor says it |
| leverage, seamless, best-in-class, robust, turnkey, holistic, enterprise-grade, disruptive, game-changing | Filler |

**Known limits to stay honest about:** Kafka with JSON only; no stream–stream joins; one machine per worker;
version 0.x, not yet production-proven.

## Validation

Every "relevant" verdict above is a hypothesis until it has customer evidence. To earn it:

1. Talk to 5–8 DuckDB or DuckLake users who have Kafka (the DuckDB Discord, r/dataengineering): what do they do
   today when someone needs data fresher than the batch?
2. Measure how many who start the quick start create a first view.
3. Test the hero: "lake" first against "exactly once" first.
