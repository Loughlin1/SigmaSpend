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
    closeExpenseForm,
    handleActionChange,
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
        <button className="collapse-button">{isCollapsed ? '▸' : '▾'}</button>
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
              <button
                type="button"
                onClick={() => showExpenseForm ? closeExpenseForm() : handleActionChange('add_manual')}
                className="inlineButton"
                title={showExpenseForm ? 'Close form' : 'Add manual transaction'}
                style={{ fontSize: '1.1rem', lineHeight: 1, padding: '0.3rem 0.65rem' }}
              >
                {showExpenseForm ? '✕' : '+'}
              </button>
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
                  const allCats = categories.flatMap(c => [c, ...(c.subcategories || [])]);
                  const matched = allCats.find(c => c.name === data.category);
                  const payload = { ...data, category_id: matched?.id ?? null };
                  delete payload.category;
                  await createExpense(payload);
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