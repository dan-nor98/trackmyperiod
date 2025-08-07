// src/handlers/cycle_handler.js

const { db } = require('../services/database.js');
const { toShamsi } = require('../utils/calendar.js');
const { t } = require('../utils/locales.js');
const { gregorianToJalali, jalaliToGregorian } = require('shamsi-date-converter');

// --- Database Helpers (Async/Await) ---
const dbQuery = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
const dbGet = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
const dbRun = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(err) { err ? reject(err) : resolve(this) }));

// --- Notification Helper ---
async function notifyPartner(bot, userId, eventMessageKey, replacements = {}) {
    const user = await dbGet(`SELECT first_name, partner_id FROM users WHERE telegram_id = ?`, [userId]);
    if (user && user.partner_id) {
        const partner = await dbGet(`SELECT language FROM users WHERE telegram_id = ?`, [user.partner_id]);
        const lang = partner ? partner.language : 'en';

        // If a symptomKey is passed, translate it for the partner
        if (replacements.symptomKey) {
            replacements.symptom = t(`symptoms.${replacements.symptomKey}`, lang);
            delete replacements.symptomKey; // remove it so it's not passed to t() again
        }

        const message = t(eventMessageKey, lang, { name: user.first_name, ...replacements });
        bot.sendMessage(user.partner_id, `💌 ${message}`);
    }
}


// --- Main Command Handlers ---
async function handleTrack(bot, msg) {
    const user = await dbGet(`SELECT role, language FROM users WHERE telegram_id = ?`, [msg.from.id]);
    const lang = user ? user.language : 'en';

    if (!user || user.role !== 'primary') {
        return bot.sendMessage(msg.chat.id, t('partnerOnlyCommand', lang));
    }

    bot.sendMessage(msg.chat.id, t('trackTitle', lang), {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: t('trackToday', lang), callback_data: 'log_method_today' }],
                [{ text: t('trackPickDate', lang), callback_data: 'log_method_picker' }]
            ]
        }
    });
}

async function handleHistory(bot, msg) {
    const user = await dbGet(`SELECT calendar_preference, role, language FROM users WHERE telegram_id = ?`, [msg.from.id]);
    const lang = user ? user.language : 'en';

    if (!user || user.role !== 'primary') {
        return bot.sendMessage(msg.chat.id, t('partnerOnlyCommand', lang));
    }

    const cycles = await dbQuery(`SELECT start_date, end_date FROM cycles WHERE user_id = ? AND end_date IS NOT NULL ORDER BY start_date DESC`, [msg.from.id]);

    if (cycles.length < 1) {
        return bot.sendMessage(msg.chat.id, t('historyNotEnoughData', lang));
    }

    const formatDate = (date) => user.calendar_preference === 'shamsi' ? toShamsi(new Date(date)) : date;
    const emoji = user.calendar_preference === 'shamsi' ? '🌙' : '🗓️';

    let response = t('historyTitle', lang);
    const recentCycles = cycles.slice(0, 5);
    recentCycles.forEach(cycle => {
        response += t('historyEntry', lang, { emoji, start: formatDate(cycle.start_date), end: formatDate(cycle.end_date) });
    });
    response += '\n';

    if (cycles.length >= 2) {
        let totalPeriodLength = 0;
        let totalCycleLength = 0;
        const calculationCycles = [...cycles].reverse(); 

        calculationCycles.forEach((cycle, index) => {
            const start = new Date(cycle.start_date);
            const end = new Date(cycle.end_date);
            totalPeriodLength += (end - start) / (1000 * 60 * 60 * 24) + 1;
            if (index > 0) {
                const prevStart = new Date(calculationCycles[index - 1].start_date);
                totalCycleLength += (start - prevStart) / (1000 * 60 * 60 * 24);
            }
        });

        const avgPeriodLength = Math.round(totalPeriodLength / calculationCycles.length);
        const avgCycleLength = Math.round(totalCycleLength / (calculationCycles.length - 1));
        const lastCycleStart = new Date(calculationCycles[calculationCycles.length - 1].start_date);
        
        const predictedDate = new Date(lastCycleStart);
        predictedDate.setDate(predictedDate.getDate() + avgCycleLength);

        response += t('predictionTitle', lang) +
                    t('avgPeriod', lang, { days: avgPeriodLength }) +
                    t('avgCycle', lang, { days: avgCycleLength }) +
                    t('predictedStart', lang, { emoji, date: formatDate(predictedDate.toISOString().split('T')[0]) }) +
                    t('predictionFooter', lang, { count: cycles.length });
    } else {
        response += t('historyNeedOneMore', lang);
    }

    bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
}

