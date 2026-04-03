import type { Command } from "commander";
import { apiRequest } from "../utils/client.js";
import {
	printJson,
	printTable,
	printError,
	printInfo,
} from "../utils/output.js";
import chalk from "chalk";

// ─── TRQL Reference (Trigger.dev Query Language) ────────────────────────────
//
// TRQL is a SQL-like language for querying task run data and metrics.
// Execute via: POST /api/v1/query  { query, scope?, period?, from?, to?, format? }
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ TABLES                                                              │
// ├──────────────────────────────────────────────────────────────────────┤
// │ runs    — All task run data                                         │
// │ metrics — CPU, memory, and custom metrics (10s buckets)             │
// └──────────────────────────────────────────────────────────────────────┘
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ RUNS COLUMNS                                                        │
// ├───────────────────┬──────────────────────────────────────────────────┤
// │ run_id            │ Unique run identifier                           │
// │ status            │ 'Completed','Failed','Crashed', etc.            │
// │ task_identifier   │ Task slug                                       │
// │ triggered_at      │ When the run was triggered                      │
// │ completed_at      │ When the run completed                          │
// │ executed_at       │ When execution started                          │
// │ attempt_count     │ Number of attempts                              │
// │ compute_cost      │ Cost of the run                                 │
// │ usage_duration    │ Duration in milliseconds                        │
// │ queue             │ Queue name                                      │
// │ machine           │ Machine preset                                  │
// │ error             │ Error info (JSON)                               │
// │ output            │ Task output (JSON, supports dot notation)       │
// │ tags              │ Array of string tags                            │
// │ environment       │ Environment name                                │
// └───────────────────┴──────────────────────────────────────────────────┘
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ METRICS COLUMNS                                                     │
// ├───────────────────┬──────────────────────────────────────────────────┤
// │ metric_name       │ e.g. 'process.cpu.utilization'                  │
// │ metric_type       │ 'gauge', 'sum', or 'histogram'                 │
// │ value             │ The observed numeric value                      │
// │ bucket_start      │ 10-second aggregation bucket start              │
// │ run_id            │ Associated run ID                               │
// │ task_identifier   │ Task slug                                       │
// │ attempt_number    │ Attempt number                                  │
// │ machine_id        │ Machine that produced the metric                │
// │ machine_name      │ Machine preset (e.g. 'small-1x')               │
// │ worker_version    │ Worker version                                  │
// │ environment_type  │ PRODUCTION, STAGING, DEVELOPMENT, PREVIEW       │
// │ attributes        │ Raw JSON attributes for custom data             │
// └───────────────────┴──────────────────────────────────────────────────┘
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ COMPARISON OPERATORS                                                │
// ├──────────────────────────────────────────────────────────────────────┤
// │ =, !=, >, >=, <, <=                                                │
// │ IN ('a', 'b')                                                      │
// │ LIKE 'pattern%'   ILIKE '%pattern%'                                │
// │ BETWEEN 'a' AND 'b'                                                │
// │ IS NULL   IS NOT NULL                                               │
// └──────────────────────────────────────────────────────────────────────┘
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ ARRAY FUNCTIONS (WHERE clause)                                      │
// ├──────────────────────────────────────────────────────────────────────┤
// │ has(tags, 'val')             — array contains value                 │
// │ notEmpty(tags)               — array is non-empty                   │
// │ hasAny(tags, array('a','b')) — any match                            │
// │ hasAll(tags, array('a','b')) — all match                            │
// │ indexOf(tags, 'val') > 0    — position-based check                 │
// │ arrayElement(tags, 1)        — access by index (1-based)           │
// └──────────────────────────────────────────────────────────────────────┘
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ AGGREGATE FUNCTIONS                                                 │
// ├──────────────────────────────────────────────────────────────────────┤
// │ count()  countIf(cond)  countDistinct(col)                         │
// │ sum(col) sumIf(col, cond)  avg(col)  min(col)  max(col)           │
// │ median(col)  quantile(p)(col)  stddevPop(col)  stddevSamp(col)    │
// └──────────────────────────────────────────────────────────────────────┘
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ DATE/TIME FUNCTIONS                                                 │
// ├──────────────────────────────────────────────────────────────────────┤
// │ timeBucket()          — auto-bucket by query time range             │
// │ toYear/toMonth/toDayOfWeek/toHour(col)                             │
// │ toStartOfDay/toStartOfHour/toStartOfMonth(col)                     │
// │ dateAdd('unit', n, col)   dateDiff('unit', col1, col2)             │
// │ now()  today()  toDate(col)  formatDateTime(col, fmt)              │
// └──────────────────────────────────────────────────────────────────────┘
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ STRING / MATH / CONDITIONAL FUNCTIONS                               │
// ├──────────────────────────────────────────────────────────────────────┤
// │ length  lower  upper  concat  substring  trim  replace             │
// │ startsWith  endsWith                                                │
// │ round  ceil  floor  abs                                            │
// │ if(cond,a,b)  multiIf(c1,v1,c2,v2,...,default)  coalesce(a,b)    │
// └──────────────────────────────────────────────────────────────────────┘
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ SPECIAL FUNCTIONS                                                   │
// ├──────────────────────────────────────────────────────────────────────┤
// │ prettyFormat(value, type)                                           │
// │   types: 'bytes','percent','duration','durationSeconds',            │
// │          'quantity','costInDollars'                                  │
// │ JSON dot notation: output.field  output.nested.field               │
// └──────────────────────────────────────────────────────────────────────┘
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ SCOPE / PERIOD / FORMAT OPTIONS                                     │
// ├──────────────────────────────────────────────────────────────────────┤
// │ scope:  'environment' (default), 'project', 'organization'         │
// │ period: '1h','6h','12h','1d','7d','30d','90d'                      │
// │ from/to: ISO 8601 datetime or Unix timestamp                       │
// │ format: 'json' (default), 'csv'                                    │
// │ Limit:  10,000 max rows                                            │
// └──────────────────────────────────────────────────────────────────────┘
//
// ─── EXAMPLE QUERIES ────────────────────────────────────────────────────
//
// ## Basic: list recent runs
//   SELECT run_id, task_identifier, status FROM runs LIMIT 10
//
// ## Percentile analysis by task
//   SELECT task_identifier, count() AS total_runs,
//     avg(usage_duration) AS avg_ms,
//     median(usage_duration) AS median_ms,
//     quantile(0.95)(usage_duration) AS p95_ms
//   FROM runs GROUP BY task_identifier
//
// ## Time-bucketed run counts
//   SELECT timeBucket(), count() AS runs FROM runs GROUP BY timeBucket()
//
// ## Daily success rate
//   SELECT toDate(triggered_at) AS day, task_identifier,
//     countIf(status = 'Completed') AS ok,
//     countIf(status = 'Failed') AS fail,
//     round(ok / (ok + fail) * 100, 2) AS success_pct
//   FROM runs WHERE status IN ('Completed','Failed')
//   GROUP BY day, task_identifier ORDER BY day DESC
//
// ## Top 10 most expensive runs
//   SELECT run_id, task_identifier, compute_cost, usage_duration
//   FROM runs WHERE compute_cost > 0 ORDER BY compute_cost DESC LIMIT 10
//
// ## Failed runs with errors
//   SELECT task_identifier, run_id, error, triggered_at
//   FROM runs WHERE status = 'Failed' ORDER BY triggered_at DESC
//
// ## Queue & machine statistics
//   SELECT queue, machine, count() AS total,
//     countIf(status='Completed') AS ok,
//     countIf(status='Failed') AS fail
//   FROM runs GROUP BY queue, machine ORDER BY queue
//
// ## Duration trends over time
//   SELECT timeBucket() AS time, task_identifier,
//     avg(usage_duration) AS avg_ms, count() AS n
//   FROM runs WHERE usage_duration IS NOT NULL
//   GROUP BY time, task_identifier ORDER BY time ASC
//
// ## JSON dot notation (access output fields)
//   SELECT run_id, output.message, output.count, output.externalId
//   FROM runs WHERE task_identifier = 'my-task'
//     AND output.externalId = 'something'
//   ORDER BY triggered_at DESC LIMIT 100
//
// ## CPU utilization trends (metrics table)
//   SELECT timeBucket(), avg(value) AS avg_cpu
//   FROM metrics WHERE metric_name = 'process.cpu.utilization'
//   GROUP BY timeBucket ORDER BY timeBucket LIMIT 1000
//
// ## Memory usage by task
//   SELECT task_identifier, avg(value) AS avg_memory
//   FROM metrics WHERE metric_name = 'process.memory.usage'
//   GROUP BY task_identifier ORDER BY avg_memory DESC LIMIT 20
//
// ## Pretty-formatted memory
//   SELECT timeBucket(),
//     prettyFormat(avg(value), 'bytes') AS avg_memory
//   FROM metrics WHERE metric_name = 'process.memory.usage'
//   GROUP BY timeBucket ORDER BY timeBucket LIMIT 1000
//
// ## Discover available metrics
//   SELECT metric_name, count() AS samples
//   FROM metrics GROUP BY metric_name ORDER BY samples DESC LIMIT 100
//
// ## Conditional status categories
//   SELECT run_id,
//     multiIf(status='Completed','ok', status='Failed','bad', 'other') AS cat,
//     coalesce(completed_at, triggered_at) AS end_time
//   FROM runs
//
// ## Array filtering (tags)
//   SELECT run_id, tags, length(tags) AS n,
//     has(tags, 'user_12345') AS has_user
//   FROM runs WHERE notEmpty(tags)
//
// ## Date arithmetic
//   SELECT dateDiff('minute', executed_at, completed_at) AS duration_min
//   FROM runs WHERE completed_at IS NOT NULL
//
// ─── END TRQL REFERENCE ─────────────────────────────────────────────────

