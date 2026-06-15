// src/components/ExpenseChart.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/charts.css'

export default function ExpenseChart({ expenses, accounts }) {
  const accountNameLookup = accounts.reduce((lookup, account) => {
    lookup[account.account_id] = account.account_name;
    return lookup;
  }, {});

  const chartData = expenses.reduce((acc, curr) => {
    if (curr.is_income) return acc; // Skip income for pure expense tracking
    const accountLabel = accountNameLookup[curr.account_id] || curr.account_id;
    const existing = acc.find(item => item.name === accountLabel);
    if (existing) {
      existing.value += curr.amount;
    } else {
      acc.push({ name: accountLabel, value: curr.amount });
    }
    return acc;
  }, []);

  return (
    <div className="chartWrapper">
      <h3>Spending Breakdown by Account</h3>
      <div className="chart-canvas-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#4a5568', fontSize: 12 }} 
              axisLine={{ stroke: '#cbd5e0' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#4a5568', fontSize: 12 }} 
              axisLine={{ stroke: '#cbd5e0' }}
              tickLine={false}
              tickFormatter={(value) => `£${value}`}
            />
            <Tooltip 
              formatter={(value) => [`£${value.toFixed(2)}`, 'Total']} 
              contentStyle={{ background: '#fff', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px' }}
            />
            {/* Using an authentic theme-aligned hex code (#2b6cb0) matching your .button classes */}
            <Bar dataKey="value" fill="#2b6cb0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}