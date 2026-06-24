import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BulkActionsPanel from './BulkActionsPanel';

const CATEGORIES = [
  { id: 1, name: 'Food', icon: '🍔', subcategories: [{ id: 11, name: 'Groceries' }] },
  { id: 2, name: 'Transport', icon: '🚗', subcategories: [] },
];

const baseProps = {
  selectedCount: 3,
  bulkCategory: '',
  setBulkCategory: vi.fn(),
  bulkUpdating: false,
  onBulkCategorize: vi.fn(),
  onBulkDelete: vi.fn(),
  onBulkUpdateType: vi.fn(),
  onBulkReclassify: vi.fn(),
  onBulkExport: vi.fn(),
  onClearSelection: vi.fn(),
  categories: CATEGORIES,
};

describe('BulkActionsPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(<BulkActionsPanel {...baseProps} selectedCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows transaction count in the label', () => {
    render(<BulkActionsPanel {...baseProps} />);
    expect(screen.getByText(/Selected/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('uses singular "transaction" for count of 1', () => {
    render(<BulkActionsPanel {...baseProps} selectedCount={1} />);
    expect(screen.getByText(/1/)).toBeInTheDocument();
    // "transaction" not "transactions"
    expect(screen.queryByText(/transactions/)).not.toBeInTheDocument();
  });

  it('shows the action dropdown with all options', () => {
    render(<BulkActionsPanel {...baseProps} />);
    const dropdown = screen.getByDisplayValue('Actions ▾');
    expect(dropdown).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Categorize/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Toggle Type/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Re-run Rules/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Export CSV/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Delete/ })).toBeInTheDocument();
  });

  it('reveals category select when Categorize action is chosen', () => {
    render(<BulkActionsPanel {...baseProps} />);
    fireEvent.change(screen.getByDisplayValue('Actions ▾'), { target: { value: 'categorize' } });
    expect(screen.getByRole('button', { name: 'Apply Category' })).toBeInTheDocument();
  });

  it('calls onBulkCategorize when Apply Category is clicked', () => {
    render(<BulkActionsPanel {...baseProps} />);
    fireEvent.change(screen.getByDisplayValue('Actions ▾'), { target: { value: 'categorize' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Category' }));
    expect(baseProps.onBulkCategorize).toHaveBeenCalledOnce();
  });

  it('reveals income/expense buttons when Toggle Type is chosen', () => {
    render(<BulkActionsPanel {...baseProps} />);
    fireEvent.change(screen.getByDisplayValue('Actions ▾'), { target: { value: 'type' } });
    expect(screen.getByRole('button', { name: /Mark as Expense/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark as Income/ })).toBeInTheDocument();
  });

  it('calls onBulkUpdateType(true) when Mark as Income is clicked', () => {
    render(<BulkActionsPanel {...baseProps} />);
    fireEvent.change(screen.getByDisplayValue('Actions ▾'), { target: { value: 'type' } });
    fireEvent.click(screen.getByRole('button', { name: /Mark as Income/ }));
    expect(baseProps.onBulkUpdateType).toHaveBeenCalledWith(true);
  });

  it('calls onBulkUpdateType(false) when Mark as Expense is clicked', () => {
    render(<BulkActionsPanel {...baseProps} />);
    fireEvent.change(screen.getByDisplayValue('Actions ▾'), { target: { value: 'type' } });
    fireEvent.click(screen.getByRole('button', { name: /Mark as Expense/ }));
    expect(baseProps.onBulkUpdateType).toHaveBeenCalledWith(false);
  });

  it('calls onBulkReclassify when Re-run Automation Rules is clicked', () => {
    render(<BulkActionsPanel {...baseProps} />);
    fireEvent.change(screen.getByDisplayValue('Actions ▾'), { target: { value: 'reclassify' } });
    fireEvent.click(screen.getByRole('button', { name: /Re-run Automation Rules/ }));
    expect(baseProps.onBulkReclassify).toHaveBeenCalledOnce();
  });

  it('calls onBulkExport when Export to CSV is clicked', () => {
    render(<BulkActionsPanel {...baseProps} />);
    fireEvent.change(screen.getByDisplayValue('Actions ▾'), { target: { value: 'export' } });
    fireEvent.click(screen.getByRole('button', { name: /Export to CSV/ }));
    expect(baseProps.onBulkExport).toHaveBeenCalledOnce();
  });

  it('calls onBulkDelete when Delete Selected is clicked', () => {
    render(<BulkActionsPanel {...baseProps} />);
    fireEvent.change(screen.getByDisplayValue('Actions ▾'), { target: { value: 'delete' } });
    fireEvent.click(screen.getByRole('button', { name: /Delete Selected/ }));
    expect(baseProps.onBulkDelete).toHaveBeenCalledOnce();
  });

  it('calls onClearSelection and resets action when Clear is clicked', () => {
    render(<BulkActionsPanel {...baseProps} />);
    fireEvent.change(screen.getByDisplayValue('Actions ▾'), { target: { value: 'delete' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(baseProps.onClearSelection).toHaveBeenCalledOnce();
    // Action dropdown should reset
    expect(screen.getByDisplayValue('Actions ▾')).toBeInTheDocument();
  });

  it('disables all controls when bulkUpdating is true', () => {
    render(<BulkActionsPanel {...baseProps} bulkUpdating={true} />);
    fireEvent.change(screen.getByDisplayValue('Actions ▾'), { target: { value: 'delete' } });
    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });

  it('renders category subcategories inside optgroups', () => {
    render(<BulkActionsPanel {...baseProps} />);
    fireEvent.change(screen.getByDisplayValue('Actions ▾'), { target: { value: 'categorize' } });
    const groceryOption = screen.getByRole('option', { name: /Groceries/ });
    expect(groceryOption).toBeInTheDocument();
    expect(groceryOption.closest('optgroup')).toHaveAttribute('label', expect.stringContaining('Food'));
  });
});
