# Luna / TrackMyPeriod

A Telegram-native Serverless bot for cycle tracking and optional partner support.
Runs JavaScript modules and stores data on Telegram's infrastructure using its
SDK and built-in SQLite database. No polling server or third-party bot host.

**Status:** native migration implementation. Local regression tests are included;
test-bot runtime validation and production setup are required before launch.

## Features

- English/Farsi messages and Gregorian/Persian date pickers.
- Period start/end, date validation, record correction/removal and undo.
- Daily symptoms on any date, with three severity levels.
- History and transparent estimates from recent start-to-start intervals.
- Expiring single-use invitations and independent opt-in sharing scopes.
- Immediate disconnect with history preservation and delivery-time consent checks.
- IANA timezones, best-effort reminders, export and confirmed deletion.
- Revision-guarded writes, update deduplication and a durable retry outbox.

## Commands

| Command | Action |
|---|---|
| /start, /help | Setup, role and command guide |
| /track | Start/end today or select a date |
| /history | Recent records, IDs and estimate |
| /edit ID START END | Correct a record; use `-` for an ongoing period |
| /remove ID, /undo | Confirm removal or reverse the latest tracking change |
| /symptoms | Symptom menu |
| /symptom NAME SEVERITY DATE | Record a symptom; severity 1–3 |
| /unsymptom NAME DATE | Remove one daily symptom |
| /partner, /sharing | Create invitation and control each sharing category |
| /disconnect, /status | Revoke connection or view currently permitted details |
| /settings, /timezone Area/City | Language, calendar, role and timezone |
| /reminders HH:MM, /reminders off | User-local reminder preference |
| /export, /delete, /privacy | Download data, confirm deletion, understand storage |

Text dates use Gregorian YYYY-MM-DD. The picker follows the selected calendar.
The old destructive /seed command has been removed.

## Development

```sh
npm ci --ignore-scripts
npm run check
npm test
```

Requires Node 24+. Runtime modules have no npm dependencies; @tgcloud/cli is only
development/deployment tooling. Use [Telegram Serverless](https://core.telegram.org/bots/serverless)
and a Serverless CLI token from BotFather, not the ordinary bot token.

- [Architecture and guarantees](docs/architecture.md)
- [Deployment, migration and rollback](docs/deployment.md)
- [Runtime reference](docs/tgcloud-sdk.md)

Telegram's published runtime does not advertise a native scheduled handler. An
optional GitHub Actions trigger invokes the Telegram-hosted maintenance module.
Without it, direct replies work but idle reminders and cleanup do not run.
Scheduling is best-effort; Telegram sends are at least once, not exactly once.
