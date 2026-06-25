// src/features/budget/components/RulesSummary.jsx
import '../../../styles/budget.css';

const BUCKETS = [
  { key: '50_needs',   label: 'Needs',   target: 0.60, color: '#2b6cb0' },
  { key: '30_wants',   label: 'Wants',   target: 0.30, color: '#6b46c1' },
  { key: '20_savings', label: 'Savings', target: 0.10, color: '#38a169' },
];

export default function RulesSummary({ categories, actuals, subActuals = {}, monthlyIncome }) {
  const income = parseFloat(monthlyIncome) || 0;
  if (!income) return null;

  const bucketTotals = {};
  BUCKETS.forEach(b => { bucketTotals[b.key] = 0; });

  categories.forEach(cat => {
    const hasSubs = cat.subcategories?.length > 0;
    if (hasSubs) {
      cat.subcategories.forEach(sub => {
        if (sub.bucket && bucketTotals[sub.bucket] !== undefined) {
          bucketTotals[sub.bucket] += subActuals[sub.name] || 0;
        }
      });
    } else if (cat.bucket && bucketTotals[cat.bucket] !== undefined) {
      bucketTotals[cat.bucket] += actuals[cat.name] || 0;
    }
  });

  return (
    <div className="rulesSummary">
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#2d3748' }}>
        60/30/10 Rule — Monthly Income: £{income.toFixed(2)}
      </h3>
      <div className="rulesBuckets">
        {BUCKETS.map(({ key, label, target, color }) => {
          const targetAmt = income * target;
          const actual = bucketTotals[key];
          const pct = targetAmt > 0 ? Math.min((actual / targetAmt) * 100, 100) : 0;
          const over = actual > targetAmt;
          const remaining = targetAmt - actual;

          return (
            <div key={key} className="rulesBucket">
              <div className="rulesBucketHeader">
                <span className="rulesBucketLabel" style={{ color }}>
                  {label} <span className="rulesBucketPct">({Math.round(target * 100)}%)</span>
                </span>
                <span className="rulesBucketTarget">Target: £{targetAmt.toFixed(2)}</span>
              </div>
              <div className="budgetProgressTrack" style={{ height: '8px', marginBottom: '0.5rem' }}>
                <div
                  className={`budgetProgressFill budgetProgressFill--${over ? 'over' : pct >= 80 ? 'warning' : 'safe'}`}
                  style={{ width: `${pct}%`, background: over ? undefined : color }}
                />
              </div>
              <div className="rulesBucketStats">
                <span>Spent: <strong>£{actual.toFixed(2)}</strong></span>
                <span className={over ? 'budgetOver' : 'budgetUnder'}>
                  {over ? `Over by £${Math.abs(remaining).toFixed(2)}` : `£${remaining.toFixed(2)} left`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: '0.75rem', color: '#718096', margin: '0.75rem 0 0 0' }}>
        Tag each category with a bucket in the table below to populate this breakdown.
      </p>
    </div>
  );
}
