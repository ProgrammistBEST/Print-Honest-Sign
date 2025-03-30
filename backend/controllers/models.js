const { pool } = require('../config/connectdb');

// Функция для получения всех категорий из базы данных
async function getCategoryByModel(model) {
    model = model.split(/[-/]/)[0].trim();
    try {
        const [rows] = await pool.query(`
          SELECT DISTINCT category FROM model_categories WHERE model = ?
        `, (model));
          console.log(rows);
  
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

function getTableName(brand, category) {
    const tableMapping = {
      men_1: `${brand}_men_1`,
      men_2: `${brand}_men_2`,
      women_slippers_1: `${brand}_women_slippers_1`,
      women_slippers_2: `${brand}_women_slippers_2`,
      kids_crocs_1: `${brand}_kids_crocs_1`,
      kids_crocs_2: `${brand}_kids_crocs_2`,
      women_crocs_1: `${brand}_women_crocs_1`,
      women_crocs_2: `${brand}_women_crocs_2`,
      crocs_1: `${brand}_crocs_1`,
      crocs_2: `${brand}_crocs_2`,
      crocs_3: `${brand}_crocs_3`,
      crocs_4: `${brand}_crocs_4`,
      winter_1: `${brand}_winter_1`,
      winter_2: `${brand}_winter_2`,
      winter_3: `${brand}_winter_3`,
      winter_4: `${brand}_winter_4`,
      winter_5: `${brand}_winter_5`,
      winter_6: `${brand}_winter_6`,
      winter_7: `${brand}_winter_7`,
      winter_8: `${brand}_winter_8`,
      winter_9: `${brand}_winter_9`,
      winter_10: `${brand}_winter_10`,
      general_2: `${brand}_general_2`,
      general_3: `${brand}_general_3`,
      general_4: `${brand}_general_4`,
      not_defined: `${brand}_not_defined`,
    };
  
    return tableMapping[category] || `${brand}_not_defined`;
  }
  

module.exports = { getCategoryByModel, getTableName };