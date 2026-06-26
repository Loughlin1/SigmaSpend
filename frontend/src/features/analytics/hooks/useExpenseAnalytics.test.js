import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useExpenseAnalytics from './useExpenseAnalytics';
import { expenseApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  expenseApi: {
    getSummary: vi.fn(),
  },
}));

const MOCK_SUMMARY = [
  { category_name: 'Food', net: -200, period: '2024-01' },
  { category_name: 'Transport', net: -100, period: '2024-01' },
];

describe('useExpenseAnalytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initialises with empty state', () => {
    const { result } = renderHook(() => useExpenseAnalytics());
    expect(result.current.summaryData).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchSummary sets summaryData on success', async () => {
    expenseApi.getSummary.mockResolvedValueOnce(MOCK_SUMMARY);
    const { result } = renderHook(() => useExpenseAnalytics());

    await act(async () => {
      await result.current.fetchSummary();
    });

    expect(result.current.summaryData).toEqual(MOCK_SUMMARY);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('defaults group_by to month when not specified', async () => {
    expenseApi.getSummary.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useExpenseAnalytics());

    await act(async () => {
      await result.current.fetchSummary();
    });

    expect(expenseApi.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({ group_by: 'month' })
    );
  });

  it('caller-supplied group_by overrides the default', async () => {
    expenseApi.getSummary.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useExpenseAnalytics());

    await act(async () => {
      await result.current.fetchSummary({ group_by: 'week' });
    });

    expect(expenseApi.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({ group_by: 'week' })
    );
  });

  it('strips empty and null filter values', async () => {
    expenseApi.getSummary.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useExpenseAnalytics());

    await act(async () => {
      await result.current.fetchSummary({ account_id: '', category: null, start_date: '2024-01-01' });
    });

    const args = expenseApi.getSummary.mock.calls[0][0];
    expect(args).not.toHaveProperty('account_id');
    expect(args).not.toHaveProperty('category');
    expect(args.start_date).toBe('2024-01-01');
  });

  it('sets error state on API failure', async () => {
    const err = new Error('Network error');
    expenseApi.getSummary.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useExpenseAnalytics());

    await act(async () => {
      await result.current.fetchSummary();
    });

    expect(result.current.error).toBe(err);
    expect(result.current.summaryData).toEqual([]);
  });

  it('clears previous error on successful fetch', async () => {
    expenseApi.getSummary
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(MOCK_SUMMARY);
    const { result } = renderHook(() => useExpenseAnalytics());

    await act(async () => { await result.current.fetchSummary(); });
    await act(async () => { await result.current.fetchSummary(); });

    expect(result.current.error).toBeNull();
    expect(result.current.summaryData).toEqual(MOCK_SUMMARY);
  });

  it('setSummaryData allows direct override of state', async () => {
    const { result } = renderHook(() => useExpenseAnalytics());
    act(() => {
      result.current.setSummaryData([{ category_name: 'Direct', net: -50 }]);
    });
    expect(result.current.summaryData).toHaveLength(1);
  });
});
