import type { Command } from "commander";
import { apiRequest } from "../utils/client.js";
import { printJson, printSuccess, printError } from "../utils/output.js";

export function registerDeploymentsCommands(program: Command): void {
	const deployments = program
		.command("deployments")
		.alias("deploy")
		.description("Manage deployments");

	deployments
		.command("latest")
		.description("Get the latest deployment")
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			try {
				const data = await apiRequest<Record<string, unknown>>(
					"/api/v1/deployments/latest",
				);
				printJson(data);
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	deployments
		.command("get <deploymentId>")
		.description("Get a specific deployment")
		.option("--json", "Output as JSON")
		.action(async (deploymentId, opts) => {
			try {
				const data = await apiRequest(`/api/v1/deployments/${deploymentId}`);
				printJson(data);
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});

	deployments
		.command("promote <version>")
		.description("Promote a deployment version")
		.option("--json", "Output as JSON")
		.action(async (version, opts) => {
			try {
				const data = await apiRequest<{
					id: string;
					version: string;
					shortCode: string;
				}>(`/api/v1/deployments/${version}/promote`, { method: "POST" });
				if (opts.json) {
					printJson(data);
				} else {
					printSuccess(
						`Promoted deployment ${data.version} (${data.shortCode})`,
					);
				}
			} catch (e: unknown) {
				printError((e as Error).message);
				process.exit(1);
			}
		});
}
