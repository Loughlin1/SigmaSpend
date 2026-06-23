// src/App.jsx
import './App.css';
import React, { useState, useEffect, useRef } from 'react';

import Header from './components/Header';
import Footer from './components/Footer';
import DescriptionSection from './components/Description';
import StatementUpload from './components/StatementUpload';

// Features
import ExpenseChart from './features/analytics/components/ExpenseChart';
import BankAccountList from './features/bank-accounts/components/BankAccountList/BankAccountList';
import LedgerSection from './features/ledger/components/LedgerSection';
import AutomationSection from './features/automation/components/AutomationSection';
import AnalyticsSection from './features/analytics/components/AnalyticsSection';
import CategoryManager from './features/categories/components/CategoryManager';

// Master Shared Hooks
import useAccounts from './features/bank-accounts/hooks/useAccounts';
import useCategories from './features/categories/hooks/useCategories';


function App() {
  // Global Shared Ecosystem Hooks
  const { accounts, loading: accountsLoading, error: accountsError, fetchAccounts, accountNameMap } = useAccounts();
  const { categories, loading: categoriesLoading, error: categoriesError, fetchCategories, createCategory } = useCategories();
  
  // Feature component communication boundaries
  const automationRef = useRef(null);
  const analyticsRef = useRef(null);

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

  return (
    <div className="page">
      <Header />

      <section className="sectionCard">
        <div className="splitSection">
          <DescriptionSection />
          <StatementUpload 
            accounts={accounts} 
            onUploadSuccess={triggerGlobalRefresh} 
          />
        </div>
      </section>

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

      <AnalyticsSection
        ref={analyticsRef}
        accounts={accounts}
      />

      <LedgerSection
        accountNameMap={accountNameMap}
        categories={categories}
        categoriesLoading={categoriesLoading}
        categoriesError={categoriesError}
        triggerGlobalRefresh={triggerGlobalRefresh}
        createRuleFromTransaction={async () => {
          if (automationRef.current) automationRef.current.refreshRules();
        }}
      />
      <Footer />
    </div>
  );
}

export default App;