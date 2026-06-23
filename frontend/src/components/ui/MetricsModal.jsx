// src/components/ui/MetricsModal.jsx
import React from 'react';

export default function MetricsModal({ isOpen, onClose, fileCount, metrics }) {
  if (!isOpen || !metrics) return null;

  const { added = 0, skipped = 0, categorized = 0, uncategorized = 0 } = metrics;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1100
    }}>
      <div className="modal-container" style={{
        background: '#fff', padding: '1.5rem', borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        maxWidth: '450px', width: '90%', animation: 'fadeIn 0.2s ease-out'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#1a202c', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          Import Complete
        </h3>
        
        <p style={{ fontSize: '0.95rem', color: '#4a5568', marginBottom: '1.25rem' }}>
          Successfully processed <strong>{fileCount}</strong> statement file{fileCount === 1 ? '' : 's'}. Here is your import breakdown:
        </p>

        <div className="metrics-list" style={{ 
          display: 'flex', flexDirection: 'column', gap: '0.5rem', 
          background: '#f7fafc', padding: '1rem', borderRadius: '6px', 
          border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.9rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>🌱 New Transactions Added:</span>
            <strong style={{ color: '#2f855a' }}>{added}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>🔄 Duplicates Skipped:</span>
            <strong style={{ color: '#4a5568' }}>{skipped}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #edf2f7', paddingTop: '0.5rem' }}>
            <span>✨ Automatically Categorised:</span>
            <strong style={{ color: '#3182ce' }}>{categorized}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>❓ Left Uncategorised:</span>
            <strong style={{ color: '#dd6b20' }}>{uncategorized}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="inlineButton"
            style={{ 
              padding: '0.5rem 1.25rem', background: '#3182ce', 
              color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' 
            }}
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}