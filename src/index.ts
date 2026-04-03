#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config();

import { Command } from "commander";
import chalk from "chalk";

import { registerEnvvarsCommands } from "./commands/envvars.js";
import { registerRunsCommands } from "./commands/runs.js";
import { registerSchedulesCommands } from "./commands/schedules.js";
import { registerTasksCommands } from "./commands/tasks.js";
import { registerDeploymentsCommands } from "./commands/deployments.js";
import { registerQueuesCommands } from "./commands/queues.js";
import { registerBatchesCommands } from "./commands/batches.js";
import { registerWaitpointsCommands } from "./commands/waitpoints.js";
import { registerQueryCommands } from "./commands/query.js";

const program = new Command();

program
	.name("trigger-cli")
	.description("CLI for the Trigger.dev Management REST API")
	.version("1.0.0");

registerEnvvarsCommands(program);
registerRunsCommands(program);
registerSchedulesCommands(program);
registerTasksCommands(program);
registerDeploymentsCommands(program);
registerQueuesCommands(program);
registerBatchesCommands(program);
registerWaitpointsCommands(program);
registerQueryCommands(program);

// Show help with env var docs when no command is given
if (process.argv.length <= 2) {
	console.log(
		chalk.bold("\nTrigger.dev CLI") +
			chalk.dim(" — Manage your Trigger.dev resources\n"),
	);
	console.log(chalk.bold("Environment variables:"));
	console.log(
		`  ${chalk.cyan("TRIGGER_SECRET_KEY")}   ${chalk.dim("(required)")}  Your secret API key (tr_dev_..., tr_prod_..., tr_stg_...)`,
	);
	console.log(
		`  ${chalk.cyan("TRIGGER_PROJECT_REF")}  ${chalk.dim("(optional)")}  Default project ref (proj_...) — avoids -p on every call`,
	);
	console.log(
		`  ${chalk.cyan("TRIGGER_ENV")}          ${chalk.dim("(optional)")}  Default environment (dev, staging, prod) — avoids -e on every call`,
	);
	console.log(
		`  ${chalk.cyan("TRIGGER_API_URL")}      ${chalk.dim("(optional)")}  API base URL (default: https://api.trigger.dev)`,
	);
	console.log();
	program.outputHelp();
	process.exit(0);
}

program.parse();
