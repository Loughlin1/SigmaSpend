// src/features/budget/components/BudgetSection.jsx
import { forwardRef, useImperativeHandle, useState } from 'react';
import useBudget from '../hooks/useBudget';
import BudgetTable from './BudgetTable';
import BudgetPieChart from './BudgetPieChart';
import { getCurrentMonthBounds } from '../../../utils/calendarUtils';

const BudgetSection = forwardRef(({ categories = [], accounts = [] }, ref) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { budgets, updateBudget, actuals, loading, error, fetchActuals } = useBudget();

  const { start, end } = getCurrentMonthBounds();
  const [filters, setFilters] = useState({ account_id: '', start_date: start, end_date: end });

  useImperativeHandle(ref, () => ({
    refreshBudget: () => fetchActuals(filters),
  }));

  const handleAccountChange = (e) => {
    const next = { ...filters, account_id: e.target.value };
    setFilters(next);
    fetchActuals(next);
  };

  const parentCategories = categories.filter(c => !c.parent_id);

  return (
    <section className="sectionCard">
      <div className="account-list__header" onClick={() => setIsCollapsed(prev => !prev)}>
        <h3>Budget Planner</h3>
        <button className="collapse-button" type="button">
          {isCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="headingRow" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#4a5568' }}>
              Set monthly budget limits per category. Actuals are pulled from the current month's transactions.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {accounts.length > 0 && (
                <select
                  value={filters.account_id}
                  onChange={handleAccountChange}
                  className="chartSelect"
                  aria-label="Filter by account"
                >
                  <option value="">All Accounts</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              )}
              <button className="inlineButton" onClick={() => fetchActuals(filters)}>Refresh</button>
            </div>
          </div>

          {error && <p className="errorText">Error loading actuals: {error.message}</p>}

          {loading ? (
            <p style={{ color: '#4a5568' }}>Loading actuals…</p>
          ) : parentCategories.length === 0 ? (
            <p style={{ color: '#4a5568' }}>No categories found. Add categories first.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginTop: '1rem' }}>
              <BudgetTable
                categories={parentCategories}
                budgets={budgets}
                actuals={actuals}
                onBudgetChange={updateBudget}
              />
              <BudgetPieChart
                categories={parentCategories}
                budgets={budgets}
                actuals={actuals}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
});

BudgetSection.displayName = 'BudgetSection';
export default BudgetSection;
