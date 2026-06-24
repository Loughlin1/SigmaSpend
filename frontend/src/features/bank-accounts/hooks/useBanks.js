// src/features/bank-accounts/hooks/useBanks.js
import { useState, useEffect } from 'react';
import { banksApi } from '../../../api/client';

export default function useBanks() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    banksApi.getAll()
      .then(setBanks)
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, []);

  return { banks, loading, error };
}
