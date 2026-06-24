import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useExpenses from './useExpenses';
import { expenseApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  expenseApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const MOCK_ENVELOPE = {
  items: [
    { id: 1, description: 'Coffee', amount: 5.0, is_income: false, date: '01/01/2024' },
    { id: 2, description: 'Salary', amount: 3000.0, is_income: true, date: '01/01/2024' },
  ],
  total_count: 2,
  page: 1,
  limit: 50,
};

describe('useExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initialises with empty state', () => {
    const { result } = renderHook(() => useExpenses());
    expect(result.current.expenses).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.totalCount).toBe(0);
    expect(result.current.page).toBe(1);
  });

  it('fetchExpenses sets expenses and totalCount on success', async () => {
    expenseApi.getAll.mockResolvedValueOnce(MOCK_ENVELOPE);
    const { result } = renderHook(() => useExpenses());

    await act(async () => {
      await result.current.fetchExpenses();
    });

    expect(result.current.expenses).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error state when fetchExpenses throws', async () => {
    const err = new Error('Network error');
    expenseApi.getAll.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useExpenses());

    await act(async () => {
      await result.current.fetchExpenses();
    });

    expect(result.current.error).toBe(err);
    expect(result.current.expenses).toEqual([]);
  });

  it('strips empty/null filters before calling the API', async () => {
    expenseApi.getAll.mockResolvedValueOnce(MOCK_ENVELOPE);
    const { result } = renderHook(() => useExpenses());

    await act(async () => {
      await result.current.fetchExpenses({ category: '', account_id: null, start_date: '2024-01-01' });
    });

    const callArgs = expenseApi.getAll.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty('category');
    expect(callArgs).not.toHaveProperty('account_id');
    expect(callArgs.start_date).toBe('2024-01-01');
  });

  it('handles a response wrapped inside a .data envelope', async () => {
    expenseApi.getAll.mockResolvedValueOnce({ data: MOCK_ENVELOPE });
    const { result } = renderHook(() => useExpenses());

    await act(async () => {
      await result.current.fetchExpenses();
    });

    expect(result.current.expenses).toHaveLength(2);
  });

  it('falls back to empty state on malformed API response', async () => {
    expenseApi.getAll.mockResolvedValueOnce({ unexpected: 'shape' });
    const { result } = renderHook(() => useExpenses());

    await act(async () => {
      await result.current.fetchExpenses();
    });

    expect(result.current.expenses).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it('createExpense calls API and then refetches', async () => {
    expenseApi.create.mockResolvedValueOnce({});
    expenseApi.getAll.mockResolvedValueOnce(MOCK_ENVELOPE);
    const { result } = renderHook(() => useExpenses());

    await act(async () => {
      await result.current.createExpense({ description: 'New Item', amount: 10 });
    });

    expect(expenseApi.create).toHaveBeenCalledOnce();
    expect(expenseApi.getAll).toHaveBeenCalledOnce();
  });

  it('createExpense re-throws on API failure', async () => {
    const err = new Error('Server error');
    expenseApi.create.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useExpenses());

    await expect(
      act(async () => {
        await result.current.createExpense({ description: 'Bad' });
      })
    ).rejects.toThrow('Server error');
  });

  it('deleteExpense calls the API with the correct id and refetches', async () => {
    expenseApi.delete.mockResolvedValueOnce({});
    expenseApi.getAll.mockResolvedValueOnce({ items: [], total_count: 0 });
    const { result } = renderHook(() => useExpenses());

    await act(async () => {
      await result.current.deleteExpense(42);
    });

    expect(expenseApi.delete).toHaveBeenCalledWith(42);
    expect(expenseApi.getAll).toHaveBeenCalledOnce();
  });

  it('changePage updates page state and fetches', async () => {
    expenseApi.getAll.mockResolvedValueOnce(MOCK_ENVELOPE);
    const { result } = renderHook(() => useExpenses());

    await act(async () => {
      result.current.changePage(2);
    });

    await waitFor(() => {
      expect(result.current.page).toBe(2);
    });
    expect(expenseApi.getAll).toHaveBeenCalledOnce();
  });

  it('changeLimit resets to page 1 and fetches with new limit', async () => {
    expenseApi.getAll.mockResolvedValueOnce(MOCK_ENVELOPE);
    const { result } = renderHook(() => useExpenses());

    await act(async () => {
      result.current.changeLimit(100);
    });

    await waitFor(() => {
      expect(result.current.limit).toBe(100);
      expect(result.current.page).toBe(1);
    });
  });
});
