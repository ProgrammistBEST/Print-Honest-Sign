const { pool } = require('../config/connectdb')

async function getDataFromTable(tableName) {
  
    const query = `
      SELECT model, size, COUNT(*) AS quantity
      FROM ??
      WHERE status IN ('Waiting', 'Comeback')
      GROUP BY model, size
    `;
  
    try {
      const [data] = await pool.query(query, [tableName]);
      return data;
    } catch (error) {
      console.error('Invalid data from getDataFromTable:', error.message);
      throw error;
    }
  }
  
  function addMissingModels(dataHS, rowsModels) {
    try {
      const validData = dataHS.filter(item => item.model && item.size);
      const dataMap = new Map(validData.map(item => [`${item.model}-${item.size}`, item]));
  
      rowsModels.forEach(row => {
        if (row.model && row.size) {
          const key = `${row.model}-${row.size}`;
          if (!dataMap.has(key)) {
            dataMap.set(key, { model: row.model, size: row.size, quantity: 0 });
          }
        }
      });
  
      return Array.from(dataMap.values());
    } catch (error) {
      console.error('Error adding missing models:', error.message);
      throw error;
    }
  }
  
  async function getModelsForNull(dataHS, brand) {
    try {
      const query = `
        SELECT COALESCE(articles.article_association, articles.article) AS model, sizes.size AS size
        FROM models
        JOIN articles ON models.article_id = articles.article_id
        JOIN sizes ON models.size_id = sizes.size_id
        JOIN brands ON models.brand_id = brands.brand_id
        WHERE models.is_deleted = 0 AND models.categories != 'Украшения для обуви' AND brands.brand = ?
      `;
      const [rowsModels] = await pool.query(query, [brand]);
      return addMissingModels(dataHS, rowsModels);
    } catch (error) {
      console.error('Error getting models for null:', error.message);
      throw error;
    }
  }
  
  module.exports = { getDataFromTable, getModelsForNull };