import type { Command } from "commander";
import { apiRequest } from "../utils/client.js";
import {
	printJson,
	printSuccess,
	printError,
	printTable,
} from "../utils/output.js";

export function registerBatchesCommands(program: Command): void {
	const batches = program.command("batches").description("Manage batch runs");

	batches
		.command("create")
		.description("Create a new batch")
		.requiredOption("-n, --run-count <n>", "Number of runs in the batch")
		.option("--parent-run <id>", "Parent run ID")
		.option("--resume-parent", "Resume parent on completion")
		.option("--idempotency-key <key>", "Idempotency key")
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			try {
				const body: Record<string, unknown> = {
					runCount: parseInt(opts.runCount),
				};
				if (opts.parentRun) body.parentRunId = opts.parentRun;
				if (opts.resumeParent) body.resumeParentOnCompletion = true;
				if (opts.idempotencyKey) body.idempotencyKey = opts.idempotencyKey;

				const data = await apiRequest<{
					id: string;
					runCount: number;
					isCached: boolean;
				}>("/api/v3/batches", { method: "POST", body });

				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(
						`Created batch ${data.id} (${data.runCount} runs, cached: ${data.isCached})`,
					);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	batches
		.command("get <batchId>")
		.description("Retrieve batch status")
		.option("--json", "Output as JSON")
		.action(async (batchId, opts) => {
			try {
				const data = await apiRequest(`/api/v1/batches/${batchId}`);
				printJson(data);
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	batches
		.command("results <batchId>")
		.description("Retrieve batch results")
		.option("--json", "Output as JSON")
		.action(async (batchId, opts) => {
			try {
				const data = await apiRequest<{
					id: string;
					items: Record<string, unknown>[];
				}>(`/api/v1/batches/${batchId}/results`);

				if (opts.json) {
					printJson(data);
				} else {
					const rows = data.items.map((item) => ({
						id: item.id,
						ok: item.ok ? "yes" : "no",
						task: item.taskIdentifier,
						durationMs:
							(item.usage as Record<string, unknown>)?.durationMs ?? "-",
					}));
					printTable(rows);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	batches
		.command("stream-items <batchId>")
		.description("Stream batch items as NDJSON")
		.requiredOption(
			"--items <ndjson>",
			'NDJSON string of items (one per line): {"index":0,"task":"...","payload":{...}}',
		)
		.option("--json", "Output as JSON")
		.action(async (batchId, opts) => {
			try {
				const data = await apiRequest(`/api/v3/batches/${batchId}/items`, {
					method: "POST",
					body: opts.items,
					contentType: "application/x-ndjson",
				});
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Streamed items to batch ${batchId}`);
					printJson(data);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});
}
