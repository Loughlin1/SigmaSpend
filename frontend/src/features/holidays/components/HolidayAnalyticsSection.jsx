import { useState, useEffect, useCallback } from 'react';
import { holidaysApi } from '../../../api/client';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function nights(start, end) {
  if (!start || !end) return null;
  return Math.round((new Date(end) - new Date(start)) / 86400000);
}

const CAT_COLOURS = [
  '#3182ce','#e53e3e','#38a169','#d69e2e','#805ad5','#dd6b20',
  '#00b5d8','#d53f8c','#2f855a','#c05621','#553c9a','#b7791f',
];

function PieChart({ slices }) {
  if (!slices.length) return null;
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  const cumulative = slices.reduce((acc, sl) => {
    const prev = acc.length ? acc[acc.length - 1].end : 0;
    return [...acc, { ...sl, start: prev, end: prev + sl.value / total }];
  }, []);

  const paths = cumulative.map((sl, i) => {
    const startAngle = sl.start * 2 * Math.PI - Math.PI / 2;
    const endAngle = sl.end * 2 * Math.PI - Math.PI / 2;
    const r = 60;
    const cx = 70, cy = 70;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = (sl.end - sl.start) > 0.5 ? 1 : 0;
    return (
      <path
        key={i}
        d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
        fill={sl.colour}
        stroke="#fff"
        strokeWidth="1.5"
      />
    );
  });

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {paths}
    </svg>
  );
}


function HolidayCard({ holiday }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    holidaysApi.getSummary(holiday.id)
      .then(setSummary)
      .catch(() => setSummary([]))
      .finally(() => setLoading(false));
  }, [holiday.id]);

  const n = nights(holiday.start_date, holiday.end_date);
  const icon = holiday.flag || '✈️';

  // Process summary rows
  const subRows = (summary || []).filter(r => r.type === 'subcategory' && parseFloat(r.total_expenses) > 0);
  const parentRows = (summary || []).filter(r => r.type === 'category' && r.category_name !== 'Uncategorized' && parseFloat(r.total_expenses) > 0);

  // Aggregate subcategories across all periods
  const subMap = {};
  subRows.forEach(r => {
    const label = r.parent_name && r.parent_name !== r.category_name ? `${r.parent_name} › ${r.category_name}` : r.category_name;
    subMap[label] = (subMap[label] || 0) + parseFloat(r.total_expenses);
  });

  // Compute direct (parent − its subcategory sum) to catch expenses assigned to parent category itself
  const parentTotals = {};
  parentRows.forEach(r => { parentTotals[r.category_name] = (parentTotals[r.category_name] || 0) + parseFloat(r.total_expenses); });
  const subByParent = {};
  subRows.forEach(r => { if (r.parent_name) subByParent[r.parent_name] = (subByParent[r.parent_name] || 0) + parseFloat(r.total_expenses); });

  const directEntries = Object.entries(parentTotals)
    .map(([name, total]) => { const direct = total - (subByParent[name] || 0); return direct > 0.01 ? [`${name} (Direct)`, direct] : null; })
    .filter(Boolean);

  const catSorted = [...Object.entries(subMap), ...directEntries].sort((a, b) => b[1] - a[1]);

  const slices = catSorted.map(([name, value], i) => ({ name, value, colour: CAT_COLOURS[i % CAT_COLOURS.length] }));
  const totalSpend = Object.values(parentTotals).reduce((s, v) => s + v, 0);

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2d3748' }}>{icon} {holiday.name}</div>
          {holiday.destination && <div style={{ fontSize: '0.82rem', color: '#718096', marginTop: '0.1rem' }}>📍 {holiday.destination}</div>}
          {(holiday.start_date || holiday.end_date) && (
            <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '0.1rem' }}>
              {fmt(holiday.start_date)} → {fmt(holiday.end_date)}{n !== null ? ` · ${n} nights` : ''}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d3748' }}>£{totalSpend.toFixed(2)}</div>
          <div style={{ fontSize: '0.78rem', color: '#718096' }}>{holiday.expense_count} expense{holiday.expense_count !== 1 ? 's' : ''}</div>
          {n ? <div style={{ fontSize: '0.78rem', color: '#718096' }}>£{(totalSpend / n).toFixed(2)}/night</div> : null}
        </div>
      </div>

      {loading && <p style={{ color: '#a0aec0', fontSize: '0.85rem' }}>Loading…</p>}

      {!loading && totalSpend === 0 && (
        <p style={{ color: '#a0aec0', fontSize: '0.85rem' }}>No expenses linked to this holiday yet.</p>
      )}

      {!loading && totalSpend > 0 && (
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
          <PieChart slices={slices} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
            {catSorted.map(([name, val], i) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: CAT_COLOURS[i % CAT_COLOURS.length], flexShrink: 0 }} />
                <span style={{ color: '#4a5568' }}>{name}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#2d3748' }}>£{val.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HolidayAnalyticsSection() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    holidaysApi.getAll()
      .then(setHolidays)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const withExpenses = holidays.filter(h => h.expense_count > 0);

  return (
    <section className="sectionCard sectionCard--primary">
      <div className="account-list__header" onClick={() => setIsCollapsed(p => !p)} style={{ cursor: 'pointer' }}>
        <h3 style={{ margin: 0 }}>Holiday Summaries</h3>
        <button className="collapse-button" type="button">{isCollapsed ? '▸' : '▾'}</button>
      </div>

      {!isCollapsed && (
        <div style={{ marginTop: '1rem' }}>
          {loading && <p style={{ color: '#718096', fontSize: '0.875rem' }}>Loading…</p>}
          {!loading && withExpenses.length === 0 && (
            <p style={{ color: '#718096', fontSize: '0.875rem' }}>No holidays with linked expenses yet. Assign expenses to a holiday in the ledger sidebar.</p>
          )}
          {!loading && withExpenses.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '1rem' }}>
              {withExpenses.map(h => <HolidayCard key={h.id} holiday={h} />)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
