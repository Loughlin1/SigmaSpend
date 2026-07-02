import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExpenseDetailSidebar from './ExpenseDetailSidebar';
import { expenseApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  expenseApi: { update: vi.fn() },
}));

vi.mock('../../../utils/calendarUtils', () => ({
  formatTransactionDate: (d) => d,
}));

const MOCK_EXPENSE = {
  id: 1,
  amount: 42.5,
  is_income: false,
  description: 'Coffee Shop',
  date: '15/01/2024',
  account_id: 10,
  notes: 'Morning coffee',
  category_id: null,
  category_metadata: { name: 'Food', is_subcategory: false, parent_name: null },
  transaction_hash: 'abc1234567890def',
  holiday_id: null,
};

const MOCK_HOLIDAYS = [
  { id: 1, name: 'Paris Trip', destination: 'France', flag: '🇫🇷', start_date: '2024-07-01', end_date: '2024-07-14', expense_count: 3, total_spend: 500 },
];

const ACCOUNT_MAP = { 10: 'Barclays Current' };

describe('ExpenseDetailSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no expense is provided', () => {
    const { container } = render(
      <ExpenseDetailSidebar expense={null} accountNameMap={ACCOUNT_MAP} holidays={MOCK_HOLIDAYS} onClose={vi.fn()} onUpdated={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders transaction details when expense is provided', async () => {
    render(
      <ExpenseDetailSidebar expense={MOCK_EXPENSE} accountNameMap={ACCOUNT_MAP} holidays={MOCK_HOLIDAYS} onClose={vi.fn()} onUpdated={vi.fn()} />
    );

    expect(screen.getByText('Transaction Details')).toBeInTheDocument();
    expect(screen.getByText('Coffee Shop')).toBeInTheDocument();
    expect(screen.getByText('£42.50')).toBeInTheDocument();
  });

  it('shows Expense badge for non-income transactions', async () => {
    render(
      <ExpenseDetailSidebar expense={MOCK_EXPENSE} accountNameMap={ACCOUNT_MAP} holidays={MOCK_HOLIDAYS} onClose={vi.fn()} onUpdated={vi.fn()} />
    );
    expect(screen.getByText('Expense')).toBeInTheDocument();
  });

  it('shows Income badge for income transactions', async () => {
    const income = { ...MOCK_EXPENSE, is_income: true };
    render(
      <ExpenseDetailSidebar expense={income} accountNameMap={ACCOUNT_MAP} holidays={MOCK_HOLIDAYS} onClose={vi.fn()} onUpdated={vi.fn()} />
    );
    expect(screen.getByText('Income')).toBeInTheDocument();
  });

  it('shows account name from accountNameMap', async () => {
    render(
      <ExpenseDetailSidebar expense={MOCK_EXPENSE} accountNameMap={ACCOUNT_MAP} holidays={MOCK_HOLIDAYS} onClose={vi.fn()} onUpdated={vi.fn()} />
    );
    expect(screen.getByText('Barclays Current')).toBeInTheDocument();
  });

  it('falls back to "Account N" when account not in map', async () => {
    render(
      <ExpenseDetailSidebar expense={MOCK_EXPENSE} accountNameMap={{}} holidays={MOCK_HOLIDAYS} onClose={vi.fn()} onUpdated={vi.fn()} />
    );
    expect(screen.getByText('Account 10')).toBeInTheDocument();
  });

  it('shows notes field when notes exist', async () => {
    render(
      <ExpenseDetailSidebar expense={MOCK_EXPENSE} accountNameMap={ACCOUNT_MAP} holidays={MOCK_HOLIDAYS} onClose={vi.fn()} onUpdated={vi.fn()} />
    );
    expect(screen.getByText('Morning coffee')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(
      <ExpenseDetailSidebar expense={MOCK_EXPENSE} accountNameMap={ACCOUNT_MAP} holidays={MOCK_HOLIDAYS} onClose={onClose} onUpdated={vi.fn()} />
    );
    // The close button
    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not show holiday picker for non-holiday categories', async () => {
    render(
      <ExpenseDetailSidebar expense={MOCK_EXPENSE} accountNameMap={ACCOUNT_MAP} holidays={MOCK_HOLIDAYS} onClose={vi.fn()} onUpdated={vi.fn()} />
    );
    expect(screen.queryByText('Holiday / Trip')).not.toBeInTheDocument();
  });

  it('shows holiday picker for Holidays category', async () => {
    const holidayExpense = {
      ...MOCK_EXPENSE,
      category_metadata: { name: 'Accommodation', is_subcategory: true, parent_name: 'Holidays' },
    };
    render(
      <ExpenseDetailSidebar expense={holidayExpense} accountNameMap={ACCOUNT_MAP} holidays={MOCK_HOLIDAYS} onClose={vi.fn()} onUpdated={vi.fn()} />
    );
    await waitFor(() => expect(screen.getByText('Holiday / Trip')).toBeInTheDocument());
  });

  it('shows save/discard footer when holiday selection changes', async () => {
    const holidayExpense = {
      ...MOCK_EXPENSE,
      category_metadata: { name: 'Accommodation', is_subcategory: true, parent_name: 'Holidays' },
    };
    render(
      <ExpenseDetailSidebar expense={holidayExpense} accountNameMap={ACCOUNT_MAP} holidays={MOCK_HOLIDAYS} onClose={vi.fn()} onUpdated={vi.fn()} />
    );
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
  });

  it('calls expenseApi.update when Save is clicked', async () => {
    expenseApi.update.mockResolvedValueOnce({});
    const onUpdated = vi.fn();
    const holidayExpense = {
      ...MOCK_EXPENSE,
      category_metadata: { name: 'Accommodation', is_subcategory: true, parent_name: 'Holidays' },
    };
    render(
      <ExpenseDetailSidebar expense={holidayExpense} accountNameMap={ACCOUNT_MAP} holidays={MOCK_HOLIDAYS} onClose={vi.fn()} onUpdated={onUpdated} />
    );
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(expenseApi.update).toHaveBeenCalledOnce());
    expect(onUpdated).toHaveBeenCalledOnce();
  });
});
