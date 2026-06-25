// src/features/budget/components/BudgetSection.jsx
import { forwardRef, useImperativeHandle, useState } from 'react';
import useBudget from '../hooks/useBudget';
import BudgetTable from './BudgetTable';
import BudgetPieChart from './BudgetPieChart';
import RulesSummary from './RulesSummary';
import { getCurrentMonthBounds } from '../../../utils/calendarUtils';

const BudgetSection = forwardRef(({ categories = [], accounts = [], onCategoryUpdated, className = '' }, ref) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const {
    budgets, updateBudget,
    bucketBudgets, updateBucketBudget,
    actuals, subActuals, fetchActuals,
    monthlyIncome, updateIncome,
    updateBucket,
    loading, error,
  } = useBudget();

  const { start, end } = getCurrentMonthBounds();
  const currentMonth = start.slice(0, 7); // "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [filters, setFilters] = useState({ start_date: start, end_date: end });

  useImperativeHandle(ref, () => ({
    refreshBudget: () => fetchActuals(filters),
  }));

  const handleMonthChange = (e) => {
    const ym = e.target.value; // "YYYY-MM"
    const [year, month] = ym.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const next = {
      start_date: `${ym}-01`,
      end_date: `${ym}-${String(lastDay).padStart(2, '0')}`,
    };
    setSelectedMonth(ym);
    setFilters(next);
    fetchActuals(next);
  };

  const handleBucketChange = async (categoryId, bucket) => {
    await updateBucket(categoryId, bucket);
    if (onCategoryUpdated) onCategoryUpdated();
  };

  const parentCategories = categories.filter(c => !c.parent_id);

  // Only include actuals for bucketed items — untagged categories are excluded from budget tracking
  const bucketedActuals = {};
  const bucketedSubActuals = {};
  for (const cat of parentCategories) {
    const hasSubs = cat.subcategories?.length > 0;
    if (hasSubs) {
      // Only include subcategories that have a bucket
      for (const sub of cat.subcategories) {
        if (sub.bucket) bucketedSubActuals[sub.name] = subActuals[sub.name] || 0;
      }
    } else if (cat.bucket) {
      bucketedActuals[cat.name] = actuals[cat.name] || 0;
    }
  }

  return (
    <section className={`sectionCard ${className}`}>
      <div className="account-list__header" onClick={() => setIsCollapsed(prev => !prev)}>
        <h3>Budget Planner</h3>
        <button className="collapse-button" type="button">
          {isCollapsed ? '▸' : '▾'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="headingRow" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.875rem', color: '#4a5568', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Monthly net income (£)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 3000"
                value={monthlyIncome}
                onChange={e => updateIncome(e.target.value)}
                className="budgetInput"
                style={{ width: '140px' }}
                aria-label="Monthly net income"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="month"
                value={selectedMonth}
                onChange={handleMonthChange}
                className="inlineButton"
              />
              <button className="inlineButton" onClick={() => fetchActuals(filters)}>Refresh</button>
            </div>
          </div>

          <RulesSummary
            categories={parentCategories}
            actuals={bucketedActuals}
            subActuals={bucketedSubActuals}
            parentActuals={actuals}
            bucketBudgets={bucketBudgets}
            monthlyIncome={monthlyIncome}
          />

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
                bucketBudgets={bucketBudgets}
                actuals={actuals}
                subActuals={subActuals}
                parentActuals={actuals}
                onBudgetChange={updateBudget}
                onBucketBudgetChange={updateBucketBudget}
                onBucketChange={handleBucketChange}
              />
              <BudgetPieChart
                categories={parentCategories}
                actuals={actuals}
                subActuals={subActuals}
                bucketBudgets={bucketBudgets}
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
