import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useExpenseFilters from './useExpenseFilters';

describe('useExpenseFilters', () => {
  it('initialises with all default filter values', () => {
    const { result } = renderHook(() => useExpenseFilters());
    expect(result.current.filters.category).toBe('');
    expect(result.current.filters.account_id).toBe('');
    expect(result.current.filters.is_income).toBe('');
    expect(result.current.filters.start_date).toBe('');
    expect(result.current.filters.end_date).toBe('');
    expect(result.current.filters.q).toBe('');
    expect(result.current.filters.min_amount).toBe('');
    expect(result.current.filters.max_amount).toBe('');
    expect(result.current.filters.sort_date).toBe('desc');
  });

  it('handleFilterChange updates a string filter', () => {
    const { result } = renderHook(() => useExpenseFilters());
    act(() => {
      result.current.handleFilterChange('category', 'Food');
    });
    expect(result.current.filters.category).toBe('Food');
  });

  it('handleFilterChange updates start_date', () => {
    const { result } = renderHook(() => useExpenseFilters());
    act(() => {
      result.current.handleFilterChange('start_date', '2024-01-01');
    });
    expect(result.current.filters.start_date).toBe('2024-01-01');
  });

  it('converts is_income "true" string to boolean true', () => {
    const { result } = renderHook(() => useExpenseFilters());
    act(() => {
      result.current.handleFilterChange('is_income', 'true');
    });
    expect(result.current.filters.is_income).toBe(true);
  });

  it('converts is_income "false" string to boolean false', () => {
    const { result } = renderHook(() => useExpenseFilters());
    act(() => {
      result.current.handleFilterChange('is_income', 'false');
    });
    expect(result.current.filters.is_income).toBe(false);
  });

  it('converts is_income empty string to empty string (all)', () => {
    const { result } = renderHook(() => useExpenseFilters());
    act(() => {
      result.current.handleFilterChange('is_income', 'true');
    });
    act(() => {
      result.current.handleFilterChange('is_income', '');
    });
    expect(result.current.filters.is_income).toBe('');
  });

  it('resets all filters when key is "reset"', () => {
    const { result } = renderHook(() => useExpenseFilters());

    act(() => {
      result.current.handleFilterChange('category', 'Food');
      result.current.handleFilterChange('start_date', '2024-01-01');
    });
    act(() => {
      result.current.handleFilterChange('reset', null);
    });

    expect(result.current.filters.category).toBe('');
    expect(result.current.filters.start_date).toBe('');
    expect(result.current.filters.sort_date).toBe('desc');
  });

  it('preserves other filters when updating one field', () => {
    const { result } = renderHook(() => useExpenseFilters());
    act(() => {
      result.current.handleFilterChange('category', 'Transport');
      result.current.handleFilterChange('q', 'coffee');
    });
    expect(result.current.filters.category).toBe('Transport');
    expect(result.current.filters.q).toBe('coffee');
  });
});
