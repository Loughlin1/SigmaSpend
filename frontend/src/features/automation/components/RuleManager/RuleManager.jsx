// src/features/automation/components/RuleManager.jsx
import { useState, useEffect } from 'react';
import RuleForm from './RuleForm';
import RuleRow from './RuleRow';
import RuleRowEdit from './RuleRowEdit';
import RulePagination from './RulePagination';
import ConfirmationModal from '../../../../components/ui/ConfirmationModal';

import '../../../../styles/lists.css';
import '../../../../styles/forms.css';

export default function RuleManager({ 
  rules = [], 
  categories = [], 
  pagination = { page: 1, pages: 1, total: 0 },
  onCreateRule, 
  onUpdateRule,
  onDeleteRule, 
  fetchRules, 
  loading, 
  error 
}) {
  const [showForm, setShowForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (typeof fetchRules === 'function') {
        fetchRules(searchQuery, pagination.page);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, pagination.page, fetchRules]);

  const handlePageChange = (targetPage) => {
    setEditingId(null); // Clear editing states on page change
    if (typeof fetchRules === 'function') {
      fetchRules(searchQuery, targetPage);
    }
  };

  const handleSaveEdit = async (ruleId, updatedData) => {
    if (typeof onUpdateRule === 'function') {
      await onUpdateRule(ruleId, updatedData);
    }
    setEditingId(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId && typeof onDeleteRule === 'function') {
      await onDeleteRule(deleteTargetId);
    }
    setDeleteTargetId(null);
  };

  return (
    <section className="sectionCard">
      <div className="account-list">
        <div className="account-list__header" onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: 'pointer' }}>
          <h3>Processing Rules ({pagination.total})</h3>
          <button className="collapse-button" type="button">
            {isCollapsed ? 'Show' : 'Hide'}
          </button>
        </div>

        {!isCollapsed && (
          <>
            {/* Search and Form sections remain identical... */}
            <div style={{ padding: '10px 0', marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="🔍 Search rules by trigger keyword or category destination..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (pagination.page !== 1 && typeof fetchRules === 'function') {
                    fetchRules(e.target.value, 1);
                  }
                }}
                className="rule-search-input"
              />
            </div>

            <div className="account-list__creation-zone" style={{ margin: '15px 0', padding: '15px 0', borderTop: '1px dashed #ccc' }}>
              <button type="button" onClick={() => setShowForm(!showForm)} className="button" style={{ marginBottom: showForm ? '15px' : 0 }}>
                {showForm ? 'Hide Form' : 'Create New Keyword Rule'}
              </button>

              {showForm && (
                <RuleForm 
                  categories={categories}
                  onCreateRule={async (ruleData) => {
                    await onCreateRule(ruleData);
                    setShowForm(false);
                  }}
                  onCancel={() => setShowForm(false)}
                />
              )}
            </div>

            {error && <div className="account-list__error">{error}</div>}
            
            {loading ? (
              <div>Loading rules engine...</div>
            ) : rules.length === 0 ? (
              <div>No keyword mapping rules configured yet.</div>
            ) : (
              <div className="account-list__wrapper">
                <table className="bank-account-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th className="table-header-cell" style={{ width: '30%', textAlign: 'left' }}>Keyword</th>
                      <th className="table-header-cell" style={{ width: '25%', textAlign: 'left' }}>Target Field</th>
                      <th className="table-header-cell" style={{ width: '30%', textAlign: 'left' }}>Maps To</th>
                      <th className="table-header-cell" style={{ width: '15%', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => (
                      editingId === rule.id ? (
                        <RuleRowEdit
                          key={rule.id}
                          rule={rule}
                          categories={categories}
                          onSave={handleSaveEdit}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <RuleRow 
                          key={rule.id}
                          rule={rule}
                          onStartEdit={(r) => setEditingId(r.id)}
                          onDeleteRule={(id) => setDeleteTargetId(id)}
                        />
                      )
                    ))}
                  </tbody>
                </table>

                <RulePagination 
                  pagination={pagination}
                  loading={loading}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
      {/* Shared Deletion Confirmation Modal Overlay */}
      <ConfirmationModal
        isOpen={deleteTargetId !== null}
        title="Delete Processing Rule"
        message="Are you sure you want to permanently delete this keyword mapping rule? Future statement uploads matching this criterion will default to Uncategorized."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </section>
  );
}