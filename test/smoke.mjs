// Zero-dependency smoke test. Run after `npm run build`: node test/smoke.mjs
// Uses mock Notion clients only -- no network calls, no token required.
import assert from "node:assert/strict";
import {
	queryDatabase,
	createPage,
	resolveDataSourceId,
	supportsDataSources,
} from "../dist/index.js";

let passed = 0;
function test(name, fn) {
	fn();
	passed++;
	console.log(`ok - ${name}`);
}

function legacyClient(calls) {
	return {
		databases: {
			query: async (args) => {
				calls.push(["databases.query", args]);
				return { results: [] };
			},
		},
		pages: {
			create: async (args) => {
				calls.push(["pages.create", args]);
				return { id: "page-1" };
			},
		},
	};
}

function modernClient(calls, dataSources) {
	return {
		databases: {
			retrieve: async ({ database_id }) => {
				calls.push(["databases.retrieve", database_id]);
				return { data_sources: dataSources };
			},
		},
		dataSources: {
			query: async (args) => {
				calls.push(["dataSources.query", args]);
				return { results: [] };
			},
		},
		pages: {
			create: async (args) => {
				calls.push(["pages.create", args]);
				return { id: "page-1" };
			},
		},
	};
}

test("supportsDataSources: false on a legacy client", () => {
	assert.equal(supportsDataSources(legacyClient([])), false);
});

test("supportsDataSources: true on a v5+ client", () => {
	assert.equal(supportsDataSources(modernClient([], [{ id: "ds-1" }])), true);
});

test("queryDatabase: legacy client calls databases.query directly", async () => {
	const calls = [];
	await queryDatabase(legacyClient(calls), "db-1", { page_size: 10 });
	assert.deepEqual(calls, [["databases.query", { database_id: "db-1", page_size: 10 }]]);
});

test("resolveDataSourceId: legacy client returns the database ID unchanged", async () => {
	assert.equal(await resolveDataSourceId(legacyClient([]), "db-1"), "db-1");
});

test("queryDatabase: v5+ client with one data source resolves it transparently", async () => {
	const calls = [];
	await queryDatabase(modernClient(calls, [{ id: "ds-1" }]), "db-1", { page_size: 10 });
	assert.deepEqual(calls, [
		["databases.retrieve", "db-1"],
		["dataSources.query", { data_source_id: "ds-1", page_size: 10 }],
	]);
});

test("queryDatabase: v5+ client with multiple data sources and no pick throws", async () => {
	await assert.rejects(
		() => queryDatabase(modernClient([], [{ id: "ds-1" }, { id: "ds-2" }]), "db-1"),
		/has 2 data sources/,
	);
});

test("queryDatabase: v5+ client with multiple data sources honors pick", async () => {
	const calls = [];
	const client = modernClient(calls, [
		{ id: "ds-1", name: "Marketing" },
		{ id: "ds-2", name: "Engineering" },
	]);
	await queryDatabase(client, "db-1", {}, { pick: (sources) => sources.find((s) => s.name === "Engineering") });
	assert.equal(calls[1][1].data_source_id, "ds-2");
});

test("queryDatabase: v5+ client with zero data sources throws", async () => {
	await assert.rejects(() => queryDatabase(modernClient([], []), "db-1"), /has no data sources/);
});

test("createPage: legacy client uses database_id parent", async () => {
	const calls = [];
	await createPage(legacyClient(calls), "db-1", { properties: { Name: {} } });
	assert.deepEqual(calls, [
		["pages.create", { parent: { database_id: "db-1" }, properties: { Name: {} } }],
	]);
});

test("createPage: v5+ client uses resolved data_source_id parent", async () => {
	const calls = [];
	await createPage(modernClient(calls, [{ id: "ds-1" }]), "db-1", { properties: { Name: {} } });
	assert.deepEqual(calls[1], [
		"pages.create",
		{ parent: { data_source_id: "ds-1" }, properties: { Name: {} } },
	]);
});

console.log(`\n${passed} passed`);
