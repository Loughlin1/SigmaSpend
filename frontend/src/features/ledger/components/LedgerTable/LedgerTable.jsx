// src/features/ledger/components/LedgerTable/LedgerTable.jsx
import React, { useState } from 'react';
import { expenseApi } from '../../../../api/client';
import BulkActionsPanel from './BulkActionsPanel';
import LedgerRowEdit from './LedgerRowEdit';
import LedgerRowRead from './LedgerRowRead';
import '../../../../styles/lists.css';
import '../../../../styles/forms.css';


export default function LedgerTable({ 
  expenses = [], 
  accountNameMap = {}, 
  categories = [], 
  onExpenseSaved, 
  onDelete,
  onCreateRuleFromTransaction,
  onBulkUpdateSuccess,
  page = 1,
  limit = 50,
  totalCount = 0,
  onPageChange,
  onLimitChange
}) {
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? expenses.map(exp => exp.id) : []);
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBulkSubmit = async () => {
    if (selectedIds.length === 0) return;
    setBulkUpdating(true);
    try {
      const catId = bulkCategory === "" ? null : parseInt(bulkCategory, 10);
      await expenseApi.bulkClassify(selectedIds, catId);
      alert(`Successfully classified ${selectedIds.length} transactions!`);
      setSelectedIds([]); 
      setBulkCategory("");
      if (typeof onBulkUpdateSuccess === 'function') onBulkUpdateSuccess();
    } catch (err) {
      console.error("[SigmaSpend UI] Bulk classification execution thread halted:", err);
      alert("Failed to apply bulk classifications.");
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleRowSave = async (payload) => {
    try {
      if (typeof onExpenseSaved === 'function') await onExpenseSaved(payload);
      setEditingId(null);
    } catch (err) {
      console.error("[SigmaSpend UI] Network thread halted inside handleRowSave:", err);
      alert("Could not save transaction changes. Please verify network connections.");
    }
  };

  const getCategoryDisplay = (categoryId) => {
    if (!categoryId) return { icon: '❓', name: 'Uncategorized' };
    for (let cat of categories) {
      if (cat.id === categoryId) return { icon: cat.icon || '📁', name: cat.name };
      const subMatch = cat.subcategories?.find(s => s.id === categoryId);
      if (subMatch) return { icon: cat.icon || '📁', name: subMatch.name };
    }
    return { icon: '❓', name: 'Uncategorized' };
  };

  const getAccountAbbreviation = (accountName) => {
    if (!accountName) return '';
    return accountName.replace(/current account/i, 'CA').replace(/credit card/i, 'CC').trim();
  };

  return (
    <div className="ledger-table-container" style={{ position: 'relative' }}>
      
      <BulkActionsPanel 
        selectedCount={selectedIds.length}
        bulkCategory={bulkCategory}
        setBulkCategory={setBulkCategory}
        bulkUpdating={bulkUpdating}
        onBulkSubmit={handleBulkSubmit}
        onClearSelection={() => setSelectedIds([])}
        categories={categories}
      />

      <table className="table ledger-table-view" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '4%', textAlign: 'center' }}>
              <input 
                type="checkbox" 
                onChange={handleSelectAll}
                checked={expenses.length > 0 && selectedIds.length === expenses.length}
              />
            </th>
            <th style={{ width: '10%' }}>Date</th>
            <th style={{ width: '20%' }}>Description</th>
            <th style={{ width: '9%' }}>Account</th>
            <th style={{ width: '14%' }}>Category</th>
            <th style={{ width: '16%' }}>Notes</th>
            <th style={{ width: '8%' }}>Type</th>
            <th style={{ width: '11%' }}>Amount</th>
            <th style={{ width: '7%', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => {
            if (editingId === exp.id) {
              return (
                <LedgerRowEdit 
                  key={exp.id}
                  expense={exp}
                  accountNameMap={accountNameMap}
                  categories={categories}
                  onSave={handleRowSave}
                  onCancel={() => setEditingId(null)}
                  onCreateRuleFromTransaction={onCreateRuleFromTransaction}
                />
              );
            }

            return (
              <LedgerRowRead 
                key={exp.id}
                expense={exp}
                isChecked={selectedIds.includes(exp.id)}
                onSelectRow={() => handleSelectRow(exp.id)}
                displayAccountName={getAccountAbbreviation(accountNameMap[exp.account_id] || exp.account_id)}
                displayCategory={getCategoryDisplay(exp.category_id)}
                onStartEdit={() => setEditingId(exp.id)}
                onDelete={onDelete}
              />
            );
          })}
        </tbody>
      </table>
      <div className="ledger-pagination-strip" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.75rem 1rem', background: '#f7fafc', borderTop: '1px solid #e2e8f0',
        borderRadius: '0 0 6px 6px', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem'
      }}>
        <div style={{ fontSize: '0.85rem', color: '#4a5568' }}>
          Showing <strong>{expenses.length}</strong> entries of <strong>{totalCount || expenses.length}</strong> total records
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#4a5568' }}>Per Page:</span>
            <select 
              value={limit} 
              onChange={e => onLimitChange && onLimitChange(Number(e.target.value))}
              style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => page > 1 && onPageChange(1)}
              disabled={page === 1}
              className="inlineButton"
              style={{ padding: '0.25rem 0.5rem', opacity: page === 1 ? 0.5 : 1 }}
            >
              «
            </button>
            <button
              onClick={() => page > 1 && onPageChange(page - 1)}
              disabled={page === 1}
              className="inlineButton"
              style={{ padding: '0.25rem 0.5rem', opacity: page === 1 ? 0.5 : 1 }}
            >
              ‹
            </button>
            <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', color: '#2d3748', alignSelf: 'center' }}>
              Page <strong>{page}</strong> of {Math.ceil(totalCount / limit) || 1}
            </span>
            <button
              onClick={() => page < Math.ceil(totalCount / limit) && onPageChange(page + 1)}
              disabled={page >= Math.ceil(totalCount / limit)}
              className="inlineButton"
              style={{ padding: '0.25rem 0.5rem', opacity: page >= Math.ceil(totalCount / limit) ? 0.5 : 1 }}
            >
              ›
            </button>
            <button
              onClick={() => page < Math.ceil(totalCount / limit) && onPageChange(Math.ceil(totalCount / limit))}
              disabled={page >= Math.ceil(totalCount / limit)}
              className="inlineButton"
              style={{ padding: '0.25rem 0.5rem', opacity: page >= Math.ceil(totalCount / limit) ? 0.5 : 1 }}
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}