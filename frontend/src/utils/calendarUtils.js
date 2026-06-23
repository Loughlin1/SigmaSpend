// src/utils/calendarUtils.js

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
 * Generates a zero-auth deep link to open Google Calendar on a specific day.
 * Supports various formats: "23/06/2026", "2026/06/23", "2026-06-23", etc.
 * @param {string} dateStr 
 * @returns {string} - Deep link URL
 */
export const getGoogleCalendarDayUrl = (dateStr) => {
  if (!dateStr) return "#";

  let year, month, day;
  const cleanStr = String(dateStr).trim();

  // 1. Handle DD/MM/YYYY or DD-MM-YYYY format (Clean UK format)
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(cleanStr)) {
    const parts = cleanStr.split(/[-/]/);
    day = parts[0].padStart(2, '0');
    month = parts[1].padStart(2, '0');
    year = parts[2];
  } 
  // 2. Handle YYYY/MM/DD or YYYY-MM-DD format (Standard ISO / Variant formats)
  else if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(cleanStr)) {
    const parts = cleanStr.split(/[-/]/);
    year = parts[0];
    month = parts[1].padStart(2, '0');
    day = parts[2].padStart(2, '0');
  } 
  // 3. Fallback: Parse natively if it's already an ISO timestamp
  else {
    const fallbackDate = new Date(cleanStr);
    if (isNaN(fallbackDate.getTime())) {
      console.error(`[SigmaSpend] Unable to parse URL date: "${dateStr}"`);
      return "#";
    }
    year = fallbackDate.getFullYear();
    month = String(fallbackDate.getMonth() + 1).padStart(2, '0');
    day = String(fallbackDate.getDate()).padStart(2, '0');
  }

  // Returns the clean, formatted Google Calendar Day View url safely
  return `https://calendar.google.com/calendar/r/day/${year}/${month}/${day}`;
};