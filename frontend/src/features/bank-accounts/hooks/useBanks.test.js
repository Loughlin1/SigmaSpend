import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useBanks from './useBanks';
import { banksApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  banksApi: {
    getAll: vi.fn(),
  },
}));

const MOCK_BANKS = [
  { id: 'barclays', name: 'Barclays' },
  { id: 'nationwide', name: 'Nationwide' },
];

describe('useBanks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initialises with loading=true and empty banks', () => {
    banksApi.getAll.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useBanks());
    expect(result.current.banks).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('loads banks on mount', async () => {
    banksApi.getAll.mockResolvedValueOnce(MOCK_BANKS);
    const { result } = renderHook(() => useBanks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.banks).toHaveLength(2);
    expect(result.current.banks[0].name).toBe('Barclays');
    expect(result.current.error).toBeNull();
  });

  it('sets error on API failure', async () => {
    const err = new Error('Server error');
    banksApi.getAll.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useBanks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(err);
    expect(result.current.banks).toEqual([]);
  });

  it('calls banksApi.getAll once on mount', async () => {
    banksApi.getAll.mockResolvedValueOnce([]);
    renderHook(() => useBanks());

    await waitFor(() => expect(banksApi.getAll).toHaveBeenCalledOnce());
  });
});
