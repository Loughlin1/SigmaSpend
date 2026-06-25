import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatTransactionDate,
  getGoogleCalendarDayUrl,
  getGmailReceiptSearchUrl,
  getCurrentMonthBounds,
} from './calendarUtils';

// ============================================================================
// formatTransactionDate
// ============================================================================

describe('formatTransactionDate', () => {
  it('formats an ISO YYYY-MM-DD date to UK short format', () => {
    expect(formatTransactionDate('2024-06-15')).toBe('Sat, 15 Jun 2024');
  });

  it('formats a YYYY/MM/DD date', () => {
    expect(formatTransactionDate('2024/06/15')).toBe('Sat, 15 Jun 2024');
  });

  it('formats a DD/MM/YYYY date', () => {
    expect(formatTransactionDate('15/06/2024')).toBe('Sat, 15 Jun 2024');
  });

  it('formats a DD-MM-YYYY date', () => {
    expect(formatTransactionDate('15-06-2024')).toBe('Sat, 15 Jun 2024');
  });

  it('returns empty string for null input', () => {
    expect(formatTransactionDate(null)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(formatTransactionDate(undefined)).toBe('');
  });

  it('returns "Invalid Date" for a nonsense string', () => {
    expect(formatTransactionDate('not-a-date')).toBe('Invalid Date');
  });

  it('handles first day of year correctly', () => {
    expect(formatTransactionDate('2024-01-01')).toBe('Mon, 1 Jan 2024');
  });

  it('handles last day of year correctly', () => {
    expect(formatTransactionDate('2024-12-31')).toBe('Tue, 31 Dec 2024');
  });
});

// ============================================================================
// getGoogleCalendarDayUrl
// ============================================================================

describe('getGoogleCalendarDayUrl', () => {
  it('opens 4-day view with transaction as 3rd day (ISO YYYY-MM-DD)', () => {
    // 2024-06-15 minus 2 days = 2024-06-13 (start), transaction on day 3
    expect(getGoogleCalendarDayUrl('2024-06-15')).toBe(
      'https://calendar.google.com/calendar/r/customday/2024/06/13?dur=4'
    );
  });

  it('builds the correct URL from a YYYY/MM/DD date', () => {
    expect(getGoogleCalendarDayUrl('2024/06/15')).toBe(
      'https://calendar.google.com/calendar/r/customday/2024/06/13?dur=4'
    );
  });

  it('builds the correct URL from a DD/MM/YYYY date', () => {
    expect(getGoogleCalendarDayUrl('15/06/2024')).toBe(
      'https://calendar.google.com/calendar/r/customday/2024/06/13?dur=4'
    );
  });

  it('pads single-digit months and days', () => {
    // 2024-01-03 minus 2 days = 2024-01-01
    expect(getGoogleCalendarDayUrl('2024-01-03')).toBe(
      'https://calendar.google.com/calendar/r/customday/2024/01/01?dur=4'
    );
  });

  it('rolls back across a month boundary correctly', () => {
    // 2024-06-01 minus 2 days = 2024-05-30
    expect(getGoogleCalendarDayUrl('2024-06-01')).toBe(
      'https://calendar.google.com/calendar/r/customday/2024/05/30?dur=4'
    );
  });

  it('returns "#" for null input', () => {
    expect(getGoogleCalendarDayUrl(null)).toBe('#');
  });

  it('returns "#" for an unparseable string', () => {
    expect(getGoogleCalendarDayUrl('garbage')).toBe('#');
  });
});

// ============================================================================
// getGmailReceiptSearchUrl
// ============================================================================

describe('getGmailReceiptSearchUrl', () => {
  it('returns a Gmail search URL containing the description and date window', () => {
    const url = getGmailReceiptSearchUrl('2024-06-15', 'Starbucks Coffee');
    expect(url).toContain('https://mail.google.com/mail/#search/');
    expect(url).toContain('Starbucks');
    // after: 3 days before = 2024/06/12, before: 4 days after = 2024/06/19
    expect(url).toContain('after%3A2024%2F06%2F12');
    expect(url).toContain('before%3A2024%2F06%2F19');
  });

  it('handles DD/MM/YYYY format', () => {
    const url = getGmailReceiptSearchUrl('15/06/2024', 'Netflix');
    expect(url).toContain('Netflix');
    expect(url).toContain('after%3A2024%2F06%2F12');
  });

  it('uses only the first two words of a long description', () => {
    const url = getGmailReceiptSearchUrl('2024-06-15', 'Amazon Marketplace GB London');
    expect(url).toContain('Amazon%20Marketplace');
    expect(url).not.toContain('GB');
  });

  it('returns "#" for null date', () => {
    expect(getGmailReceiptSearchUrl(null, 'Tesco')).toBe('#');
  });

  it('returns "#" for unparseable date', () => {
    expect(getGmailReceiptSearchUrl('garbage', 'Tesco')).toBe('#');
  });
});

// ============================================================================
// getCurrentMonthBounds
// ============================================================================

describe('getCurrentMonthBounds', () => {
  beforeEach(() => {
    // Fix time to 15 June 2024
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the first day of the current month as start', () => {
    expect(getCurrentMonthBounds().start).toBe('2024-06-01');
  });

  it('returns the last day of the current month as end', () => {
    expect(getCurrentMonthBounds().end).toBe('2024-06-30');
  });

  it('handles February in a leap year correctly', () => {
    vi.setSystemTime(new Date('2024-02-10'));
    const { start, end } = getCurrentMonthBounds();
    expect(start).toBe('2024-02-01');
    expect(end).toBe('2024-02-29');
  });

  it('handles December correctly', () => {
    vi.setSystemTime(new Date('2024-12-01'));
    const { start, end } = getCurrentMonthBounds();
    expect(start).toBe('2024-12-01');
    expect(end).toBe('2024-12-31');
  });
});