async function handleSeeding(bot, msg) {
    const user = await dbGet(`SELECT role, language FROM users WHERE telegram_id = ?`, [msg.from.id]);
    const lang = user ? user.language : 'en';

    if (!user || user.role !== 'primary') {
        return bot.sendMessage(msg.chat.id, t('partnerOnlyCommand', lang));
    }
    
    await dbRun(`DELETE FROM cycles WHERE user_id = ?`, [msg.from.id]);
    const cyclesToSeed = [ { period: 5, cycle: 28 }, { period: 4, cycle: 29 }, { period: 5, cycle: 27 } ];
    let currentStartDate = new Date();
    currentStartDate.setDate(currentStartDate.getDate() - 28);
    for (const cycle of cyclesToSeed) {
        const endDate = new Date(currentStartDate);
        endDate.setDate(endDate.getDate() + (cycle.period - 1));
        await dbRun(`INSERT INTO cycles (user_id, start_date, end_date) VALUES (?, ?, ?)`, 
            [msg.from.id, currentStartDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);
        currentStartDate.setDate(currentStartDate.getDate() - cycle.cycle);
    }
    bot.sendMessage(msg.chat.id, t('seedSuccess', lang));
}

async function handleSymptomsCommand(bot, msg) {
    const user = await dbGet(`SELECT role, language FROM users WHERE telegram_id = ?`, [msg.from.id]);
    const lang = user ? user.language : 'en';

    if (!user || user.role !== 'primary') {
        return bot.sendMessage(msg.chat.id, t('partnerOnlyCommand', lang));
    }

    const activeCycle = await dbGet(`SELECT id FROM cycles WHERE user_id = ? AND end_date IS NULL`, [msg.from.id]);
    if (!activeCycle) {
        return bot.sendMessage(msg.chat.id, t('symptomsNeedActive', lang));
    }

    const symptomKeys = ['cramps', 'headache', 'fatigue', 'nausea', 'bloating', 'mood_swings'];
    const emojis = {
        cramps: '😖', headache: '🤕', fatigue: '😴',
        nausea: '🤢', bloating: '🐡', mood_swings: '🎭'
    };
    
    const keyboard = symptomKeys.map(key => ([{ 
        text: `${emojis[key]} ${t(`symptoms.${key}`, lang)}`, 
        callback_data: `log_symptom_${key}` 
    }]));

    bot.sendMessage(msg.chat.id, t('symptomsTitle', lang), {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
}

async function handleStatusCommand(bot, msg) {
    const partner = await dbGet(`SELECT role, partner_id, language FROM users WHERE telegram_id = ?`, [msg.from.id]);
    const lang = partner ? partner.language : 'en';

    if (!partner || partner.role !== 'partner' || !partner.partner_id) {
        return bot.sendMessage(msg.chat.id, t('partnerOnlyCommand', lang));
    }

    const primaryUser = await dbGet(`SELECT * FROM users WHERE telegram_id = ?`, [partner.partner_id]);
    const activeCycle = await dbGet(`SELECT * FROM cycles WHERE user_id = ? ORDER BY start_date DESC LIMIT 1`, [primaryUser.telegram_id]);

    if (!activeCycle) {
        return bot.sendMessage(msg.chat.id, t('statusNoData', lang, { name: primaryUser.first_name }));
    }

    const today = new Date();
    const startDate = new Date(activeCycle.start_date);
    const cycleDay = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
    let statusMessage = t('statusTitle', lang, { name: primaryUser.first_name });

    if (activeCycle.end_date === null) {
        statusMessage += t('statusOnPeriod', lang, { day: cycleDay });
    } else {
        statusMessage += t('statusInCycle', lang, { day: cycleDay });
    }

    const todayStr = today.toISOString().split('T')[0];
    const symptoms = await dbQuery(`SELECT symptom_name FROM symptoms WHERE cycle_id = ? AND logged_at = ?`, [activeCycle.id, todayStr]);

    if (symptoms.length > 0) {
        const translatedSymptoms = symptoms.map(s => t(`symptoms.${s.symptom_name}`, lang)).join('\n- ');
        statusMessage += t('statusSymptomsToday', lang, { symptoms: translatedSymptoms });
    } else {
        statusMessage += t('statusNoSymptoms', lang);
    }

    bot.sendMessage(msg.chat.id, statusMessage, { parse_mode: 'Markdown' });
}

// --- Callback Handlers ---
async function handleMethodChoice(bot, callbackQuery) {
    const user = await dbGet(`SELECT language FROM users WHERE telegram_id = ?`, [callbackQuery.from.id]);
    const lang = user.language;
    const method = callbackQuery.data.split('_').pop();
    const msg = callbackQuery.message;
    bot.editMessageText(t('trackStartOrEnd', lang), {
        parse_mode: 'Markdown',
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        reply_markup: {
            inline_keyboard: [
                [{ text: t('trackStartDate', lang), callback_data: `log_select_start_${method}` }],
                [{ text: t('trackEndDate', lang), callback_data: `log_select_end_${method}` }]
            ]
        }
    });
}

async function handleLogSelection(bot, callbackQuery) {
    const [,, type, method] = callbackQuery.data.split('_');
    const msg = callbackQuery.message;
    const user = await dbGet(`SELECT language, calendar_preference FROM users WHERE telegram_id = ?`, [callbackQuery.from.id]);
    const lang = user.language;


    if (method === 'today') {
        const today = new Date().toISOString().split('T')[0];
        if (type === 'start') await logPeriodStart(bot, callbackQuery, today);
        else await logPeriodEnd(bot, callbackQuery, today);
    } else {
        const keyboard = generateCalendar(type, user.calendar_preference, new Date());
        bot.editMessageText(t('calendarSelectDate', lang), {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: keyboard
        });
    }
}

async function handleCalendarNav(bot, callbackQuery) {
    const parts = callbackQuery.data.split('_');
    const type = parts[2];
    const pref = parts[3];
    const dateStr = parts[4];
    const direction = parts[5];

    const msg = callbackQuery.message;
    const user = await dbGet(`SELECT language FROM users WHERE telegram_id = ?`, [callbackQuery.from.id]);
    const lang = user.language;

    let currentMonthDate = new Date(dateStr);
    const monthOffset = (direction === 'prev' ? -1 : 1);
    currentMonthDate.setMonth(currentMonthDate.getMonth() + monthOffset);

    const keyboard = generateCalendar(type, pref, currentMonthDate);
    bot.editMessageText(t('calendarSelectDate', lang), {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        reply_markup: keyboard
    });
}

async function handleDateSelection(bot, callbackQuery) {
    const [,, type, dateStr] = callbackQuery.data.split('_');
    if (type === 'start') await logPeriodStart(bot, callbackQuery, dateStr);
    else await logPeriodEnd(bot, callbackQuery, dateStr);
}

async function handleSymptomLogging(bot, callbackQuery) {
    const user = await dbGet(`SELECT language FROM users WHERE telegram_id = ?`, [callbackQuery.from.id]);
    const lang = user.language;
    const symptomKey = callbackQuery.data.split('log_symptom_')[1];
    const today = new Date().toISOString().split('T')[0];

    const activeCycle = await dbGet(`SELECT id FROM cycles WHERE user_id = ? AND end_date IS NULL`, [callbackQuery.from.id]);
    if (!activeCycle) {
        return bot.answerCallbackQuery(callbackQuery.id, { text: t('symptomsNeedActive', lang), show_alert: true });
    }

    await dbRun(`INSERT INTO symptoms (cycle_id, symptom_name, logged_at) VALUES (?, ?, ?)`, [activeCycle.id, symptomKey, today]);
    
    const translatedSymptom = t(`symptoms.${symptomKey}`, lang);
    bot.answerCallbackQuery(callbackQuery.id, { text: t('symptomLoggedToast', lang, { symptom: translatedSymptom }) });
    bot.editMessageText(t('symptomLogged', lang, { symptom: translatedSymptom }), {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: 'Markdown'
    });

    await notifyPartner(bot, callbackQuery.from.id, 'partnerNotificationSymptom', { symptomKey });
}

// --- Core Logic Functions ---
async function logPeriodStart(bot, callbackQuery, dateStr) {
    const msg = callbackQuery.message;
    const telegramId = callbackQuery.from.id;
    
    const user = await dbGet(`SELECT language, calendar_preference FROM users WHERE telegram_id = ?`, [telegramId]);
    const lang = user.language;
    const displayDate = user.calendar_preference === 'shamsi' ? toShamsi(new Date(dateStr)) : dateStr;

    const activeCycle = await dbGet(`SELECT * FROM cycles WHERE user_id = ? AND end_date IS NULL`, [telegramId]);
    if (activeCycle) {
        return bot.answerCallbackQuery(callbackQuery.id, { text: t('logStartFailActive', lang), show_alert: true });
    }
    await dbRun(`INSERT INTO cycles (user_id, start_date) VALUES (?, ?)`, [telegramId, dateStr]);
    bot.editMessageText(t('logStartSuccess', lang, { date: displayDate }), { chat_id: msg.chat.id, message_id: msg.message_id, parse_mode: 'Markdown' });
    await notifyPartner(bot, telegramId, 'partnerNotificationPeriodStart', { date: displayDate });
}

async function logPeriodEnd(bot, callbackQuery, dateStr) {
    const msg = callbackQuery.message;
    const telegramId = callbackQuery.from.id;

    const user = await dbGet(`SELECT language, calendar_preference FROM users WHERE telegram_id = ?`, [telegramId]);
    const lang = user.language;
    const displayDate = user.calendar_preference === 'shamsi' ? toShamsi(new Date(dateStr)) : dateStr;

    const activeCycle = await dbGet(`SELECT * FROM cycles WHERE user_id = ? AND end_date IS NULL ORDER BY start_date DESC LIMIT 1`, [telegramId]);
    if (!activeCycle) {
        return bot.answerCallbackQuery(callbackQuery.id, { text: t('logEndFailNoActive', lang), show_alert: true });
    }
    await dbRun(`UPDATE cycles SET end_date = ? WHERE id = ?`, [dateStr, activeCycle.id]);
    bot.editMessageText(t('logEndSuccess', lang, { date: displayDate }), { chat_id: msg.chat.id, message_id: msg.message_id, parse_mode: 'Markdown' });
    await notifyPartner(bot, telegramId, 'partnerNotificationPeriodEnd', { date: displayDate });
}

// --- Calendar Generation Utility ---
function generateCalendar(type, pref, date) {
    const keyboard = [];
    const dayHeaders = pref === 'shamsi' 
        ? ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] 
        : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const isLeapJalali = (year) => {
        const remainders = [1, 5, 9, 13, 17, 22, 26, 30];
        return remainders.includes(year % 33);
    };

    if (pref === 'shamsi') {
        const shamsiMonthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
        const [sYear, sMonth] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
        
        let daysInShamsiMonth = 30;
        if (sMonth <= 6) {
            daysInShamsiMonth = 31;
        } else if (sMonth === 12 && !isLeapJalali(sYear)) {
            daysInShamsiMonth = 29;
        }

        const firstDayGregorian = jalaliToGregorian(sYear, sMonth, 1);
        const firstDayOfWeek = (new Date(firstDayGregorian[0], firstDayGregorian[1] - 1, firstDayGregorian[2]).getDay() + 1) % 7;

        keyboard.push([{ text: `🌙 ${shamsiMonthNames[sMonth - 1]} ${sYear}`, callback_data: 'ignore' }]);
        keyboard.push(dayHeaders.map(d => ({ text: d, callback_data: 'ignore' })));

        let week = Array(firstDayOfWeek).fill({ text: ' ', callback_data: 'ignore' });
        for (let day = 1; day <= daysInShamsiMonth; day++) {
            const [gy, gm, gd] = jalaliToGregorian(sYear, sMonth, day);
            const dateStr = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
            week.push({ text: String(day), callback_data: `datepicker_select_${type}_${dateStr}` });
            if (week.length === 7) {
                keyboard.push(week);
                week = [];
            }
        }
        if (week.length > 0) keyboard.push(week.concat(Array(7 - week.length).fill({ text: ' ', callback_data: 'ignore' })));
    } else {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        keyboard.push([{ text: `🗓️ ${monthNames[month]} ${year}`, callback_data: 'ignore' }]);
        keyboard.push(dayHeaders.map(d => ({ text: d, callback_data: 'ignore' })));

        let week = Array(firstDay).fill({ text: ' ', callback_data: 'ignore' });
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            week.push({ text: String(day), callback_data: `datepicker_select_${type}_${dateStr}` });
            if (week.length === 7) {
                keyboard.push(week);
                week = [];
            }
        }
        if (week.length > 0) keyboard.push(week.concat(Array(7 - week.length).fill({ text: ' ', callback_data: 'ignore' })));
    }

    const navDate = date.toISOString().split('T')[0];
    keyboard.push([
        { text: '‹ Prev', callback_data: `datepicker_nav_${type}_${pref}_${navDate}_prev` },
        { text: 'Next ›', callback_data: `datepicker_nav_${type}_${pref}_${navDate}_next` }
    ]);
    return { inline_keyboard: keyboard };
}

module.exports = {
    handleTrack,
    handleHistory,
    handleSeeding,
    handleSymptomsCommand,
    handleStatusCommand,
    handleMethodChoice,
    handleLogSelection,
    handleCalendarNav,
    handleDateSelection,
    handleSymptomLogging,
};
