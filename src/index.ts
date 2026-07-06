/**
 * notion-data-source-compat
 *
 * A tiny compatibility layer for Notion's 2025-09-03 API change, which split
 * "database" into a container object plus one or more "data sources." As of
 * `@notionhq/client` v5.0.0, `client.databases.query` was removed entirely —
 * queries and page-creation parents must target a data source instead.
 *
 * This package resolves that split transparently so callers can keep working
 * with a plain database ID, on either the old (`@notionhq/client` <5) or new
 * (>=5) major version of the SDK.
 */

export interface DataSourceReference {
	id: string;
	name?: string;
}

export interface LegacyDatabaseObject {
	properties?: Record<string, unknown>;
	data_sources?: DataSourceReference[];
}

/**
 * True if the installed @notionhq/client is on the 2025-09-03+ data model
 * (i.e. it exposes `client.dataSources`). False for pre-5.0.0 clients, which
 * still expose `client.databases.query` directly.
 */
export function supportsDataSources(client: any): boolean {
	return typeof client?.dataSources?.query === "function";
}

export interface ResolveOptions {
	/**
	 * How to choose among multiple data sources on one database. Defaults to
	 * throwing — most databases have exactly one, and silently picking the
	 * "first" one is how subtle data-loss bugs get shipped. Pass a function
	 * to pick deliberately (e.g. by name) for multi-source databases.
	 */
	pick?: (sources: DataSourceReference[]) => DataSourceReference;
}

/**
 * Resolves the single data source ID for a database. On a legacy client
 * (`supportsDataSources(client) === false`), returns the database ID itself,
 * since there's no separate data source concept to resolve.
 */
export async function resolveDataSourceId(
	client: any,
	databaseId: string,
	options: ResolveOptions = {},
): Promise<string> {
	if (!supportsDataSources(client)) {
		return databaseId;
	}
	const db: LegacyDatabaseObject = await client.databases.retrieve({ database_id: databaseId });
	const sources = db.data_sources ?? [];
	if (sources.length === 0) {
		throw new Error(`Database ${databaseId} has no data sources.`);
	}
	if (sources.length === 1) {
		return sources[0].id;
	}
	if (options.pick) {
		return options.pick(sources).id;
	}
	throw new Error(
		`Database ${databaseId} has ${sources.length} data sources; pass { pick } to choose one. ` +
			`Data source IDs: ${sources.map((s) => `${s.id}${s.name ? ` (${s.name})` : ""}`).join(", ")}`,
	);
}

export interface QueryDatabaseParams {
	filter?: unknown;
	sorts?: unknown[];
	start_cursor?: string;
	page_size?: number;
	archived?: boolean;
	in_trash?: boolean;
}

/**
 * Query a database's rows, regardless of which major version of
 * @notionhq/client is installed. Equivalent to the pre-5.0 `databases.query`
 * call, but keeps working after the 2025-09-03 upgrade.
 */
export async function queryDatabase(
	client: any,
	databaseId: string,
	params: QueryDatabaseParams = {},
	options: ResolveOptions = {},
): Promise<any> {
	if (!supportsDataSources(client)) {
		return client.databases.query({ database_id: databaseId, ...params });
	}
	const dataSourceId = await resolveDataSourceId(client, databaseId, options);
	return client.dataSources.query({ data_source_id: dataSourceId, ...params });
}

export interface CreatePageParams {
	properties: Record<string, unknown>;
	icon?: unknown;
	cover?: unknown;
	children?: unknown[];
}

/**
 * Create a page inside a database, regardless of which major version of
 * @notionhq/client is installed. Equivalent to the pre-5.0
 * `pages.create({ parent: { database_id } })` call, but keeps working after
 * the 2025-09-03 upgrade (where `data_source_id` is the required parent
 * shape once a database has more than one data source).
 */
export async function createPage(
	client: any,
	databaseId: string,
	params: CreatePageParams,
	options: ResolveOptions = {},
): Promise<any> {
	if (!supportsDataSources(client)) {
		return client.pages.create({ parent: { database_id: databaseId }, ...params });
	}
	const dataSourceId = await resolveDataSourceId(client, databaseId, options);
	return client.pages.create({ parent: { data_source_id: dataSourceId }, ...params });
}
