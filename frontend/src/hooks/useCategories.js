import { useState, useCallback } from 'react';
import { categoryApi } from '../api/client';

export default function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoryApi.getAll();
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (name, parentId = null) => {
    try {
      await categoryApi.create({ name, parent_id: parentId });
      await fetchCategories(); // Re-fetch entire nested tree structure
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [fetchCategories]);

  return { categories, loading, fetchCategories, createCategory };
}