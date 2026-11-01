// src/features/ledger/components/CategorySearchSelect.jsx
import { useState, useEffect, useRef } from 'react';

const UNCATEGORIZED_LABEL = '❓ Uncategorized';

function buildOptions(categories) {
  return [
    { label: UNCATEGORIZED_LABEL, value: '' },
    ...categories.flatMap(cat => {
      const icon = cat.icon || '📁';
      return [
        { label: `${icon} ${cat.name} (All)`, value: String(cat.id), isParent: true },
        ...(cat.subcategories?.map(sub => ({ label: `🔹 ${sub.name}`, value: String(sub.id) })) || []),
      ];
    }),
  ];
}

// Single-select, searchable category picker. `value` is a category/subcategory
// id as a string (or '' for Uncategorized), matching the plain <select> it replaces.
export default function CategorySearchSelect({ value, onChange, categories, disabled, style }) {
  const [inputVal, setInputVal] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const allOptions = buildOptions(categories);
  const selectedLabel = allOptions.find(o => o.value === String(value ?? ''))?.label || UNCATEGORIZED_LABEL;

  const filtered = inputVal
    ? allOptions.filter(o => o.label.toLowerCase().includes(inputVal.toLowerCase()))
    : allOptions;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setInputVal('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (optValue) => {
    onChange(optValue);
    setInputVal('');
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <input
        type="text"
        role="combobox"
        aria-label="Category"
        aria-expanded={open}
        value={open ? inputVal : selectedLabel}
        disabled={disabled}
        onFocus={() => { setOpen(true); setInputVal(''); }}
        onChange={e => { setInputVal(e.target.value); setOpen(true); }}
        className="form-inline-input"
        style={{ margin: 0, padding: '0.35rem', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
      />

      {open && (
        <ul style={{
          position: 'absolute', zIndex: 100, top: '100%', left: 0, right: 0,
          background: '#fff', border: '1px solid #cbd5e0', borderRadius: '6px',
          margin: '2px 0 0', padding: 0, listStyle: 'none',
          maxHeight: '220px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          {filtered.length === 0 && (
            <li style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', color: '#a0aec0' }}>No matches</li>
          )}
          {filtered.map(opt => (
            <li
              key={opt.value || 'uncategorized'}
              role="option"
              aria-selected={opt.value === String(value ?? '')}
              onMouseDown={e => { e.preventDefault(); select(opt.value); }}
              style={{ padding: '0.45rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: opt.isParent ? 600 : 400, color: '#2d3748', whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.background = '#ebf8ff'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
