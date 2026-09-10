# TrackMyPeriod

Target the native Telegram Serverless runtime. Read docs/architecture.md and
https://core.telegram.org/bots/serverless before changing platform integration.

- Deployed modules are schema.js, handlers/*.js and lib/**/*.js.
- Use bare imports: sdk, sdk/db, schema, lib/name. No Node APIs, npm imports,
  relative imports, polling, HTTP servers or in-process timers in deployed code.
- Handlers receive the payload and ctx; update_id is ctx.update.update_id.
- Database calls are asynchronous. Foreign keys are disabled. Do not invent a
  transaction API or assume separate SQL calls share a transaction.
- Keep account mutations, update deduplication and pending messages in one
  revision-guarded account update. Revalidate sharing at delivery time.
- Never log health data, invitation tokens, credentials or raw API exceptions.
- Run npm run check and npm test. Local tests are not native runtime validation;
  a test-bot smoke run remains a deployment gate.
- Deploy and migrate separately. Never write or read .tgcloud contents by hand.
- Preserve existing data; legacy imports insert missing accounts only.
