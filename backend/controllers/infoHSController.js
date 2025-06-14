const { pool } = require("../config/connectdb");
const { getCategoryByModel } = require("./models.js");

const getInfoAboutAllHonestSign = async (req, res) => {
  const selectedPlace = req.query.placePrint;

  const brands = ["armbest", "bestshoes", "best26", "arm2"];
  const categories = await getCategoryByModel();

  const places = {
    Лермонтово: "lermontovo",
    Пятигорск: "pyatigorsk",
    Тест: "test",
  };

  // Проверка на валидность местоположения
  if (!places[selectedPlace]) {
    return res.status(400).json({ error: "Неизвестное место" });
  }

  console.log(selectedPlace, "Запрос на получение данных о печати чз из базы");

  let query;

  if (selectedPlace === "Тест") {
    // Если место - Тест, используем одну таблицу
    query = `
      SELECT brand, model, size, COUNT(*) AS quantity
      FROM delivery_test
      WHERE status = 'Waiting'
        AND locked = 0
      GROUP BY brand, model, size
    `;
  } else {
    // Формируем часть запроса для остальных мест
    const queryParts = [];

    for (const brand of brands) {
      for (const category of categories) {
        const tableName = `${brand.toLowerCase()}_${category}`;
        if (!tableName) continue;

        const fullTableName = `${brand}_${category}`;
        queryParts.push(`
            SELECT brand, model, size, COUNT(*) AS quantity
            FROM ${fullTableName}
            WHERE status = 'Waiting'
              AND locked = 0
            GROUP BY brand, model, size
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
