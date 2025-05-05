const { error } = require('pdf-lib');
const { pool } = require('../config/connectdb');

// Функция для получения всех категорий из базы данных
async function getCategoryByModel(model, Size) {
    let sql;
    let params = [];

    if (model === 'ЭВА') {
        model = (typeof Size === 'string' && Size.charAt(0)) || model;
    }
    if (model === undefined || model === null) {
        sql = "SELECT DISTINCT category FROM model_categories";
    } else {
        model = model.split(/[-/]/)[0].trim();
        sql = "SELECT DISTINCT category FROM model_categories WHERE model = ?";
        params.push(model);
    }

    try {
        const [rows] = await pool.query(sql, params);
  
          if (rows.length === 0) {
              return 'not_defined';
          } else {
              return rows.map(row => row.category);
          }      
      } catch (error) {
        console.error("Ошибка при получении категорий из базы данных:", error.message);
        throw error;
      }
}

async function getTablesName(brand) {
  try {
    if (!brand){
      throw new Error('Brand is required')
    } 

    const query = `
      SELECT DISTINCT category FROM model_categories;
    `
    const result = await pool.query(query);
    if (result.length === 0 || !Array.isArray(result[0])) {
      throw new Error('Invalid data from data base')
    }
    // Формируем массив объектов с префиксом бренда
    const tablesName = result[0].map(row => `${brand}_${row.category}`);
    return tablesName;
  } catch (error) {
    console.error('Error in getTablesName', error.message);
    throw error;
  }
}
  

module.exports = { getCategoryByModel, getTablesName };