const TRQL_HELP = `
${chalk.bold("TRQL — Trigger.dev Query Language")}

A SQL-like language for querying task run data and metrics.

${chalk.bold("Tables:")}
  ${chalk.cyan("runs")}     All task run data (run_id, status, task_identifier, triggered_at,
           completed_at, executed_at, attempt_count, compute_cost, usage_duration,
           queue, machine, error, output, tags, environment)
  ${chalk.cyan("metrics")}  CPU, memory, and custom metrics in 10-second buckets
           (metric_name, metric_type, value, bucket_start, run_id,
           task_identifier, attempt_number, machine_id, machine_name,
           worker_version, environment_type, attributes)

${chalk.bold("Operators:")}
  =, !=, >, >=, <, <=, IN, LIKE, ILIKE, BETWEEN, IS NULL, IS NOT NULL

${chalk.bold("Array functions:")}
  has(arr, val), notEmpty(arr), hasAny(arr, array('a','b')),
  hasAll(arr, array('a','b')), indexOf(arr, val), arrayElement(arr, n)

${chalk.bold("Aggregates:")}
  count(), countIf(cond), countDistinct(col), sum(col), sumIf(col, cond),
  avg(col), min(col), max(col), median(col), quantile(p)(col),
  stddevPop(col), stddevSamp(col)

${chalk.bold("Date/Time:")}
  timeBucket(), toYear/toMonth/toDayOfWeek/toHour(col),
  toStartOfDay/toStartOfHour/toStartOfMonth(col),
  dateAdd('unit', n, col), dateDiff('unit', c1, c2), now(), today()

${chalk.bold("Special:")}
  prettyFormat(value, 'bytes'|'percent'|'duration'|'durationSeconds'|
    'quantity'|'costInDollars')
  JSON dot notation: output.field, output.nested.field

${chalk.bold("Scope:")}  environment (default), project, organization
${chalk.bold("Period:")} 1h, 6h, 12h, 1d, 7d, 30d, 90d
${chalk.bold("Format:")} json (default), csv
${chalk.bold("Limit:")}  10,000 max rows

${chalk.bold("Example queries:")}
  ${chalk.dim("# Recent failed runs")}
  SELECT task_identifier, run_id, error FROM runs WHERE status = 'Failed' ORDER BY triggered_at DESC

  ${chalk.dim("# P95 duration by task")}
  SELECT task_identifier, quantile(0.95)(usage_duration) AS p95_ms FROM runs GROUP BY task_identifier

  ${chalk.dim("# Daily success rate")}
  SELECT toDate(triggered_at) AS day, countIf(status='Completed') AS ok,
    countIf(status='Failed') AS fail, round(ok/(ok+fail)*100, 2) AS pct
  FROM runs WHERE status IN ('Completed','Failed') GROUP BY day ORDER BY day DESC

  ${chalk.dim("# CPU trends")}
  SELECT timeBucket(), avg(value) AS avg_cpu FROM metrics
  WHERE metric_name = 'process.cpu.utilization' GROUP BY timeBucket ORDER BY timeBucket

  ${chalk.dim("# Memory by task")}
  SELECT task_identifier, prettyFormat(avg(value),'bytes') AS mem FROM metrics
  WHERE metric_name = 'process.memory.usage' GROUP BY task_identifier ORDER BY avg(value) DESC
`;

