import { useState, useCallback, useMemo } from 'react';
import { logsApi } from '../../../api/client';

const DEFAULT_FILTERS = {
  level: '',
  module: '',
  since: '',
  limit: 200,
  search: '',
  http_method: '',
  http_path: '',
};

function matchesEntry(entry, filters) {
  const { search, http_method, http_path } = filters;

  if (http_method && entry.http_method !== http_method) return false;

  if (http_path) {
    const pathLower = (entry.http_path || '').toLowerCase();
    if (!pathLower.includes(http_path.toLowerCase())) return false;
  }

  if (search) {
    const term = search.toLowerCase();
    const inMessage = (entry.message || '').toLowerCase().includes(term);
    const inPath = (entry.http_path || '').toLowerCase().includes(term);
    let inPayload = false;
    if (entry.payload != null) {
      try { inPayload = JSON.stringify(entry.payload).toLowerCase().includes(term); } catch { /* skip */ }
    }
    if (!inMessage && !inPath && !inPayload) return false;
  }

  return true;
}

export default function useLogs() {
  const [rawEntries, setRawEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const fetchLogs = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    // Strip client-only keys before sending to the API
    const { search: _s, http_method: _m, http_path: _p, ...serverFilters } = { ...filters, ...overrides };
    const params = Object.fromEntries(
      Object.entries(serverFilters).filter(([, v]) => v !== '' && v !== null)
    );
    try {
      const data = await logsApi.getLogs(params);
      setRawEntries(data.entries);
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
    } catch { /* non-fatal */ }
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Client-side filtered view
  const entries = useMemo(
    () => rawEntries.filter(e => matchesEntry(e, filters)),
    [rawEntries, filters],
  );

  // Derive available HTTP methods from loaded entries for the filter dropdown
  const httpMethods = useMemo(
    () => [...new Set(rawEntries.map(e => e.http_method).filter(Boolean))].sort(),
    [rawEntries],
  );

  return {
    entries,
    total,
    modules,
    httpMethods,
    loading,
    error,
    filters,
    fetchLogs,
    fetchModules,
    handleFilterChange,
    resetFilters,
  };
}
