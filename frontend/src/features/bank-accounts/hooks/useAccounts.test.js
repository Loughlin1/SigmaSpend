import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAccounts from './useAccounts';
import { accountsApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  accountsApi: {
    getAccounts: vi.fn(),
  },
}));

const MOCK_ACCOUNTS = [
  { id: 1, account_name: 'Current Account', bank_name: 'Barclays' },
  { id: 2, account_name: 'Savings', bank_name: 'Nationwide' },
];

describe('useAccounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initialises with loading=true and empty accounts before any fetch', () => {
    const { result } = renderHook(() => useAccounts());
    // Hook does not auto-fetch; loading starts true by design
    expect(result.current.accounts).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe('');
  });

  it('fetchAccounts populates accounts on success', async () => {
    accountsApi.getAccounts.mockResolvedValueOnce(MOCK_ACCOUNTS);
    const { result } = renderHook(() => useAccounts());

    await act(async () => { await result.current.fetchAccounts(); });

    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('fetchAccounts calls API with active_only: true', async () => {
    accountsApi.getAccounts.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useAccounts());

    await act(async () => { await result.current.fetchAccounts(); });

    expect(accountsApi.getAccounts).toHaveBeenCalledWith({ active_only: true });
  });

  it('fetchAccounts sets error message on failure', async () => {
    accountsApi.getAccounts.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useAccounts());

    await act(async () => { await result.current.fetchAccounts(); });

    expect(result.current.error).toMatch(/unable to load/i);
    expect(result.current.accounts).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('accountNameMap builds an id→name mapping', async () => {
    accountsApi.getAccounts.mockResolvedValueOnce(MOCK_ACCOUNTS);
    const { result } = renderHook(() => useAccounts());

    await act(async () => { await result.current.fetchAccounts(); });

    expect(result.current.accountNameMap[1]).toBe('Current Account');
    expect(result.current.accountNameMap[2]).toBe('Savings');
  });

  it('accountNameMap is empty when no accounts', async () => {
    accountsApi.getAccounts.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useAccounts());

    await act(async () => { await result.current.fetchAccounts(); });

    expect(result.current.accountNameMap).toEqual({});
  });

  it('setAccounts allows direct state override', async () => {
    accountsApi.getAccounts.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useAccounts());

    await act(async () => { await result.current.fetchAccounts(); });

    act(() => {
      result.current.setAccounts([{ id: 99, account_name: 'Manual' }]);
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accountNameMap[99]).toBe('Manual');
  });
});
