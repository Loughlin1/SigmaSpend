import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useHolidays from './useHolidays';
import { holidaysApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  holidaysApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const MOCK_HOLIDAYS = [
  { id: 1, name: 'Paris', destination: 'France', flag: '🇫🇷', expense_count: 3, total_spend: 450 },
  { id: 2, name: 'Rome', destination: 'Italy', flag: '🇮🇹', expense_count: 0, total_spend: 0 },
];

describe('useHolidays', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initialises with empty holidays after mount', async () => {
    holidaysApi.getAll.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useHolidays());
    // Hook triggers fetchHolidays on mount, wait for it to settle
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches holidays on mount', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(MOCK_HOLIDAYS);
    const { result } = renderHook(() => useHolidays());

    await waitFor(() => expect(result.current.holidays).toHaveLength(2));

    expect(result.current.error).toBeNull();
  });

  it('sets error on mount failure', async () => {
    const err = new Error('Network error');
    holidaysApi.getAll.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useHolidays());

    await waitFor(() => expect(result.current.error).toBe(err));
  });

  it('fetchHolidays reloads data', async () => {
    holidaysApi.getAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(MOCK_HOLIDAYS);
    const { result } = renderHook(() => useHolidays());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.fetchHolidays(); });

    expect(result.current.holidays).toHaveLength(2);
  });

  it('createHoliday prepends new holiday to list', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(MOCK_HOLIDAYS);
    const newHoliday = { id: 3, name: 'Tokyo', destination: 'Japan', flag: '🇯🇵', expense_count: 0, total_spend: 0 };
    holidaysApi.create.mockResolvedValueOnce(newHoliday);
    const { result } = renderHook(() => useHolidays());

    await waitFor(() => expect(result.current.holidays).toHaveLength(2));

    await act(async () => {
      await result.current.createHoliday({ name: 'Tokyo', destination: 'Japan' });
    });

    expect(result.current.holidays[0].name).toBe('Tokyo');
    expect(result.current.holidays).toHaveLength(3);
  });

  it('createHoliday returns the created holiday', async () => {
    holidaysApi.getAll.mockResolvedValueOnce([]);
    const newHoliday = { id: 10, name: 'Berlin', flag: '🇩🇪', expense_count: 0, total_spend: 0 };
    holidaysApi.create.mockResolvedValueOnce(newHoliday);
    const { result } = renderHook(() => useHolidays());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created;
    await act(async () => {
      created = await result.current.createHoliday({ name: 'Berlin' });
    });

    expect(created).toEqual(newHoliday);
  });

  it('updateHoliday replaces the matching holiday in state', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(MOCK_HOLIDAYS);
    const updated = { ...MOCK_HOLIDAYS[0], name: 'Paris Updated' };
    holidaysApi.update.mockResolvedValueOnce(updated);
    const { result } = renderHook(() => useHolidays());

    await waitFor(() => expect(result.current.holidays).toHaveLength(2));

    await act(async () => {
      await result.current.updateHoliday(1, { name: 'Paris Updated' });
    });

    expect(result.current.holidays[0].name).toBe('Paris Updated');
    expect(result.current.holidays).toHaveLength(2);
  });

  it('deleteHoliday removes the holiday from state', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(MOCK_HOLIDAYS);
    holidaysApi.delete.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useHolidays());

    await waitFor(() => expect(result.current.holidays).toHaveLength(2));

    await act(async () => {
      await result.current.deleteHoliday(1);
    });

    expect(result.current.holidays).toHaveLength(1);
    expect(result.current.holidays[0].id).toBe(2);
  });
});
