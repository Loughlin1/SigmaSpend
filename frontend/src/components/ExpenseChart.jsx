// src/components/ExpenseChart.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
    <div className="chart-container" style={{ width: '100%', height: 300 }}>
      <h3>Spending Breakdown by Account</h3>
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => [`£${value.toFixed(2)}`, 'Total']} />
          <Bar dataKey="value" fill="#4f46e5" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}