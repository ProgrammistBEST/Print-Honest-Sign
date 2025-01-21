const { pool } = require('../config/connectdb');

const getPrintedHonestSign = async (req, res) => {
  const selectedPlace = req.query.placePrint;
  const selectedBrand = req.query.brand; // Новый параметр для фильтрации по бренду
  console.log('selectedPlace:', selectedPlace, 'selectedBrand:', selectedBrand);

  const placeMappings = {
    'Лермонтово': 'lermontovo',
    'Пятигорск': 'pyatigorsk',
    'Тест': 'test'
  };

  const brandMappings = {
    Armbest: "armbest",
    BestShoes: "bestshoes",
    Best26: "best26",
    "Ozon Armbest": "armbest_ozon",
    "Ozon BestShoes": "bestshoes_ozon"
  };

  // Проверка валидности выбранного места
  if (!placeMappings[selectedPlace]) {
    return res.status(400).json({ error: 'Неизвестное место' });
  }

  const selectedPlaceDB = placeMappings[selectedPlace];

  try {
    let query;

    if (selectedPlace === 'Тест') {
      // Для места "Тест" используем одну таблицу
      query = `
        SELECT Brand, Model, Size, COUNT(*) AS quantity,
               DATE_FORMAT(Date, '%d.%m %H:%i:%s') AS date, user, deliverynumber
        FROM delivery_test
        WHERE Status = 'Used' 
          AND Locked = 1 
          AND Date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY Model, Size, user, DATE(Date)
      `;
    } else {
      // Формируем запрос для остальных мест и брендов
      const queryParts = [];

      for (const [brandName, brandDB] of Object.entries(brandMappings)) {
        if (!selectedBrand || selectedBrand === brandName) { // Фильтрация по бренду
          queryParts.push(`
            SELECT Brand, Model, Size, COUNT(*) AS quantity,
                   DATE_FORMAT(Date, '%d.%m %H:%i:%s') AS date, user, deliverynumber
            FROM delivery_${brandDB}_${selectedPlaceDB}
            WHERE Status = 'Used' 
              AND Locked = 1 
              AND Date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY Model, Size, user, DATE(Date)
          `);
        }
      }

      if (queryParts.length === 0) {
        return res.status(400).json({ error: 'Указанный бренд недоступен' });
      }

      query = queryParts.join(' UNION ALL ');
    }

    const [waitingRows] = await pool.query(query);
    res.json(waitingRows);
  } catch (error) {
    console.error('Ошибка запроса:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
};

module.exports = { getPrintedHonestSign };
