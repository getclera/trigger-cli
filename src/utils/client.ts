import chalk from "chalk";

interface TriggerConfig {
	apiKey: string;
	baseUrl: string;
	projectRef: string | undefined;
	env: string | undefined;
}

let cachedConfig: TriggerConfig | null = null;

export function getConfig(): TriggerConfig {
	if (cachedConfig) return cachedConfig;

	const apiKey = process.env.TRIGGER_SECRET_KEY || process.env.TRIGGER_API_KEY;
	const baseUrl = process.env.TRIGGER_API_URL || "https://api.trigger.dev";
	const projectRef = process.env.TRIGGER_PROJECT_REF;
	const env = process.env.TRIGGER_ENV;

	if (!apiKey) {
		console.error(
			chalk.red("Error: TRIGGER_SECRET_KEY environment variable is required"),
		);
		console.error(chalk.dim("Set it in your .env file or export it:"));
		console.error(chalk.dim("  export TRIGGER_SECRET_KEY=tr_dev_..."));
		process.exit(1);
	}

	cachedConfig = { apiKey, baseUrl, projectRef, env };
	return cachedConfig;
}

/**
 * Resolve project ref: CLI flag takes precedence, then env var default.
 */
export function resolveProject(cliValue: string | undefined): string {
	const val = cliValue || getConfig().projectRef;
	if (!val) {
		console.error(
			chalk.red(
				"Error: Project ref required. Use -p/--project or set TRIGGER_PROJECT_REF",
			),
		);
		process.exit(1);
	}
	return val;
}

/**
 * Resolve environment: CLI flag takes precedence, then env var default.
 */
export function resolveEnv(cliValue: string | undefined): string {
	const val = cliValue || getConfig().env;
	if (!val) {
		console.error(
			chalk.red("Error: Environment required. Use -e/--env or set TRIGGER_ENV"),
		);
		process.exit(1);
	}
	return val;
}

interface RequestOptions {
	method?: string;
	body?: unknown;
	headers?: Record<string, string>;
	contentType?: string;
}

export async function apiRequest<T = unknown>(
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const config = getConfig();
	const url = `${config.baseUrl}${path}`;
	const { method = "GET", body, headers = {}, contentType } = options;

	const res = await fetch(url, {
		method,
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			"Content-Type": contentType || "application/json",
			...headers,
		},
		body: body
			? typeof body === "string"
				? body
				: JSON.stringify(body)
			: undefined,
	});

	if (!res.ok) {
		const text = await res.text();
		let message: string;
		try {
			const json = JSON.parse(text);
			message = json.error || json.message || text;
		} catch {
			message = text;
		}
		throw new Error(`API ${method} ${path} failed (${res.status}): ${message}`);
	}

	const text = await res.text();
	if (!text) return {} as T;

	try {
		return JSON.parse(text) as T;
	} catch {
		return text as unknown as T;
	}
}

export function buildQueryString(
	params: Record<string, string | number | boolean | undefined>,
): string {
	const entries = Object.entries(params).filter(
		([, v]) => v !== undefined && v !== "",
	);
	if (entries.length === 0) return "";
	return (
		"?" +
		entries
			.map(
				([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
			)
			.join("&")
	);
}
