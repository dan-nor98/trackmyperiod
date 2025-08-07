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
        partnerRoleInfo: "✅ Your role is set as a supportive partner!\n\nTo get started, your partner needs to invite you from their account.\n\n*Please forward the message below to them so they can set up their account and invite you.*",
        partnerForwardMessage: "Hey! I'm using the Luna bot to be a more supportive partner. You can use it to track your cycle and it will keep me in the loop. You can start the bot here: {link}\n\nOnce you're set up, please use the `/partner` command to send me an invitation link so we can connect!",

        // Help Command
        helpTitle: "❓ *Luna Bot Help*\n\nHere's what I can do:\n\n",
        helpPrimary: "*/track* - 🩸 Log your period.\n" +
                     "*/symptoms* - 🤒 Log your symptoms.\n" +
                     "*/history* - 📈 View history & predictions.\n" +
                     "*/partner* - 🤝 Invite your partner.\n" +
                     "*/reminders* - 🔔 Manage reminders.\n" +
                     "*/settings* - ⚙️ Change language or calendar.\n",
        helpPartner: "*/status* - ❤️ Check your partner's status.\n" +
                     "*/share* - 📲 Share this bot with others.\n",
        helpFooter: "\n*/help* - ❓ Show this help message again.",

        // Command Descriptions
        command_track: '🩸 Log your period',
        command_symptoms: '🤒 Log symptoms',
        command_history: '📈 View history & predictions',
        command_status: "❤️ Check partner's status",
        command_partner: '🤝 Invite or manage partner',
        command_reminders: '🔔 Manage reminders',
        command_settings: '⚙️ Change language/calendar/role',
        command_help: '❓ Get help',
        command_share: '📲 Share the bot with others',

        // Partner Feature
        partnerInvite: "💌 *Partner Invitation Link*\n\nShare this link with your partner. It is valid for 10 minutes:\n\n{link}",
        partnerOnlyCommand: "This command is only for users tracking their cycle.",
        partnerConnectedToYou: `💞 You are now connected with *{name}*!`,
        partnerConnectedToThem: `💞 You are now connected with *{name}*!\n\nYou can use the \`/status\` command to check in on them.`,
        partnerLinkInvalid: "This invitation link is invalid or has expired. Please ask your partner to generate a new one.",
        partnerDisconnected: "Your partner {name} has changed their role and you have been disconnected.",
        partnerNotificationPeriodStart: "A heads up from {name}: her period started on {date}.",
        partnerNotificationPeriodEnd: "A heads up from {name}: her period ended on {date}.",
        partnerNotificationSymptom: "A heads up from {name}: she is experiencing: {symptom}.",

        // Share Feature
        shareMessage: "Know someone who could benefit from Luna? Share this link with them:\n\n{link}",

        // Settings
        settingsTitle: "⚙️ *Settings*\n\nPlease choose what you'd like to change:",
        settingsLanguage: "🌐 Language",
        settingsCalendar: "🗓️ Calendar",
        settingsRole: "👤 Role",
        languagePrompt: "Please choose your language:",
        settingsLanguageConfirmation: "✅ Your language has been set to *{lang}*.",
        settingsCalendarConfirmation: "✅ Your calendar has been set to *{calendarName}*.",
        changeRolePrompt: "👤 *Change Role*\n\nAre you sure you want to change your role?\n\n⚠️ *Warning:* This action will disconnect you from any partner and permanently delete all of your cycle and symptom data.",
        changeRoleConfirm: "✅ Yes, I'm sure",
        changeRoleCancel: "❌ Cancel",
        roleChanged: "✅ Your role has been successfully changed to *{role}*.",
        roleChangeCancelled: "👍 Role change cancelled.",
        settingsSavedToast: "Settings saved!",

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
        logStartFailActive: "You already have an active period.",
        logEndFailNoActive: "No active period to end.",
        seedSuccess: "🧪 I've added 3 sample cycles to your history. You can now use the /history command.",
        calendarSelectDate: "🗓️ Please select a date from the calendar:",
        
        // Symptoms
        symptoms: {
            cramps: 'Cramps',
            headache: 'Headache',
            fatigue: 'Fatigue',
            nausea: 'Nausea',
            bloating: 'Bloating',
            mood_swings: 'Mood Swings'
        },
        symptomsTitle: "🤒 *Log a Symptom*\n\nWhat symptom would you like to log for today?",
        symptomsNeedActive: "You can only log symptoms during an active period. Please log a period start using `/track` first.",
        symptomLogged: "✅ Symptom logged: *{symptom}*.\n\nYou can log another or use a different command.",
        symptomLoggedToast: "{symptom} logged!",

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
        partnerRoleInfo: "✅ نقش شما به عنوان شریک حامی تنظیم شد!\n\nبرای شروع، شریک شما باید شما را از حساب خود دعوت کند.\n\n*لطفاً پیام زیر را برای او ارسال کنید تا حساب خود را راه‌اندازی کرده و شما را دعوت کند.*",
        partnerForwardMessage: "سلام! من از ربات لونا استفاده می‌کنم تا شریک حمایت‌گر بهتری باشم. تو می‌توانی از آن برای پیگیری چرخه قاعدگی‌ات استفاده کنی و من را در جریان قرار دهی. می‌توانی ربات را از اینجا شروع کنی: {link}\n\nپس از راه‌اندازی، لطفاً از دستور `/partner` برای ارسال لینک دعوت به من استفاده کن تا بتوانیم متصل شویم!",
        
        // Help Command
        helpTitle: "❓ *راهنمای ربات لونا*\n\nاین‌ها کارهایی است که من می‌توانم انجام دهم:\n\n",
        helpPrimary: "*/track* - 🩸 ثبت شروع یا پایان دوره قاعدگی.\n" +
                     "*/symptoms* - 🤒 ثبت علائم روزانه.\n" +
                     "*/history* - 📈 مشاهده تاریخچه و پیش‌بینی‌ها.\n" +
                     "*/partner* - 🤝 ایجاد لینک دعوت برای شریک زندگی.\n" +
                     "*/reminders* - 🔔 مدیریت یادآوری‌های روزانه.\n" +
                     "*/settings* - ⚙️ تغییر زبان یا تقویم.\n",
        helpPartner: "*/status* - ❤️ بررسی وضعیت فعلی شریک زندگی‌تان.\n" +
                     "*/share* - 📲 اشتراک‌گذاری این ربات با دیگران.\n",
        helpFooter: "\n*/help* - ❓ نمایش مجدد این پیام راهنما.",

        // Command Descriptions
        command_track: '🩸 ثبت قاعدگی',
        command_symptoms: '🤒 ثبت علائم',
        command_history: '📈 مشاهده تاریخچه و پیش‌بینی',
        command_status: "❤️ بررسی وضعیت شریک",
        command_partner: '🤝 دعوت یا مدیریت شریک',
        command_reminders: '🔔 مدیریت یادآوری‌ها',
        command_settings: '⚙️ تغییر زبان/تقویم/نقش',
        command_help: '❓ دریافت راهنما',
        command_share: '📲 اشتراک‌گذاری ربات با دیگران',

        // Partner Feature
        partnerInvite: "💌 *لینک دعوت از شریک زندگی*\n\nاین لینک را با شریک خود به اشتراک بگذارید. این لینک به مدت ۱۰ دقیقه معتبر است:\n\n{link}",
        partnerOnlyCommand: "این دستور فقط برای کاربرانی که چرخه خود را دنبال می‌کنند در دسترس است.",
        partnerConnectedToYou: `💞 شما اکنون به *{name}* متصل شدید!`,
        partnerConnectedToThem: `💞 شما اکنون به *{name}* متصل شدید!\n\nمی‌توانید از دستور \`/status\` برای باخبر شدن از وضعیت او استفاده کنید.`,
        partnerLinkInvalid: "این لینک دعوت نامعتبر است یا منقضی شده. لطفاً از شریک خود بخواهید یک لینک جدید ایجاد کند.",
        partnerDisconnected: "کاربر {name} نقش خود را تغییر داده و ارتباط شما با ایشان قطع شده است.",
        partnerNotificationPeriodStart: "اطلاع‌رسانی از طرف {name}: دوره قاعدگی ایشان در تاریخ {date} شروع شد.",
        partnerNotificationPeriodEnd: "اطلاع‌رسانی از طرف {name}: دوره قاعدگی ایشان در تاریخ {date} به پایان رسید.",
        partnerNotificationSymptom: "اطلاع‌رسانی از طرف {name}: ایشان در حال تجربه این علامت است: {symptom}.",

        // Share Feature
        shareMessage: "کسی را می‌شناسید که لونا بتواند به او کمک کند؟ این لینک را با او به اشتراک بگذارید:\n\n{link}",

        // Settings
        settingsTitle: "⚙️ *تنظیمات*\n\nلطفاً انتخاب کنید چه چیزی را می‌خواهید تغییر دهید:",
        settingsLanguage: "🌐 زبان",
        settingsCalendar: "🗓️ تقویم",
        settingsRole: "👤 نقش",
        languagePrompt: "لطفاً زبان خود را انتخاب کنید:",
        settingsLanguageConfirmation: "✅ زبان شما به *{lang}* تغییر کرد.",
        settingsCalendarConfirmation: "✅ تقویم شما به *{calendarName}* تغییر کرد.",
        changeRolePrompt: "👤 *تغییر نقش*\n\nآیا از تغییر نقش خود مطمئن هستید؟\n\n⚠️ *هشدار:* این کار باعث قطع ارتباط شما با شریکتان و حذف دائمی تمام داده‌های چرخه و علائم شما می‌شود.",
        changeRoleConfirm: "✅ بله، مطمئنم",
        changeRoleCancel: "❌ لغو",
        roleChanged: "✅ نقش شما با موفقیت به *{role}* تغییر کرد.",
        roleChangeCancelled: "👍 تغییر نقش لغو شد.",
        settingsSavedToast: "تنظیمات ذخیره شد!",

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
        logStartFailActive: "شما در حال حاضر یک دوره فعال دارید.",
        logEndFailNoActive: "هیچ دوره فعالی برای پایان دادن وجود ندارد.",
        seedSuccess: "🧪 من ۳ چرخه نمونه به تاریخچه شما اضافه کردم. اکنون می‌توانید از دستور /history استفاده کنید.",
        calendarSelectDate: "🗓️ لطفاً یک تاریخ از تقویم انتخاب کنید:",

        // Symptoms
        symptoms: {
            cramps: 'گرفتگی عضلات',
            headache: 'سردرد',
            fatigue: 'خستگی',
            nausea: 'حالت تهوع',
            bloating: 'نفخ',
            mood_swings: 'نوسانات خلقی'
        },
        symptomsTitle: "🤒 *ثبت علائم*\n\nچه علامتی را برای امروز می‌خواهید ثبت کنید؟",
        symptomsNeedActive: "شما فقط در طول یک دوره فعال می‌توانید علائم را ثبت کنید. لطفاً ابتدا شروع دوره را با `/track` ثبت کنید.",
        symptomLogged: "✅ علامت ثبت شد: *{symptom}*.\n\nمی‌توانید علامت دیگری ثبت کنید یا از دستور دیگری استفاده کنید.",
        symptomLoggedToast: "{symptom} ثبت شد!",

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
    // Navigate to the string, supporting nested keys like 'symptoms.cramps'
    const keys = key.split('.');
    let result = strings[lang] || strings['en'];
    for (const k of keys) {
        result = result ? result[k] : undefined;
    }

    let str = result || (strings['en'] ? keys.reduce((acc, k) => acc ? acc[k] : undefined, strings['en']) : undefined) || `MISSING_KEY: ${key}`;

    for (const placeholder in replacements) {
        str = str.replace(`{${placeholder}}`, replacements[placeholder]);
    }
    return str;
}

module.exports = { t };
