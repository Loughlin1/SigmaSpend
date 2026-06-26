import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCategories from './useCategories';
import { categoryApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  categoryApi: {
    getAll: vi.fn(),
    create: vi.fn(),
  },
}));

const MOCK_CATEGORIES = [
  { id: 1, name: 'Food', icon: '🍔', subcategories: [{ id: 11, name: 'Groceries' }] },
  { id: 2, name: 'Transport', icon: '🚗', subcategories: [] },
];

describe('useCategories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initialises with empty categories and loading=false', () => {
    const { result } = renderHook(() => useCategories());
    expect(result.current.categories).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('fetchCategories populates categories on success', async () => {
    categoryApi.getAll.mockResolvedValueOnce(MOCK_CATEGORIES);
    const { result } = renderHook(() => useCategories());

    await act(async () => { await result.current.fetchCategories(); });

    expect(result.current.categories).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });

  it('fetchCategories does not throw on API error', async () => {
    categoryApi.getAll.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useCategories());

    await act(async () => { await result.current.fetchCategories(); });

    expect(result.current.categories).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('createCategory calls API then refetches', async () => {
    categoryApi.create.mockResolvedValueOnce({});
    categoryApi.getAll.mockResolvedValueOnce(MOCK_CATEGORIES);
    const { result } = renderHook(() => useCategories());

    await act(async () => { await result.current.createCategory('Clothing'); });

    expect(categoryApi.create).toHaveBeenCalledWith({ name: 'Clothing', parent_id: null });
    expect(categoryApi.getAll).toHaveBeenCalledOnce();
  });

  it('createCategory passes parent_id when provided', async () => {
    categoryApi.create.mockResolvedValueOnce({});
    categoryApi.getAll.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useCategories());

    await act(async () => { await result.current.createCategory('Shirts', 5); });

    expect(categoryApi.create).toHaveBeenCalledWith({ name: 'Shirts', parent_id: 5 });
  });

  it('createCategory re-throws on failure', async () => {
    categoryApi.create.mockRejectedValueOnce(new Error('Conflict'));
    const { result } = renderHook(() => useCategories());

    await expect(
      act(async () => { await result.current.createCategory('Bad'); })
    ).rejects.toThrow('Conflict');
  });
});
