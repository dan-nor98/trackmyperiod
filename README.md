# TrackMyPeriod Bot

A sophisticated Telegram bot designed for easy and private menstrual cycle tracking, with a unique feature for sharing information with a partner to foster support and understanding.

## About

TrackMyPeriod is more than just a period tracker; it's a tool for couples. It allows individuals to effortlessly log their menstrual cycles, track symptoms, and receive intelligent predictions. At the same time, it provides an option to securely connect with a partner, keeping them informed and empowering them to be more supportive.

Built with Node.js, this bot is designed to be intuitive, private, and accessible, featuring multi-language and multi-calendar support to cater to a global audience.

## Functionality

The bot's features are tailored to two distinct roles: the primary user who is tracking their cycle, and their supportive partner.

### For Primary Users (Cycle Tracking)

- **🩸 Period Tracking (`/track`):** Easily log the start and end dates of a period, either for the current day or by selecting a specific date from a calendar.
- **🤒 Symptom Logging (`/symptoms`):** Log common symptoms like cramps, headaches, and fatigue during an active period.
- **📈 History & Predictions (`/history`):** View a summary of your last five cycles, see your average period and cycle length, and get an AI-powered prediction for your next period.
- **🤝 Partner Connection (`/partner`):** Generate a secure, one-time invitation link to share with your partner.
- **🔔 Reminders (`/reminders`):** Set a preferred time to receive daily reminders about upcoming PMS and predicted period start dates.
- **⚙️ Settings (`/settings`):** Customize your experience by choosing your preferred language (English/Farsi) and calendar system (Gregorian/Shamsi).
- **🧪 Test Data (`/seed`):** Add sample cycle data to your profile to immediately test the history and prediction features.


### For Partners (Supportive Role)

- **❤️ Status Check (`/status`):** Proactively check your partner's current cycle status, including which day of their cycle or period they are on and any symptoms they've logged for the day.
- **💌 Automated Notifications:** Receive discreet, automated notifications when your partner's period starts or ends, when they log a significant symptom, and when their next period is approaching.
- **❓ Help Menu (`/help`):** Access a simple help menu that shows you the commands available for your role.

### Key Features

- **🌐 Multi-Language Support:** The bot is fully bilingual, supporting both **English** and **Farsi** in all commands and messages.
- **🌙 Multi-Calendar Support:** All dates are displayed according to the user's preference, with full support for both **Gregorian** and **Shamsi (Hijri)** calendars, including the interactive date picker.
- **🤖 Persistent Menu:** A convenient menu button in the Telegram chat provides quick access to all relevant commands.