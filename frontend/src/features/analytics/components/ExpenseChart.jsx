// src/components/ExpenseChart.jsx
import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell, ReferenceLine } from 'recharts';
import '../../../styles/charts.css';

export default function ExpenseChart({ expenses = [], loading }) {
  const [groupBy, setGroupBy] = useState('parent-category');
  const [transactionType, setTransactionType] = useState('net');
  const [sortBy, setSortBy] = useState('amount');

  const chartData = useMemo(() => {
    if (!Array.isArray(expenses) || expenses.length === 0) return [];

    // Normalise dropdown logic to backend keys
    let targetType = 'category';
    if (groupBy === 'total') targetType = 'total';
    if (groupBy === 'subcategory') targetType = 'subcategory';

    // Filter by type matching logic
    const filteredRows = expenses.filter(
      item => String(item.type).toLowerCase() === targetType.toLowerCase()
    );

    // Map rows to Recharts friendly properties
    return filteredRows
      .map((item) => {
        let baseName = item.category_name || 'Global Grand Total';
        
        if (targetType === 'subcategory' && item.parent_name) {
          baseName = `${item.parent_name} → ${item.category_name}`;
        }

        const periodStr = item.period ? ` (${item.period})` : '';
        // ⚡ FIX: Make the name unique per time period slot to resolve the Tooltip mapping bug
        const uniqueDisplayName = `${baseName}${periodStr}`;

        const isNet = transactionType.toLowerCase() === 'net';
        const isIncome = transactionType.toLowerCase() === 'income';
        const rawValue = isNet
          ? (item.net ?? (item.total_income - item.total_expenses))
          : isIncome ? item.total_income : item.total_expenses;

        return {
          name: uniqueDisplayName,
          pureName: baseName,
          value: parseFloat((rawValue || 0).toFixed(2)),
          period: item.period || ''
        };
      })
      .filter(node => transactionType.toLowerCase() === 'net' ? node.value !== 0 : node.value > 0)
      .sort((a, b) =>
        sortBy === 'alpha'
          ? a.pureName.localeCompare(b.pureName)
          : b.value - a.value
      );
  }, [expenses, groupBy, transactionType, sortBy]);

  const isNetView = transactionType.toLowerCase() === 'net';
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
            <label htmlFor="groupBy">Breakdown Layer:</label>
            <select 
              id="groupBy" 
              value={groupBy} 
              onChange={(e) => setGroupBy(e.target.value)}
              className="chartSelect"
            >
              <option value="parent-category">Parent Categories</option>
              <option value="subcategory">Subcategories</option>
              <option value="total">Overall Grand Totals</option>
            </select>
          </div>

          <div className="controlGroup">
            <label htmlFor="transactionType">Metric:</label>
            <select
              id="transactionType"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="chartSelect"
            >
              <option value="expenses">Expenses Only</option>
              <option value="income">Income Only</option>
              <option value="net">Net (Income − Expenses)</option>
            </select>
          </div>

          <div className="controlGroup">
            <label htmlFor="sortBy">Sort:</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="chartSelect"
            >
              <option value="amount">By Amount</option>
              <option value="alpha">Alphabetically</option>
            </select>
          </div>
        </div>
      </div>

      <hr className="chartDivider" />

      <div className="chart-canvas-container" style={{ height: `${dynamicHeight}px`, minHeight: '300px' }}>
        {chartData.length === 0 ? (
          <div className="noDataMessage">No transaction records match your selected criteria.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical" 
              margin={{ top: 10, right: 50, left: 20, bottom: 5 }} // Increased right margin for inline value tags
            >
              <XAxis 
                type="number"
                tick={{ fill: '#4a5568', fontSize: 12 }} 
                axisLine={{ stroke: '#cbd5e0' }}
                tickLine={false}
                tickFormatter={(value) => `£${value}`}
              />
              <YAxis 
                type="category"
                dataKey="name" 
                tick={{ fill: '#2d3748', fontSize: 12, fontWeight: 500 }} 
                axisLine={{ stroke: '#cbd5e0' }}
                tickLine={false}
                width={220} // Slightly widened to make room for name + period strings cleanly
              />
              <Tooltip 
                // Updated formatter to cleanly display parsed item information without duplication shifts
                formatter={(value, name, props) => [
                  `£${value.toFixed(2)}`, 
                  `${props.payload.pureName} (${props.payload.period || 'All-Time'})`
                ]} 
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
              />
              {isNetView && <ReferenceLine x={0} stroke="#cbd5e0" strokeWidth={1.5} />}
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={isNetView
                      ? (entry.value >= 0 ? '#38a169' : '#e53e3e')
                      : transactionType.toLowerCase() === 'income' ? '#38a169' : '#2b6cb0'}
                  />
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
    </div>
  );
}