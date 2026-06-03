// src/components/ExpenseChart.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ExpenseChart({ expenses }) {
  // Simple transformation: aggregate data by category name
  const chartData = expenses.reduce((acc, curr) => {
    if (curr.is_income) return acc; // Skip income for pure expense tracking
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += curr.amount;
    } else {
      acc.push({ name: curr.category, value: curr.amount });
    }
    return acc;
  }, []);

  return (
    <div className="chart-container" style={{ width: '100%', height: 300 }}>
      <h3>Spending Breakdown</h3>
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#4f46e5" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}