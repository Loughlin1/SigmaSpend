// src/features/budget/components/BudgetPieChart.jsx
import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../../../styles/charts.css';

const STATUS_COLORS = {
  safe: '#38a169',
  warning: '#d69e2e',
  over: '#e53e3e',
  unbudgeted: '#a0aec0',
};

function getStatus(actual, budget) {
  if (!budget) return 'unbudgeted';
  const pct = actual / budget;
  if (pct >= 1) return 'over';
  if (pct >= 0.8) return 'warning';
  return 'safe';
}

const RADIAN = Math.PI / 180;
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) {
  if (percent < 0.04) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {name.length > 10 ? name.slice(0, 9) + '…' : name}
    </text>
  );
}

export default function BudgetPieChart({ categories, budgets, actuals }) {
  const data = useMemo(() => {
    const parentCategories = categories.filter(c => !c.parent_id);
    return parentCategories
      .map(cat => {
        const actual = actuals[cat.name] || 0;
        return { name: cat.name, icon: cat.icon || '📁', actual, budget: budgets[cat.name] || 0 };
      })
      .filter(d => d.actual > 0);
  }, [categories, budgets, actuals]);

  if (data.length === 0) {
    return (
      <div className="chartWrapper">
        <div className="noDataMessage">No expense data for the current period.</div>
      </div>
    );
  }

  return (
    <div className="chartWrapper">
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#2d3748' }}>Spend Distribution</h3>
      <div className="chart-canvas-container" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="actual"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="75%"
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={STATUS_COLORS[getStatus(entry.actual, entry.budget)]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`£${value.toFixed(2)}`, name]}
              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
            />
            <Legend
              formatter={(value, entry) => {
                const d = data.find(x => x.name === value);
                return d ? `${d.icon} ${value}` : value;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.8rem', color: '#4a5568' }}>
        <span><span style={{ color: STATUS_COLORS.safe }}>●</span> Under 80%</span>
        <span><span style={{ color: STATUS_COLORS.warning }}>●</span> 80–100%</span>
        <span><span style={{ color: STATUS_COLORS.over }}>●</span> Over budget</span>
        <span><span style={{ color: STATUS_COLORS.unbudgeted }}>●</span> No budget set</span>
      </div>
    </div>
  );
}
