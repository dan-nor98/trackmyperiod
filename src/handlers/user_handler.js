// src/handlers/user_handler.js

const { db } = require('../services/database.js');
const { t } = require('../utils/locales.js');

// --- Database Helpers (Async/Await) ---
const dbGet = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
const dbRun = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(err) { err ? reject(err) : resolve(this) }));

async function handleHelpCommand(bot, msg) {
    const chatId = msg.chat.id;
    const user = await dbGet(`SELECT role, language FROM users WHERE telegram_id = ?`, [msg.from.id]);
    const lang = user ? user.language : 'en';

    let helpText = t('helpTitle', lang);

    if (user && user.role === 'primary') {
        helpText += t('helpPrimary', lang);
    } else if (user && user.role === 'partner') {
        helpText += t('helpPartner', lang);
    } else {
        helpText += t('helpUnassigned', lang);
    }
    
    helpText += t('helpFooter', lang);
    bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
}

function handleStart(bot, msg, match) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const firstName = msg.from.first_name;
    const pairingCode = match[1];

    if (pairingCode) {
        return handlePairing(bot, msg, pairingCode);
    }

    db.get(`SELECT * FROM users WHERE telegram_id = ?`, [telegramId], (err, row) => {
        if (err) return console.error("DB Error (find user):", err.message);

        if (!row) {
            db.run(`INSERT INTO users (telegram_id, first_name) VALUES (?, ?)`, [telegramId, firstName], (insertErr) => {
                if (insertErr) return console.error("DB Error (insert user):", insertErr.message);
                bot.sendMessage(chatId, t('welcome', 'en', { name: firstName }), {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "English", callback_data: 'set_language_en' }],
                            [{ text: "فارسی", callback_data: 'set_language_fa' }]
                        ]
                    }
                });
            });
        } else {
            bot.sendMessage(chatId, t('welcomeBack', row.language, { name: firstName }));
        }
    });
}

async function handleLanguageChoice(bot, callbackQuery) {
    const msg = callbackQuery.message;
    const telegramId = callbackQuery.from.id;
    const lang = callbackQuery.data.split('_').pop();

    await dbRun(`UPDATE users SET language = ? WHERE telegram_id = ?`, [lang, telegramId]);

    const user = await dbGet(`SELECT role FROM users WHERE telegram_id = ?`, [telegramId]);
    if (user && user.role) {
        bot.editMessageText(t('settingsLanguageConfirmation', lang, { lang: lang === 'fa' ? 'فارسی' : 'English' }), {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
        });
        return;
    }

    bot.editMessageText(t('rolePrompt', lang), {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        reply_markup: {
            inline_keyboard: [
                [{ text: t('rolePrimary', lang), callback_data: 'set_role_primary' }],
                [{ text: t('rolePartner', lang), callback_data: 'set_role_partner' }]
            ]
        }
    });
}

async function handleRoleChoice(bot, callbackQuery) {
    const msg = callbackQuery.message;
    const user = await dbGet(`SELECT language FROM users WHERE telegram_id = ?`, [callbackQuery.from.id]);
    const lang = user.language;
    const role = callbackQuery.data === 'set_role_primary' ? 'primary' : 'partner';

    await dbRun(`UPDATE users SET role = ? WHERE telegram_id = ?`, [role, callbackQuery.from.id]);

    if (role === 'primary') {
        bot.editMessageText(t('calendarPrompt', lang), {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [{ text: t('calendarGregorian', lang), callback_data: 'set_calendar_gregorian' }],
                    [{ text: t('calendarShamsi', lang), callback_data: 'set_calendar_shamsi' }]
                ]
            }
        });
    } else {
        bot.editMessageText(t('partnerRoleInfo', lang), {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
        });
    }
}

async function handleCalendarChoice(bot, callbackQuery) {
    const msg = callbackQuery.message;
    const user = await dbGet(`SELECT language, role FROM users WHERE telegram_id = ?`, [callbackQuery.from.id]);
    const lang = user.language;
    const calendarType = callbackQuery.data.split('_').pop();
    
    const friendlyName = t(calendarType === 'shamsi' ? 'calendarShamsi' : 'calendarGregorian', lang);
    const emoji = calendarType === 'shamsi' ? '🌙' : '🗓️';

    await dbRun(`UPDATE users SET calendar_preference = ? WHERE telegram_id = ?`, [calendarType, callbackQuery.from.id]);
    
    if (user.role) {
        bot.editMessageText(t('settingsCalendarConfirmation', lang, { calendarName: friendlyName }), {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
        });
    } else {
        bot.editMessageText(t('setupComplete', lang, { emoji: emoji, calendarName: friendlyName }), {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
        });
    }
}

async function handlePartnerCommand(bot, msg) {
    const user = await dbGet(`SELECT role, language FROM users WHERE telegram_id = ?`, [msg.from.id]);
    const lang = user.language;

    if (!user || user.role !== 'primary') {
        return bot.sendMessage(msg.chat.id, t('partnerOnlyCommand', lang));
    }

    const botInfo = await bot.getMe();
    const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await dbRun(`UPDATE users SET pairing_code = ? WHERE telegram_id = ?`, [pairingCode, msg.from.id]);
    const link = `https://t.me/${botInfo.username}?start=${pairingCode}`;
    bot.sendMessage(msg.chat.id, t('partnerInvite', lang, { link: link }), { parse_mode: 'Markdown' });
}

