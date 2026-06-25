// src/features/bank-accounts/components/BankAccountList/BankAccountList.jsx
import { useState } from 'react';
import BankAccountForm from '../BankAccountForm'; // Relative step over to form layout sibling
import AccountRowRead from './AccountRowRead';
import AccountRowEdit from './AccountRowEdit';

import '../../../../styles/lists.css';

export default function BankAccountList({ accounts = [], loading, error, onAccountUpdated, onAccountCreated }) {
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showAccountForm, setShowAccountForm] = useState(false); // Fully isolated local state!

  return (
    <section className="sectionCard">
      <div className="account-list">
        <div className="account-list__header" onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: 'pointer' }}>
          <h3>Bank Accounts ({accounts.length})</h3>
          <button className="collapse-button">
            {isCollapsed ? 'Show' : 'Hide'}
          </button>
        </div>
        
        {!isCollapsed && (
          <>
            {error && <div className="account-list__error">{error}</div>}
            {loading ? (
              <div>Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <div>No bank accounts found in the database.</div>
            ) : (
              <div className="account-list__wrapper">
                <table className="bank-account-table">
                  <thead>
                    <tr>
                      <th className="table-header-cell" style={{ width: '20%', textAlign: 'left' }}>Account Name</th>
                      <th className="table-header-cell" style={{ width: '15%', textAlign: 'left' }}>Bank</th>
                      <th className="table-header-cell" style={{ width: '12%', textAlign: 'left' }}>Format</th>
                      <th className="table-header-cell" style={{ width: '15%', textAlign: 'left' }}>Invert Signs</th>
                      <th className="table-header-cell" style={{ width: '25%', textAlign: 'left' }}>Mappings</th>
                      <th className="table-header-cell" style={{ width: '13%', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => {
                      const accountId = account.account_id ?? account.id;
                      return editingAccountId === accountId ? (
                        <AccountRowEdit
                          key={accountId}
                          account={{ ...account, account_id: accountId }}
                          onAccountUpdated={onAccountUpdated}
                          onCancel={() => setEditingAccountId(null)}
                        />
                      ) : (
                        <AccountRowRead
                          key={accountId}
                          account={{ ...account, account_id: accountId }}
                          onStartEdit={(acc) => setEditingAccountId(acc.account_id)}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="account-list__creation-zone" style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}>
              <button 
                type="button" 
                onClick={() => setShowAccountForm(!showAccountForm)} 
                className="button"
                style={{ marginBottom: '15px' }}
              >
                {showAccountForm ? 'Hide Form' : 'Create New Bank Account'}
              </button>
              
              {showAccountForm && (
                <BankAccountForm onAccountCreated={async (data) => {
                  if (typeof onAccountCreated === 'function') await onAccountCreated(data);
                  setShowAccountForm(false);
                }} />
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}