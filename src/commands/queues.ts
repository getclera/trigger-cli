import type { Command } from "commander";
import { apiRequest, buildQueryString } from "../utils/client.js";
import {
	printJson,
	printTable,
	printSuccess,
	printError,
} from "../utils/output.js";

export function registerQueuesCommands(program: Command): void {
	const queues = program.command("queues").description("Manage queues");

	queues
		.command("list")
		.alias("ls")
		.description("List all queues")
		.option("--page <n>", "Page number")
		.option("--per-page <n>", "Results per page")
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			try {
				const qs = buildQueryString({
					page: opts.page,
					perPage: opts.perPage,
				});
				const data = await apiRequest<{
					data: Record<string, unknown>[];
					pagination: Record<string, unknown>;
				}>(`/api/v1/queues${qs}`);

				if (opts.json) {
					printJson(data);
				} else {
					const rows = (data.data || []).map((q) => ({
						id: q.id,
						name: q.name,
						type: q.type,
						running: q.running,
						queued: q.queued,
						paused: q.paused ? "yes" : "no",
						concurrency: q.concurrencyLimit,
					}));
					printTable(rows);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	queues
		.command("get <queueParam>")
		.description("Retrieve a queue")
		.option("--type <type>", "Param type: id (default), task, custom", "id")
		.option("--json", "Output as JSON")
		.action(async (queueParam, opts) => {
			try {
				const qs = buildQueryString({ type: opts.type });
				const data = await apiRequest(`/api/v1/queues/${queueParam}${qs}`);
				printJson(data);
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	queues
		.command("pause <queueParam>")
		.description("Pause a queue")
		.option("--type <type>", "Param type: id (default), task, custom", "id")
		.option("--json", "Output as JSON")
		.action(async (queueParam, opts) => {
			try {
				const data = await apiRequest(`/api/v1/queues/${queueParam}/pause`, {
					method: "POST",
					body: { action: "pause", type: opts.type },
				});
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Paused queue ${queueParam}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	queues
		.command("resume <queueParam>")
		.description("Resume a paused queue")
		.option("--type <type>", "Param type: id (default), task, custom", "id")
		.option("--json", "Output as JSON")
		.action(async (queueParam, opts) => {
			try {
				const data = await apiRequest(`/api/v1/queues/${queueParam}/pause`, {
					method: "POST",
					body: { action: "resume", type: opts.type },
				});
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Resumed queue ${queueParam}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	queues
		.command("set-concurrency <queueParam>")
		.description("Override concurrency limit for a queue")
		.requiredOption("-l, --limit <n>", "Concurrency limit (0-100000)")
		.option("--type <type>", "Param type: id (default), task, custom", "id")
		.option("--json", "Output as JSON")
		.action(async (queueParam, opts) => {
			try {
				const data = await apiRequest(
					`/api/v1/queues/${queueParam}/concurrency/override`,
					{
						method: "POST",
						body: {
							type: opts.type,
							concurrencyLimit: parseInt(opts.limit),
						},
					},
				);
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(
						`Set concurrency limit to ${opts.limit} for queue ${queueParam}`,
					);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	queues
		.command("reset-concurrency <queueParam>")
		.description("Reset concurrency limit to default")
		.option("--type <type>", "Param type: id (default), task, custom", "id")
		.option("--json", "Output as JSON")
		.action(async (queueParam, opts) => {
			try {
				const data = await apiRequest(
					`/api/v1/queues/${queueParam}/concurrency/reset`,
					{
						method: "POST",
						body: { type: opts.type },
					},
				);
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Reset concurrency limit for queue ${queueParam}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});
}
