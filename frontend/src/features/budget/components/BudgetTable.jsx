// src/features/budget/components/BudgetTable.jsx
import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import '../../../styles/budget.css';

// One colour per parent category — subcategories sharing a parent get the same colour
const PARENT_PALETTE = ['#3182ce','#dd6b20','#805ad5','#0987a0','#b7791f','#6b46c1','#2c7a7b','#c05621','#553c9a','#2b6cb0'];

function BucketPieChart({ items }) {
  // Build parent → colour map based on unique parents in this bucket
  const parents = [...new Set(items.map(i => i.parentName || i.name))];
  const parentColour = Object.fromEntries(parents.map((p, i) => [p, PARENT_PALETTE[i % PARENT_PALETTE.length]]));

  const data = items
    .filter(i => i.actual > 0)
    .map(i => ({
      name: i.displayName,
      value: i.actual,
      colour: parentColour[i.parentName || i.name],
    }));

  if (data.length === 0) return null;

  return (
    <div style={{ padding: '0.75rem 0.875rem', borderTop: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ flex: '0 0 320px', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={140} labelLine={false}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.colour} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`£${value.toFixed(2)}`, name]}
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend grouped by parent */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.82rem' }}>
          {parents.map(parent => {
            const children = data.filter(d => (d.name === parent || items.find(i => i.displayName === d.name)?.parentName === parent));
            return (
              <div key={parent} style={{ marginBottom: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, color: '#2d3748' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: parentColour[parent], display: 'inline-block', flexShrink: 0 }} />
                  {parent}
                </div>
                {children.length > 1 && children.map(c => (
                  <div key={c.name} style={{ display: 'flex', gap: '0.75rem', paddingLeft: '1.1rem', color: '#4a5568', lineHeight: 1.4 }}>
                    <span>{c.name}</span>
                    <span>£{c.value.toFixed(2)}</span>
                  </div>
                ))}
                {children.length === 1 && (
                  <div style={{ display: 'flex', gap: '0.75rem', paddingLeft: '1.1rem', color: '#4a5568' }}>
                    <span>{children[0].name}</span>
                    <span>£{children[0].value.toFixed(2)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
  if (pct > 1) return 'over';
  if (pct === 1) return 'exact';
  if (pct >= 0.8) return 'warning';
  return 'safe';
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

export default function BudgetTable({ categories, bucketBudgets = {}, actuals, subActuals = {}, parentActuals = {}, onBucketBudgetChange, onBucketChange }) {
  const allKeys = [...BUCKETS.map(b => b.key), 'untagged'];
  const [collapsed, setCollapsed] = useState(Object.fromEntries(allKeys.map(k => [k, true])));
  const toggleSection = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  // Build flat line items: subcategory if it (or siblings) have buckets, else parent
  const lineItems = [];
  for (const cat of categories) {
    const hasSubs = cat.subcategories?.length > 0;
    if (hasSubs) {
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
      // parentActuals includes rolled-up subcategory totals, so subtract them to get direct-only
      const subTotal = cat.subcategories.reduce((s, sub) => s + (subActuals[sub.name] || 0), 0);
      const parentDirect = Math.round(((parentActuals[cat.name] || 0) - subTotal) * 100) / 100;
      if (parentDirect !== 0) {
        lineItems.push({
          id: cat.id,
          name: cat.name,
          displayName: `${cat.name} (direct)`,
          parentName: cat.name,
          icon: cat.icon || '📁',
          bucket: cat.bucket || '',
          actual: parentDirect,
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
    const sectionKey = bucketDef?.key || 'untagged';
    const isCollapsed = collapsed[sectionKey];
    const totalActual = items.reduce((s, i) => s + i.actual, 0);
    const bucketBudget = bucketDef ? (bucketBudgets[bucketDef.key] || 0) : 0;
    const remaining = bucketBudget > 0 ? bucketBudget - totalActual : null;

    return (
      <div
        key={sectionKey}
        style={{
          marginBottom: '1.5rem',
          border: `1px solid ${bucketDef?.border || '#e2e8f0'}`,
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Section header */}
        <div
          style={{
            background: bucketDef?.bg || '#f7fafc',
            borderBottom: isCollapsed ? 'none' : `1px solid ${bucketDef?.border || '#e2e8f0'}`,
            padding: '0.6rem 0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Left: label + chevron (clickable) */}
          <div
            onClick={() => toggleSection(sectionKey)}
            style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', cursor: 'pointer', userSelect: 'none', flex: 1 }}
          >
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: bucketDef?.colour || '#4a5568' }}>
              {bucketDef?.label || '— Untagged'}
            </span>
            {bucketDef && (
              <span style={{ fontSize: '0.78rem', color: '#718096' }}>target {bucketDef.pct} of income</span>
            )}
            <span style={{ fontSize: '1rem', color: '#718096', marginLeft: '0.25rem' }}>
              {isCollapsed ? '▸' : '▾'}
            </span>
          </div>
          {/* Right: budget input + spend summary */}
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', color: '#4a5568', alignItems: 'center', flexWrap: 'wrap' }}>
            {bucketDef && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#718096' }}>Budget £</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="—"
                  value={bucketBudgets[bucketDef.key] ?? ''}
                  onChange={e => onBucketBudgetChange(bucketDef.key, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="budgetInput"
                  style={{ width: '90px' }}
                />
              </label>
            )}
            <span>Spent: <strong>£{totalActual.toFixed(2)}</strong></span>
            {remaining !== null && (
              <span className={remaining < 0 ? 'budgetOver' : remaining === 0 ? '' : 'budgetUnder'}>
                {remaining < 0 ? `-£${Math.abs(remaining).toFixed(2)} over` : remaining === 0 ? 'On budget' : `£${remaining.toFixed(2)} left`}
              </span>
            )}
            {bucketBudget > 0 && (
              <div style={{ width: '80px' }}>
                <ProgressBar actual={totalActual} budget={bucketBudget} />
              </div>
            )}
          </div>
        </div>

        {/* Rows */}
        {!isCollapsed && <table className="budgetTable" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Bucket</th>
              <th>Actual Spend</th>
              <th>% of Budget</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const sharePct = bucketBudget > 0 ? ((item.actual / bucketBudget) * 100).toFixed(1) : null;
              return (
                <tr key={item.id}>
                  <td className="budgetCategoryCell">
                    <div className="budgetCategoryCell__inner">
                      <span className="budgetIcon">{item.icon}</span>
                      <span>
                        {item.isSub && (
                          <span style={{ fontSize: '0.75rem', color: '#718096', marginRight: '0.25rem' }}>
                            {item.parentName} ›
                          </span>
                        )}
                        {item.displayName}
                      </span>
                    </div>
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
                  <td className="budgetActualCell">£{item.actual.toFixed(2)}</td>
                  <td style={{ fontSize: '0.82rem', fontWeight: sharePct !== null ? 600 : 400,
                    color: sharePct === null || parseFloat(sharePct) === 0 ? '#718096'
                      : parseFloat(sharePct) >= 80 ? '#e53e3e'
                      : parseFloat(sharePct) >= 50 ? '#d69e2e'
                      : '#38a169'
                  }}>
                    {sharePct !== null ? `${sharePct}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>}
        {!isCollapsed && bucketDef && <BucketPieChart items={items} />}
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
