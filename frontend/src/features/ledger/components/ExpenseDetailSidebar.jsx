import { useState, useEffect, useCallback } from 'react';
import { expenseApi } from '../../../api/client';
import { holidaysApi } from '../../../api/client';
import { formatTransactionDate } from '../../../utils/calendarUtils';

export default function ExpenseDetailSidebar({ expense, accountNameMap, onClose, onUpdated }) {
  const [holidays, setHolidays] = useState([]);
  const [selectedHolidayId, setSelectedHolidayId] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadHolidays = useCallback(async () => {
    try {
      const data = await holidaysApi.getAll();
      setHolidays(data);
    } catch {
      // non-fatal
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadHolidays(); }, [loadHolidays]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedHolidayId(expense?.holiday_id != null ? String(expense.holiday_id) : '');
    setDirty(false);
  }, [expense]);

  if (!expense) return null;

  const cat = expense.category_metadata || {};
  const accountName = accountNameMap[expense.account_id] || `Account ${expense.account_id}`;

  const handleHolidayChange = (e) => {
    setSelectedHolidayId(e.target.value);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const holidayId = selectedHolidayId === '' ? null : parseInt(selectedHolidayId, 10);
      // expense.date arrives as "DD/MM/YYYY" from the API serializer; backend expects "YYYY-MM-DD"
      const [d, m, y] = expense.date.split('/');
      const isoDate = `${y}-${m}-${d}`;
      await expenseApi.update(expense.id, {
        account_id: expense.account_id,
        date: isoDate,
        amount: expense.amount,
        is_income: expense.is_income,
        description: expense.description,
        notes: expense.notes,
        category_id: expense.category_id,
        holiday_id: holidayId,
      });
      setDirty(false);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Failed to save expense detail', err);
    } finally {
      setSaving(false);
    }
  };

  const selectedHoliday = holidays.find(h => String(h.id) === selectedHolidayId);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
          zIndex: 200, backdropFilter: 'blur(1px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '360px',
        background: '#fff', zIndex: 201, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f7fafc' }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2d3748' }}>Transaction Details</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#718096', lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {/* Amount + type */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: expense.is_income ? '#22543d' : '#2d3748' }}>
              £{Number(expense.amount).toFixed(2)}
            </span>
            <span style={{ fontSize: '0.78rem', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600, background: expense.is_income ? '#c6f6d5' : '#fed7d7', color: expense.is_income ? '#22543d' : '#c53030' }}>
              {expense.is_income ? 'Income' : 'Expense'}
            </span>
          </div>

          <Field label="Description">{expense.description}</Field>
          <Field label="Date">{formatTransactionDate(expense.date)}</Field>
          <Field label="Account">{accountName}</Field>
          <Field label="Category">
            {cat.is_subcategory ? `${cat.parent_name} › ${cat.name}` : (cat.name || 'Uncategorized')}
          </Field>
          {expense.notes && <Field label="Notes">{expense.notes}</Field>}
          <Field label="Transaction ID"><span style={{ fontSize: '0.72rem', color: '#a0aec0', fontFamily: 'monospace' }}>{expense.transaction_hash?.slice(0, 16)}…</span></Field>

          {/* Holiday assignment — only for Holidays category and its subcategories */}
          {cat.parent_name === 'Holidays' && <>
            <div style={{ borderTop: '1px solid #e2e8f0' }} />
            <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#718096', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Holiday / Trip
            </label>
            <select
              value={selectedHolidayId}
              onChange={handleHolidayChange}
              style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.875rem', background: '#fff' }}
            >
              <option value="">— None —</option>
              {holidays.map(h => (
                <option key={h.id} value={h.id}>
                  {h.flag || '✈️'} {h.name}{h.destination ? ` · ${h.destination}` : ''}
                </option>
              ))}
            </select>

            {selectedHoliday && (
              <div style={{ marginTop: '0.6rem', padding: '0.6rem 0.75rem', background: '#ebf8ff', borderRadius: '6px', fontSize: '0.82rem', color: '#2b6cb0' }}>
                <div style={{ fontWeight: 600 }}>✈️ {selectedHoliday.name}</div>
                {selectedHoliday.destination && <div>📍 {selectedHoliday.destination}</div>}
                {(selectedHoliday.start_date || selectedHoliday.end_date) && (
                  <div style={{ color: '#4a5568', marginTop: '0.2rem' }}>
                    {selectedHoliday.start_date} → {selectedHoliday.end_date}
                  </div>
                )}
                {selectedHoliday.expense_count > 0 && (
                  <div style={{ marginTop: '0.2rem', color: '#4a5568' }}>
                    {selectedHoliday.expense_count} expense{selectedHoliday.expense_count !== 1 ? 's' : ''} · £{Number(selectedHoliday.total_spend).toFixed(2)} total
                  </div>
                )}
              </div>
            )}
          </div>
          </>}
        </div>

        {/* Footer */}
        {dirty && (
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="form__cancel" onClick={() => { setSelectedHolidayId(expense?.holiday_id != null ? String(expense.holiday_id) : ''); setDirty(false); }}>Discard</button>
            <button type="button" className="form__submit" style={{ background: '#3182ce', color: '#fff' }} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '0.875rem', color: '#2d3748' }}>{children}</div>
    </div>
  );
}
