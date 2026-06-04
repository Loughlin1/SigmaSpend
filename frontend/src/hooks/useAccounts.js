import { useState, useCallback, useMemo } from 'react';
import { ingestionApi } from '../api/client';

export default function useAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ingestionApi.getAccounts({ active_only: true });
      setAccounts(data);
      setError('');
    } catch (err) {
      console.error('Failed fetching bank accounts', err);
      setError('Unable to load bank accounts at this time.');
    } finally {
      setLoading(false);
    }
  }, []);

  const accountNameMap = useMemo(() => {
    return accounts.reduce((map, account) => {
      map[account.account_id] = account.account_name;
      return map;
    }, {});
  }, [accounts]);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    setAccounts,
    accountNameMap,
  };
}
