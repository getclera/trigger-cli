import type { Command } from "commander";
import { apiRequest } from "../utils/client.js";
import { printJson, printSuccess, printError } from "../utils/output.js";

export function registerTasksCommands(program: Command): void {
	const tasks = program.command("tasks").description("Trigger tasks");

	tasks
		.command("trigger <taskIdentifier>")
		.description("Trigger a task run")
		.option("--payload <json>", "JSON payload")
		.option("--context <json>", "JSON context")
		.option("--queue <name>", "Queue name")
		.option("--concurrency-limit <n>", "Queue concurrency limit (0-1000)")
		.option("--concurrency-key <key>", "Concurrency key")
		.option("--idempotency-key <key>", "Idempotency key")
		.option("--ttl <ttl>", "Time to live (e.g., '1h', 300)")
		.option("--delay <delay>", "Delay (duration or ISO datetime)")
		.option("--tags <tags...>", "Tags (space-separated, max 10)")
		.option(
			"--machine <preset>",
			"Machine preset (micro, small-1x, small-2x, medium-1x, medium-2x, large-1x, large-2x)",
		)
		.option("--json", "Output as JSON")
		.action(async (taskIdentifier, opts) => {
			try {
				const body: Record<string, unknown> = {};

				if (opts.payload) body.payload = JSON.parse(opts.payload);
				if (opts.context) body.context = JSON.parse(opts.context);

				const options: Record<string, unknown> = {};
				if (opts.queue || opts.concurrencyLimit) {
					options.queue = {
						...(opts.queue && { name: opts.queue }),
						...(opts.concurrencyLimit && {
							concurrencyLimit: parseInt(opts.concurrencyLimit),
						}),
					};
				}
				if (opts.concurrencyKey) options.concurrencyKey = opts.concurrencyKey;
				if (opts.idempotencyKey) options.idempotencyKey = opts.idempotencyKey;
				if (opts.ttl) options.ttl = opts.ttl;
				if (opts.delay) options.delay = opts.delay;
				if (opts.tags) options.tags = opts.tags;
				if (opts.machine) options.machine = opts.machine;

				if (Object.keys(options).length > 0) body.options = options;

				const data = await apiRequest<{ id: string }>(
					`/api/v1/tasks/${taskIdentifier}/trigger`,
					{ method: "POST", body },
				);
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Triggered ${taskIdentifier} → run ${data.id}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	tasks
		.command("batch-trigger")
		.description("Batch trigger multiple tasks (max 1000)")
		.requiredOption(
			"--items <json>",
			'JSON array of items: [{"task":"...","payload":{...}}]',
		)
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			try {
				const items = JSON.parse(opts.items);
				const data = await apiRequest<{ batchId: string; runs: string[] }>(
					"/api/v1/tasks/batch",
					{ method: "POST", body: { items } },
				);
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(
						`Batch triggered ${data.runs.length} run(s), batch ID: ${data.batchId}`,
					);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});
}
