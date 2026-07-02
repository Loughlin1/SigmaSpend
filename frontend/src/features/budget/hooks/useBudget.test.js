import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useBudget from './useBudget';
import { expenseApi, budgetApi, bucketBudgetApi, incomeApi, categoryApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  expenseApi: { getSummary: vi.fn() },
  budgetApi: { getAll: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
  bucketBudgetApi: { getAll: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
  incomeApi: { get: vi.fn(), update: vi.fn() },
  categoryApi: { updateBucket: vi.fn() },
}));

vi.mock('../../../utils/calendarUtils', () => ({
  getLastMonthBounds: () => ({ start: '2024-01-01', end: '2024-01-31' }),
}));

describe('useBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    budgetApi.getAll.mockResolvedValue([]);
    bucketBudgetApi.getAll.mockResolvedValue([]);
    incomeApi.get.mockResolvedValue({ monthly_net_income: 0 });
    expenseApi.getSummary.mockResolvedValue([]);
  });

  it('initialises with default empty state', async () => {
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.budgets).toEqual({});
    expect(result.current.bucketBudgets).toEqual({});
    expect(result.current.monthlyIncome).toBe('');
  });

  it('fetchBudgets maps budget list to a category_id keyed object', async () => {
    budgetApi.getAll.mockResolvedValueOnce([
      { category_id: 1, amount: 200, period: 'monthly' },
    ]);
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.budgets[1]).toBeDefined());
    expect(result.current.budgets[1]).toEqual({ amount: 200, period: 'monthly' });
  });

  it('fetchBucketBudgets maps bucket list to bucket_key keyed object', async () => {
    bucketBudgetApi.getAll.mockResolvedValueOnce([
      { bucket_key: '50_needs', amount: '1500' },
    ]);
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.bucketBudgets['50_needs']).toBeDefined());
    expect(result.current.bucketBudgets['50_needs']).toBe(1500);
  });

  it('sets monthlyIncome when income > 0', async () => {
    incomeApi.get.mockResolvedValueOnce({ monthly_net_income: 3500 });
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.monthlyIncome).toBe(3500));
  });

  it('updateBudget calls budgetApi.upsert with parsed amount', async () => {
    budgetApi.upsert.mockResolvedValueOnce({});
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateBudget(1, '250', 'monthly');
    });

    expect(budgetApi.upsert).toHaveBeenCalledWith(1, { amount: 250, period: 'monthly' });
  });

  it('updateBudget deletes budget when amount is empty', async () => {
    budgetApi.delete.mockResolvedValueOnce({});
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateBudget(1, '');
    });

    expect(budgetApi.delete).toHaveBeenCalledWith(1);
  });

  it('updateBucketBudget calls bucketBudgetApi.upsert', async () => {
    bucketBudgetApi.upsert.mockResolvedValueOnce({});
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateBucketBudget('30_wants', '800');
    });

    expect(bucketBudgetApi.upsert).toHaveBeenCalledWith('30_wants', 800);
  });

  it('updateBucketBudget deletes when amount is empty', async () => {
    bucketBudgetApi.delete.mockResolvedValueOnce({});
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateBucketBudget('50_needs', '');
    });

    expect(bucketBudgetApi.delete).toHaveBeenCalledWith('50_needs');
  });

  it('updateIncome calls incomeApi.update with parsed amount', async () => {
    incomeApi.update.mockResolvedValueOnce({});
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateIncome('4000');
    });

    expect(incomeApi.update).toHaveBeenCalledWith(4000);
  });

  it('updateIncome does not call API when value is empty', async () => {
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateIncome('');
    });

    expect(incomeApi.update).not.toHaveBeenCalled();
  });

  it('updateBucket calls categoryApi.updateBucket', async () => {
    categoryApi.updateBucket.mockResolvedValueOnce({});
    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateBucket(1, '50_needs');
    });

    expect(categoryApi.updateBucket).toHaveBeenCalledWith(1, '50_needs');
  });

  it('fetchActuals calls getSummary and populates actuals map', async () => {
    // The hook auto-fetches on mount (first call returns []), then we call again
    expenseApi.getSummary
      .mockResolvedValueOnce([])  // mount auto-fetch
      .mockResolvedValueOnce([{ type: 'category', category_name: 'Food', net: '-200' }]);

    const { result } = renderHook(() => useBudget());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchActuals();
    });

    expect(result.current.actuals['Food']).toBe(200);
  });
});
