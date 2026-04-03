import type { Command } from "commander";
import { apiRequest, buildQueryString } from "../utils/client.js";
import {
	printJson,
	printTable,
	printSuccess,
	printError,
} from "../utils/output.js";
import { confirm } from "../utils/prompt.js";

export function registerRunsCommands(program: Command): void {
	const runs = program.command("runs").description("Manage task runs");

	runs
		.command("list")
		.alias("ls")
		.description("List runs with optional filters")
		.option(
			"--status <statuses>",
			"Comma-separated statuses (COMPLETED,FAILED,...)",
		)
		.option("--task <identifier>", "Filter by task identifier")
		.option("--tag <tags>", "Comma-separated tags")
		.option("--version <version>", "Filter by version")
		.option("--from <datetime>", "Created after (ISO 8601)")
		.option("--to <datetime>", "Created before (ISO 8601)")
		.option("--period <period>", "Time period (1h, 6h, 1d, 7d, 30d)")
		.option("--schedule <id>", "Filter by schedule ID")
		.option("--bulk-action <id>", "Filter by bulk action ID")
		.option("--is-test", "Show only test runs")
		.option("--page-size <n>", "Results per page (10-100)", "25")
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
					"filter[taskIdentifier]": opts.task,
					"filter[tag]": opts.tag,
					"filter[version]": opts.version,
					"filter[createdAt][from]": opts.from,
					"filter[createdAt][to]": opts.to,
					"filter[createdAt][period]": opts.period,
					"filter[schedule]": opts.schedule,
					"filter[bulkAction]": opts.bulkAction,
					"filter[isTest]": opts.isTest ? "true" : undefined,
				});

				const data = await apiRequest<{ data: Record<string, unknown>[] }>(
					`/api/v1/runs${qs}`,
				);
				if (opts.json) {
					printJson(data);
				} else {
					const rows = (data.data || []).map((r) => ({
						id: r.id,
						task: r.taskIdentifier,
						status: r.status,
						version: r.version || "-",
						createdAt: r.createdAt,
					}));
					printTable(rows);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	runs
		.command("get <runId>")
		.description("Retrieve a specific run")
		.option("--json", "Output as JSON")
		.action(async (runId, opts) => {
			try {
				const data = await apiRequest<Record<string, unknown>>(
					`/api/v3/runs/${runId}`,
				);
				if (opts.json) {
					printJson(data);
				} else {
					printJson(data);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	runs
		.command("replay <runId>")
		.description("Replay a run (creates a new run)")
		.option("--json", "Output as JSON")
		.action(async (runId, opts) => {
			try {
				const data = await apiRequest<{ id: string }>(
					`/api/v1/runs/${runId}/replay`,
					{ method: "POST" },
				);
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Replayed run ${runId} → new run ${data.id}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	runs
		.command("cancel <runId>")
		.description("Cancel a run")
		.option("--force", "Skip confirmation")
		.option("--json", "Output as JSON")
		.action(async (runId, opts) => {
			try {
				if (!opts.force) {
					const ok = await confirm(`Cancel run ${runId}?`);
					if (!ok) return;
				}
				const data = await apiRequest<{ id: string }>(
					`/api/v2/runs/${runId}/cancel`,
					{ method: "POST" },
				);
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Canceled run ${data.id}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	runs
		.command("reschedule <runId>")
		.description("Reschedule a run")
		.requiredOption(
			"-d, --delay <delay>",
			"Delay duration (e.g., '1d', '2h') or ISO datetime",
		)
		.option("--json", "Output as JSON")
		.action(async (runId, opts) => {
			try {
				const data = await apiRequest(`/api/v1/runs/${runId}/reschedule`, {
					method: "POST",
					body: { delay: opts.delay },
				});
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Rescheduled run ${runId} with delay ${opts.delay}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	runs
		.command("tag <runId>")
		.description("Add tags to a run")
		.requiredOption("-t, --tags <tags...>", "Tags to add (space-separated)")
		.option("--json", "Output as JSON")
		.action(async (runId, opts) => {
			try {
				const data = await apiRequest(`/api/v1/runs/${runId}/tags`, {
					method: "POST",
					body: { tags: opts.tags },
				});
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Added ${opts.tags.length} tag(s) to run ${runId}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	runs
		.command("events <runId>")
		.description("Retrieve events for a run")
		.option("--json", "Output as JSON")
		.action(async (runId, opts) => {
			try {
				const data = await apiRequest(`/api/v1/runs/${runId}/events`);
				printJson(data);
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	runs
		.command("result <runId>")
		.description("Retrieve the result of a run")
		.option("--json", "Output as JSON")
		.action(async (runId, opts) => {
			try {
				const data = await apiRequest(`/api/v1/runs/${runId}/result`);
				printJson(data);
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	runs
		.command("trace <runId>")
		.description("Retrieve the trace of a run")
		.option("--json", "Output as JSON")
		.action(async (runId, opts) => {
			try {
				const data = await apiRequest(`/api/v1/runs/${runId}/trace`);
				printJson(data);
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	runs
		.command("update-metadata <runId>")
		.description("Update run metadata")
		.requiredOption("-m, --metadata <json>", "Metadata as JSON string")
		.option("--json", "Output as JSON")
		.action(async (runId, opts) => {
			try {
				const metadata = JSON.parse(opts.metadata);
				const data = await apiRequest(`/api/v1/runs/${runId}/metadata`, {
					method: "PUT",
					body: { metadata },
				});
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Updated metadata for run ${runId}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});
}
