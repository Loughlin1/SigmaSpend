import { useState, useCallback } from 'react';

export default function useExpenseForm() {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [actionSelect, setActionSelect] = useState('none');
  const [editingExpense, setEditingExpense] = useState(null);

  const closeExpenseForm = useCallback(() => {
    setEditingExpense(null);
    setShowExpenseForm(false);
    setActionSelect('none');
  }, []);

  const openEditExpense = useCallback((expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
    setActionSelect('none');
  }, []);

  const handleActionChange = useCallback((value) => {
    setActionSelect(value);
    setShowExpenseForm(value === 'add_manual');
    if (value !== 'add_manual') {
      setEditingExpense(null);
    }
  }, []);

  return {
    showExpenseForm,
    actionSelect,
    editingExpense,
    closeExpenseForm,
    openEditExpense,
    handleActionChange,
    setShowExpenseForm,
    setEditingExpense,
  };
}
