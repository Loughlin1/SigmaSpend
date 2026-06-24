// src/features/budget/components/BudgetTable.jsx
import '../../../styles/budget.css';

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

export default function BudgetTable({ categories, budgets, actuals, onBudgetChange }) {
  const parentCategories = categories.filter(c => !c.parent_id);

  const totalBudget = parentCategories.reduce((sum, c) => sum + (parseFloat(budgets[c.id]?.amount) || 0), 0);
  const totalActual = parentCategories.reduce((sum, c) => sum + (actuals[c.name] || 0), 0);

  return (
    <div className="budgetTableWrapper">
      <table className="budgetTable">
        <thead>
          <tr>
            <th>Category</th>
            <th>Monthly Budget (£)</th>
            <th>Actual Spend</th>
            <th>Remaining</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {parentCategories.map(cat => {
            const actual = actuals[cat.name] || 0;
            const budget = parseFloat(budgets[cat.id]?.amount) || 0;
            const remaining = budget > 0 ? budget - actual : null;
            const status = getStatus(actual, budget);

            return (
              <tr key={cat.id} className={status ? `budgetRow--${status}` : ''}>
                <td className="budgetCategoryCell">
                  <span className="budgetIcon">{cat.icon || '📁'}</span>
                  {cat.name}
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="—"
                    value={budgets[cat.id]?.amount ?? ''}
                    onChange={e => onBudgetChange(cat.id, e.target.value)}
                    className="budgetInput"
                    aria-label={`Budget for ${cat.name}`}
                  />
                </td>
                <td className="budgetActualCell">
                  £{actual.toFixed(2)}
                  {budget > 0 && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <ProgressBar actual={actual} budget={budget} />
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
        {parentCategories.length > 0 && (
          <tfoot>
            <tr className="budgetTotalsRow">
              <td><strong>Total</strong></td>
              <td><strong>{totalBudget > 0 ? `£${totalBudget.toFixed(2)}` : '—'}</strong></td>
              <td><strong>£{totalActual.toFixed(2)}</strong></td>
              <td className={totalBudget > 0 ? (totalActual > totalBudget ? 'budgetOver' : 'budgetUnder') : ''}>
                <strong>
                  {totalBudget > 0
                    ? totalActual > totalBudget
                      ? `-£${(totalActual - totalBudget).toFixed(2)}`
                      : `£${(totalBudget - totalActual).toFixed(2)}`
                    : '—'}
                </strong>
              </td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
