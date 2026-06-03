// src/components/StatementUpload.jsx
import React, { useState } from 'react';
import { ingestionApi } from '../api/client';

export default function StatementUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const summary = await ingestionApi.uploadStatement(file);
      alert(`Imported ${summary.imported} new records!`);
      onUploadSuccess();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-box">
      <h3>Import Bank Statement</h3>
      <input type="file" accept=".csv,.pdf" onChange={e => setFile(e.target.files[0])} />
      <button onClick={handleUpload} disabled={!file || loading}>
        {loading ? 'Processing...' : 'Upload & Deduplicate'}
      </button>
    </div>
  );
}