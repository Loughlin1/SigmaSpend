// src/features/automation/components/RuleRow.jsx

export default function RuleRow({ rule, onStartEdit, onDeleteRule }) {
  return (
    <tr>
      <td style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#e53e3e', textAlign: 'left', verticalAlign: 'middle' }}>
        "{rule.keyword}"
      </td>
      <td style={{ fontSize: '0.85rem', color: '#4a5568', textAlign: 'left', textTransform: 'capitalize', verticalAlign: 'middle' }}>
        {rule.match_field || 'Description'}
      </td>
      <td style={{ fontWeight: '600', textAlign: 'left', verticalAlign: 'middle' }}>
        {rule.category?.icon} {rule.category?.name || `Category #${rule.category_id}`}
      </td>
      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
          <button 
            type="button" 
            onClick={() => onStartEdit(rule)}
            style={{ padding: '2px 8px', background: '#edf2f7', color: '#4a5568', border: '1px solid #cbd5e0', borderRadius: '4px', cursor: 'pointer' }}
          >
            ✏️
          </button>
          <button 
            type="button" 
            onClick={() => onDeleteRule && onDeleteRule(rule.id)}
            style={{ padding: '2px 8px', background: '#fff5f5', color: '#c53030', border: '1px solid #fed7d7', borderRadius: '4px', cursor: 'pointer' }}
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
}