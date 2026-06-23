// src/components/ui/ConfirmationModal.jsx
import React, { useEffect } from 'react';

export default function ConfirmationModal({ 
  isOpen, 
  title = "Confirm Deletion", 
  message = "Are you sure you want to permanently delete this item? This action cannot be undone.", 
  confirmText = "Delete", 
  cancelText = "Cancel", 
  onConfirm, 
  onCancel 
}) {
  // Prevent background scrolling when the modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 2000, animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        width: '90%', maxWidth: '400px', textAlign: 'center',
        border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out'
      }}>
        {/* Warning Icon Element */}
        <div style={{
          fontSize: '2rem', marginBottom: '0.75rem', color: '#e53e3e'
        }}>
          ⚠️
        </div>

        <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a202c', fontSize: '1.25rem', fontWeight: '600' }}>
          {title}
        </h3>
        
        <p style={{ margin: '0 0 1.5rem 0', color: '#4a5568', fontSize: '0.9rem', lineHeight: '1.4' }}>
          {message}
        </p>

        {/* Action Button Row */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            className="inlineButton"
            style={{ 
              padding: '0.5rem 1rem', background: '#edf2f7', color: '#4a5568', 
              borderColor: '#cbd5e0', fontWeight: '500' 
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inlineButton"
            style={{ 
              padding: '0.5rem 1rem', background: '#fff5f5', color: '#c53030', 
              borderColor: '#fed7d7', fontWeight: '600' 
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}