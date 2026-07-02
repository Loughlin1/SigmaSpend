// src/features/ledger/components/LedgerTable/BulkActionsPanel.jsx
import { useState } from 'react';

const ACTION_CATEGORIZE = 'categorize';
const ACTION_DELETE     = 'delete';
const ACTION_TYPE       = 'type';
const ACTION_RECLASSIFY = 'reclassify';
const ACTION_EXPORT     = 'export';
const ACTION_HOLIDAY    = 'holiday';

export default function BulkActionsPanel({
  selectedCount,
  bulkCategory,
  setBulkCategory,
  bulkUpdating,
  onBulkCategorize,
  onBulkDelete,
  onBulkUpdateType,
  onBulkReclassify,
  onBulkExport,
  onBulkAssignHoliday,
  onClearSelection,
  categories,
  holidays = [],
}) {
  const [activeAction, setActiveAction] = useState('');
  const [bulkHolidayId, setBulkHolidayId] = useState('');

  if (selectedCount === 0) return null;

  const handleActionSelect = (e) => {
    setActiveAction(e.target.value);
  };

  const renderActionControls = () => {
    switch (activeAction) {
      case ACTION_CATEGORIZE:
        return (
          <>
            <select
              value={bulkCategory}
              onChange={e => setBulkCategory(e.target.value)}
              className="form-inline-input"
              style={{ margin: 0, padding: '0.35rem', width: '200px', fontSize: '0.85rem' }}
              disabled={bulkUpdating}
            >
              <option value="">❓ Move to Uncategorized</option>
              {categories.map(cat => (
                <optgroup key={cat.id} label={`${cat.icon || '📁'} ${cat.name}`}>
                  <option value={cat.id}>{cat.name} (All)</option>
                  {cat.subcategories?.map(sub => (
                    <option key={sub.id} value={sub.id}>🔹 {sub.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              onClick={onBulkCategorize}
              className="inlineButton"
              style={{ background: '#3182ce', color: 'white', padding: '0.35rem 1rem' }}
              disabled={bulkUpdating}
            >
              {bulkUpdating ? 'Updating...' : 'Apply Category'}
            </button>
          </>
        );

      case ACTION_TYPE:
        return (
          <>
            <button
              onClick={() => onBulkUpdateType(false)}
              className="inlineButton"
              style={{ background: '#2d3748', color: 'white', padding: '0.35rem 1rem' }}
              disabled={bulkUpdating}
            >
              {bulkUpdating ? 'Updating...' : '🔴 Mark as Expense'}
            </button>
            <button
              onClick={() => onBulkUpdateType(true)}
              className="inlineButton"
              style={{ background: '#276749', color: 'white', padding: '0.35rem 1rem' }}
              disabled={bulkUpdating}
            >
              {bulkUpdating ? 'Updating...' : '🟢 Mark as Income'}
            </button>
          </>
        );

      case ACTION_RECLASSIFY:
        return (
          <button
            onClick={onBulkReclassify}
            className="inlineButton"
            style={{ background: '#6b46c1', color: 'white', padding: '0.35rem 1rem' }}
            disabled={bulkUpdating}
          >
            {bulkUpdating ? 'Reclassifying...' : '⚡ Re-run Automation Rules'}
          </button>
        );

      case ACTION_EXPORT:
        return (
          <button
            onClick={onBulkExport}
            className="inlineButton"
            style={{ background: '#276749', color: 'white', padding: '0.35rem 1rem' }}
            disabled={bulkUpdating}
          >
            📥 Export to CSV
          </button>
        );

      case ACTION_HOLIDAY:
        return (
          <>
            <select
              value={bulkHolidayId}
              onChange={e => setBulkHolidayId(e.target.value)}
              className="form-inline-input"
              style={{ margin: 0, padding: '0.35rem', width: '200px', fontSize: '0.85rem' }}
              disabled={bulkUpdating}
            >
              <option value="">— None (unlink) —</option>
              {holidays.map(h => (
                <option key={h.id} value={h.id}>
                  {h.flag} {h.name}{h.destination ? ` · ${h.destination}` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => onBulkAssignHoliday(bulkHolidayId === '' ? null : parseInt(bulkHolidayId, 10))}
              className="inlineButton"
              style={{ background: '#2b6cb0', color: 'white', padding: '0.35rem 1rem' }}
              disabled={bulkUpdating}
            >
              {bulkUpdating ? 'Updating...' : 'Assign Holiday'}
            </button>
          </>
        );

      case ACTION_DELETE:
        return (
          <button
            onClick={onBulkDelete}
            className="inlineButton"
            style={{ background: '#c53030', color: 'white', padding: '0.35rem 1rem' }}
            disabled={bulkUpdating}
          >
            {bulkUpdating ? 'Deleting...' : '🗑️ Delete Selected'}
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'sticky', top: '10px', zIndex: 10, display: 'flex', flexWrap: 'wrap',
      alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
      background: '#ebf8ff', border: '1px solid #bee3f8', padding: '0.75rem 1rem',
      borderRadius: '6px', marginBottom: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
    }}>
      <span style={{ fontSize: '0.9rem', color: '#2b6cb0', fontWeight: '500' }}>
        Selected <strong>{selectedCount}</strong> transaction{selectedCount !== 1 ? 's' : ''}
      </span>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={activeAction}
          onChange={handleActionSelect}
          className="form-inline-input"
          style={{ margin: 0, padding: '0.35rem', fontSize: '0.85rem', minWidth: '160px' }}
          disabled={bulkUpdating}
        >
          <option value="">Actions ▾</option>
          <option value={ACTION_CATEGORIZE}>🏷️ Categorize</option>
          <option value={ACTION_HOLIDAY}>✈️ Assign Holiday</option>
          <option value={ACTION_TYPE}>🔄 Toggle Type</option>
          <option value={ACTION_RECLASSIFY}>⚡ Re-run Rules</option>
          <option value={ACTION_EXPORT}>📥 Export CSV</option>
          <option value={ACTION_DELETE}>🗑️ Delete</option>
        </select>
        {renderActionControls()}
        <button
          onClick={() => { onClearSelection(); setActiveAction(''); }}
          className="inlineButton"
          style={{ padding: '0.35rem 0.75rem' }}
          disabled={bulkUpdating}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
