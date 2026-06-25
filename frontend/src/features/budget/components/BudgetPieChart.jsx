// src/features/budget/components/BudgetPieChart.jsx
import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../../../styles/charts.css';

const BUCKETS = [
  { key: '50_needs',   label: 'Needs',   colour: '#3182ce' },
  { key: '30_wants',   label: 'Wants',   colour: '#d69e2e' },
  { key: '20_savings', label: 'Savings', colour: '#38a169' },
];

const RADIAN = Math.PI / 180;
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  if (percent < 0.04) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {name}
    </text>
  );
}

function CustomTooltip({ active, payload, bucketBudgets }) {
  if (!active || !payload?.length) return null;
  const { name, value, bucketKey } = payload[0].payload;
  const budget = bucketBudgets[bucketKey] || 0;
  const pct = budget > 0 ? ((value / budget) * 100).toFixed(1) : null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.6rem 0.875rem', fontSize: '13px' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{name}</div>
      <div>Spent: <strong>£{value.toFixed(2)}</strong></div>
      {budget > 0 && <div>Budget: £{budget.toFixed(2)}</div>}
      {pct !== null && <div style={{ color: parseFloat(pct) > 100 ? '#e53e3e' : '#38a169' }}>{pct}% of budget</div>}
    </div>
  );
}

export default function BudgetPieChart({ categories, actuals, subActuals = {}, bucketBudgets = {} }) {
  const data = useMemo(() => {
    const totals = {};
    BUCKETS.forEach(b => { totals[b.key] = 0; });

    const parentCategories = categories.filter(c => !c.parent_id);
    for (const cat of parentCategories) {
      const hasSubs = cat.subcategories?.length > 0;
      if (hasSubs) {
        for (const sub of cat.subcategories) {
          if (sub.bucket && totals[sub.bucket] !== undefined) {
            totals[sub.bucket] += subActuals[sub.name] || 0;
          }
        }
        // direct transactions on parent
        const subTotal = cat.subcategories.reduce((s, sub) => s + (subActuals[sub.name] || 0), 0);
        const parentDirect = Math.round(((actuals[cat.name] || 0) - subTotal) * 100) / 100;
        if (parentDirect > 0 && cat.bucket && totals[cat.bucket] !== undefined) {
          totals[cat.bucket] += parentDirect;
        }
      } else if (cat.bucket && totals[cat.bucket] !== undefined) {
        totals[cat.bucket] += actuals[cat.name] || 0;
      }
    }

    return BUCKETS
      .map(b => ({ name: b.label, bucketKey: b.key, value: totals[b.key], colour: b.colour }))
      .filter(d => d.value > 0);
  }, [categories, actuals, subActuals]);

  if (data.length === 0) {
    return (
      <div className="chartWrapper">
        <div className="noDataMessage">No bucketed expense data for the current period.</div>
      </div>
    );
  }

  return (
    <div className="chartWrapper">
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#2d3748' }}>Spend Distribution</h3>
      <div className="chart-canvas-container" style={{ minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="75%"
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map(entry => (
                <Cell key={entry.bucketKey} fill={entry.colour} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip bucketBudgets={bucketBudgets} />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
