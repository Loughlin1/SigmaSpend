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
      console.error('Failed fetching categories', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (name) => {
    try {
      const newCategory = await categoryApi.create({ name });
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
      return newCategory;
    } catch (err) {
      console.error('Failed creating category', err);
      throw err;
    }
  }, []);

  return { categories, loading, fetchCategories, createCategory };
}