async function handlePairing(bot, msg, pairingCode) {
    const partnerChatId = msg.chat.id;
    const partnerTelegramId = msg.from.id;
    const partnerFirstName = msg.from.first_name;

    const primaryUser = await dbGet(`SELECT * FROM users WHERE pairing_code = ? AND role = 'primary'`, [pairingCode]);
    if (!primaryUser) {
        return bot.sendMessage(partnerChatId, t('partnerLinkInvalid', 'en') + '\n\n' + t('partnerLinkInvalid', 'fa'));
    }

    const partnerSql = `INSERT INTO users (telegram_id, first_name, role, partner_id, language) VALUES (?, ?, 'partner', ?, ?)
                        ON CONFLICT(telegram_id) DO UPDATE SET role='partner', partner_id=?, language=?`;
    await dbRun(partnerSql, [partnerTelegramId, partnerFirstName, primaryUser.telegram_id, primaryUser.language, primaryUser.telegram_id, primaryUser.language]);
    await dbRun(`UPDATE users SET partner_id = ?, pairing_code = NULL WHERE telegram_id = ?`, [partnerTelegramId, primaryUser.telegram_id]);
    
    bot.sendMessage(primaryUser.telegram_id, t('partnerConnectedToYou', primaryUser.language, { name: partnerFirstName }), { parse_mode: 'Markdown' });
    bot.sendMessage(partnerChatId, t('partnerConnectedToThem', primaryUser.language, { name: primaryUser.first_name }), { parse_mode: 'Markdown' });
}

async function handleSettings(bot, msg) {
    const user = await dbGet(`SELECT language FROM users WHERE telegram_id = ?`, [msg.from.id]);
    const lang = user ? user.language : 'en';
    bot.sendMessage(msg.chat.id, t('settingsTitle', lang), {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: t('settingsLanguage', lang), callback_data: 'settings_language' }],
                [{ text: t('settingsCalendar', lang), callback_data: 'settings_calendar' }]
            ]
        }
    });
}

async function handleSettingsChoice(bot, callbackQuery) {
    const msg = callbackQuery.message;
    const choice = callbackQuery.data.split('_')[1];
    const user = await dbGet(`SELECT language FROM users WHERE telegram_id = ?`, [callbackQuery.from.id]);
    const lang = user.language;

    if (choice === 'language') {
        bot.editMessageText(t('languagePrompt', lang), {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "English", callback_data: 'set_language_en' }],
                    [{ text: "فارسی", callback_data: 'set_language_fa' }]
                ]
            }
        });
    } else if (choice === 'calendar') {
        bot.editMessageText(t('calendarPrompt', lang), {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [{ text: t('calendarGregorian', lang), callback_data: 'set_calendar_gregorian' }],
                    [{ text: t('calendarShamsi', lang), callback_data: 'set_calendar_shamsi' }]
                ]
            }
        });
    }
}

async function handleRemindersCommand(bot, msg) {
    const user = await dbGet(`SELECT role, language, reminder_time FROM users WHERE telegram_id = ?`, [msg.from.id]);
    const lang = user.language;

    if (!user || user.role !== 'primary') {
        return bot.sendMessage(msg.chat.id, t('partnerOnlyCommand', lang)); // Re-using a similar string
    }

    const status = user.reminder_time ? t('remindersStatusOn', lang, { time: user.reminder_time }) : t('remindersStatusOff', lang);
    
    bot.sendMessage(msg.chat.id, t('remindersTitle', lang, { status: status }), {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '☀️ 08:00', callback_data: 'set_reminder_08:00' }, { text: '🌤️ 09:00', callback_data: 'set_reminder_09:00' }],
                [{ text: '🕛 12:00', callback_data: 'set_reminder_12:00' }, { text: '🌆 18:00', callback_data: 'set_reminder_18:00' }],
                [{ text: t('turnOffReminders', lang), callback_data: 'set_reminder_off' }]
            ]
        }
    });
}

async function handleReminderChoice(bot, callbackQuery) {
    const msg = callbackQuery.message;
    const user = await dbGet(`SELECT language FROM users WHERE telegram_id = ?`, [callbackQuery.from.id]);
    const lang = user.language;
    const choice = callbackQuery.data.split('set_reminder_')[1];
    
    const timeToSet = choice === 'off' ? null : choice;
    await dbRun(`UPDATE users SET reminder_time = ? WHERE telegram_id = ?`, [timeToSet, callbackQuery.from.id]);

    const status = timeToSet ? t('remindersUpdatedStatusOn', lang, { time: timeToSet }) : t('remindersStatusOff', lang);
    bot.editMessageText(t('remindersUpdated', lang, { status: status }), {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown'
    });
    bot.answerCallbackQuery(callbackQuery.id, { text: "Settings saved!" });
}

module.exports = {
    handleStart,
    handleHelpCommand,
    handleLanguageChoice,
    handleRoleChoice,
    handleCalendarChoice,
    handlePartnerCommand,
    handlePairing,
    handleSettings,
    handleSettingsChoice,
    handleRemindersCommand,
    handleReminderChoice,
};
