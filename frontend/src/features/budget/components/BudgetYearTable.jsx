import { useState, useEffect, useCallback } from 'react';
import { BUCKETS } from '../budgetConstants';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthKey(year, monthIdx) {
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
}

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth(); // 0-indexed

const UNTAGGED = { key: '', label: '— Untagged', colour: '#4a5568', bg: '#f7fafc', border: '#e2e8f0', rowBg: '#fafafa' };

export default function BudgetYearTable({ categories, budgets = {}, bucketBudgets = {}, year, fetchYearActuals }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const toggleSection = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchYearActuals(year);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [fetchYearActuals, year]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return <p style={{ color: '#4a5568', padding: '1rem 0' }}>Loading year data…</p>;
  }

  const { catMap, subMap } = data;

  // Build all rows with their bucket key
  const allRows = [];
  for (const cat of categories) {
    const hasSubs = cat.subcategories?.length > 0;
    const icon = cat.icon || '📁';
    if (hasSubs) {
      for (const sub of cat.subcategories) {
        allRows.push({
          id: sub.id,
          label: sub.name,
          parentLabel: `${icon} ${cat.name}`,
          isSub: true,
          bucket: sub.bucket || '',
          monthData: subMap[sub.name] || {},
          allocated: budgets[sub.id]?.amount ?? null,
        });
      }
    } else {
      allRows.push({
        id: cat.id,
        label: `${icon} ${cat.name}`,
        parentLabel: null,
        isSub: false,
        bucket: cat.bucket || '',
        monthData: catMap[cat.name] || {},
        allocated: budgets[cat.id]?.amount ?? null,
      });
    }
  }

  const isCurrentYear = year === CURRENT_YEAR;
  const avgMonths = isCurrentYear ? CURRENT_MONTH + 1 : 12;
  const avgLabel = isCurrentYear ? 'YTD Avg' : 'Avg/mo';

  const rowTotal = (row) => MONTHS.reduce((s, _, mi) => s + (row.monthData[monthKey(year, mi)] || 0), 0);
  const fmt = (v) => v > 0 ? `£${v.toFixed(2)}` : '—';
  const fmtAlloc = (v) => v != null ? `£${v.toFixed(2)}` : '—';
  const fmtAvg = (total) => avgMonths > 0 ? `£${(total / avgMonths).toFixed(2)}` : '—';

  const COL_COUNT = 2 + MONTHS.length + 2; // Category + Allocated + 12 months + Total + Avg

  const sections = [
    ...BUCKETS.map(b => ({ def: b, rows: allRows.filter(r => r.bucket === b.key) })),
    { def: UNTAGGED, rows: allRows.filter(r => !r.bucket) },
  ].filter(s => s.rows.length > 0);

  // Grand totals across all rows
  const grandMonthTotals = MONTHS.map((_, mi) =>
    allRows.reduce((s, r) => s + (r.monthData[monthKey(year, mi)] || 0), 0)
  );
  const grandTotal = grandMonthTotals.reduce((s, v) => s + v, 0);
  const grandAllocated = allRows.reduce((s, r) => s + (r.allocated || 0), 0);

  return (
    <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
      <table className="budgetTable" style={{ margin: 0, minWidth: '900px', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ minWidth: '160px', textAlign: 'left' }}>Category</th>
            <th style={{ minWidth: '100px' }}>Allocated</th>
            {MONTHS.map(m => <th key={m} style={{ minWidth: '72px' }}>{m}</th>)}
            <th style={{ minWidth: '88px' }}>Total</th>
            <th style={{ minWidth: '88px', color: '#718096' }}>{avgLabel}</th>
          </tr>
        </thead>
        <tbody>
          {sections.map(({ def, rows }) => {
            const sectionMonthTotals = MONTHS.map((_, mi) =>
              rows.reduce((s, r) => s + (r.monthData[monthKey(year, mi)] || 0), 0)
            );
            const sectionTotal = sectionMonthTotals.reduce((s, v) => s + v, 0);
            const sectionAllocated = rows.reduce((s, r) => s + (r.allocated || 0), 0);
            const monthsWithData = sectionMonthTotals.filter(v => v > 0).length;
            const sectionAvg = monthsWithData > 0 ? sectionTotal / monthsWithData : null;
            const isCollapsed = !!collapsed[def.key];

            return [
              // Bucket header row
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

              // Category rows (hidden when collapsed)
              ...(!isCollapsed ? rows.map(row => {
                const total = rowTotal(row);
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
                    {MONTHS.map((_, mi) => {
                      const v = row.monthData[monthKey(year, mi)] || 0;
                      const overAlloc = row.allocated != null && v > row.allocated;
                      return (
                        <td key={mi} className="budgetActualCell" style={{ color: overAlloc ? '#e53e3e' : undefined }}>
                          {fmt(v)}
                        </td>
                      );
                    })}
                    <td className="budgetActualCell" style={{ fontWeight: 600 }}>{fmt(total)}</td>
                    <td className="budgetActualCell" style={{ color: '#718096' }}>{fmtAvg(total)}</td>
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
            {grandMonthTotals.map((v, mi) => (
              <td key={mi} className="budgetActualCell" style={{ fontWeight: 700 }}>{fmt(v)}</td>
            ))}
            <td className="budgetActualCell" style={{ fontWeight: 700 }}>{fmt(grandTotal)}</td>
            <td className="budgetActualCell" style={{ fontWeight: 700, color: '#718096' }}>{fmtAvg(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
