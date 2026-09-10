# Deployment and migration

## Prerequisites

- Node.js 24+ for repository tooling and SQLite tests.
- A test bot with Serverless enabled in BotFather.
- Its **Serverless CLI access token**, obtained under Serverless → CLI Access.
  This is distinct from the ordinary Bot API token. Do not commit or paste it into code.
- Review docs/architecture.md, particularly the scheduling and delivery limits.

## Local verification

```sh
npm ci --ignore-scripts
npm run check
npm test
npx tgcloud init
npx tgcloud status
```

`init` fills missing scaffold files and initializes CLI-managed local state. It
does not replace existing modules. Never manipulate .tgcloud files manually.

## Test deployment

```sh
npx tgcloud login
npm run deploy
npx tgcloud migrate --dry-run
npx tgcloud migrate
npm run smoke
npx tgcloud webhook
```

Code deployment and schema migration are separate. The smoke module sends no
messages; it checks the hosted SDK and makes/removes a temporary row in jobs.
If it fails, resolve the native capability mismatch before proceeding. The
platform manages webhook registration; do not call setWebhook yourself.

Test with two test accounts: both languages, both calendars, timezone changes,
logging/undo/edit, invitation expiry, each sharing toggle, partner replacement,
private-chat enforcement, export, and confirmed deletion. Also test a blocked
recipient and an intentional retry of the same update ID. For `tgcloud run`
handler tests, supply a realistic payload and ctx.update.update_id; a handler
test can send real Telegram messages to the provided chat.

## Existing luna.db data

1. Stop the old polling process and take a protected backup of luna.db. Keep it
   offline and read-only. The old process must not keep writing during export.
2. Export into a directory outside source control:

```sh
node scripts/export-legacy.mjs /absolute/path/luna.db exports
```

3. On a migrated test bot first, import each generated batch:

```sh
node scripts/import-legacy.mjs exports/legacy-1.json
```

The exporter reads only; file creation refuses to overwrite existing batches.
The importer validates dates/overlaps and inserts missing accounts only. An
interrupted batch can be retried: existing rows are skipped. It never replaces
an existing target account, including a deletion tombstone. Verify reported counts
and each account's exported history before removing any backup.

Old pairing relationships and invitation codes are deliberately not imported.
Users must reconnect and choose sharing scopes. Old reminder times are disabled
because their timezone was never stored; users set a timezone and enable reminders
again. Gregorian storage dates and Farsi/Shamsi preferences are preserved. Old
symptom duplicates on the same date/name collapse to one daily entry with severity 1,
because the legacy schema did not capture severity. Orphaned symptoms stop export
for manual ownership recovery; invalid dates stop import for correction.

For production, stop the old poller, enable Serverless in BotFather, link the
production CLI token, deploy/migrate and import. Start with sharing off. Keep the
old database backup available for rollback; do not immediately erase it.

## Reminders and cleanup

The repo includes .github/workflows/reminders.yml, disabled unless the repository
variable TELEGRAM_MAINTENANCE_ENABLED equals true. Configure the GitHub environment
`telegram-production` with its TGCLOUD_TOKEN secret, then enable that variable
after production has been deployed and migrated. Review who can modify the default
branch: the token can execute local project code against production.

Use workflow_dispatch once to verify the job. GitHub invokes the Telegram-hosted
maintenance module every five minutes, subject to scheduler delays. Neither the
workflow nor its credentials are configured automatically by this implementation.
The workflow executes the default branch's local module version through tgcloud
run, so merge only reviewed maintenance code. For a manual tick:

```sh
npm run maintenance
```

Monitor failed workflow runs, maintenance counts, application delivery_failed codes,
account document size, and reminder delay. Increasing capacity requires measuring
native invocation limits; this implementation does not assume undocumented quotas.

## Rollback

For code regressions, check out the previous known-good native commit and deploy
it through tgcloud; do not force deployment over unreviewed remote changes. Schema
drops are separate reviewed operations. This migration adds new tables rather than
rewriting the legacy database.

Returning to the old polling bot requires exporting records created since cutover,
reconciling them with the protected legacy backup, disabling native delivery, and
then restarting polling. Do not restore an old snapshot over newer health records.
Telegram messages already sent cannot be rolled back.
