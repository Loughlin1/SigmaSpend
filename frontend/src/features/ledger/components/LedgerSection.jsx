// src/features/ledger/components/LedgerSection.jsx
import { useEffect } from 'react';
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
  createRuleFromTransaction
}) {
  
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
    <section className="sectionCard">
      <div className="headingRow" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Transaction Ledger</h3>
        <div className="actionsRow">
          <select value={actionSelect} onChange={(e) => handleActionChange(e.target.value)} className="inlineButton">
            <option value="none">Actions</option>
            <option value="add_manual">Add Manual Transaction</option>
          </select>
          {showExpenseForm && (
            <button type="button" onClick={closeExpenseForm} className="inlineButton">
              Close
            </button>
          )}
        </div>
      </div>

      <LedgerFilters 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        accountNameMap={accountNameMap}
        categories={categories}
      />

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
    </section>
  );
}