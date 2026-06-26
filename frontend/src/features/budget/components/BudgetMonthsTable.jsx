import { useState, useEffect, useCallback } from 'react';
import { BUCKETS } from '../budgetConstants';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const UNTAGGED = { key: '', label: '— Untagged', colour: '#4a5568', bg: '#f7fafc', border: '#e2e8f0', rowBg: '#fafafa' };

function buildMonthList(startYM, endYM) {
  const months = [];
  let [y, m] = startYM.split('-').map(Number);
  const [ey, em] = endYM.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function colLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_LABELS[m - 1]} ${String(y).slice(2)}`;
}

function lastDayOf(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export default function BudgetMonthsTable({ categories, budgets = {}, bucketBudgets = {}, startMonth, endMonth, fetchRangeActuals }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const toggleSection = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const months = buildMonthList(startMonth, endMonth);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endDate = `${endMonth}-${String(lastDayOf(endMonth)).padStart(2, '0')}`;
      const result = await fetchRangeActuals(`${startMonth}-01`, endDate);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [fetchRangeActuals, startMonth, endMonth]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return <p style={{ color: '#4a5568', padding: '1rem 0' }}>Loading…</p>;
  }

  const { catMap, subMap } = data;

  const allRows = [];
  for (const cat of categories) {
    const hasSubs = cat.subcategories?.length > 0;
    const icon = cat.icon || '📁';
    if (hasSubs) {
      for (const sub of cat.subcategories) {
        allRows.push({
          id: sub.id, label: sub.name, parentLabel: `${icon} ${cat.name}`, isSub: true,
          bucket: sub.bucket || '', monthData: subMap[sub.name] || {},
          allocated: budgets[sub.id]?.amount ?? null,
        });
      }
    } else {
      allRows.push({
        id: cat.id, label: `${icon} ${cat.name}`, parentLabel: null, isSub: false,
        bucket: cat.bucket || '', monthData: catMap[cat.name] || {},
        allocated: budgets[cat.id]?.amount ?? null,
      });
    }
  }

  const rowTotal = (row) => months.reduce((s, mk) => s + (row.monthData[mk] || 0), 0);
  const fmt = (v) => v > 0 ? `£${v.toFixed(2)}` : '—';
  const fmtAlloc = (v) => v != null ? `£${v.toFixed(2)}` : '—';
  const fmtAvg = (total, divisor) => divisor > 0 ? `£${(total / divisor).toFixed(2)}` : '—';

  const COL_COUNT = 2 + months.length + 2;

  const sections = [
    ...BUCKETS.map(b => ({ def: b, rows: allRows.filter(r => r.bucket === b.key) })),
    { def: UNTAGGED, rows: allRows.filter(r => !r.bucket) },
  ].filter(s => s.rows.length > 0);

  const grandMonthTotals = months.map(mk => allRows.reduce((s, r) => s + (r.monthData[mk] || 0), 0));
  const grandTotal = grandMonthTotals.reduce((s, v) => s + v, 0);
  const grandAllocated = allRows.reduce((s, r) => s + (r.allocated || 0), 0);
  const grandMonthsWithData = grandMonthTotals.filter(v => v > 0).length;

  return (
    <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
      <table className="budgetTable" style={{ margin: 0, minWidth: '600px', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ minWidth: '160px', textAlign: 'left' }}>Category</th>
            <th style={{ minWidth: '100px' }}>Allocated</th>
            {months.map(mk => <th key={mk} style={{ minWidth: '72px' }}>{colLabel(mk)}</th>)}
            <th style={{ minWidth: '88px' }}>Total</th>
            <th style={{ minWidth: '88px', color: '#718096' }}>Avg/mo</th>
          </tr>
        </thead>
        <tbody>
          {sections.map(({ def, rows }) => {
            const sectionMonthTotals = months.map(mk => rows.reduce((s, r) => s + (r.monthData[mk] || 0), 0));
            const sectionTotal = sectionMonthTotals.reduce((s, v) => s + v, 0);
            const sectionAllocated = rows.reduce((s, r) => s + (r.allocated || 0), 0);
            const monthsWithData = sectionMonthTotals.filter(v => v > 0).length;
            const sectionAvg = monthsWithData > 0 ? sectionTotal / monthsWithData : null;
            const isCollapsed = !!collapsed[def.key];

            return [
              <tr
                key={`hdr-${def.key}`}
                onClick={() => toggleSection(def.key)}
                style={{ background: def.bg, borderTop: `3px solid ${def.border}`, borderBottom: `2px solid ${def.border}`, cursor: 'pointer', userSelect: 'none' }}
              >
                <td colSpan={COL_COUNT} style={{ padding: '0.55rem 0.875rem', fontWeight: 800, fontSize: '0.95rem', color: def.colour, letterSpacing: '0.01em' }}>
                  <span style={{ marginRight: '0.5rem' }}>{isCollapsed ? '▸' : '▾'}</span>
                  {def.label}
                  <span style={{ fontWeight: 500, fontSize: '0.82rem', color: '#4a5568', marginLeft: '1rem', gap: '1rem', display: 'inline-flex' }}>
                    {def.key && bucketBudgets[def.key] != null && (
                      <span>Monthly budget: <strong>£{Number(bucketBudgets[def.key]).toFixed(2)}</strong></span>
                    )}
                    {sectionAllocated > 0 && <span>Allocated: <strong>£{sectionAllocated.toFixed(2)}</strong></span>}
                    {sectionAvg != null && <span>Avg/mo: <strong style={{ color: def.colour }}>£{sectionAvg.toFixed(2)}</strong></span>}
                    <span>Total spent: <strong style={{ color: def.colour }}>£{sectionTotal.toFixed(2)}</strong></span>
                  </span>
                </td>
              </tr>,

              ...(!isCollapsed ? rows.map(row => {
                const total = rowTotal(row);
                const monthsWithRowData = months.filter(mk => (row.monthData[mk] || 0) > 0).length;
                return (
                  <tr key={row.id} style={{ background: def.rowBg }}>
                    <td className="budgetCategoryCell">
                      <div className="budgetCategoryCell__inner">
                        {row.isSub && (
                          <span style={{ fontSize: '0.72rem', color: '#718096', marginRight: '0.3rem' }}>
                            {row.parentLabel} ›
                          </span>
                        )}
                        <span>{row.label}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.82rem', color: '#718096' }}>
                      {fmtAlloc(row.allocated)}
                    </td>
                    {months.map(mk => {
                      const v = row.monthData[mk] || 0;
                      const overAlloc = row.allocated != null && v > row.allocated;
                      return (
                        <td key={mk} className="budgetActualCell" style={{ color: overAlloc ? '#e53e3e' : undefined }}>
                          {fmt(v)}
                        </td>
                      );
                    })}
                    <td className="budgetActualCell" style={{ fontWeight: 600 }}>{fmt(total)}</td>
                    <td className="budgetActualCell" style={{ color: '#718096' }}>{fmtAvg(total, monthsWithRowData)}</td>
                  </tr>
                );
              }) : []),
            ];
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 700, background: '#f7fafc' }}>
            <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>Total</td>
            <td style={{ textAlign: 'right', fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}>
              {grandAllocated > 0 ? `£${grandAllocated.toFixed(2)}` : '—'}
            </td>
            {grandMonthTotals.map((v, i) => (
              <td key={i} className="budgetActualCell" style={{ fontWeight: 700 }}>{fmt(v)}</td>
            ))}
            <td className="budgetActualCell" style={{ fontWeight: 700 }}>{fmt(grandTotal)}</td>
            <td className="budgetActualCell" style={{ fontWeight: 700, color: '#718096' }}>{fmtAvg(grandTotal, grandMonthsWithData)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
