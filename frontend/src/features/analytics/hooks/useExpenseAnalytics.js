// src/hooks/useExpenseAnalytics.js
import { useState, useCallback } from 'react';
import { expenseApi } from '../../../api/client';

export default function useExpenseAnalytics() {
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetches aggregated chart/summary data from the backend analytics endpoint.
   * Accepts filters like account_id, category, start_date, end_date, and group_by.
   */
  const fetchSummary = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      // Clean up empty strings or null values so they don't pollute query params
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      );

      // Default grouping to 'month' if the user hasn't explicitly overridden it
      const queryParams = {
        group_by: 'month',
        ...cleanFilters
      };

      // Calls the new analytical endpoint: /api/v1/expenses/analytics/summary
      const data = await expenseApi.getSummary(queryParams);
      
      setSummaryData(data);
      setError(null);
    } catch (err) {
      console.error('Failed fetching analytics summary data', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    summaryData,
    loading,
    error,
    fetchSummary,
    setSummaryData,
  };
}