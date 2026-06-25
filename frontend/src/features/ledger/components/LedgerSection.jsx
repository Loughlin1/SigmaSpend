// src/features/ledger/components/LedgerSection.jsx
import { useEffect, useState } from 'react';
import LedgerFilters from './LedgerFilters';
import ExpenseForm from './ExpenseForm';
import LedgerTable from './LedgerTable/LedgerTable';

// Custom Hooks
import useExpenses from '../hooks/useExpenses';
import useExpenseFilters from '../hooks/useExpenseFilters';
import useExpenseForm from '../hooks/useExpenseForm';

export default function LedgerSection({
  accountNameMap,
  categories,
  triggerGlobalRefresh,
  createRuleFromTransaction,
  className = '',
}) {
  
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 1. Fully isolated features states
  const { 
    expenses, 
    loading: expensesLoading, 
    error: expensesError, 
    page, 
    limit, 
    totalCount, 
    changePage, 
    changeLimit, 
    fetchExpenses, 
    createExpense, 
    updateExpense, 
    deleteExpense 
  } = useExpenses();

  const { filters, handleFilterChange } = useExpenseFilters();
  
  // 2. Consume form lifecycle here instead of pulling from App.jsx
  const { 
    showExpenseForm, 
    actionSelect, 
    closeExpenseForm, 
    handleActionChange 
  } = useExpenseForm();

  // 3. React automatically to filter and pagination page bounds changes
  useEffect(() => {
    const cleanParams = Object.fromEntries(
      Object.entries(filters).filter(([, val]) => val !== '' && val !== null)
    );
    fetchExpenses(cleanParams, page, limit);
  }, [fetchExpenses, filters, page, limit]);

  const handleLocalRefresh = async () => {
    const cleanParams = Object.fromEntries(
      Object.entries(filters).filter(([, val]) => val !== '' && val !== null)
    );
    await fetchExpenses(cleanParams, page, limit);
    await triggerGlobalRefresh(); 
  };

  return (
    <section className={`sectionCard ${className}`}>
      <div className="account-list__header" onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: 'pointer' }}>
        <h3 style={{ margin: 0 }}>Transaction Ledger</h3>
        <button className="collapse-button">{isCollapsed ? 'Show' : 'Hide'}</button>
      </div>

      {!isCollapsed && (
        <>
          <div style={{ marginTop: '1rem' }}>
            <div className="actionsRow" style={{ marginBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={handleLocalRefresh}
                className="inlineButton"
                disabled={expensesLoading}
                title="Refresh transactions"
              >
                {expensesLoading ? '...' : '↻ Refresh'}
              </button>
              <select value={actionSelect} onChange={(e) => handleActionChange(e.target.value)} className="inlineButton">
                <option value="none">Actions</option>
                <option value="add_manual">Add Manual Transaction</option>
              </select>
              {showExpenseForm && (
                <button type="button" onClick={closeExpenseForm} className="inlineButton">Close</button>
              )}
            </div>

            <LedgerFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              accountNameMap={accountNameMap}
              categories={categories}
            />
          </div>

          {showExpenseForm && (
            <div className="formPanel">
              <ExpenseForm
                categories={categories}
                accountNameMap={accountNameMap}
                initialData={null}
                onExpenseAdded={async (data) => {
                  await createExpense(data);
                  await handleLocalRefresh();
                  closeExpenseForm();
                }}
                onCancel={closeExpenseForm}
              />
            </div>
          )}

          {expensesError && <p className="errorText">Error loading ledger data: {expensesError.message}</p>}

          {expensesLoading ? (
            <p>Loading ledger records...</p>
          ) : (
            <LedgerTable
              expenses={expenses}
              accountNameMap={accountNameMap}
              categories={categories}
              onExpenseSaved={async (payload) => {
                await updateExpense(payload.id, payload);
                await handleLocalRefresh();
              }}
              onDelete={async (id) => {
                await deleteExpense(id);
                await handleLocalRefresh();
              }}
              onCreateRuleFromTransaction={createRuleFromTransaction}
              onBulkUpdateSuccess={handleLocalRefresh}
              page={page}
              limit={limit}
              totalCount={totalCount}
              onPageChange={(newPage) => changePage(newPage, filters)}
              onLimitChange={(newLimit) => changeLimit(newLimit, filters)}
            />
          )}
        </>
      )}
    </section>
  );
}