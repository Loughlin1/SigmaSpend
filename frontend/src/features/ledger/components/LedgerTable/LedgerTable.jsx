// src/features/ledger/components/LedgerTable/LedgerTable.jsx
import { useState } from 'react';
import { expenseApi } from '../../../../api/client';
import BulkActionsPanel from './BulkActionsPanel';
import LedgerRowEdit from './LedgerRowEdit';
import LedgerRowRead from './LedgerRowRead';
import ConfirmationModal from '../../../../components/ui/ConfirmationModal';
import CustomModal from '../../../../components/ui/CustomModal';
import { getAccountAbbreviation, getCategoryDisplay } from '../../../../utils/formatters';

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
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const [density, setDensity] = useState('compact'); // 'compact' | 'comfortable'

  // Success Modal States
  const [showBulkSuccess, setShowBulkSuccess] = useState(false);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState('');

  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });

  const triggerErrorModal = (title, message) => {
    setErrorModal({ isOpen: true, title, message });
  };

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? expenses.map(exp => exp.id) : []);
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const finishBulkSuccess = (message) => {
    setBulkSuccessMessage(message);
    setShowBulkSuccess(true);
    setSelectedIds([]);
    setBulkCategory("");
  };

  const handleBulkCategorize = async () => {
    if (!selectedIds.length) return;
    setBulkUpdating(true);
    try {
      const catId = bulkCategory === "" ? null : parseInt(bulkCategory, 10);
      await expenseApi.bulkClassify(selectedIds, catId);
      finishBulkSuccess(`Categorized ${selectedIds.length} transaction${selectedIds.length !== 1 ? 's' : ''}.`);
    } catch (err) {
      console.error("[SigmaSpend UI] Bulk classify failed:", err);
      triggerErrorModal("Bulk Classification Failed", "Could not apply batch categories.");
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkDeletePending(false);
    setBulkUpdating(true);
    try {
      await expenseApi.bulkDelete(selectedIds);
      finishBulkSuccess(`Deleted ${selectedIds.length} transaction${selectedIds.length !== 1 ? 's' : ''}.`);
    } catch (err) {
      console.error("[SigmaSpend UI] Bulk delete failed:", err);
      triggerErrorModal("Bulk Delete Failed", "Could not delete selected transactions.");
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkUpdateType = async (isIncome) => {
    if (!selectedIds.length) return;
    setBulkUpdating(true);
    try {
      await expenseApi.bulkUpdateType(selectedIds, isIncome);
      finishBulkSuccess(`Marked ${selectedIds.length} transaction${selectedIds.length !== 1 ? 's' : ''} as ${isIncome ? 'Income' : 'Expense'}.`);
    } catch (err) {
      console.error("[SigmaSpend UI] Bulk type update failed:", err);
      triggerErrorModal("Bulk Update Failed", "Could not update transaction types.");
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkReclassify = async () => {
    if (!selectedIds.length) return;
    setBulkUpdating(true);
    try {
      const result = await expenseApi.bulkReclassify(selectedIds);
      finishBulkSuccess(`Re-ran automation rules on ${result.updated} transaction${result.updated !== 1 ? 's' : ''}.`);
    } catch (err) {
      console.error("[SigmaSpend UI] Bulk reclassify failed:", err);
      triggerErrorModal("Re-classification Failed", "Could not re-run automation rules.");
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkExport = () => {
    if (!selectedIds.length) return;
    const selected = expenses.filter(e => selectedIds.includes(e.id));
    const headers = ['ID', 'Date', 'Description', 'Amount', 'Type', 'Category', 'Notes', 'Account'];
    const rows = selected.map(e => [
      e.id,
      e.date,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.amount,
      e.is_income ? 'Income' : 'Expense',
      `"${(e.category_metadata?.full_path || 'Uncategorized').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      e.account_id,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sigmaspend_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRowSave = async (payload) => {
    try {
      if (typeof onExpenseSaved === 'function') await onExpenseSaved(payload);
      setEditingId(null);
    } catch (err) {
      console.error("[SigmaSpend UI] Network thread halted inside handleRowSave:", err);
      triggerErrorModal(
        "Save Interrupted", 
        "Could not save transaction modifications. Please check your local network connections and verify the backend service port."
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId && typeof onDelete === 'function') {
      await onDelete(deleteTargetId);
    }
    setDeleteTargetId(null);
  };

  const rowPadding = density === 'compact' ? '0.3rem 0.6rem' : '0.75rem 1rem';

  return (
    <div className="ledger-table-container" style={{ position: 'relative' }}>

      {/* Density toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e0' }}>
          {['compact', 'comfortable'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDensity(d)}
              style={{
                padding: '0.2rem 0.6rem',
                fontSize: '0.75rem',
                border: 'none',
                borderLeft: d === 'comfortable' ? '1px solid #cbd5e0' : 'none',
                cursor: 'pointer',
                background: density === d ? '#3182ce' : '#fff',
                color: density === d ? '#fff' : '#4a5568',
                fontWeight: density === d ? 600 : 400,
              }}
            >
              {d === 'compact' ? '≡ Compact' : '☰ Comfortable'}
            </button>
          ))}
        </div>
      </div>

      <BulkActionsPanel
        selectedCount={selectedIds.length}
        bulkCategory={bulkCategory}
        setBulkCategory={setBulkCategory}
        bulkUpdating={bulkUpdating}
        onBulkCategorize={handleBulkCategorize}
        onBulkDelete={() => setBulkDeletePending(true)}
        onBulkUpdateType={handleBulkUpdateType}
        onBulkReclassify={handleBulkReclassify}
        onBulkExport={handleBulkExport}
        onClearSelection={() => setSelectedIds([])}
        categories={categories}
      />

      <table className="table ledger-table-view" style={{ width: '100%', fontSize: density === 'compact' ? '0.82rem' : '0.875rem' }}>
        <thead>
          <tr>
            <th style={{ width: '4%', textAlign: 'center', padding: rowPadding }}>
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={expenses.length > 0 && selectedIds.length === expenses.length}
              />
            </th>
            <th style={{ width: '10%', padding: rowPadding }}>Date</th>
            <th style={{ width: '20%', padding: rowPadding }}>Description</th>
            <th style={{ width: '9%', padding: rowPadding }}>Account</th>
            <th style={{ width: '14%', padding: rowPadding }}>Category</th>
            <th style={{ width: '16%', padding: rowPadding }}>Notes</th>
            <th style={{ width: '8%', padding: rowPadding }}>Type</th>
            <th style={{ width: '11%', padding: rowPadding }}>Amount</th>
            <th style={{ width: '7%', textAlign: 'center', padding: rowPadding }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.length === 0 && (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#718096' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>No transactions found</div>
                <div style={{ fontSize: '0.85rem' }}>Try adjusting your filters, or upload a statement above to get started.</div>
              </td>
            </tr>
          )}
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
                  rowPadding={rowPadding}
                />
              );
            }

            return (
              <LedgerRowRead
                key={exp.id}
                expense={exp}
                isChecked={selectedIds.includes(exp.id)}
                onSelectRow={() => handleSelectRow(exp.id)}
                rowPadding={rowPadding}
                displayAccountName={getAccountAbbreviation(accountNameMap[exp.account_id] || exp.account_id)}
                displayCategory={getCategoryDisplay(exp.category_id, categories)}
                onStartEdit={() => setEditingId(exp.id)}
                onDelete={setDeleteTargetId}
              />
            );
          })}
        </tbody>
      </table>

      {/* Pagination Controls Strip */}
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
            <button onClick={() => page > 1 && onPageChange(1)} disabled={page === 1} className="inlineButton" style={{ padding: '0.25rem 0.5rem', opacity: page === 1 ? 0.5 : 1 }}>«</button>
            <button onClick={() => page > 1 && onPageChange(page - 1)} disabled={page === 1} className="inlineButton" style={{ padding: '0.25rem 0.5rem', opacity: page === 1 ? 0.5 : 1 }}>‹</button>
            <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', color: '#2d3748', alignSelf: 'center' }}>
              Page <strong>{page}</strong> of {Math.ceil(totalCount / limit) || 1}
            </span>
            <button onClick={() => page < Math.ceil(totalCount / limit) && onPageChange(page + 1)} disabled={page >= Math.ceil(totalCount / limit)} className="inlineButton" style={{ padding: '0.25rem 0.5rem', opacity: page >= Math.ceil(totalCount / limit) ? 0.5 : 1 }}>›</button>
            <button onClick={() => page < Math.ceil(totalCount / limit) && onPageChange(Math.ceil(totalCount / limit))} disabled={page >= Math.ceil(totalCount / limit)} className="inlineButton" style={{ padding: '0.25rem 0.5rem', opacity: page >= Math.ceil(totalCount / limit) ? 0.5 : 1 }}>»</button>
          </div>
        </div>
      </div>

      {/* Single-row delete confirmation */}
      <ConfirmationModal
        isOpen={deleteTargetId !== null}
        title="Delete Transaction"
        message="Are you sure you want to permanently delete this transaction record? This will alter your historical balances and aggregation summaries."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Bulk delete confirmation */}
      <ConfirmationModal
        isOpen={bulkDeletePending}
        title={`Delete ${selectedIds.length} Transaction${selectedIds.length !== 1 ? 's' : ''}`}
        message={`Are you sure you want to permanently delete ${selectedIds.length} selected transaction${selectedIds.length !== 1 ? 's' : ''}? This cannot be undone and will affect your historical totals.`}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeletePending(false)}
      />

      {/* Bulk action success modal */}
      <CustomModal
        isOpen={showBulkSuccess}
        onClose={async () => {
          setShowBulkSuccess(false);
          if (typeof onBulkUpdateSuccess === 'function') {
            await onBulkUpdateSuccess();
          }
        }}
        title="Bulk Action Complete"
        variant="success"
      >
        {bulkSuccessMessage}
      </CustomModal>

      {/* ◄ New Generic CustomModal Instance catching operational faults */}
      <CustomModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        variant="danger"
        confirmText="Dismiss"
      >
        {errorModal.message}
      </CustomModal>
    </div>
  );
}