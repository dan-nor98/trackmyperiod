// src/handlers/user_handler.js

const { db } = require('../services/database.js');
const { t } = require('../utils/locales.js');

// --- Database Helpers (Async/Await) ---
const dbGet = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
const dbRun = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(err) { err ? reject(err) : resolve(this) }));
const dbQuery = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));

async function setCommandsForUser(bot, chatId, lang, role) {
    const baseCommands = [
        { command: 'settings', description: t('command_settings', lang) },
        { command: 'help', description: t('command_help', lang) },
    ];

    let roleCommands = [];
    if (role === 'primary') {
        roleCommands = [
            { command: 'track', description: t('command_track', lang) },
            { command: 'symptoms', description: t('command_symptoms', lang) },
            { command: 'history', description: t('command_history', lang) },
            { command: 'partner', description: t('command_partner', lang) },
            { command: 'reminders', description: t('command_reminders', lang) },
        ];
    } else if (role === 'partner') {
        roleCommands = [
            { command: 'status', description: t('command_status', lang) },
            { command: 'share', description: t('command_share', lang) },
        ];
    }

    const allCommands = [...roleCommands, ...baseCommands];

    try {
        await bot.setMyCommands(allCommands, { scope: { type: 'chat', chat_id: chatId } });
    } catch (error) {
        console.error(`Failed to set commands for chat ${chatId}:`, error.message);
    }
}


async function handleHelpCommand(bot, msg) {
    const chatId = msg.chat.id;
    const user = await dbGet(`SELECT role, language FROM users WHERE telegram_id = ?`, [msg.from.id]);
    const lang = user ? user.language : 'en';

    let helpText = t('helpTitle', lang);

    if (user && user.role === 'primary') {
        helpText += t('helpPrimary', lang);
    } else if (user && user.role === 'partner') {
        helpText += t('helpPartner', lang);
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
            db.run(`INSERT INTO users (telegram_id, first_name) VALUES (?, ?)`, [telegramId, firstName], async (insertErr) => {
                if (insertErr) return console.error("DB Error (insert user):", insertErr.message);
                await setCommandsForUser(bot, chatId, 'en', null); // Set default commands
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
            setCommandsForUser(bot, chatId, row.language, row.role);
            bot.sendMessage(chatId, t('welcomeBack', row.language, { name: firstName }));
        }
    });
}

async function handleLanguageChoice(bot, callbackQuery) {
    const msg = callbackQuery.message;
    const telegramId = callbackQuery.from.id;
    const lang = callbackQuery.data.split('_').pop();

    const user = await dbGet(`SELECT role FROM users WHERE telegram_id = ?`, [telegramId]);
    await dbRun(`UPDATE users SET language = ? WHERE telegram_id = ?`, [lang, telegramId]);
    await setCommandsForUser(bot, msg.chat.id, lang, user.role);

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
    const telegramId = callbackQuery.from.id;
    const data = callbackQuery.data;

    const user = await dbGet(`SELECT * FROM users WHERE telegram_id = ?`, [telegramId]);
    const lang = user.language;
    const isChanging = data.startsWith('set_new_role_');
    const role = data.includes('primary') ? 'primary' : 'partner';

    if (isChanging) {
        const partner = await dbGet(`SELECT partner_id FROM users WHERE telegram_id = ?`, [telegramId]);
        if (partner && partner.partner_id) {
            const partnerUser = await dbGet(`SELECT language, first_name FROM users WHERE telegram_id = ?`, [partner.partner_id]);
            const partnerLang = partnerUser ? partnerUser.language : 'en';
            await dbRun(`UPDATE users SET partner_id = NULL WHERE telegram_id = ?`, [partner.partner_id]);
            bot.sendMessage(partner.partner_id, t('partnerDisconnected', partnerLang, {name: user.first_name}));
        }
        
        const cycles = await dbQuery(`SELECT id FROM cycles WHERE user_id = ?`, [telegramId]);
        if (cycles.length > 0) {
            const cycleIds = cycles.map(c => c.id);
            await dbRun(`DELETE FROM symptoms WHERE cycle_id IN (${cycleIds.join(',')})`);
            await dbRun(`DELETE FROM cycles WHERE user_id = ?`, [telegramId]);
        }
        
        await dbRun(`UPDATE users SET role = ?, partner_id = NULL WHERE telegram_id = ?`, [role, telegramId]);
        await setCommandsForUser(bot, msg.chat.id, lang, role);
        
        const friendlyRole = t(role === 'primary' ? 'rolePrimary' : 'rolePartner', lang);
        bot.editMessageText(t('roleChanged', lang, { role: friendlyRole }), {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
        });

    } else { // Initial setup
        await dbRun(`UPDATE users SET role = ? WHERE telegram_id = ?`, [role, telegramId]);
        await setCommandsForUser(bot, msg.chat.id, lang, role);

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
                parse_mode: 'Markdown'
            });
            const botInfo = await bot.getMe();
            const link = `https://t.me/${botInfo.username}`;
            bot.sendMessage(msg.chat.id, t('partnerForwardMessage', lang, {link: link}), {
                parse_mode: 'Markdown'
            });
        }
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
    
    await setCommandsForUser(bot, partnerChatId, primaryUser.language, 'partner');

    bot.sendMessage(primaryUser.telegram_id, t('partnerConnectedToYou', primaryUser.language, { name: partnerFirstName }), { parse_mode: 'Markdown' });
    bot.sendMessage(partnerChatId, t('partnerConnectedToThem', primaryUser.language, { name: primaryUser.first_name }), { parse_mode: 'Markdown' });
}

