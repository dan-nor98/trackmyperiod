// src/utils/locales.js

const strings = {
    en: {
        // Onboarding & General
        welcome: "👋 Welcome, {name}!\n\nI'm Luna, your personal cycle assistant. To get started, please choose your language:",
        welcomeBack: "👋 Welcome back, {name}!\n\nUse the menu button or type /help to see what I can do.",
        rolePrompt: "Great! Now, please tell me your role:",
        rolePrimary: "🚺 I'm tracking my cycle",
        rolePartner: "🤝 I'm supporting a partner",
        calendarPrompt: "Excellent! Now, please choose your preferred calendar system.",
        calendarGregorian: "🗓️ Gregorian",
        calendarShamsi: "🌙 Shamsi (Hijri)",
        setupComplete: "🎉 *Setup Complete!* 🎉\n\nYour calendar is set to {emoji} {calendarName}.\n\nYou can now use the menu button (or type /help).",
        partnerRoleInfo: "✅ Got it. You're all set!\n\nTo connect with your partner, ask them to generate an invitation link using the `/partner` command.",

        // Help Command
        helpTitle: "❓ *Luna Bot Help*\n\nHere's what I can do:\n\n",
        helpPrimary: "*/track* - 🩸 Log your period.\n" +
                     "*/symptoms* - 🤒 Log your symptoms.\n" +
                     "*/history* - 📈 View history & predictions.\n" +
                     "*/partner* - 🤝 Invite your partner.\n" +
                     "*/reminders* - 🔔 Manage reminders.\n" +
                     "*/settings* - ⚙️ Change language or calendar.\n",
        helpPartner: "*/status* - ❤️ Check your partner's status.\n",
        helpFooter: "\n*/help* - ❓ Show this help message again.",

        // Partner Feature
        partnerInvite: "💌 *Partner Invitation Link*\n\nShare this link with your partner. It is valid for 10 minutes:\n\n{link}",
        partnerOnlyCommand: "This command is only for users tracking their cycle.",
        partnerConnectedToYou: `💞 You are now connected with *{name}*!`,
        partnerConnectedToThem: `💞 You are now connected with *{name}*!\n\nYou can use the \`/status\` command to check in on them.`,
        partnerLinkInvalid: "This invitation link is invalid or has expired. Please ask your partner to generate a new one.",

        // Settings
        settingsTitle: "⚙️ *Settings*\n\nPlease choose what you'd like to change:",
        settingsLanguage: "🌐 Language",
        settingsCalendar: "🗓️ Calendar",
        languagePrompt: "Please choose your language:",
        settingsLanguageConfirmation: "✅ Your language has been set to *{lang}*.",
        settingsCalendarConfirmation: "✅ Your calendar has been set to *{calendarName}*.",

        // Reminders
        remindersTitle: "🔔 *Reminder Settings*\n\nReminders are currently: *{status}*\n\nChoose a time to receive daily PMS and period predictions, or turn them off.",
        remindersStatusOn: "On ({time})",
        remindersStatusOff: "Off",
        remindersUpdated: "🔔 *Reminder settings updated.*\n\nThey are now: *{status}*",
        remindersUpdatedStatusOn: "On, set for {time}",
        turnOffReminders: "❌ Turn Off Reminders",

        // Tracking & History
        trackTitle: "🩸 *Log Your Period*\n\nHow would you like to log your period date?",
        trackToday: "Today",
        trackPickDate: "Pick a Different Date",
        trackStartOrEnd: "🩸 Are you logging a period *start* or *end*?",
        trackStartDate: "Start Date",
        trackEndDate: "End Date",
        historyTitle: "*📈 Recent Period History*\n",
        historyEntry: "- {emoji} {start} to {end}\n",
        predictionTitle: "*🔮 Your Cycle Prediction*\n",
        avgPeriod: "*Average Period:* {days} days\n",
        avgCycle: "*Average Cycle:* {days} days\n\n",
        predictedStart: "*Predicted Next Period:* {emoji} {date}\n\n",
        predictionFooter: "_This prediction is based on your last {count} cycles._",
        historyNotEnoughData: "You haven't logged any complete cycles yet. Use `/track` to get started!",
        historyNeedOneMore: "_Log one more complete cycle to get predictions!_",
        logStartSuccess: "✅ Period start logged for *{date}*.\n\nYou can now log symptoms with /symptoms.",
        logEndSuccess: "✅ Period end logged for *{date}*.",
        
        // Symptoms
        symptomsTitle: "🤒 *Log a Symptom*\n\nWhat symptom would you like to log for today?",
        symptomsNeedActive: "You can only log symptoms during an active period. Please log a period start using `/track` first.",
        symptomLogged: "✅ Symptom logged: *{symptom}*.\n\nYou can log another or use a different command.",

        // Status
        statusTitle: "❤️ *{name}'s Status*\n\n",
        statusOnPeriod: "🩸 Currently on *Day {day}* of her period.",
        statusInCycle: "🌸 Currently on *Day {day}* of her cycle.",
        statusSymptomsToday: "\n\n*Symptoms Logged Today:*\n- {symptoms}",
        statusNoSymptoms: "\n\n_No symptoms logged for today._",
        statusNoData: "{name} hasn't logged any cycle data yet.",
    },
    fa: {
        // Onboarding & General
        welcome: "👋 خوش آمدید، {name}!\n\nمن لونا، دستیار شخصی شما برای چرخه قاعدگی هستم. برای شروع، لطفاً زبان خود را انتخاب کنید:",
        welcomeBack: "👋 خوش آمدید، {name}!\n\nاز دکمه منو یا دستور /help برای دیدن امکانات استفاده کنید.",
        rolePrompt: "عالی! حالا لطفاً نقش خود را مشخص کنید:",
        rolePrimary: "🚺 من چرخه قاعدگی‌ام را دنبال می‌کنم",
        rolePartner: "🤝 من از شریک زندگی‌ام حمایت می‌کنم",
        calendarPrompt: "بسیار خب! حالا لطفاً سیستم تقویم مورد نظر خود را انتخاب کنید.",
        calendarGregorian: "🗓️ میلادی",
        calendarShamsi: "🌙 شمسی (هجری)",
        setupComplete: "🎉 *راه‌اندازی کامل شد!* 🎉\n\nتقویم شما بر روی {emoji} {calendarName} تنظیم شد.\n\nاکنون می‌توانید از دکمه منو (یا دستور /help) استفاده کنید.",
        partnerRoleInfo: "✅ متوجه شدم. شما آماده‌اید!\n\nبرای اتصال به شریک زندگی‌تان، از او بخواهید با استفاده از دستور `/partner` یک لینک دعوت ایجاد کند.",
        
        // Help Command
        helpTitle: "❓ *راهنمای ربات لونا*\n\nاین‌ها کارهایی است که من می‌توانم انجام دهم:\n\n",
        helpPrimary: "*/track* - 🩸 ثبت شروع یا پایان دوره قاعدگی.\n" +
                     "*/symptoms* - 🤒 ثبت علائم روزانه.\n" +
                     "*/history* - 📈 مشاهده تاریخچه و پیش‌بینی‌ها.\n" +
                     "*/partner* - 🤝 ایجاد لینک دعوت برای شریک زندگی.\n" +
                     "*/reminders* - 🔔 مدیریت یادآوری‌های روزانه.\n" +
                     "*/settings* - ⚙️ تغییر زبان یا تقویم.\n",
        helpPartner: "*/status* - ❤️ بررسی وضعیت فعلی شریک زندگی‌تان.\n",
        helpFooter: "\n*/help* - ❓ نمایش مجدد این پیام راهنما.",

        // Partner Feature
        partnerInvite: "💌 *لینک دعوت از شریک زندگی*\n\nاین لینک را با شریک خود به اشتراک بگذارید. این لینک به مدت ۱۰ دقیقه معتبر است:\n\n{link}",
        partnerOnlyCommand: "این دستور فقط برای کاربرانی که چرخه خود را دنبال می‌کنند در دسترس است.",
        partnerConnectedToYou: `💞 شما اکنون به *{name}* متصل شدید!`,
        partnerConnectedToThem: `💞 شما اکنون به *{name}* متصل شدید!\n\nمی‌توانید از دستور \`/status\` برای باخبر شدن از وضعیت او استفاده کنید.`,
        partnerLinkInvalid: "این لینک دعوت نامعتبر است یا منقضی شده. لطفاً از شریک خود بخواهید یک لینک جدید ایجاد کند.",

        // Settings
        settingsTitle: "⚙️ *تنظیمات*\n\nلطفاً انتخاب کنید چه چیزی را می‌خواهید تغییر دهید:",
        settingsLanguage: "🌐 زبان",
        settingsCalendar: "🗓️ تقویم",
        languagePrompt: "لطفاً زبان خود را انتخاب کنید:",
        settingsLanguageConfirmation: "✅ زبان شما به *{lang}* تغییر کرد.",
        settingsCalendarConfirmation: "✅ تقویم شما به *{calendarName}* تغییر کرد.",

        // Reminders
        remindersTitle: "🔔 *تنظیمات یادآوری*\n\nیادآوری‌ها در حال حاضر: *{status}*\n\nیک زمان برای دریافت پیش‌بینی‌های روزانه PMS و قاعدگی انتخاب کنید، یا آن را خاموش کنید.",
        remindersStatusOn: "روشن ({time})",
        remindersStatusOff: "خاموش",
        remindersUpdated: "🔔 *تنظیمات یادآوری به‌روز شد.*\n\nوضعیت فعلی: *{status}*",
        remindersUpdatedStatusOn: "روشن، تنظیم برای {time}",
        turnOffReminders: "❌ خاموش کردن یادآوری‌ها",

        // Tracking & History
        trackTitle: "🩸 *ثبت دوره قاعدگی*\n\nچگونه می‌خواهید تاریخ قاعدگی خود را ثبت کنید؟",
        trackToday: "امروز",
        trackPickDate: "انتخاب یک تاریخ دیگر",
        trackStartOrEnd: "🩸 آیا *شروع* یا *پایان* دوره را ثبت می‌کنید؟",
        trackStartDate: "تاریخ شروع",
        trackEndDate: "تاریخ پایان",
        historyTitle: "*📈 تاریخچه دوره‌های اخیر*\n",
        historyEntry: "- {emoji} از {start} تا {end}\n",
        predictionTitle: "*🔮 پیش‌بینی چرخه شما*\n",
        avgPeriod: "*میانگین دوره قاعدگی:* {days} روز\n",
        avgCycle: "*میانگین چرخه:* {days} روز\n\n",
        predictedStart: "*شروع دوره بعدی:* {emoji} {date}\n\n",
        predictionFooter: "_این پیش‌بینی بر اساس {count} چرخه اخیر شماست._",
        historyNotEnoughData: "شما هنوز هیچ چرخه کاملی را ثبت نکرده‌اید. برای شروع از `/track` استفاده کنید!",
        historyNeedOneMore: "_برای دریافت پیش‌بینی، یک چرخه کامل دیگر را ثبت کنید!_",
        logStartSuccess: "✅ شروع دوره برای *{date}* ثبت شد.\n\nاکنون می‌توانید علائم خود را با /symptoms ثبت کنید.",
        logEndSuccess: "✅ پایان دوره برای *{date}* ثبت شد.",

        // Symptoms
        symptomsTitle: "🤒 *ثبت علائم*\n\nچه علامتی را برای امروز می‌خواهید ثبت کنید؟",
        symptomsNeedActive: "شما فقط در طول یک دوره فعال می‌توانید علائم را ثبت کنید. لطفاً ابتدا شروع دوره را با `/track` ثبت کنید.",
        symptomLogged: "✅ علامت ثبت شد: *{symptom}*.\n\nمی‌توانید علامت دیگری ثبت کنید یا از دستور دیگری استفاده کنید.",

        // Status
        statusTitle: "❤️ *وضعیت {name}*\n\n",
        statusOnPeriod: "🩸 در حال حاضر در *روز {day}* دوره قاعدگی خود است.",
        statusInCycle: "🌸 در حال حاضر در *روز {day}* چرخه خود است.",
        statusSymptomsToday: "\n\n*علائم ثبت شده امروز:*\n- {symptoms}",
        statusNoSymptoms: "\n\n_هیچ علامتی برای امروز ثبت نشده است._",
        statusNoData: "{name} هنوز هیچ داده‌ای از چرخه خود ثبت نکرده است.",
    }
};

function t(key, lang = 'en', replacements = {}) {
    const langStrings = strings[lang] || strings['en'];
    let str = langStrings[key] || strings['en'][key] || `MISSING_KEY: ${key}`;

    for (const placeholder in replacements) {
        str = str.replace(`{${placeholder}}`, replacements[placeholder]);
    }
    return str;
}

module.exports = { t };
