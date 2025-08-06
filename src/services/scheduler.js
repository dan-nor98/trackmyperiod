// src/services/scheduler.js

const { db } = require('./database.js');

const dbQuery = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));

async function checkAndSendReminders(bot) {
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    
    const usersToRemind = await dbQuery(`SELECT * FROM users WHERE reminder_time LIKE ? AND role = 'primary'`, [`${currentHour}:%`]);

    for (const user of usersToRemind) {
        const cycles = await dbQuery(`SELECT start_date FROM cycles WHERE user_id = ? AND end_date IS NOT NULL ORDER BY start_date DESC LIMIT 2`, [user.telegram_id]);
        if (cycles.length < 2) continue;

        const lastCycleStart = new Date(cycles[0].start_date);
        const prevCycleStart = new Date(cycles[1].start_date);
        const avgCycleLength = (lastCycleStart - prevCycleStart) / (1000 * 60 * 60 * 24);

        const predictedDate = new Date(lastCycleStart);
        predictedDate.setDate(predictedDate.getDate() + avgCycleLength);

        // Set time to 0 to compare dates only
        predictedDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);

        const daysUntil = Math.round((predictedDate - now) / (1000 * 60 * 60 * 24));

        let message = null;
        let partnerMessage = null;

        // PMS reminder window: 3-5 days before predicted start
        if (daysUntil >= 3 && daysUntil <= 5) {
            message = `Your period is predicted in ${daysUntil} days. You might start to experience PMS symptoms.`;
            partnerMessage = `Her period is predicted in ${daysUntil} days. She might start to experience PMS symptoms soon.`;
        } 
        // Period start reminder: 1 day before
        else if (daysUntil === 1) {
            message = "Your period is predicted to start tomorrow.";
            partnerMessage = "Her period is predicted to start tomorrow.";
        }

        if (message) {
            bot.sendMessage(user.telegram_id, `🔔 Reminder: ${message}`);
            if (user.partner_id) {
                bot.sendMessage(user.partner_id, `🔔 Reminder for ${user.first_name}: ${partnerMessage}`);
            }
        }
    }
}

function startScheduler(bot) {
    console.log('Reminder scheduler started. Checking every hour.');
    checkAndSendReminders(bot);
    setInterval(() => checkAndSendReminders(bot), 1000 * 60 * 60);
}

module.exports = { startScheduler };
