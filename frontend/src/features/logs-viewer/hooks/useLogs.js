import { useState, useCallback } from 'react';
import { logsApi } from '../../../api/client';

const DEFAULT_FILTERS = { level: '', module: '', since: '', limit: 200 };

export default function useLogs() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const fetchLogs = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    const params = Object.fromEntries(
      Object.entries({ ...filters, ...overrides }).filter(([, v]) => v !== '' && v !== null)
    );
    try {
      const data = await logsApi.getLogs(params);
      setEntries(data.entries);
      setTotal(data.total);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchModules = useCallback(async () => {
    try {
      const data = await logsApi.getModules();
      setModules(data.modules);
    } catch {
      // non-fatal
    }
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    entries,
    total,
    modules,
    loading,
    error,
    filters,
    fetchLogs,
    fetchModules,
    handleFilterChange,
    resetFilters,
  };
}
