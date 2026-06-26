import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useExpenseForm from './useExpenseForm';

describe('useExpenseForm', () => {
  it('initialises with form hidden and no editing expense', () => {
    const { result } = renderHook(() => useExpenseForm());
    expect(result.current.showExpenseForm).toBe(false);
    expect(result.current.actionSelect).toBe('none');
    expect(result.current.editingExpense).toBeNull();
  });

  it('openEditExpense shows form and sets editingExpense', () => {
    const { result } = renderHook(() => useExpenseForm());
    const expense = { id: 1, description: 'Coffee', amount: 5 };

    act(() => {
      result.current.openEditExpense(expense);
    });

    expect(result.current.showExpenseForm).toBe(true);
    expect(result.current.editingExpense).toEqual(expense);
    expect(result.current.actionSelect).toBe('none');
  });

  it('closeExpenseForm hides form and clears editing state', () => {
    const { result } = renderHook(() => useExpenseForm());

    act(() => {
      result.current.openEditExpense({ id: 1, description: 'Coffee' });
    });
    act(() => {
      result.current.closeExpenseForm();
    });

    expect(result.current.showExpenseForm).toBe(false);
    expect(result.current.editingExpense).toBeNull();
    expect(result.current.actionSelect).toBe('none');
  });

  it('handleActionChange with add_manual shows the form', () => {
    const { result } = renderHook(() => useExpenseForm());

    act(() => {
      result.current.handleActionChange('add_manual');
    });

    expect(result.current.actionSelect).toBe('add_manual');
    expect(result.current.showExpenseForm).toBe(true);
  });

  it('handleActionChange with other value hides form and clears editingExpense', () => {
    const { result } = renderHook(() => useExpenseForm());

    act(() => {
      result.current.openEditExpense({ id: 2, description: 'Lunch' });
    });
    act(() => {
      result.current.handleActionChange('upload');
    });

    expect(result.current.showExpenseForm).toBe(false);
    expect(result.current.editingExpense).toBeNull();
    expect(result.current.actionSelect).toBe('upload');
  });

  it('setShowExpenseForm can directly control form visibility', () => {
    const { result } = renderHook(() => useExpenseForm());

    act(() => {
      result.current.setShowExpenseForm(true);
    });

    expect(result.current.showExpenseForm).toBe(true);
  });

  it('setEditingExpense can directly set the editing expense', () => {
    const { result } = renderHook(() => useExpenseForm());
    const expense = { id: 5, description: 'Direct set' };

    act(() => {
      result.current.setEditingExpense(expense);
    });

    expect(result.current.editingExpense).toEqual(expense);
  });
});
