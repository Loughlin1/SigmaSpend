import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useRules from './useRules';
import { rulesApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  rulesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

const MOCK_RESPONSE = {
  items: [
    { id: 1, keyword: 'coffee', category_id: 2, match_field: 'description' },
    { id: 2, keyword: 'tesco', category_id: 3, match_field: 'description' },
  ],
  page: 1,
  pages: 2,
  total: 12,
};

describe('useRules', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initialises with empty state', () => {
    const { result } = renderHook(() => useRules());
    expect(result.current.rules).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.pagination).toEqual({ page: 1, pages: 1, total: 0 });
  });

  it('fetchRules populates rules and pagination', async () => {
    rulesApi.getAll.mockResolvedValueOnce(MOCK_RESPONSE);
    const { result } = renderHook(() => useRules());

    await act(async () => { await result.current.fetchRules(); });

    expect(result.current.rules).toHaveLength(2);
    expect(result.current.pagination.total).toBe(12);
    expect(result.current.pagination.pages).toBe(2);
    expect(result.current.loading).toBe(false);
  });

  it('fetchRules with search term passes q param', async () => {
    rulesApi.getAll.mockResolvedValueOnce({ items: [], page: 1, pages: 1, total: 0 });
    const { result } = renderHook(() => useRules());

    await act(async () => { await result.current.fetchRules('coffee', 1); });

    expect(rulesApi.getAll).toHaveBeenCalledWith(expect.objectContaining({ q: 'coffee' }));
  });

  it('fetchRules without search term omits q param', async () => {
    rulesApi.getAll.mockResolvedValueOnce({ items: [], page: 1, pages: 1, total: 0 });
    const { result } = renderHook(() => useRules());

    await act(async () => { await result.current.fetchRules('', 1); });

    const args = rulesApi.getAll.mock.calls[0][0];
    expect(args).not.toHaveProperty('q');
  });

  it('fetchRules sets error string on failure', async () => {
    rulesApi.getAll.mockRejectedValueOnce({ message: 'Server down' });
    const { result } = renderHook(() => useRules());

    await act(async () => { await result.current.fetchRules(); });

    expect(result.current.error).toBe('Server down');
    expect(result.current.loading).toBe(false);
  });

  it('createRule calls API and refetches from page 1', async () => {
    rulesApi.create.mockResolvedValueOnce({});
    rulesApi.getAll.mockResolvedValueOnce(MOCK_RESPONSE);
    const { result } = renderHook(() => useRules());

    await act(async () => {
      await result.current.createRule({ keyword: 'gym', category_id: 5, match_field: 'description' });
    });

    expect(rulesApi.create).toHaveBeenCalledOnce();
    expect(rulesApi.getAll).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });

  it('createRule re-throws on failure', async () => {
    rulesApi.create.mockRejectedValueOnce(new Error('Bad request'));
    const { result } = renderHook(() => useRules());

    await expect(
      act(async () => { await result.current.createRule({}); })
    ).rejects.toThrow();
  });

  it('deleteRule calls API with correct id and refetches', async () => {
    rulesApi.delete.mockResolvedValueOnce({});
    rulesApi.getAll.mockResolvedValueOnce({ items: [], page: 1, pages: 1, total: 0 });
    const { result } = renderHook(() => useRules());

    await act(async () => { await result.current.deleteRule(42); });

    expect(rulesApi.delete).toHaveBeenCalledWith(42);
    expect(rulesApi.getAll).toHaveBeenCalledOnce();
  });

  it('createRuleFromTransaction cleans keywords and calls createRule', async () => {
    rulesApi.create.mockResolvedValueOnce({});
    rulesApi.getAll.mockResolvedValueOnce({ items: [], page: 1, pages: 1, total: 0 });
    const { result } = renderHook(() => useRules());

    await act(async () => {
      await result.current.createRuleFromTransaction({
        keyword: 'TESCO 12345 01/01',
        match_field: 'description',
        category_id: 3,
      });
    });

    const createArg = rulesApi.create.mock.calls[0][0];
    expect(createArg.keyword).not.toMatch(/\d{5}/);
    expect(createArg.keyword.length).toBeGreaterThanOrEqual(3);
  });

  it('createRuleFromTransaction does nothing when keyword is empty', async () => {
    const { result } = renderHook(() => useRules());

    await act(async () => {
      await result.current.createRuleFromTransaction({ keyword: '', category_id: 1, match_field: 'description' });
    });

    expect(rulesApi.create).not.toHaveBeenCalled();
  });

  it('createRuleFromTransaction does nothing when cleaned keyword is too short', async () => {
    const { result } = renderHook(() => useRules());

    await act(async () => {
      await result.current.createRuleFromTransaction({ keyword: '12345', category_id: 1, match_field: 'description' });
    });

    expect(rulesApi.create).not.toHaveBeenCalled();
  });
});
