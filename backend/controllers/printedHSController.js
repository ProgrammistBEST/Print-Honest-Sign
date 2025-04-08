const { pool } = require("../config/connectdb");
const { getTableName } = require("./models.js");

// Функция для получения всех категорий из базы данных
async function fetchCategoriesFromDB() {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT category FROM model_categories
    `);
    return rows.map((row) => row.category);
  } catch (error) {
    console.error(
      "Ошибка при получении категорий из базы данных:",
      error.message
    );
    throw error;
  }
}

const getPrintedHonestSign = async (req, res) => {
  const selectedPlace = req.query.placePrint;
  const selectedBrand = req.query.brand;
  console.log("selectedPlace:", selectedPlace, "selectedBrand:", selectedBrand);

  const placeMappings = {
    Лермонтово: "",
    Пятигорск: "",
    Тест: "test",
  };

  const brands = ["armbest", "bestshoes", "best26"];

  const categories = await fetchCategoriesFromDB();

  // Проверка валидности выбранного места
  //   if (!placeMappings[selectedPlace]) {
  //     return res.status(400).json({ error: 'Неизвестное место' });
  //   }

  //   const selectedPlaceDB = placeMappings[selectedPlace];

  try {
    let query;

    if (selectedPlace === "Тест") {
      // Для места "Тест" используем одну таблицу
      query = `
        SELECT brand, model, size, COUNT(*) AS quantity,
               DATE_FORMAT(date_used, '%d.%m %H:%i:%s') AS date, user
        FROM delivery_test
        WHERE status = 'Used' 
          AND locked = 1 
        GROUP BY model, size, user, date
      `;
    } else {
      // Формируем запрос для остальных мест и брендов
      const queryParts = [];

      // Формируем запросы для всех комбинаций брендов и категорий
      for (const brand of brands) {
        for (const category of categories) {
          const tableName = `${brand.toLowerCase()}_${category}`;
          if (!tableName) continue;
          queryParts.push(`
            SELECT brand, model, size, COUNT(*) AS quantity,
                   DATE_FORMAT(date_used, '%d.%m %H:%i:%s') AS date, user
            FROM ${tableName}
            WHERE status = 'Used' 
              AND locked = 1 
            GROUP BY model, size, user, date
          `);
        }
      }

      if (queryParts.length === 0) {
        return res.status(400).json({ error: "Указанный бренд недоступен" });
      }

      query = queryParts.join(" UNION ALL ");
    }

    const [waitingRows] = await pool.query(query);
    res.json(waitingRows);
  } catch (error) {
    console.error("Ошибка запроса:", error);
    res.status(500).json({ error: "Ошибка сервера", details: error.message });
  }
};

module.exports = { getPrintedHonestSign };
