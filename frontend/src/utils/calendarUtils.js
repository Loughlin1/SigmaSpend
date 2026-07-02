// src/utils/calendarUtils.js

/**
 * Parses a date string in DD/MM/YYYY, YYYY/MM/DD, or YYYY-MM-DD format
 * into a Date object. Returns null if unparseable.
 * @param {string} dateStr
 * @returns {Date|null}
 */
const parseDateStr = (dateStr) => {
  if (!dateStr) return null;
  const cleanStr = String(dateStr).trim();
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(cleanStr)) {
    const parts = cleanStr.split(/[-/]/);
    return new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
  }
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(cleanStr)) {
    return new Date(cleanStr.replace(/\//g, '-'));
  }
  const d = new Date(cleanStr);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Formats a Date as YYYY/MM/DD for Gmail's after:/before: search operators.
 * @param {Date} date
 * @returns {string}
 */
const toGmailDateStr = (date) =>
  `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

/**
 * Generates a Gmail deep-link that searches for receipt/invoice emails
 * within a ±3 day window around the transaction date, filtered by description.
 * @param {string} dateStr
 * @param {string} description - Transaction description / merchant name
 * @returns {string} - Gmail search URL
 */
export const getGmailReceiptSearchUrl = (dateStr, description) => {
  const parsed = parseDateStr(dateStr);
  if (!parsed) return '#';

  const before = new Date(parsed);
  before.setDate(before.getDate() + 4); // exclusive upper bound

  const after = new Date(parsed);
  after.setDate(after.getDate() - 3);

  // Take the first 1-2 meaningful words from the description as the search term
  const searchTerm = (description || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(' ');

  const query = `(receipt OR invoice OR "order confirmation") "${searchTerm}" after:${toGmailDateStr(after)} before:${toGmailDateStr(before)}`;
  return `https://mail.google.com/mail/#search/${encodeURIComponent(query)}`;
};

/**
 * Formats a date string into a structured UK format including the weekday.
 * @param {string} dateStr - E.g., "2026/06/23" or "23/06/2026"
 * @returns {string} - E.g., "Tue, 23 Jun 2026"
 */
export const formatTransactionDate = (dateStr) => {
  if (!dateStr) return "";

  let parsedDate;

  // 1. Convert to string and sanitize any extra whitespace
  const cleanStr = String(dateStr).trim();

  // 2. Handle DD/MM/YYYY or DD-MM-YYYY format
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(cleanStr)) {
    const parts = cleanStr.split(/[-/]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    parsedDate = new Date(`${year}-${month}-${day}T00:00:00`);
  } 
  // 3. Handle YYYY/MM/DD or YYYY-MM-DD format
  else if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(cleanStr)) {
    const parts = cleanStr.split(/[-/]/);
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    parsedDate = new Date(`${year}-${month}-${day}T00:00:00`);
  } 
  // 4. Fallback for ISO strings or timestamps
  else {
    parsedDate = new Date(cleanStr);
  }

  // Check if the resulting date object is actually valid
  if (isNaN(parsedDate.getTime())) {
    console.error(`[SigmaSpend Exception] Failed to parse date string: "${dateStr}"`);
    return "Invalid Date";
  }

  // 5. Render using clean UK formatting layouts
  return new Intl.DateTimeFormat('en-GB', { 
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(parsedDate);
};

/**
 * Generates a zero-auth deep link to open Google Calendar week view centred
 * 2 days before the transaction date, so charges that cleared a day or two
 * late are still visible in the same view.
 * Supports various formats: "23/06/2026", "2026/06/23", "2026-06-23", etc.
 * @param {string} dateStr
 * @returns {string} - Deep link URL
 */
export const getGoogleCalendarDayUrl = (dateStr) => {
  const parsedDate = parseDateStr(dateStr);
  if (!parsedDate) {
    console.error(`[SigmaSpend] Unable to parse URL date: "${dateStr}"`);
    return "#";
  }

  // Step back 2 days so the transaction date is the 3rd day in a 4-day window
  parsedDate.setDate(parsedDate.getDate() - 2);

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');

  return `https://calendar.google.com/calendar/r/customday/${year}/${month}/${day}?dur=4`;
};


/**
 * Helper to compute the ISO-standard start and end bounds of the current month.
 * Automatically accommodates varying day counts (e.g., leap years).
 * @returns {Object} { start, end } in YYYY-MM-DD format
 */
export const getCurrentMonthBounds = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed (Jan=0, Jun=5)

  // First day of the current month: YYYY-MM-01
  const startDay = new Date(year, month, 1);
  // Passing 0 as the day value selects the final day of the prior month, 
  // so month + 1 with day 0 cleanly lands on the exact last day of the current month.
  const endDay = new Date(year, month + 1, 0);

  const formatISO = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    start: formatISO(startDay),
    end: formatISO(endDay)
  };
};

/**
 * Helper to compute the ISO-standard start and end bounds of last month.
 * Automatically accommodates varying day counts (e.g., leap years) and year rollovers.
 * @returns {Object} { start, end } in YYYY-MM-DD format
 */
export const getLastMonthBounds = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed (Jan=0, Jun=5)

  // First day of last month: passing month - 1 lets Date handle the year rollover for January
  const startDay = new Date(year, month - 1, 1);
  // Day 0 of this month cleanly lands on the last day of last month
  const endDay = new Date(year, month, 0);

  const formatISO = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    start: formatISO(startDay),
    end: formatISO(endDay)
  };
};