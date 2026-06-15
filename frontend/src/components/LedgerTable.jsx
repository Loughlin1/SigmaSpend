// src/components/LedgerTable.jsx
import React from 'react';

export default function LedgerTable({ 
  expenses = [], 
  accountNameMap = {}, 
  categories = [], 
  onEdit, 
  onDelete 
}) {
  
  const getCategoryIcon = (categoryName) => {
    const match = categories.find(c => c.name === categoryName);
    if (match) return match.icon;
    
    // If it's a subcategory, look through the children lists
    for (let cat of categories) {
      if (cat.subcategories?.some(s => s.name === categoryName)) {
        return '🔹'; // Consistent bullet for all subcategory lines
      }
    }
    return '❓'; // Fallback icon
  };

  return (
    <table border="1" cellPadding="10" className="table">
      <thead className="table">
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Account</th>
          <th>Category</th>
          <th>Notes</th>
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
            <td>{getCategoryIcon(exp.category)} {exp.category}</td>
            <td>{exp.notes}</td>
            <td>{exp.is_income ? 'Income' : 'Expense'}</td>
            <td>£{Number(exp.amount).toFixed(2)}</td>
            <td style={{display: "flex", gap: "0.25rem", alignContent: "center", justifyContent: "center", border: "none"}}>
              <button type="button" onClick={() => onEdit && onEdit(exp)}>
                Edit
              </button>
              <button type="button" style={{background: '#c53030', border: '1px solid #fed7d7', borderRadius: '4px'}} onClick={() => onDelete && onDelete(exp.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}