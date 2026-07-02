import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LedgerSection from './LedgerSection';
import { expenseApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  expenseApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const HOLIDAYS = [
  { id: 1, name: 'Paris', destination: 'France', flag: '🇫🇷', expense_count: 2, total_spend: 300 },
];

const EMPTY_ENVELOPE = { items: [], total_count: 0 };

function baseProps(overrides = {}) {
  return {
    accountNameMap: {},
    categories: [],
    holidays: HOLIDAYS,
    triggerGlobalRefresh: vi.fn(),
    createRuleFromTransaction: vi.fn(),
    focusRequest: null,
    ...overrides,
  };
}

describe('LedgerSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    expenseApi.getAll.mockResolvedValue(EMPTY_ENVELOPE);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('fetches expenses without a holiday filter by default', async () => {
    render(<LedgerSection {...baseProps()} />);
    await waitFor(() => expect(expenseApi.getAll).toHaveBeenCalled());
    const lastCallParams = expenseApi.getAll.mock.calls.at(-1)[0];
    expect(lastCallParams.holiday_id).toBeUndefined();
  });

  it('applies the holiday_id filter and scrolls into view when a focusRequest arrives', async () => {
    const { rerender } = render(<LedgerSection {...baseProps()} />);
    await waitFor(() => expect(expenseApi.getAll).toHaveBeenCalled());

    rerender(<LedgerSection {...baseProps({ focusRequest: { holidayId: 1, ts: Date.now() } })} />);

    await waitFor(() => {
      const lastCallParams = expenseApi.getAll.mock.calls.at(-1)[0];
      expect(lastCallParams.holiday_id).toBe('1');
    });
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('re-expands the section when a focusRequest arrives while collapsed', async () => {
    const { rerender } = render(<LedgerSection {...baseProps()} />);
    await waitFor(() => expect(expenseApi.getAll).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Transaction Ledger'));
    expect(screen.queryByTitle('Refresh transactions')).not.toBeInTheDocument();

    rerender(<LedgerSection {...baseProps({ focusRequest: { holidayId: 1, ts: Date.now() } })} />);

    await waitFor(() => expect(screen.getByTitle('Refresh transactions')).toBeInTheDocument());
  });
});
