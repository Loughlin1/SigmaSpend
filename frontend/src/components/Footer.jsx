// src/components/Footer.jsx

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{ 
      marginTop: '4rem', 
      paddingTop: '1.5rem', 
      borderTop: '1px solid #eee', 
      color: '#718096', 
      fontSize: '0.85rem' 
    }}>
      <div className="headingRow" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          &copy; {currentYear} <strong>SigmaSpend</strong>. All rights reserved.
        </div>
      </div>
    </footer>
  );
}