# notion-data-source-compat

[![npm](https://img.shields.io/badge/npm-not%20yet%20published-lightgrey)](https://www.npmjs.com/package/notion-data-source-compat)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

A tiny compatibility shim for Notion's **2025-09-03 API change**, which split
a Notion "database" into a container object plus one or more **data
sources**. `@notionhq/client` removed `databases.query` entirely starting in
`5.0.0` (published the same day) — queries and page-creation parents now
target a data source, not the database container.

If you have code that calls `client.databases.query(...)` or
`client.pages.create({ parent: { database_id } })` and you upgrade
`@notionhq/client` past v5, it breaks with:

```json
{
  "object": "error",
  "status": 400,
  "code": "invalid_request_url",
  "message": "Invalid request URL."
}
```

This package resolves the split transparently, so your code keeps working —
on **either** major version of the SDK — without you tracking which one is
installed.

## Why this exists

We hit this exact break migrating an internal tool and went looking for a
drop-in fix before writing our own. What's out there instead:

- Dozens of independent projects hand-roll the identical `retrieve →
  data_sources[0].id → query` pattern inline, every time, with no shared
  abstraction.
- [`notion-helper`](https://github.com/TomFrankly/notion-helper) added
  data-source support, but it's a whole fluent builder API for constructing
  Notion property objects — adopting it means rewriting your call sites to
  its API, not patching in a compatibility layer.
- Nothing published targets *just* the compatibility problem: "make my
  existing `databases.query` / `pages.create` calls keep working."

This package is that missing piece. It's intentionally small — three
functions, zero required config, no opinion about how you build your
property objects.

## Install

```bash
npm install notion-data-source-compat @notionhq/client
```

Works with `@notionhq/client` `>=2.2.15` — both the pre-2025-09-03 line
(v2–v4) and the current v5+ line.

## Usage

```ts
import { Client } from "@notionhq/client";
import { queryDatabase, createPage } from "notion-data-source-compat";

const notion = new Client({ auth: process.env.NOTION_API_TOKEN });

// Works the same whether @notionhq/client is on v2-v4 or v5+.
const results = await queryDatabase(notion, databaseId, {
  filter: { property: "Status", status: { equals: "In progress" } },
  sorts: [{ property: "Due Date", direction: "ascending" }],
  page_size: 100,
});

const page = await createPage(notion, databaseId, {
  properties: {
    Name: { title: [{ text: { content: "New row" } }] },
  },
});
```

### Multi-source databases

Most databases have exactly one data source, so `queryDatabase` and
`createPage` resolve it automatically. If a database genuinely has more than
one (e.g. a linked database shared across teamspaces), pass `pick` to choose
deliberately — the shim refuses to silently guess:

```ts
await queryDatabase(notion, databaseId, { page_size: 100 }, {
  pick: (sources) => sources.find((s) => s.name === "Engineering")!,
});
```

### Lower-level helpers

```ts
import { resolveDataSourceId, supportsDataSources } from "notion-data-source-compat";

supportsDataSources(notion); // true on @notionhq/client >=5, false otherwise
const dataSourceId = await resolveDataSourceId(notion, databaseId);
```

## API

| Function | Equivalent to (pre-5.0) |
|---|---|
| `queryDatabase(client, databaseId, params?, options?)` | `client.databases.query({ database_id, ...params })` |
| `createPage(client, databaseId, params, options?)` | `client.pages.create({ parent: { database_id }, ...params })` |
| `resolveDataSourceId(client, databaseId, options?)` | — resolves the single data source ID, or the database ID itself on a legacy client |
| `supportsDataSources(client)` | — `true` if the installed client is on the 2025-09-03+ data model |

## What this doesn't do

- Doesn't wrap every Notion endpoint — just the two that broke
  (`databases.query`, `pages.create`). For everything else, use
  `@notionhq/client` directly.
- Doesn't manage schema/property-config differences between `databases` and
  `dataSources` objects (e.g. `database.retrieve` no longer returns
  `properties` on v5+ — use `client.dataSources.retrieve` for that).
- Doesn't publish to npm yet — install directly from GitHub in the meantime:
  `npm install github:tygart-media/notion-data-source-compat`.

## License

MIT
