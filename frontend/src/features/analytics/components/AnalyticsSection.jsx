// src/features/analytics/components/AnalyticsSection.jsx
import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import AnalyticsFilters from './AnalyticsFilters';
import ExpenseChart from './ExpenseChart';
import useExpenseAnalytics from '../hooks/useExpenseAnalytics';
import { getCurrentMonthBounds } from '../../../utils/calendarUtils'

const AnalyticsSection = forwardRef(({ accounts, className = '' }, ref) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { summaryData, loading: analyticsLoading, error: analyticsError, fetchSummary } = useExpenseAnalytics();
  
  const { start: defaultStart, end: defaultEnd } = getCurrentMonthBounds();

  // Isolate chart-specific filters to this feature context
  const [chartFilters, setChartFilters] = useState({
    group_by: 'month',
    start_date: defaultStart, 
    end_date: defaultEnd,
    account_id: ''
  });

  // Automatically react to local filter modifications
  useEffect(() => {
    fetchSummary(chartFilters);
  }, [fetchSummary, chartFilters]);

  // Expose an explicit refresh capability up to App.jsx
  useImperativeHandle(ref, () => ({
    refreshAnalytics: () => {
      fetchSummary(chartFilters);
    }
  }));

  return (
    <section className={`sectionCard ${className}`}>
      <div className="account-list__header" onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: 'pointer' }}>
        <h2 style={{ margin: 0 }}>Financial Summaries</h2>
        <button className="collapse-button">{isCollapsed ? '▸' : '▾'}</button>
      </div>

      {!isCollapsed && (
        <>
          <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <AnalyticsFilters
              chartFilters={chartFilters}
              onFilterChange={setChartFilters}
              accounts={accounts}
            />
          </div>

          {analyticsError && <p className="errorText">Error loading aggregations: {analyticsError.message}</p>}

          <ExpenseChart
            expenses={summaryData}
            accounts={accounts}
            loading={analyticsLoading}
          />
        </>
      )}
    </section>
  );
});

export default AnalyticsSection;