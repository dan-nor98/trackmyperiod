// src/bot.js

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const userHandler = require('./handlers/user_handler');
const cycleHandler = require('./handlers/cycle_handler');
const { initializeDatabase } = require('./services/database');
const scheduler = require('./services/scheduler');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token || token === 'YOUR_TELEGRAM_BOT_TOKEN') {
    console.error('Error: TELEGRAM_BOT_TOKEN is not set correctly in your .env file.');
    process.exit(1);
}

async function startApp() {
    try {
        await initializeDatabase();
        console.log('[OK] Database is ready.');

        const bot = new TelegramBot(token, { polling: true });

        const commands = [
            { command: 'track', description: '🩸 Log your period' },
            { command: 'symptoms', description: '🤒 Log symptoms' },
            { command: 'history', description: '📈 View history & predictions' },
            { command: 'status', description: "❤️ Check partner's status" },
            { command: 'partner', description: '🤝 Invite or manage partner' },
            { command: 'reminders', description: '🔔 Manage reminders' },
            { command: 'settings', description: '⚙️ Change language/calendar' },
            { command: 'help', description: '❓ Get help' },
        ];
        await bot.setMyCommands(commands);
        console.log('[OK] Custom command menu set.');

        // --- Command Handlers ---
        bot.onText(/\/start(?: (.+))?/, (msg, match) => userHandler.handleStart(bot, msg, match));
        bot.onText(/\/help/, (msg) => userHandler.handleHelpCommand(bot, msg));
        bot.onText(/\/settings/, (msg) => userHandler.handleSettings(bot, msg));
        bot.onText(/\/track/, (msg) => cycleHandler.handleTrack(bot, msg));
        bot.onText(/\/partner/, (msg) => userHandler.handlePartnerCommand(bot, msg));
        bot.onText(/\/history/, (msg) => cycleHandler.handleHistory(bot, msg));
        bot.onText(/\/seed/, (msg) => cycleHandler.handleSeeding(bot, msg));
        bot.onText(/\/symptoms/, (msg) => cycleHandler.handleSymptomsCommand(bot, msg));
        bot.onText(/\/reminders/, (msg) => userHandler.handleRemindersCommand(bot, msg));
        bot.onText(/\/status/, (msg) => cycleHandler.handleStatusCommand(bot, msg));

        // --- Callback Query Handler ---
        bot.on('callback_query', (callbackQuery) => {
            const data = callbackQuery.data;

            if (data.startsWith('set_language_')) {
                userHandler.handleLanguageChoice(bot, callbackQuery);
            } else if (data.startsWith('set_role_')) {
                userHandler.handleRoleChoice(bot, callbackQuery);
            } else if (data.startsWith('set_calendar_')) {
                userHandler.handleCalendarChoice(bot, callbackQuery);
            } else if (data.startsWith('log_method_')) {
                cycleHandler.handleMethodChoice(bot, callbackQuery);
            } else if (data.startsWith('log_select_')) {
                cycleHandler.handleLogSelection(bot, callbackQuery);
            } else if (data.startsWith('datepicker_nav_')) {
                cycleHandler.handleCalendarNav(bot, callbackQuery);
            } else if (data.startsWith('datepicker_select_')) {
                cycleHandler.handleDateSelection(bot, callbackQuery);
            } else if (data.startsWith('log_symptom_')) {
                cycleHandler.handleSymptomLogging(bot, callbackQuery);
            } else if (data.startsWith('set_reminder_')) {
                userHandler.handleReminderChoice(bot, callbackQuery);
            } else if (data.startsWith('settings_')) {
                userHandler.handleSettingsChoice(bot, callbackQuery);
            }
        });

        // --- Error Handler ---
        bot.on('polling_error', (error) => console.error(`[POLL_ERROR] ${error.code} - ${error.message}`));

        // --- Start Scheduler ---
        scheduler.startScheduler(bot);

        console.log('[OK] Luna bot is running and listening for messages...');

    } catch (err) {
        console.error("[FATAL] Failed to start the application:", err);
    }
}

startApp();
