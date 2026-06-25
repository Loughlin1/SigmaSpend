// src/features/bank-accounts/components/BankAccountList/AccountRowRead.jsx

export default function AccountRowRead({ account, onStartEdit }) {
  return (
    <tr>
      <td style={{ 
        fontSize: '0.85rem', whiteSpace: 'normal', wordBreak: 'break-word', 
        minWidth: '120px', maxWidth: '180px', verticalAlign: 'top' 
      }}>
        <strong style={{ color: '#2d3748' }}>{account.account_name}</strong>
      </td>
      <td>{account.bank_name}</td>
      <td>{account.amount_style}</td>
      <td>
        {account.invert_amounts ? (
          <span style={{ 
            background: '#fff5f5', color: '#c53030', padding: '2px 6px', 
            borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #fed7d7' 
          }}>
            🔄 Inverted (Credit)
          </span>
        ) : (
          <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Standard</span>
        )}
      </td>
      <td style={{ fontSize: '0.85rem', whiteSpace: 'normal', wordBreak: 'break-word', minWidth: '180px', maxWidth: '250px' }}>
        <div>Date: {account.mappings?.date_column}</div>
        <div>Description: {account.mappings?.description_column}</div>
        {account.amount_style === 'single_column' ? (
          <div>Amount: {account.mappings?.amount_column}</div>
        ) : (
          <>
            <div>Credit: {account.mappings?.amount_in_column}</div>
            <div>Debit: {account.mappings?.amount_out_column}</div>
          </>
        )}
        {account.mappings?.pdf_regex && (
          <div style={{ marginTop: '0.35rem' }}>
            <span style={{ color: '#718096' }}>PDF Regex:</span>
            <code style={{ display: 'block', fontSize: '0.7rem', wordBreak: 'break-all', color: '#553c9a', marginTop: '0.1rem' }}>
              {account.mappings.pdf_regex}
            </code>
          </div>
        )}
        {account.mappings?.pdf_header_bypass && (
          <div style={{ marginTop: '0.25rem' }}>
            <span style={{ color: '#718096' }}>Header Bypass:</span>{' '}
            <code style={{ fontSize: '0.75rem', color: '#553c9a' }}>{account.mappings.pdf_header_bypass}</code>
          </div>
        )}
      </td>
      <td style={{ textAlign: 'center' }}>
        <button onClick={() => onStartEdit(account)}>Edit</button>
      </td>
    </tr>
  );
}