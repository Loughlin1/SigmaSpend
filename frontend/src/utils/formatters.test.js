import { describe, it, expect } from 'vitest';
import { getAccountAbbreviation, getCategoryDisplay, formatHolidaySpend } from './formatters';

// ============================================================================
// getAccountAbbreviation
// ============================================================================

describe('getAccountAbbreviation', () => {
  it('replaces "current account" with CA', () => {
    expect(getAccountAbbreviation('Main Current Account')).toBe('Main CA');
  });

  it('replaces "credit card" with CC', () => {
    expect(getAccountAbbreviation('Monzo Credit Card')).toBe('Monzo CC');
  });

  it('is case-insensitive for replacement keywords', () => {
    expect(getAccountAbbreviation('Barclays CURRENT ACCOUNT')).toBe('Barclays CA');
  });

  it('returns the name unchanged when no known keyword matches', () => {
    expect(getAccountAbbreviation('Savings ISA')).toBe('Savings ISA');
  });

  it('returns "UNK" for null input', () => {
    expect(getAccountAbbreviation(null)).toBe('UNK');
  });

  it('returns "UNK" for undefined input', () => {
    expect(getAccountAbbreviation(undefined)).toBe('UNK');
  });

  it('returns "UNK" for non-string input', () => {
    expect(getAccountAbbreviation(42)).toBe('UNK');
  });

  it('trims trailing whitespace after replacement', () => {
    const result = getAccountAbbreviation('Main Current Account   ');
    expect(result).toBe('Main CA');
  });
});

// ============================================================================
// getCategoryDisplay
// ============================================================================

const CATEGORIES = [
  {
    id: 1,
    name: 'Food',
    icon: '🍔',
    subcategories: [
      { id: 11, name: 'Groceries' },
      { id: 12, name: 'Restaurants' },
    ],
  },
  {
    id: 2,
    name: 'Transport',
    icon: '🚗',
    subcategories: [],
  },
];

describe('getCategoryDisplay', () => {
  it('returns the correct icon and name for a top-level category', () => {
    expect(getCategoryDisplay(1, CATEGORIES)).toEqual({ icon: '🍔', name: 'Food' });
  });

  it('returns the correct name for a subcategory (inherits parent icon)', () => {
    expect(getCategoryDisplay(11, CATEGORIES)).toEqual({ icon: '🍔', name: 'Groceries' });
  });

  it('returns the correct name for another subcategory', () => {
    expect(getCategoryDisplay(12, CATEGORIES)).toEqual({ icon: '🍔', name: 'Restaurants' });
  });

  it('returns Uncategorized when the id does not match any category', () => {
    expect(getCategoryDisplay(999, CATEGORIES)).toEqual({ icon: '❓', name: 'Uncategorized' });
  });

  it('returns Uncategorized for null categoryId', () => {
    expect(getCategoryDisplay(null, CATEGORIES)).toEqual({ icon: '❓', name: 'Uncategorized' });
  });

  it('returns Uncategorized when categories list is empty', () => {
    expect(getCategoryDisplay(1, [])).toEqual({ icon: '❓', name: 'Uncategorized' });
  });

  it('falls back to the folder emoji when a category has no icon set', () => {
    const cats = [{ id: 5, name: 'Misc', icon: null, subcategories: [] }];
    expect(getCategoryDisplay(5, cats)).toEqual({ icon: '📁', name: 'Misc' });
  });
});

// ============================================================================
// formatHolidaySpend
// ============================================================================

describe('formatHolidaySpend', () => {
  it('formats a positive spend as a normal total', () => {
    expect(formatHolidaySpend(300)).toEqual({ text: '£300.00 total', isReimbursed: false });
  });

  it('formats zero as a normal total', () => {
    expect(formatHolidaySpend(0)).toEqual({ text: '£0.00 total', isReimbursed: false });
  });

  it('formats a negative net (income exceeds expenses) as reimbursed, using the absolute value', () => {
    expect(formatHolidaySpend(-300)).toEqual({ text: '£300.00 reimbursed', isReimbursed: true });
  });

  it('treats null/undefined as zero', () => {
    expect(formatHolidaySpend(null)).toEqual({ text: '£0.00 total', isReimbursed: false });
    expect(formatHolidaySpend(undefined)).toEqual({ text: '£0.00 total', isReimbursed: false });
  });
});
