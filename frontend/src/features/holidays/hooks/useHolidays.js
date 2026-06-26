import { useState, useCallback, useEffect } from 'react';
import { holidaysApi } from '../../../api/client';

export default function useHolidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await holidaysApi.getAll();
      setHolidays(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const createHoliday = useCallback(async (data) => {
    const created = await holidaysApi.create(data);
    setHolidays(prev => [created, ...prev]);
    return created;
  }, []);

  const updateHoliday = useCallback(async (id, data) => {
    const updated = await holidaysApi.update(id, data);
    setHolidays(prev => prev.map(h => h.id === id ? updated : h));
    return updated;
  }, []);

  const deleteHoliday = useCallback(async (id) => {
    await holidaysApi.delete(id);
    setHolidays(prev => prev.filter(h => h.id !== id));
  }, []);

  return { holidays, loading, error, fetchHolidays, createHoliday, updateHoliday, deleteHoliday };
}
