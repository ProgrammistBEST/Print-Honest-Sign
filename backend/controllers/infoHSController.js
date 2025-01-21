const { pool } = require('../config/connectdb');

const getInfoAboutAllHonestSign = async (req, res) => {
  const selectedPlace = req.query.placePrint;

  const brandMappings = {
    Armbest: "armbest",
    BestShoes: "bestshoes",
    Best26: "best26",
    "Ozon Armbest": "armbest_ozon",
    "Ozon BestShoes": "bestshoes_ozon",
  };

  const places = {
    Лермонтово: "lermontovo",
    Пятигорск: "pyatigorsk",
    Тест: "test",
  };

  // Проверка на валидность местоположения
  if (!places[selectedPlace]) {
    return res.status(400).json({ error: "Неизвестное место" });
  }

  console.log(selectedPlace, 'in info');

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
    const brandTables = Object.entries(brandMappings)
      .map(([key, value]) => {
        const tableName = `delivery_${value}_${places[selectedPlace]}`;
        return `
          SELECT Brand, Model, Size, deliverynumber, COUNT(*) AS quantity
          FROM ${tableName}
          WHERE Status = 'Waiting'
            AND Locked = 0
          GROUP BY Model, Size, deliverynumber
        `;
      })
      .join(" UNION ALL ");

    query = `${brandTables}`;
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
