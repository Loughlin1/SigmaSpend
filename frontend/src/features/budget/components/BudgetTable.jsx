// src/features/budget/components/BudgetTable.jsx
import '../../../styles/budget.css';

const BUCKETS = [
  { key: '50_needs',   label: '🏠 Needs',   pct: '60%', colour: '#3182ce', bg: '#ebf8ff', border: '#bee3f8' },
  { key: '30_wants',   label: '🎉 Wants',   pct: '30%', colour: '#d69e2e', bg: '#fffff0', border: '#faf089' },
  { key: '20_savings', label: '💰 Savings', pct: '10%', colour: '#38a169', bg: '#f0fff4', border: '#c6f6d5' },
];

const BUCKET_OPTIONS = [
  { value: '',          label: '— untagged —' },
  { value: '50_needs',  label: '🏠 Needs (60%)' },
  { value: '30_wants',  label: '🎉 Wants (30%)' },
  { value: '20_savings',label: '💰 Savings (10%)' },
];

function getStatus(actual, budget) {
  if (!budget) return null;
  const pct = actual / budget;
  if (pct >= 1) return 'over';
  if (pct >= 0.8) return 'warning';
  return 'safe';
}

function StatusBadge({ status }) {
  if (!status) return <span className="budgetBadge budgetBadge--none">No limit</span>;
  const labels = { safe: 'On track', warning: 'Approaching', over: 'Over budget' };
  return <span className={`budgetBadge budgetBadge--${status}`}>{labels[status]}</span>;
}

function ProgressBar({ actual, budget }) {
  if (!budget) return null;
  const pct = Math.min((actual / budget) * 100, 100);
  const status = getStatus(actual, budget);
  return (
    <div className="budgetProgressTrack">
      <div className={`budgetProgressFill budgetProgressFill--${status}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function BudgetTable({ categories, budgets, actuals, subActuals = {}, onBudgetChange, onBucketChange }) {

  // Build flat line items: subcategory if it (or siblings) have buckets, else parent
  const lineItems = [];
  for (const cat of categories) {
    const hasBucketedSubs = cat.subcategories?.some(s => s.bucket);
    if (hasBucketedSubs) {
      for (const sub of cat.subcategories) {
        lineItems.push({
          id: sub.id,
          name: sub.name,
          displayName: sub.name,
          parentName: cat.name,
          icon: cat.icon || '📁',
          bucket: sub.bucket || '',
          actual: subActuals[sub.name] || 0,
          isSub: true,
        });
      }
    } else {
      lineItems.push({
        id: cat.id,
        name: cat.name,
        displayName: cat.name,
        parentName: null,
        icon: cat.icon || '📁',
        bucket: cat.bucket || '',
        actual: actuals[cat.name] || 0,
        isSub: false,
      });
    }
  }

  // Group into buckets + untagged
  const grouped = {};
  BUCKETS.forEach(b => { grouped[b.key] = []; });
  grouped[''] = [];
  lineItems.forEach(item => {
    const key = item.bucket || '';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const renderSection = (bucketDef, items) => {
    const totalActual = items.reduce((s, i) => s + i.actual, 0);
    const totalBudget = items.reduce((s, i) => s + (parseFloat(budgets[i.id]?.amount) || 0), 0);
    const remaining = totalBudget > 0 ? totalBudget - totalActual : null;
    const sectionStatus = getStatus(totalActual, totalBudget);

    return (
      <div
        key={bucketDef?.key || 'untagged'}
        style={{
          marginBottom: '1.5rem',
          border: `1px solid ${bucketDef?.border || '#e2e8f0'}`,
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Section header */}
        <div style={{
          background: bucketDef?.bg || '#f7fafc',
          borderBottom: `1px solid ${bucketDef?.border || '#e2e8f0'}`,
          padding: '0.6rem 0.875rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: bucketDef?.colour || '#4a5568' }}>
              {bucketDef?.label || '— Untagged'}
            </span>
            {bucketDef && (
              <span style={{ fontSize: '0.78rem', color: '#718096' }}>target {bucketDef.pct} of income</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: '#4a5568' }}>
            <span>Spent: <strong>£{totalActual.toFixed(2)}</strong></span>
            {totalBudget > 0 && <span>Budget: <strong>£{totalBudget.toFixed(2)}</strong></span>}
            {remaining !== null && (
              <span className={remaining < 0 ? 'budgetOver' : 'budgetUnder'}>
                {remaining < 0 ? `-£${Math.abs(remaining).toFixed(2)} over` : `£${remaining.toFixed(2)} left`}
              </span>
            )}
          </div>
        </div>

        {/* Rows */}
        <table className="budgetTable" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Bucket</th>
              <th>Monthly Budget (£)</th>
              <th>Actual Spend</th>
              <th>Remaining</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const budget = parseFloat(budgets[item.id]?.amount) || 0;
              const remaining = budget > 0 ? budget - item.actual : null;
              const status = getStatus(item.actual, budget);
              return (
                <tr key={item.id} className={status ? `budgetRow--${status}` : ''}>
                  <td className="budgetCategoryCell">
                    <span className="budgetIcon">{item.icon}</span>
                    <span>
                      {item.isSub && (
                        <span style={{ fontSize: '0.75rem', color: '#718096', marginRight: '0.25rem' }}>
                          {item.parentName} ›
                        </span>
                      )}
                      {item.displayName}
                    </span>
                  </td>
                  <td>
                    <select
                      value={item.bucket}
                      onChange={e => onBucketChange(item.id, e.target.value)}
                      className="budgetInput"
                      style={{ width: '140px' }}
                    >
                      {BUCKET_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="—"
                      value={budgets[item.id]?.amount ?? ''}
                      onChange={e => onBudgetChange(item.id, e.target.value)}
                      className="budgetInput"
                    />
                  </td>
                  <td className="budgetActualCell">
                    £{item.actual.toFixed(2)}
                    {budget > 0 && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <ProgressBar actual={item.actual} budget={budget} />
                      </div>
                    )}
                  </td>
                  <td className={remaining !== null ? (remaining < 0 ? 'budgetOver' : 'budgetUnder') : ''}>
                    {remaining !== null ? (remaining < 0 ? `-£${Math.abs(remaining).toFixed(2)}` : `£${remaining.toFixed(2)}`) : '—'}
                  </td>
                  <td>
                    <StatusBadge status={status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="budgetTableWrapper">
      {BUCKETS.map(b => grouped[b.key].length > 0 && renderSection(b, grouped[b.key]))}
      {grouped[''].length > 0 && renderSection(null, grouped[''])}
    </div>
  );
}
