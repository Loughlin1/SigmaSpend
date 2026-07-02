// src/App.jsx
import './App.css';
import { useEffect, useRef, useState } from 'react';

import Header from './components/Header';
import Footer from './components/Footer';
import StatementUpload from './components/StatementUpload';

// Features
import BankAccountList from './features/bank-accounts/components/BankAccountList/BankAccountList';
import LedgerSection from './features/ledger/components/LedgerSection';
import AutomationSection from './features/automation/components/AutomationSection';
import AnalyticsSection from './features/analytics/components/AnalyticsSection';
import CategoryManager from './features/categories/components/CategoryManager';
import LogsSection from './features/logs-viewer/components/LogsSection';
import BudgetSection from './features/budget/components/BudgetSection';
import HolidayList from './features/holidays/components/HolidayList';
import BackupSection from './features/backup/components/BackupSection';
import HolidayAnalyticsSection from './features/holidays/components/HolidayAnalyticsSection';

// Master Shared Hooks
import useAccounts from './features/bank-accounts/hooks/useAccounts';
import useCategories from './features/categories/hooks/useCategories';
import useHolidays from './features/holidays/hooks/useHolidays';


function App() {
  // Global Shared Ecosystem Hooks
  const { accounts, loading: accountsLoading, error: accountsError, fetchAccounts, accountNameMap } = useAccounts();
  const { categories, loading: categoriesLoading, error: categoriesError, fetchCategories, createCategory } = useCategories();
  const { holidays, loading: holidaysLoading, error: holidaysError, createHoliday, updateHoliday, deleteHoliday } = useHolidays();

  // Feature component communication boundaries
  const automationRef = useRef(null);
  const analyticsRef = useRef(null);
  const budgetRef = useRef(null);

  const [configCollapsed, setConfigCollapsed] = useState(false);
  const [ledgerFocusRequest, setLedgerFocusRequest] = useState(null);

  // App Mount Prefetch
  useEffect(() => {
    fetchAccounts();
    fetchCategories();
  }, [fetchAccounts, fetchCategories]);

  const triggerGlobalRefresh = async () => {
    if (analyticsRef.current) {
      analyticsRef.current.refreshAnalytics();
    }
  };

  // ts forces the effect in LedgerSection to re-fire even when the same holiday is clicked twice in a row
  const viewHolidayTransactions = (holidayId) => {
    setLedgerFocusRequest({ holidayId, ts: Date.now() });
  };

  return (
    <div className="page">
      <Header />

      <StatementUpload
        accounts={accounts}
        onUploadSuccess={triggerGlobalRefresh}
        className="sectionCard--primary"
      />

      <AnalyticsSection
        ref={analyticsRef}
        accounts={accounts}
        className="sectionCard--primary"
      />

      <BudgetSection
        ref={budgetRef}
        categories={categories}
        accounts={accounts}
        onCategoryUpdated={fetchCategories}
        className="sectionCard--primary"
      />

      <HolidayAnalyticsSection holidays={holidays} loading={holidaysLoading} onViewTransactions={viewHolidayTransactions} />

      <LedgerSection
        accountNameMap={accountNameMap}
        categories={categories}
        categoriesLoading={categoriesLoading}
        categoriesError={categoriesError}
        holidays={holidays}
        focusRequest={ledgerFocusRequest}
        triggerGlobalRefresh={triggerGlobalRefresh}
        createRuleFromTransaction={async (ruleData) => {
          if (automationRef.current) await automationRef.current.createRuleFromTransaction(ruleData);
        }}
        className="sectionCard--primary"
      />

      {/* Configuration — secondary, collapsed by default */}
      <section className="sectionCard sectionCard--secondary">
        <div
          className="account-list__header"
          onClick={() => setConfigCollapsed(!configCollapsed)}
          style={{ cursor: 'pointer' }}
        >
          <h2 style={{ margin: 0 }}>Configuration</h2>
          <button className="collapse-button">{configCollapsed ? '▸' : '▾'}</button>
        </div>

        {!configCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.75rem' }}>
            <BankAccountList
              accounts={accounts}
              loading={accountsLoading}
              error={accountsError}
              onAccountUpdated={fetchAccounts}
              onAccountCreated={fetchAccounts}
            />

            <CategoryManager
              categories={categories}
              onCreateCategory={createCategory}
              loading={categoriesLoading}
              error={categoriesError}
            />

            <AutomationSection
              ref={automationRef}
              categories={categories}
              triggerGlobalRefresh={triggerGlobalRefresh}
            />

            <HolidayList
              holidays={holidays}
              loading={holidaysLoading}
              error={holidaysError}
              onCreateHoliday={createHoliday}
              onUpdateHoliday={updateHoliday}
              onDeleteHoliday={deleteHoliday}
            />
            <BackupSection />
          </div>
        )}
      </section>

      <LogsSection className="sectionCard--secondary" />

      <Footer />
    </div>
  );
}

export default App;
