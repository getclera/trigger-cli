import type { Command } from "commander";
import { apiRequest, buildQueryString } from "../utils/client.js";
import {
	printJson,
	printTable,
	printSuccess,
	printError,
} from "../utils/output.js";

export function registerWaitpointsCommands(program: Command): void {
	const waitpoints = program
		.command("waitpoints")
		.alias("wp")
		.description("Manage waitpoint tokens");

	waitpoints
		.command("create")
		.description("Create a waitpoint token")
		.option("--idempotency-key <key>", "Idempotency key")
		.option("--idempotency-key-ttl <ttl>", "Idempotency key TTL (e.g., '1h')")
		.option("--timeout <timeout>", "Timeout (ISO 8601 or duration)")
		.option("--tags <tags...>", "Tags (space-separated, max 10)")
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			try {
				const body: Record<string, unknown> = {};
				if (opts.idempotencyKey) body.idempotencyKey = opts.idempotencyKey;
				if (opts.idempotencyKeyTtl)
					body.idempotencyKeyTTL = opts.idempotencyKeyTtl;
				if (opts.timeout) body.timeout = opts.timeout;
				if (opts.tags) body.tags = opts.tags;

				const data = await apiRequest<{
					id: string;
					isCached: boolean;
					url: string;
				}>("/api/v1/waitpoints/tokens", { method: "POST", body });

				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Created waitpoint ${data.id}`);
					console.log(`  URL: ${data.url}`);
					console.log(`  Cached: ${data.isCached}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	waitpoints
		.command("complete <waitpointId>")
		.description("Complete a waitpoint token")
		.option("--data <json>", "JSON data to pass")
		.option("--json", "Output as JSON")
		.action(async (waitpointId, opts) => {
			try {
				const body: Record<string, unknown> = {};
				if (opts.data) body.data = JSON.parse(opts.data);

				const data = await apiRequest(
					`/api/v1/waitpoints/tokens/${waitpointId}/complete`,
					{ method: "POST", body },
				);
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Completed waitpoint ${waitpointId}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	waitpoints
		.command("list")
		.alias("ls")
		.description("List waitpoint tokens")
		.option(
			"--status <statuses>",
			"Comma-separated: WAITING, COMPLETED, TIMED_OUT",
		)
		.option("--idempotency-key <key>", "Filter by idempotency key")
		.option("--tags <tags>", "Comma-separated tags")
		.option("--from <datetime>", "Created after (ISO 8601)")
		.option("--to <datetime>", "Created before (ISO 8601)")
		.option("--period <period>", "Time period (1h, 6h, 1d, 7d, 30d)")
		.option("--page-size <n>", "Results per page (1-100)")
		.option("--after <cursor>", "Cursor for next page")
		.option("--before <cursor>", "Cursor for previous page")
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			try {
				const qs = buildQueryString({
					"page[size]": opts.pageSize,
					"page[after]": opts.after,
					"page[before]": opts.before,
					"filter[status]": opts.status,
					"filter[idempotencyKey]": opts.idempotencyKey,
					"filter[tags]": opts.tags,
					"filter[createdAt][from]": opts.from,
					"filter[createdAt][to]": opts.to,
					"filter[createdAt][period]": opts.period,
				});

				const data = await apiRequest<{ data: Record<string, unknown>[] }>(
					`/api/v1/waitpoints/tokens${qs}`,
				);

				if (opts.json) {
					printJson(data);
				} else {
					const rows = (data.data || []).map((w) => ({
						id: w.id,
						status: w.status,
						idempotencyKey: w.idempotencyKey || "-",
						timeoutAt: w.timeoutAt || "-",
						completedAt: w.completedAt || "-",
						createdAt: w.createdAt,
					}));
					printTable(rows);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	waitpoints
		.command("get <waitpointId>")
		.description("Retrieve a waitpoint token")
		.option("--json", "Output as JSON")
		.action(async (waitpointId, opts) => {
			try {
				const data = await apiRequest(
					`/api/v1/waitpoints/tokens/${waitpointId}`,
				);
				printJson(data);
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});
}
