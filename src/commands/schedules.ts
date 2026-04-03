import type { Command } from "commander";
import { apiRequest, buildQueryString } from "../utils/client.js";
import {
	printJson,
	printTable,
	printSuccess,
	printError,
	printInfo,
} from "../utils/output.js";
import { confirm } from "../utils/prompt.js";

export function registerSchedulesCommands(program: Command): void {
	const schedules = program
		.command("schedules")
		.alias("sched")
		.description("Manage schedules");

	schedules
		.command("list")
		.alias("ls")
		.description("List all schedules")
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
				}>(`/api/v1/schedules${qs}`);

				if (opts.json) {
					printJson(data);
				} else {
					const rows = (data.data || []).map((s) => ({
						id: s.id,
						task: s.task,
						active: s.active ? "yes" : "no",
						cron: (s.generator as Record<string, unknown>)?.expression || "-",
						timezone: s.timezone || "UTC",
						nextRun: s.nextRun || "-",
					}));
					printTable(rows);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	schedules
		.command("get <scheduleId>")
		.description("Retrieve a schedule")
		.option("--json", "Output as JSON")
		.action(async (scheduleId, opts) => {
			try {
				const data = await apiRequest(`/api/v1/schedules/${scheduleId}`);
				printJson(data);
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	schedules
		.command("create")
		.description("Create a schedule")
		.requiredOption("-t, --task <identifier>", "Task identifier")
		.requiredOption("-c, --cron <expression>", "Cron expression")
		.requiredOption("-k, --dedup-key <key>", "Deduplication key")
		.option("--external-id <id>", "External ID")
		.option("--timezone <tz>", "IANA timezone (default: UTC)")
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			try {
				const body: Record<string, unknown> = {
					task: opts.task,
					cron: opts.cron,
					deduplicationKey: opts.dedupKey,
				};
				if (opts.externalId) body.externalId = opts.externalId;
				if (opts.timezone) body.timezone = opts.timezone;

				const data = await apiRequest("/api/v1/schedules", {
					method: "POST",
					body,
				});
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Created schedule for task "${opts.task}"`);
					printJson(data);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	schedules
		.command("update <scheduleId>")
		.description("Update a schedule")
		.option("-t, --task <identifier>", "Task identifier")
		.option("-c, --cron <expression>", "Cron expression")
		.option("--external-id <id>", "External ID")
		.option("--timezone <tz>", "IANA timezone")
		.option("--json", "Output as JSON")
		.action(async (scheduleId, opts) => {
			try {
				const body: Record<string, unknown> = {};
				if (opts.task) body.task = opts.task;
				if (opts.cron) body.cron = opts.cron;
				if (opts.externalId) body.externalId = opts.externalId;
				if (opts.timezone) body.timezone = opts.timezone;

				const data = await apiRequest(`/api/v1/schedules/${scheduleId}`, {
					method: "PUT",
					body,
				});
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Updated schedule ${scheduleId}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	schedules
		.command("delete <scheduleId>")
		.alias("rm")
		.description("Delete a schedule")
		.option("--force", "Skip confirmation")
		.option("--json", "Output as JSON")
		.action(async (scheduleId, opts) => {
			try {
				if (!opts.force) {
					const ok = await confirm(`Delete schedule ${scheduleId}?`);
					if (!ok) return;
				}
				const data = await apiRequest(`/api/v1/schedules/${scheduleId}`, {
					method: "DELETE",
				});
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Deleted schedule ${scheduleId}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	schedules
		.command("activate <scheduleId>")
		.description("Activate a schedule")
		.option("--json", "Output as JSON")
		.action(async (scheduleId, opts) => {
			try {
				const data = await apiRequest(
					`/api/v1/schedules/${scheduleId}/activate`,
					{ method: "POST" },
				);
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Activated schedule ${scheduleId}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	schedules
		.command("deactivate <scheduleId>")
		.description("Deactivate a schedule")
		.option("--json", "Output as JSON")
		.action(async (scheduleId, opts) => {
			try {
				const data = await apiRequest(
					`/api/v1/schedules/${scheduleId}/deactivate`,
					{ method: "POST" },
				);
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Deactivated schedule ${scheduleId}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	schedules
		.command("timezones")
		.description("List available timezones (no auth required)")
		.option("--exclude-utc", "Exclude UTC")
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			try {
				const qs = buildQueryString({
					excludeUtc: opts.excludeUtc ? "true" : undefined,
				});
				const data = await apiRequest<{ timezones: string[] }>(
					`/api/v1/timezones${qs}`,
				);
				if (opts.json) {
					printJson(data);
				} else {
					for (const tz of data.timezones) {
						console.log(tz);
					}
					printInfo(`${data.timezones.length} timezone(s)`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});
}
