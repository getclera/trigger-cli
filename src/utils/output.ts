import chalk from "chalk";

export function printJson(data: unknown): void {
	console.log(JSON.stringify(data, null, 2));
}

export function printTable(
	rows: Record<string, unknown>[],
	columns?: string[],
): void {
	if (rows.length === 0) {
		console.log(chalk.dim("No results"));
		return;
	}

	const cols = columns || Object.keys(rows[0]);
	const widths = cols.map((col) => {
		const maxValue = rows.reduce((max, row) => {
			const val = String(row[col] ?? "");
			return val.length > max ? val.length : max;
		}, 0);
		return Math.max(col.length, maxValue);
	});

	// Header
	const header = cols.map((col, i) => col.padEnd(widths[i])).join("  ");
	console.log(chalk.bold(header));
	console.log(chalk.dim(widths.map((w) => "─".repeat(w)).join("──")));

	// Rows
	for (const row of rows) {
		const line = cols
			.map((col, i) => {
				const val = String(row[col] ?? "");
				return val.padEnd(widths[i]);
			})
			.join("  ");
		console.log(line);
	}

	console.log(chalk.dim(`\n${rows.length} row(s)`));
}

export function printSuccess(message: string): void {
	console.log(chalk.green("✓"), message);
}

export function printError(message: string): void {
	console.error(chalk.red("✗"), message);
}

export function printInfo(message: string): void {
	console.log(chalk.blue("ℹ"), message);
}

export function printWarn(message: string): void {
	console.log(chalk.yellow("⚠"), message);
}
