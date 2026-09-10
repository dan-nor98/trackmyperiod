# Runtime reference

The authoritative reference is [Telegram Serverless](https://core.telegram.org/bots/serverless).
This project targets @tgcloud/cli 0.1.2 and the published SDK as reviewed on 2026-09-10.

The CLI is a development dependency; it is not deployed. The runtime supplies
`sdk`, including `api`, `db`, and `InputFile`, plus the schema DSL in `sdk/db`.
See AGENTS.md for project rules and architecture.md for the application design.

Run `npm run smoke` against a migrated test bot to validate SQLite RETURNING,
JSON, randomblob, the raw result shape, InputFile and Intl support. Do not assume
Node's globals match the hosted V8 sandbox merely because local tests pass.
