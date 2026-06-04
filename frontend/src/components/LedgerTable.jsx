import React from 'react';

export default function LedgerTable({ expenses = [], accountNameMap = {}, onEdit, onDelete }) {
  return (
    <table border="1" cellPadding="10" className="table">
      <thead className="tableHeader">
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Account</th>
          <th>Category</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((exp) => (
          <tr key={exp.id}>
            <td>{exp.date}</td>
            <td>{exp.description}</td>
            <td>{accountNameMap[exp.account_id] || exp.account_id}</td>
            <td>{exp.category}</td>
            <td>{exp.is_income ? 'Income' : 'Expense'}</td>
            <td>£{Number(exp.amount).toFixed(2)}</td>
            <td>
              <button type="button" onClick={() => onEdit && onEdit(exp)}>
                Edit
              </button>
              <button type="button" onClick={() => onDelete && onDelete(exp.id)} style={{ marginLeft: '0.5rem' }}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
