import React from 'react';

export default function BankAccountList({ accounts, loading, error }) {
  return (
    <div className="account-list" style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', background: '#fff' }}>
      <h3>Bank Accounts</h3>
      {error ? (
        <div style={{ color: '#cc0000', marginBottom: '1rem' }}>
          {error}
        </div>
      ) : null}
      {loading ? (
        <div>Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <div>No bank accounts found in the database.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Account ID</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Account Name</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Bank</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Format</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.account_id}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>{account.account_id}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>{account.account_name}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>{account.bank_name}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>{account.amount_style}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
