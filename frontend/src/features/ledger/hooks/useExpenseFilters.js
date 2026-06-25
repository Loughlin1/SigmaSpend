// src/features/ledger/hooks/useExpenseFilters.js
import { useState, useCallback } from 'react';

const INITIAL_FILTERS = {
  category: '',
  account_id: '',
  is_income: '',
  start_date: '',
  end_date: '',
  q: '',
  min_amount: '',
  max_amount: '',
  sort_date: 'desc',
};

export default function useExpenseFilters() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const handleFilterChange = useCallback((key, value) => {
    if (key === 'reset') {
      setFilters(INITIAL_FILTERS);
    } else {
      let processedValue = value;
      
      // Parse string booleans from the <select> back into data layer values
      if (key === 'is_income') {
        if (value === 'true') processedValue = true;
        if (value === 'false') processedValue = false;
        if (value === '') processedValue = '';
      }

      setFilters((prev) => ({ ...prev, [key]: processedValue }));
    }
  }, []);

  return {
    filters,
    handleFilterChange
  };
}