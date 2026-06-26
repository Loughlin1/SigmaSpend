import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useLogs from './useLogs';
import { logsApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  logsApi: {
    getLogs: vi.fn(),
    getModules: vi.fn(),
  },
}));

const MOCK_LOG_RESPONSE = {
  total: 3,
  entries: [
    { timestamp: '2024-01-15T10:00:00Z', level: 'INFO', module: 'sigmaspend.api', message: 'Request received', http_method: 'GET', http_path: '/api/v1/expenses/' },
    { timestamp: '2024-01-15T10:01:00Z', level: 'ERROR', module: 'sigmaspend.db', message: 'Connection failed', http_method: null, http_path: null },
    { timestamp: '2024-01-15T10:02:00Z', level: 'DEBUG', module: 'sigmaspend.api', message: 'Query executed with keyword coffee', http_method: 'POST', http_path: '/api/v1/expenses/' },
  ],
};

describe('useLogs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initialises with empty state', () => {
    const { result } = renderHook(() => useLogs());
    expect(result.current.entries).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.modules).toEqual([]);
  });

  it('fetchLogs populates entries and total on success', async () => {
    logsApi.getLogs.mockResolvedValueOnce(MOCK_LOG_RESPONSE);
    const { result } = renderHook(() => useLogs());

    await act(async () => { await result.current.fetchLogs(); });

    expect(result.current.entries).toHaveLength(3);
    expect(result.current.total).toBe(3);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchLogs strips client-only filter keys before calling API', async () => {
    logsApi.getLogs.mockResolvedValueOnce({ total: 0, entries: [] });
    const { result } = renderHook(() => useLogs());

    await act(async () => {
      await result.current.fetchLogs({ search: 'coffee', http_method: 'GET', http_path: '/api' });
    });

    const args = logsApi.getLogs.mock.calls[0][0];
    expect(args).not.toHaveProperty('search');
    expect(args).not.toHaveProperty('http_method');
    expect(args).not.toHaveProperty('http_path');
  });

  it('fetchLogs sets error on failure', async () => {
    const err = new Error('Server error');
    logsApi.getLogs.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useLogs());

    await act(async () => { await result.current.fetchLogs(); });

    expect(result.current.error).toBe(err);
  });

  it('fetchModules populates modules list', async () => {
    logsApi.getModules.mockResolvedValueOnce({ modules: ['sigmaspend.api', 'sigmaspend.db'] });
    const { result } = renderHook(() => useLogs());

    await act(async () => { await result.current.fetchModules(); });

    expect(result.current.modules).toEqual(['sigmaspend.api', 'sigmaspend.db']);
  });

  it('fetchModules does not crash when API fails', async () => {
    logsApi.getModules.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useLogs());

    await act(async () => { await result.current.fetchModules(); });

    expect(result.current.modules).toEqual([]);
  });

  it('handleFilterChange updates a single filter key', () => {
    const { result } = renderHook(() => useLogs());

    act(() => {
      result.current.handleFilterChange('level', 'ERROR');
    });

    expect(result.current.filters.level).toBe('ERROR');
  });

  it('resetFilters restores all defaults', () => {
    const { result } = renderHook(() => useLogs());

    act(() => {
      result.current.handleFilterChange('level', 'ERROR');
      result.current.handleFilterChange('search', 'coffee');
    });
    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters.level).toBe('');
    expect(result.current.filters.search).toBe('');
    expect(result.current.filters.limit).toBe(200);
  });

  it('client-side search filter excludes non-matching entries', async () => {
    logsApi.getLogs.mockResolvedValueOnce(MOCK_LOG_RESPONSE);
    const { result } = renderHook(() => useLogs());

    await act(async () => { await result.current.fetchLogs(); });
    act(() => {
      result.current.handleFilterChange('search', 'coffee');
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].message).toMatch(/coffee/);
  });

  it('client-side http_method filter excludes non-matching entries', async () => {
    logsApi.getLogs.mockResolvedValueOnce(MOCK_LOG_RESPONSE);
    const { result } = renderHook(() => useLogs());

    await act(async () => { await result.current.fetchLogs(); });
    act(() => {
      result.current.handleFilterChange('http_method', 'POST');
    });

    const methods = result.current.entries.map(e => e.http_method);
    expect(methods.every(m => m === 'POST')).toBe(true);
  });

  it('httpMethods derives unique methods from loaded entries', async () => {
    logsApi.getLogs.mockResolvedValueOnce(MOCK_LOG_RESPONSE);
    const { result } = renderHook(() => useLogs());

    await act(async () => { await result.current.fetchLogs(); });

    expect(result.current.httpMethods).toContain('GET');
    expect(result.current.httpMethods).toContain('POST');
    // null http_method should be excluded
    expect(result.current.httpMethods).not.toContain(null);
  });
});