async function handleShareCommand(bot, msg) {
    const user = await dbGet(`SELECT language FROM users WHERE telegram_id = ?`, [msg.from.id]);
    const lang = user ? user.language : 'en';
    
    const botInfo = await bot.getMe();
    const link = `https://t.me/${botInfo.username}`;
    bot.sendMessage(msg.chat.id, t('shareMessage', lang, { link }), { parse_mode: 'Markdown' });
}

async function handleSettings(bot, msg) {
    const user = await dbGet(`SELECT language FROM users WHERE telegram_id = ?`, [msg.from.id]);
    const lang = user ? user.language : 'en';
    bot.sendMessage(msg.chat.id, t('settingsTitle', lang), {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: t('settingsLanguage', lang), callback_data: 'settings_language' }],
                [{ text: t('settingsCalendar', lang), callback_data: 'settings_calendar' }],
                [{ text: t('settingsRole', lang), callback_data: 'settings_role' }]
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
    } else if (choice === 'role') {
        bot.editMessageText(t('changeRolePrompt', lang), {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: t('changeRoleConfirm', lang), callback_data: 'confirm_role_change' }],
                    [{ text: t('changeRoleCancel', lang), callback_data: 'cancel_role_change' }]
                ]
            }
        });
    }
}

async function handleRoleChangeConfirmation(bot, callbackQuery) {
    const msg = callbackQuery.message;
    const user = await dbGet(`SELECT language FROM users WHERE telegram_id = ?`, [callbackQuery.from.id]);
    const lang = user.language;

    bot.editMessageText(t('rolePrompt', lang), {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        reply_markup: {
            inline_keyboard: [
                [{ text: t('rolePrimary', lang), callback_data: 'set_new_role_primary' }],
                [{ text: t('rolePartner', lang), callback_data: 'set_new_role_partner' }]
            ]
        }
    });
}

async function handleRoleChangeCancel(bot, callbackQuery) {
    const msg = callbackQuery.message;
    const user = await dbGet(`SELECT language FROM users WHERE telegram_id = ?`, [callbackQuery.from.id]);
    const lang = user.language;
    bot.editMessageText(t('roleChangeCancelled', lang), {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown'
    });
}

async function handleRemindersCommand(bot, msg) {
    const user = await dbGet(`SELECT role, language, reminder_time FROM users WHERE telegram_id = ?`, [msg.from.id]);
    const lang = user.language;

    if (!user || user.role !== 'primary') {
        return bot.sendMessage(msg.chat.id, t('partnerOnlyCommand', lang));
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
    bot.answerCallbackQuery(callbackQuery.id, { text: t('settingsSavedToast', lang) });
}

module.exports = {
    handleStart,
    handleHelpCommand,
    handleLanguageChoice,
    handleRoleChoice,
    handleCalendarChoice,
    handlePartnerCommand,
    handlePairing,
    handleShareCommand,
    handleSettings,
    handleSettingsChoice,
    handleRemindersCommand,
    handleReminderChoice,
    handleRoleChangeConfirmation,
    handleRoleChangeCancel,
};