export function registerQueryCommands(program: Command): void {
	const query = program
		.command("query [sql]")
		.alias("q")
		.description(
			"Execute a TRQL query against your Trigger.dev data. " +
				"Use --help-trql for full syntax reference.",
		)
		.option(
			"-s, --scope <scope>",
			"Scope: environment (default), project, organization",
		)
		.option("--period <period>", "Time period: 1h, 6h, 12h, 1d, 7d, 30d, 90d")
		.option("--from <datetime>", "Start date (ISO 8601 or Unix timestamp)")
		.option("--to <datetime>", "End date (ISO 8601 or Unix timestamp)")
		.option("-f, --format <format>", "Output format: json (default), csv")
		.option("--json", "Output raw JSON response")
		.option("--help-trql", "Show full TRQL syntax reference")
		.action(async (sql, opts) => {
			if (opts.helpTrql) {
				console.log(TRQL_HELP);
				return;
			}

			if (!sql) {
				printError("Query is required. Usage: trigger-cli query 'SELECT ...'");
				printInfo("Use --help-trql for TRQL syntax reference");
				process.exit(1);
			}

			try {
				const body: Record<string, unknown> = { query: sql };
				if (opts.scope) body.scope = opts.scope;
				if (opts.period) body.period = opts.period;
				if (opts.from) body.from = opts.from;
				if (opts.to) body.to = opts.to;
				if (opts.format) body.format = opts.format;

				const data = await apiRequest<{ results: unknown }>("/api/v1/query", {
					method: "POST",
					body,
				});

				if (opts.format === "csv" || typeof data.results === "string") {
					console.log(data.results);
					return;
				}

				if (opts.json) {
					printJson(data);
					return;
				}

				const results = data.results;
				if (Array.isArray(results) && results.length > 0) {
					printTable(results as Record<string, unknown>[]);
				} else if (Array.isArray(results)) {
					printInfo("Query returned no results");
				} else {
					printJson(data);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});
}
