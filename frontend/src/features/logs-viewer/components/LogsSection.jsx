import { useEffect, useState } from 'react';
import useLogs from '../hooks/useLogs';
import LogFilters from './LogFilters';
import LogTable from './LogTable';
import LogDetailSidebar from './LogDetailSidebar';
import '../../../styles/lists.css';

export default function LogsSection() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const {
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
  } = useLogs();

  useEffect(() => {
    if (!isCollapsed) {
      fetchModules();
      fetchLogs();
    }
  }, [isCollapsed, fetchModules, fetchLogs]);

  const handleReset = () => {
    resetFilters();
    fetchLogs({ level: '', module: '', since: '', limit: 200 });
  };

  return (
    <section className="sectionCard">
      <div className="account-list__header" onClick={() => setIsCollapsed(prev => !prev)}>
        <h3>Application Logs</h3>
        <button className="collapse-button" type="button">
          {isCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="headingRow" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
            {!loading && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#4a5568' }}>
                {filters.search
                  ? <>{entries.length} of {total} entries</>
                  : <>{total} entries</>}
              </p>
            )}
            <button className="inlineButton" onClick={() => fetchLogs()}>Refresh</button>
          </div>

          <LogFilters
            filters={filters}
            modules={modules}
            httpMethods={httpMethods}
            onChange={handleFilterChange}
            onSearch={() => fetchLogs()}
            onReset={handleReset}
          />

          {error && <p className="errorText">Failed to load logs: {error.message}</p>}

          {loading ? (
            <p>Loading logs...</p>
          ) : (
            <LogTable entries={entries} onSelectEntry={setSelectedEntry} />
          )}
        </>
      )}

      <LogDetailSidebar
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </section>
  );
}
