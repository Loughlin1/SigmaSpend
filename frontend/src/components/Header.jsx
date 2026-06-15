// src/components/Header.jsx
import React from 'react';
import logo from '../assets/logo.png'; // Adjust this path based on where your logo file sits

export default function Header() {
  return (
    <header style={{ borderBottom: '1px solid #ccc', paddingBottom: '1rem', marginBottom: '2rem' }}>
      <div className="headingRow logo-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src={logo} alt="SigmaSpend Logo" width="64" className="logo" />
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#2d3748' }}>
            SigmaSpend Dashboard
          </h1>
        </div>
        <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>
          Local Expense Tracking
        </div>
      </div>
    </header>
  );
}