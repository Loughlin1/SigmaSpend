import { useState } from 'react';
import useHolidays from '../hooks/useHolidays';

const EMPTY_FORM = { name: '', destination: '', start_date: '', end_date: '', notes: '' };

function HolidayForm({ initial = EMPTY_FORM, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: form.name.trim(),
      destination: form.destination.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="form" style={{ marginTop: '0.75rem' }}>
      <div className="form__grid">
        <input
          className="form-inline-input"
          placeholder="Trip name *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          required
        />
        <input
          className="form-inline-input"
          placeholder="Destination"
          value={form.destination}
          onChange={e => set('destination', e.target.value)}
        />
        <input
          className="form-inline-input"
          type="date"
          placeholder="Start date"
          value={form.start_date}
          onChange={e => set('start_date', e.target.value)}
        />
        <input
          className="form-inline-input"
          type="date"
          placeholder="End date"
          value={form.end_date}
          onChange={e => set('end_date', e.target.value)}
        />
        <input
          className="form-inline-input"
          placeholder="Notes"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          style={{ gridColumn: '1 / -1' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
        <button type="button" className="form__cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="form__submit" style={{ background: '#3182ce', color: '#fff' }}>Save</button>
      </div>
    </form>
  );
}

function HolidayRow({ holiday, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const nights = holiday.start_date && holiday.end_date
    ? Math.round((new Date(holiday.end_date) - new Date(holiday.start_date)) / 86400000)
    : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'start', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>✈️ {holiday.name}</span>
          {holiday.destination && (
            <span style={{ fontSize: '0.82rem', color: '#718096' }}>📍 {holiday.destination}</span>
          )}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '0.2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {(holiday.start_date || holiday.end_date) && (
            <span>{fmt(holiday.start_date)} → {fmt(holiday.end_date)}{nights !== null ? ` (${nights}n)` : ''}</span>
          )}
          {holiday.expense_count > 0 && (
            <span>{holiday.expense_count} expense{holiday.expense_count !== 1 ? 's' : ''} · <strong>£{Number(holiday.total_spend).toFixed(2)}</strong></span>
          )}
          {holiday.notes && <span style={{ fontStyle: 'italic' }}>{holiday.notes}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <button type="button" className="inlineButton" onClick={() => onEdit(holiday)} style={{ fontSize: '0.78rem' }}>Edit</button>
        {confirming ? (
          <>
            <button type="button" className="inlineButton" style={{ fontSize: '0.78rem', color: '#e53e3e', borderColor: '#feb2b2' }} onClick={() => onDelete(holiday.id)}>Confirm</button>
            <button type="button" className="inlineButton" style={{ fontSize: '0.78rem' }} onClick={() => setConfirming(false)}>Cancel</button>
          </>
        ) : (
          <button type="button" className="inlineButton" style={{ fontSize: '0.78rem', color: '#e53e3e', borderColor: '#feb2b2' }} onClick={() => setConfirming(true)}>Delete</button>
        )}
      </div>
    </div>
  );
}

export default function HolidayList() {
  const { holidays, loading, error, createHoliday, updateHoliday, deleteHoliday } = useHolidays();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);

  const handleCreate = async (data) => {
    await createHoliday(data);
    setShowForm(false);
  };

  const handleUpdate = async (data) => {
    await updateHoliday(editingHoliday.id, data);
    setEditingHoliday(null);
  };

  const handleEdit = (holiday) => {
    setShowForm(false);
    setEditingHoliday(holiday);
  };

  return (
    <div className="sectionCard" style={{ marginTop: '1rem' }}>
      <div className="account-list__header" onClick={() => setIsCollapsed(p => !p)}>
        <h3>Holidays & Trips</h3>
        <button className="collapse-button" type="button">{isCollapsed ? '▸' : '▾'}</button>
      </div>

      {!isCollapsed && (
        <div style={{ marginTop: '0.75rem' }}>
          {error && <p className="errorText">Failed to load holidays.</p>}
          {loading ? (
            <p style={{ color: '#718096', fontSize: '0.875rem' }}>Loading…</p>
          ) : holidays.length === 0 && !showForm ? (
            <p style={{ color: '#718096', fontSize: '0.875rem' }}>No holidays yet.</p>
          ) : (
            holidays.map(h => (
              editingHoliday?.id === h.id ? (
                <HolidayForm
                  key={h.id}
                  initial={{
                    name: h.name,
                    destination: h.destination || '',
                    start_date: h.start_date || '',
                    end_date: h.end_date || '',
                    notes: h.notes || '',
                  }}
                  onSave={handleUpdate}
                  onCancel={() => setEditingHoliday(null)}
                />
              ) : (
                <HolidayRow
                  key={h.id}
                  holiday={h}
                  onEdit={handleEdit}
                  onDelete={deleteHoliday}
                />
              )
            ))
          )}

          {showForm ? (
            <HolidayForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
          ) : (
            <button
              type="button"
              className="inlineButton"
              style={{ marginTop: '0.75rem' }}
              onClick={() => { setEditingHoliday(null); setShowForm(true); }}
            >
              + Add Holiday / Trip
            </button>
          )}
        </div>
      )}
    </div>
  );
}
