// src/components/ui/CustomModal.jsx

export default function CustomModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  confirmText = "Acknowledge", 
  onConfirm,
  variant = "primary" // "primary", "danger", or "success"
}) {
  if (!isOpen) return null;

  // Determine button color accents based on context
  const getButtonStyles = () => {
    const base = {
      padding: '0.5rem 1.5rem',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: '500'
    };

    if (variant === 'danger') {
      return { ...base, background: '#e53e3e' };
    }
    if (variant === 'success') {
      return { ...base, background: '#38a169' };
    }
    return { ...base, background: '#3182ce' }; // Primary
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1100
    }}>
      <div className="modal-container" style={{
        background: '#fff', padding: '1.5rem', borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        maxWidth: '450px', width: '90%', animation: 'fadeIn 0.15s ease-out'
      }}>
        {/* Title */}
        <h3 style={{ 
          margin: '0 0 0.75rem 0', 
          color: '#1a202c', 
          borderBottom: '1px solid #e2e8f0', 
          paddingBottom: '0.5rem' 
        }}>
          {title}
        </h3>
        
        {/* Dynamic Content Body Passed via Children */}
        <div className="modal-body" style={{ fontSize: '0.95rem', color: '#4a5568', marginBottom: '1.5rem', lineHeight: '1.4' }}>
          {children}
        </div>

        {/* Dynamic Actions Footer */}
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          {onClose && onConfirm && (
            <button
              type="button"
              onClick={onClose}
              className="inlineButton textButton"
              style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', color: '#4a5568', cursor: 'pointer' }}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm || onClose}
            className="inlineButton"
            style={getButtonStyles()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}