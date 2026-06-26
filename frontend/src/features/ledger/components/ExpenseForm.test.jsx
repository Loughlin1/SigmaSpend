import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExpenseForm from './ExpenseForm';

const CATEGORIES = [
  {
    id: 1, name: 'Food', icon: '🍔',
    subcategories: [{ id: 11, name: 'Groceries' }],
  },
  {
    id: 2, name: 'Transport', icon: '🚗',
    subcategories: [],
  },
];

const ACCOUNT_MAP = { 5: 'Barclays', 6: 'Nationwide' };

const baseProps = {
  categories: CATEGORIES,
  accountNameMap: ACCOUNT_MAP,
  onExpenseAdded: vi.fn(),
  onExpenseSaved: vi.fn(),
  onCancel: vi.fn(),
  initialData: null,
};

describe('ExpenseForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders "Add Manual Transaction" heading when no initialData', () => {
    render(<ExpenseForm {...baseProps} />);
    expect(screen.getByText('Add Manual Transaction')).toBeInTheDocument();
  });

  it('renders "Edit Transaction" heading when initialData is provided', () => {
    const initialData = {
      id: 1, amount: 20, description: 'Lunch', date: '2024-01-15',
      is_income: false, category: 'Food', notes: '', account_id: '5',
    };
    render(<ExpenseForm {...baseProps} initialData={initialData} />);
    expect(screen.getByText('Edit Transaction')).toBeInTheDocument();
  });

  it('pre-fills fields from initialData', () => {
    const initialData = {
      id: 1, amount: 99.99, description: 'Rent', date: '2024-03-01',
      is_income: false, category: 'Food', notes: 'Monthly rent', account_id: '5',
    };
    render(<ExpenseForm {...baseProps} initialData={initialData} />);
    expect(screen.getByDisplayValue('Rent')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Monthly rent')).toBeInTheDocument();
    expect(screen.getByDisplayValue('99.99')).toBeInTheDocument();
  });

  it('renders Cancel and Save Transaction buttons', () => {
    render(<ExpenseForm {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Transaction' })).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<ExpenseForm {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(baseProps.onCancel).toHaveBeenCalledOnce();
  });

  it('renders category options including subcategories', () => {
    render(<ExpenseForm {...baseProps} />);
    expect(screen.getByRole('option', { name: /Food/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Groceries/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Transport/i })).toBeInTheDocument();
  });

  it('renders account options from accountNameMap', () => {
    render(<ExpenseForm {...baseProps} />);
    expect(screen.getByRole('option', { name: 'Barclays' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Nationwide' })).toBeInTheDocument();
  });

  it('calls onExpenseAdded with parsed payload on submit (new expense)', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm {...baseProps} />);

    await user.type(screen.getByPlaceholderText('Description'), 'Coffee');
    await user.type(screen.getByPlaceholderText('Amount'), '4.50');
    await user.selectOptions(screen.getByDisplayValue('Select Target Account'), '5');

    fireEvent.submit(screen.getByRole('button', { name: 'Save Transaction' }).closest('form'));

    expect(baseProps.onExpenseAdded).toHaveBeenCalledOnce();
    const payload = baseProps.onExpenseAdded.mock.calls[0][0];
    expect(payload.description).toBe('Coffee');
    expect(payload.amount).toBe(4.5);
    expect(payload.account_id).toBe('5');
  });

  it('calls onExpenseSaved with id when editing an existing expense', async () => {
    const user = userEvent.setup();
    const initialData = {
      id: 7, amount: 10, description: 'Old Desc', date: '2024-01-15',
      is_income: false, category: 'Food', notes: '', account_id: '5',
    };
    render(<ExpenseForm {...baseProps} initialData={initialData} />);

    // Change description
    const descInput = screen.getByDisplayValue('Old Desc');
    await user.clear(descInput);
    await user.type(descInput, 'New Desc');

    fireEvent.submit(screen.getByRole('button', { name: 'Save Transaction' }).closest('form'));

    expect(baseProps.onExpenseSaved).toHaveBeenCalledOnce();
    const payload = baseProps.onExpenseSaved.mock.calls[0][0];
    expect(payload.id).toBe(7);
    expect(payload.description).toBe('New Desc');
  });

  it('defaults is_income to Expense', () => {
    render(<ExpenseForm {...baseProps} />);
    const select = screen.getByDisplayValue('Expense');
    expect(select).toBeInTheDocument();
  });
});
