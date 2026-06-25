// src/components/ExpenseChart.jsx
import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell, ReferenceLine } from 'recharts';
import '../../../styles/charts.css';

const BAR_COLOUR = { income: '#38a169', expenses: '#2b6cb0' };

function getValue(item, transactionType) {
  const isNet = transactionType === 'net';
  const isIncome = transactionType === 'income';
  const raw = isNet
    ? (item.net ?? (item.total_income - item.total_expenses))
    : isIncome ? item.total_income : item.total_expenses;
  return parseFloat((raw || 0).toFixed(2));
}

export default function ExpenseChart({ expenses = [], loading }) {
  const [groupBy, setGroupBy] = useState('parent-category');
  const [transactionType, setTransactionType] = useState('net');
  const [sortBy, setSortBy] = useState('amount');
  const [viewMode, setViewMode] = useState('per-category'); // 'combined' | 'per-category'

  const targetType = groupBy === 'total' ? 'total' : groupBy === 'subcategory' ? 'subcategory' : 'category';
  const isNetView = transactionType === 'net';

  // --- COMBINED VIEW data ---
  const chartData = useMemo(() => {
    if (!Array.isArray(expenses) || expenses.length === 0) return [];
    return expenses
      .filter(item => item.type === targetType)
      .map(item => {
        let baseName = item.category_name || 'Global Grand Total';
        if (targetType === 'subcategory' && item.parent_name)
          baseName = `${item.parent_name} → ${item.category_name}`;
        const periodStr = item.period ? ` (${item.period})` : '';
        return {
          name: `${baseName}${periodStr}`,
          pureName: baseName,
          value: getValue(item, transactionType),
          period: item.period || '',
        };
      })
      .filter(n => isNetView ? n.value !== 0 : n.value > 0)
      .sort((a, b) => sortBy === 'alpha' ? a.pureName.localeCompare(b.pureName) : b.value - a.value);
  }, [expenses, targetType, transactionType, sortBy, isNetView]);

  // --- PER-CATEGORY VIEW data ---
  // Groups rows by category name, each having an array of { period, value }
  const perCategoryData = useMemo(() => {
    if (!Array.isArray(expenses) || expenses.length === 0) return [];
    const map = {};
    expenses
      .filter(item => item.type === targetType)
      .forEach(item => {
        const name = item.category_name || 'Global Grand Total';
        if (!map[name]) map[name] = { name, periods: [], total: 0 };
        const value = getValue(item, transactionType);
        map[name].periods.push({ period: item.period || '', value });
        map[name].total += value;
      });

    return Object.values(map)
      .filter(cat => isNetView ? cat.total !== 0 : cat.total > 0)
      .map(cat => ({
        ...cat,
        periods: cat.periods.sort((a, b) => a.period.localeCompare(b.period)),
      }))
      .sort((a, b) =>
        sortBy === 'alpha' ? a.name.localeCompare(b.name) : b.total - a.total
      );
  }, [expenses, targetType, transactionType, sortBy, isNetView]);

  const dynamicHeight = Math.max(chartData.length * 45, 300);

  if (loading) {
    return (
      <div className="chartWrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <p>Recalculating multi-level summations via database engine...</p>
      </div>
    );
  }

  return (
    <div className="chartWrapper">
      <div className="chartHeader">
        <h3>Charts</h3>

        <div className="chartControls">
          <div className="controlGroup">
            <label htmlFor="groupBy">Breakdown:</label>
            <select id="groupBy" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="chartSelect">
              <option value="parent-category">Parent Categories</option>
              <option value="subcategory">Subcategories</option>
              <option value="total">Overall Grand Totals</option>
            </select>
          </div>

          <div className="controlGroup">
            <label htmlFor="transactionType">Metric:</label>
            <select id="transactionType" value={transactionType} onChange={(e) => setTransactionType(e.target.value)} className="chartSelect">
              <option value="expenses">Expenses Only</option>
              <option value="income">Income Only</option>
              <option value="net">Net (Income − Expenses)</option>
            </select>
          </div>

          <div className="controlGroup">
            <label htmlFor="sortBy">Sort:</label>
            <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="chartSelect">
              <option value="amount">By Amount</option>
              <option value="alpha">Alphabetically</option>
            </select>
          </div>

          <div className="controlGroup">
            <label>View:</label>
            <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e0' }}>
              {['combined', 'per-category'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.8rem',
                    border: 'none',
                    borderLeft: m === 'per-category' ? '1px solid #cbd5e0' : 'none',
                    cursor: 'pointer',
                    background: viewMode === m ? '#3182ce' : '#fff',
                    color: viewMode === m ? '#fff' : '#4a5568',
                    fontWeight: viewMode === m ? 600 : 400,
                  }}
                >
                  {m === 'combined' ? 'Combined' : 'Per Category'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <hr className="chartDivider" />

      {/* COMBINED VIEW */}
      {viewMode === 'combined' && (
        <div className="chart-canvas-container" style={{ height: `${dynamicHeight}px`, minHeight: '300px' }}>
          {chartData.length === 0 ? (
            <div className="noDataMessage"><span style={{ fontSize: '2rem' }}>📊</span><span style={{ fontWeight: 500 }}>No data for this period</span><span style={{ fontSize: '0.85rem' }}>Try a different date range, account, or upload a statement.</span></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 50, left: 20, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#4a5568', fontSize: 12 }} axisLine={{ stroke: '#cbd5e0' }} tickLine={false} tickFormatter={(v) => `£${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#2d3748', fontSize: 12, fontWeight: 500 }} axisLine={{ stroke: '#cbd5e0' }} tickLine={false} width={220} />
                <Tooltip
                  formatter={(value, name, props) => [`£${Math.abs(value).toFixed(2)}`, `${props.payload.pureName} (${props.payload.period || 'All-Time'})`]}
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
                />
                {isNetView && <ReferenceLine x={0} stroke="#cbd5e0" strokeWidth={1.5} />}
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={isNetView ? (entry.value >= 0 ? '#38a169' : '#e53e3e') : BAR_COLOUR[transactionType] || '#2b6cb0'} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(val) => `£${Math.abs(val).toFixed(2)}${isNetView && val < 0 ? ' ▼' : ''}`}
                    style={{ fill: '#4a5568', fontSize: 11, fontWeight: 500 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* PER-CATEGORY VIEW */}
      {viewMode === 'per-category' && (
        perCategoryData.length === 0 ? (
          <div className="noDataMessage"><span style={{ fontSize: '2rem' }}>📊</span><span style={{ fontWeight: 500 }}>No data for this period</span><span style={{ fontSize: '0.85rem' }}>Try a different date range, account, or upload a statement.</span></div>
        ) : (
          <div className="per-category-grid">
            {perCategoryData.map((cat) => {
              const barColour = isNetView ? null : BAR_COLOUR[transactionType] || '#2b6cb0';
              const maxAbs = Math.max(...cat.periods.map(p => Math.abs(p.value)), 0.01);
              return (
                <div key={cat.name} style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#2d3748' }}>{cat.name}</strong>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 600,
                      color: isNetView ? (cat.total >= 0 ? '#2f855a' : '#c53030') : '#4a5568'
                    }}>
                      £{Math.abs(cat.total).toFixed(2)}{isNetView && cat.total < 0 ? ' ▼' : ''}
                    </span>
                  </div>
                  <div style={{ height: '160px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cat.periods} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <XAxis dataKey="period" tick={{ fill: '#718096', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis hide domain={isNetView ? [-maxAbs * 1.1, maxAbs * 1.1] : [0, maxAbs * 1.1]} />
                        <Tooltip
                          formatter={(val) => [`£${Math.abs(val).toFixed(2)}`, cat.name]}
                          contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px' }}
                        />
                        {isNetView && <ReferenceLine y={0} stroke="#cbd5e0" strokeWidth={1} />}
                        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                          {cat.periods.map((entry) => (
                            <Cell key={entry.period} fill={isNetView ? (entry.value >= 0 ? '#38a169' : '#e53e3e') : barColour} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
