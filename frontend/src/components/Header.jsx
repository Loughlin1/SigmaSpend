// src/components/Header.jsx
import logo from '../assets/logo.png';

export default function Header() {
  return (
    <header style={{ borderBottom: '1px solid #ccc', marginBottom: '2rem' }}>
      <div className="headingRow logo-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src={logo} alt="SigmaSpend Logo" width="64" className="logo" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#2d3748' }}>SigmaSpend</h1>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#718096', lineHeight: 1.4 }}>
              Upload bank statements, organise transactions, and track spending — privately, locally.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
