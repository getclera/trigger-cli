import type { Command } from "commander";
import { apiRequest, resolveProject, resolveEnv } from "../utils/client.js";
import {
	printJson,
	printTable,
	printSuccess,
	printError,
} from "../utils/output.js";
import { confirm } from "../utils/prompt.js";

export function registerEnvvarsCommands(program: Command): void {
	const envvars = program
		.command("envvars")
		.alias("env")
		.description("Manage environment variables");

	envvars
		.command("list")
		.alias("ls")
		.description("List all environment variables")
		.option("-p, --project <ref>", "Project ref (or TRIGGER_PROJECT_REF)")
		.option("-e, --env <env>", "Environment (or TRIGGER_ENV)")
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			try {
				const data = await apiRequest<{ name: string; value: string }[]>(
					`/api/v1/projects/${resolveProject(opts.project)}/envvars/${resolveEnv(opts.env)}`,
				);
				if (opts.json) {
					printJson(data);
				} else {
					printTable(
						data.map((v) => ({
							name: v.name,
							value:
								v.value.length > 50 ? v.value.slice(0, 47) + "..." : v.value,
						})),
					);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	envvars
		.command("get <name>")
		.description("Retrieve a specific environment variable")
		.option("-p, --project <ref>", "Project ref (or TRIGGER_PROJECT_REF)")
		.option("-e, --env <env>", "Environment (or TRIGGER_ENV)")
		.option("--json", "Output as JSON")
		.action(async (name, opts) => {
			try {
				const data = await apiRequest<{ value: string }>(
					`/api/v1/projects/${opts.project}/envvars/${opts.env}/${name}`,
				);
				if (opts.json) {
					printJson(data);
				} else {
					console.log(data.value);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	envvars
		.command("create")
		.description("Create an environment variable")
		.option("-p, --project <ref>", "Project ref (or TRIGGER_PROJECT_REF)")
		.option("-e, --env <env>", "Environment (or TRIGGER_ENV)")
		.requiredOption("-n, --name <name>", "Variable name")
		.requiredOption("-v, --value <value>", "Variable value")
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			try {
				const data = await apiRequest(
					`/api/v1/projects/${resolveProject(opts.project)}/envvars/${resolveEnv(opts.env)}`,
					{
						method: "POST",
						body: { name: opts.name, value: opts.value },
					},
				);
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Created env var "${opts.name}" in ${opts.env}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	envvars
		.command("update <name>")
		.description("Update an environment variable")
		.option("-p, --project <ref>", "Project ref (or TRIGGER_PROJECT_REF)")
		.option("-e, --env <env>", "Environment (or TRIGGER_ENV)")
		.requiredOption("-v, --value <value>", "New value")
		.option("--json", "Output as JSON")
		.action(async (name, opts) => {
			try {
				const data = await apiRequest(
					`/api/v1/projects/${opts.project}/envvars/${opts.env}/${name}`,
					{ method: "PUT", body: { value: opts.value } },
				);
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Updated env var "${name}" in ${opts.env}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	envvars
		.command("delete <name>")
		.alias("rm")
		.description("Delete an environment variable")
		.option("-p, --project <ref>", "Project ref (or TRIGGER_PROJECT_REF)")
		.option("-e, --env <env>", "Environment (or TRIGGER_ENV)")
		.option("--force", "Skip confirmation")
		.option("--json", "Output as JSON")
		.action(async (name, opts) => {
			try {
				if (!opts.force) {
					const ok = await confirm(
						`Delete env var "${name}" from ${opts.env}?`,
					);
					if (!ok) return;
				}
				const data = await apiRequest(
					`/api/v1/projects/${opts.project}/envvars/${opts.env}/${name}`,
					{ method: "DELETE" },
				);
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(`Deleted env var "${name}" from ${opts.env}`);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	envvars
		.command("import")
		.description("Import multiple environment variables")
		.option("-p, --project <ref>", "Project ref (or TRIGGER_PROJECT_REF)")
		.option("-e, --env <env>", "Environment (or TRIGGER_ENV)")
		.requiredOption("--vars <pairs...>", "KEY=VALUE pairs (space-separated)")
		.option("--override", "Override existing variables")
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			try {
				const variables = (opts.vars as string[]).map((pair) => {
					const eqIdx = pair.indexOf("=");
					if (eqIdx === -1)
						throw new Error(`Invalid format: "${pair}". Use KEY=VALUE`);
					return { name: pair.slice(0, eqIdx), value: pair.slice(eqIdx + 1) };
				});

				const data = await apiRequest(
					`/api/v1/projects/${opts.project}/envvars/${opts.env}/import`,
					{
						method: "POST",
						body: { variables, override: opts.override ?? false },
					},
				);
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(
						`Imported ${variables.length} env var(s) to ${opts.env}`,
					);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});
}
