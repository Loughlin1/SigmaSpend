import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LedgerRowRead from './LedgerRowRead';

const baseExpense = {
  id: 1,
  date: '01/08/2024',
  description: 'Hotel',
  amount: 120,
  is_income: false,
  account_id: 1,
  category_id: null,
};

const baseProps = {
  isChecked: false,
  onSelectRow: vi.fn(),
  displayAccountName: 'Test',
  displayCategory: { icon: '📁', name: 'Uncategorized' },
  onStartEdit: vi.fn(),
  onDelete: vi.fn(),
};

function renderRow(expenseOverrides = {}, holidays = []) {
  const expense = { ...baseExpense, ...expenseOverrides };
  return render(
    <table>
      <tbody>
        <LedgerRowRead {...baseProps} expense={expense} holidays={holidays} />
      </tbody>
    </table>
  );
}

describe('LedgerRowRead', () => {
  it('renders the assigned holiday badge with a fallback flag when the holiday is not in the holidays list', () => {
    renderRow({ holiday_id: 5, holiday_name: 'Summer Trip' }, []);
    expect(screen.getByText(/Summer Trip/)).toBeInTheDocument();
  });

  it('renders the holiday-specific flag when the assigned holiday is present in the holidays list', () => {
    renderRow(
      { holiday_id: 5, holiday_name: 'Summer Trip' },
      [{ id: 5, name: 'Summer Trip', flag: '🏖️' }]
    );
    expect(screen.getByText('🏖️ Summer Trip')).toBeInTheDocument();
  });

  it('does not render a holiday badge when no holiday is assigned', () => {
    renderRow({ holiday_id: null, holiday_name: null }, []);
    expect(screen.queryByText(/✈️/)).not.toBeInTheDocument();
  });
});
