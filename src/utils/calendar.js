// src/utils/calendar.js

const { gregorianToJalali, jalaliToGregorian } = require('shamsi-date-converter');

/**
 * Converts a Gregorian date to a Hijri Shamsi date string.
 * @param {Date} date - The Gregorian date object.
 * @returns {string} The date in 'YYYY/MM/DD' format.
 */
function toShamsi(date) {
    const [year, month, day] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

/**
 * Converts a Hijri Shamsi date string to a Gregorian date object.
 * @param {string} shamsiDate - The date string in 'YYYY/MM/DD' format.
 * @returns {Date} The Gregorian date object.
 */
function toGregorian(shamsiDate) {
    const [year, month, day] = shamsiDate.split('/').map(Number);
    const [gYear, gMonth, gDay] = jalaliToGregorian(year, month, day);
    return new Date(gYear, gMonth - 1, gDay);
}

module.exports = {
    toShamsi,
    toGregorian,
};
