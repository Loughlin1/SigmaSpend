// src/components/Description.jsx
import React, { useState, useEffect } from 'react';

export default function DescriptionSection({}) {
  return (
    <div style={{maxWidth: '600px'}}>
      <h3>Sigma Spend </h3>
      <p style={{ fontSize: '1rem', lineHeight: '1.6', color: '#4a5568', margin: 0 }}>
        Welcome to your smart financial workspace.
      </p>
      <br></br>
      <p style={{ fontSize: '1rem', lineHeight: '1.6', color: '#4a5568', margin: 0 }}>
       Securely upload bank statements, 
        organise transactions across tailored subcategory hierarchies, and let our 
        hybrid rule engine and local AI automatically classify your expense patterns 
        with total privacy.
      </p>
    </div>
  );
}