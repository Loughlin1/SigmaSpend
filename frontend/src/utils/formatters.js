// src/utils/formatters.js

/**
 * Standardizes bank account names into short abbreviations.
 * @param {string} accountName 
 * @returns {string} E.g., "Main CA" or "UNK"
 */
export const getAccountAbbreviation = (accountName) => {
  if (!accountName || typeof accountName !== 'string') {
    return "UNK"; 
  }
  return accountName
    .replace(/current account/i, 'CA')
    .replace(/credit card/i, 'CC')
    .trim();
};


/**
 * Recursively resolves an icon and display name for a given category ID.
 * @param {number|string} categoryId 
 * @param {Array} categories - Full structured list of category objects
 * @returns {Object} { icon, name }
 */
export const getCategoryDisplay = (categoryId, categories = []) => {
  if (!categoryId) return { icon: '❓', name: 'Uncategorized' };
  
  for (let cat of categories) {
    if (cat.id === categoryId) {
      return { icon: cat.icon || '📁', name: cat.name };
    }
    // Deep search subcategories if present
    const subMatch = cat.subcategories?.find(s => s.id === categoryId);
    if (subMatch) {
      return { icon: cat.icon || '📁', name: subMatch.name };
    }
  }
  
  return { icon: '❓', name: 'Uncategorized' };
};