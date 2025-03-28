const { pool } = require('../config/connectdb');
const { getTableName } = require('./models.js');

// Функция для получения всех категорий из базы данных
async function fetchCategoriesFromDB() {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT category FROM model_categories
    `);
    return rows.map(row => row.category);
  } catch (error) {
    console.error("Ошибка при получении категорий из базы данных:", error.message);
    throw error;
  }
}

const getInfoAboutAllHonestSign = async (req, res) => {
  const selectedPlace = req.query.placePrint;

  const brands = ["armbest", "bestshoes", "best26"];
  const categories = await fetchCategoriesFromDB();

  const places = {
    Лермонтово: "lermontovo",
    Пятигорск: "pyatigorsk",
    Тест: "test",
  };
    
  // Проверка на валидность местоположения
  if (!places[selectedPlace]) {
    return res.status(400).json({ error: "Неизвестное место" });
  }

  console.log(selectedPlace, 'Запрос на получение данных о печати чз из базы');

  let query;

  if (selectedPlace === "Тест") {
    // Если место - Тест, используем одну таблицу
    query = `
      SELECT Brand, Model, Size, deliverynumber, COUNT(*) AS quantity
      FROM delivery_test
      WHERE Status = 'Waiting'
        AND Locked = 0
      GROUP BY Model, Size, deliverynumber
    `;
  } else {
    // Формируем часть запроса для остальных мест
    const queryParts = [];

    for (const brand of brands) {
        for (const category of categories) {
          const tableName = getTableName(brand, category);
          if (!tableName) continue;

          const fullTableName = `${brand}_${category}`;
          queryParts.push(`
            SELECT Brand, Model, Size, deliverynumber, COUNT(*) AS quantity
            FROM ${fullTableName}
            WHERE Status = 'Waiting'
              AND Locked = 0
            GROUP BY Model, Size, deliverynumber
          `);
        }
    }
    query = queryParts.join(" UNION ALL ");
  }

  try {
    const [waitingRows] = await pool.query(query);
    res.json(waitingRows);
  } catch (error) {
    console.error("Ошибка запроса:", error);
    res.status(500).json({
      error: "Ошибка сервера",
      details: error.message,
    });
  }
};

module.exports = { getInfoAboutAllHonestSign };
