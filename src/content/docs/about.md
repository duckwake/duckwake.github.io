---
title: Fresh tables shouldn't need a platform.
description: Why DuckWake exists. Fresh lake tables from Kafka should take one SQL view and one DuckLake transaction per epoch, not a streaming platform.
head:
  - tag: title
    content: About DuckWake
---

It is a Monday morning. The dashboard says revenue per game is flat, and someone asks why. The events behind it
reached Kafka a minute ago. The table the dashboard reads was last rebuilt overnight.

Almost every data team has lived some version of this. The data exists; it just isn't where people look. The
usual fixes all cost something. You can schedule the batch job more often, and accept that the day it fails
halfway it will drop rows or write some of them twice. Or you can adopt a streaming platform: a cluster, state
backends, checkpoint tuning, a second language next to SQL, and somebody on call for all of it.

Both paths share one assumption: that fresh data needs heavy machinery. For a lot of teams that assumption is the
real problem. Their data fits on one machine, and their analytics already runs in one process. They only want a
table that keeps up.

## The idea

DuckDB showed that serious analytics can live in a single process. DuckLake added something just as important: a
lake whose catalog sits in a database, so every commit to the lake is a transaction.

That second part changes the hard question. Exactly-once output is usually a distributed-systems problem, with
coordinated checkpoints and two-phase commits between systems that do not trust each other. But if a view's new
rows, the view's own state and the Kafka offsets it read are all written in one DuckLake transaction, either all
three are saved or none of them are. After a crash, the worker resumes from the last commit. Nothing is lost, and
nothing is written twice. Exactly-once becomes a property of a commit.

> One SQL view. One worker next to DuckDB. One DuckLake transaction per epoch.

The rest follows from taking that idea seriously. DuckWake runs a view in small batches called epochs. It doesn't
recompute everything each time: the view is compiled into an incremental operator circuit in the DBSP model, the
approach Feldera uses, so each epoch computes only what changed. The output is an ordinary DuckLake table. Any
DuckDB client can read it, with nothing new to install.

## Who it is for

DuckWake is for data engineers who already like DuckDB and DuckLake. They would rather read a `SELECT` than a job
graph, and they want a dashboard that is a few seconds old, not a night old, without taking on a platform to get
there. Views can be written as dbt models, next to the rest of a team's SQL.

It is not for teams that need a multi-node cluster for millions of events per second. Those teams have good tools
already, and DuckWake does not try to be one of them.

## What we hold ourselves to

- **Prove it, don't claim it.** Every view in the test suites is checked against the same SQL run as one batch
  query, and `duckwake_verify` lets you run that check on your own views. The crash tests kill the worker with
  `kill -9` and abort it mid-transaction, before and after `COMMIT`, then check that the output still matches
  exactly.
- **Say what it does, with numbers.** We publish measurements together with the machine and the flags they came
  from. We don't publish adjectives.
- **Name the limits.** When something isn't supported yet, we say so and say why. A limit stated plainly costs
  less than a surprise in production.
- **Stay small.** One process per worker, plain SQL, ordinary tables. The lake remains the source of truth, and
  DuckWake is only the thing that keeps it fresh.

## Where it stands

DuckWake is open source under the MIT license, at version 0.1, built on DuckDB 2.0 and DuckLake 1.1. It reads JSON
from Kafka, with SASL and TLS, and writes to lakes on local disk or S3. Views filter, join lake tables, aggregate
over windows or per group, and read other views and lake tables through their change feeds. Workers fail over and
rebalance on their own, and every part has metrics, alerts and an integration suite in CI.

The [roadmap](/docs/project/roadmap/) to production runs through four stages, each ending at a gate that must pass
before the next one starts. CI, a real environment and operability are built; a 24-hour soak, failure drills and
the runbook come next, on a long-running server.

The code, the docs and the design documents are on [GitHub](https://github.com/duckwake/duckwake). Issues and pull
requests are welcome.
