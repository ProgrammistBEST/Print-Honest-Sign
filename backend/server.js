// Библиотека
const express = require('express');
const app = express();
const portExpress = 6501;
// const portExpress = process.env.PORT || 6501;
const portSocket = 6502;
const fs = require('fs');
const cors = require('cors');
// const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
// const os = require('os');
const { processPDF } = require('./utils/pdfProcessor.js');
// const { exec } = require('child_process');
const { PDFDocument } = require('pdf-lib');
const { pool, userPool } = require('./config/connectdb.js');
// const stringSimilarity = require('string-similarity');
const { getPrinters } = require('pdf-to-printer');
// const mysql = require('mysql2');
// const iconv = require('iconv-lite');

////////////////// Импортируем функции //////////////////////
const { getInfoAboutAllHonestSign } = require('./controllers/infoHSController.js');
const { getPrintedHonestSign } = require('./controllers/printedHSController.js');
const { getCategoryByModel, getTableName } = require('./controllers/models.js');
const { compareFiles } = require('./utils/compareFiles.js');
const initializeLogger = require('./controllers/logStream.js');
// const { general_article, get_article } = require('./models/scriptsArticles.js');
// const { kyz } = require('./controllers/kyzController.js');

app.use(cors());
app.use(express.json());

// ПОДКЛЮЧЕНИЕ ЛОГГЕРА
initializeLogger();

// const util = require('util');
// const execCommand = util.promisify(exec);

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/build')));
} 

// Для работы с сокетами
const http = require('http');
const  { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    methods: ['GET', 'POST'],
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');
});

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Обслуживание статических файлов!
// app.use(express.static(path.join(__dirname, '../frontend/public')));
// app.use('/frontend', express.static(path.join(__dirname, './frontend')));

app.get('/api/printers', async (req, res) => {
  try {
    const printers = await getPrinters();
    res.json(printers);
  } catch (error) {
    res.status(500).json({ error: 'Не удалось получить список принтеров' });
  }
});

// Роуты
app.get('/api/printedHonestSign', getPrintedHonestSign);
app.get('/api/InfoAboutAllHonestSign', getInfoAboutAllHonestSign);
app.post('/api/compare', upload.single('file'), compareFiles);

// Добавление моделей
app.post('/api/models/add', async (req, res) => {

    const models = req.body;
    if (!Array.isArray(models) || models.length === 0) {
        return res.status(400).send({ error: 'Массив моделей пуст или отсутствует' });
    }

    const addedModels = [];
    const existingModels = [];

    try {
        for (const model of models) {
            const { article, size, brand } = model;
            console.log(article, size, brand)
            // Проверка данных модели
            if (!article || !size || !brand) {
                return res.status(400).send({ error: 'Некорректные данные модели' });
            }

            // Определение таблицы на основе бренда
            let table;
            switch (brand) {
                case 'bestshoes':
                    table = 'product_sizesbestshoes';
                    break;
                case 'best26':
                    table = 'product_sizesbest26';
                    break;
                case 'armbest':
                    table = 'product_sizesarmbest';
                    break;
                default:
                    return res.status(400).send({ error: `Неизвестный бренд: ${brand}` });
            }

            // Проверка существования модели в базе данных
            const [existingRows] = await pool.query(
                `SELECT * FROM ${table} WHERE vendor_code = ? AND tech_size = ?`,
                [article, size]
            );

            if (existingRows.length > 0) {
                // Модель уже существует
                existingModels.push({ article, size, brand });
            } else {
                // Добавление новой модели
                await pool.query(`INSERT INTO ${table} (vendor_code, tech_size) VALUES (?, ?)`, [article, size]);
                addedModels.push({ article, size, brand });
            }
        }

        // Формирование ответа
        if (existingModels.length > 0 && addedModels.length === 0) {
            // Все модели уже существуют
            return res.status(409).send({
                message: 'Все указанные модели уже существуют',
                existingModels,
            });
        } else if (existingModels.length > 0) {
            // Некоторые модели уже существуют
            return res.status(200).send({
                message: 'Часть моделей добавлена, часть уже существует',
                addedModels,
                existingModels,
            });
        } else {
            // Все модели успешно добавлены
            return res.status(200).send({
                message: 'Все модели успешно добавлены',
                addedModels,
            });
        }
    } catch (error) {
        console.error('Ошибка добавления поставки:', error);
        res.status(500).send({ error: 'Ошибка добавления поставки' });
    }
});

async function mergePDFs(pdfPaths) {
  const mergedPdf = await PDFDocument.create(); // Создаём новый PDF-документ
  for (const pdfPath of pdfPaths) {
    const pdfBytes = fs.readFileSync(pdfPath); // Читаем содержимое каждого PDF-файла
    const pdfDoc = await PDFDocument.load(pdfBytes); // Загружаем PDF-документ
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices()); // Копируем страницы
    copiedPages.forEach((page) => mergedPdf.addPage(page)); // Добавляем страницы в новый PDF
  }

  const mergedPdfBytes = await mergedPdf.save(); // Сохраняем объединённый PDF

  const mergedPdfPath = path.join(__dirname, getCurrentTimestamp() + 'merged.pdf'); // Путь к объединённому файлу
  fs.writeFileSync(mergedPdfPath, mergedPdfBytes); // Записываем объединённый файл на диск

  // Удаляем использованные PDF-файлы
  for (const pdfPath of pdfPaths) {
    fs.unlinkSync(pdfPath); // Синхронное удаление файла
  }
  console.log(mergedPdfPath)
  return mergedPdfPath; // Возвращаем путь к объединённому PDF
}

function extractSizeFromPath(filePath) {
  const match = filePath.match(/\[\](\d+)\.pdf$/); // Ищем число после "[]", перед ".pdf"
  return match ? parseInt(match[1], 10) : null; // Возвращаем число или null, если не найдено
}

app.post('/api/CheckUser', async (req, res) => {
  const { user } = req.body;
  try {
    // Выполняем запрос к базе данных MySQL
    const [rows] = await userPool.execute(
      'SELECT * FROM programm_users WHERE pswd = ?',
      [user]
    );

    if (rows.length > 0) {
      res.send(rows)
    } else {
      res.status(500).send('Ошибка');
    }
  } catch (error) {
    res.status(500).send('Не найдено');
  }
});

function convertDateToServerFormat(clientDate) {
  // Разделение даты и времени
  const [datePart, timePart] = clientDate.split(' ');
  const [day, month] = datePart.split('.');
  const [hours, minutes, seconds] = timePart.split(':');

  // Получение текущего года
  const year = new Date().getFullYear();
  const formattedSeconds = seconds ? seconds : '00';

  // Форматирование даты в серверный формат
  return `${year}-${month}-${day} ${hours}:${minutes}:${formattedSeconds}`;
}

// Обновление статуса киза
app.put('/api/returnKyz', async (req, res) => {

  let {
    Brand,
    user,
    placePrint,
    date,
    Model,
    Size,
  } = req.body;

  let tableName;
    
  const category = await getCategoryByModel(Model);
  tableName = `${Brand.toLowerCase()}_${category}`;
  
  if (placePrint == 'Тест') {
    tableName = 'delivery_test';
  } 
    
  const serverDate = convertDateToServerFormat(date);
  console.log(tableName, Brand, placePrint, serverDate, user, Model, Size);

  try {
    const [result] = await pool.query(
      `UPDATE \`${tableName}\` SET Status = 'Waiting', Locked = 0 WHERE Date = ? AND Brand = ? AND user = ? AND Model = ? AND Size = ?`,
      [serverDate, Brand, user, Model, Size]
    );
    res.json({
      message: 'Status updated successfully',
      changes: result.affectedRows // Количество измененных строк
    });
  } catch (err) {
    console.error('Error during update:', err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// Функция для разделения PDF на части
async function splitPDFIntoChunks(pdfBytes, chunkSize = 500) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();
  const chunks = [];

  for (let startPage = 0; startPage < totalPages; startPage += chunkSize) {
    const endPage = Math.min(startPage + chunkSize, totalPages);
    const newPdfDoc = await PDFDocument.create();
    const copiedPages = await newPdfDoc.copyPages(pdfDoc, Array.from({ length: endPage - startPage }, (_, i) => startPage + i));
    copiedPages.forEach(page => newPdfDoc.addPage(page));
    const chunkBytes = await newPdfDoc.save();
    chunks.push(chunkBytes);
  }

  return chunks, totalPages;
}

// Загрузка нового киза
app.post('/uploadNewKyz', upload.single('file'), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).send({ message: 'Файл не загружен.' });
    }

    const fileBuffer = req.file.buffer;
    const brandData = JSON.parse(req.body.brandData);
    const placePrint = JSON.parse(req.body.placePrint);
    const MultiModel = JSON.parse(req.body.MultiModel);
    
    const pdfBytes = new Uint8Array(fileBuffer);
    const { chunks, totalPages } = await splitPDFIntoChunks(pdfBytes, 500);

    for (let i = 0; i < chunks.length; i++) {
      const chunkBytes = chunks[i];
      console.log(`Обработка части ${i + 1} из ${chunks.length}`);
      await processPDF(chunkBytes, brandData, placePrint, io, MultiModel, totalPages);
    }
    
    res.status(200).send({ message: 'Файл успешно загружен.' });

  } catch (err) {
    console.error('Error processing file:', err);
    res.status(500).send({ message: 'Ошибка загрузки файла.' });
  }
});

let activeRequests = {};

app.use((req, res, next) => {
  const requestKey = `${req.ip}-${req.originalUrl}`;

  if (activeRequests[requestKey]) {
    return res.status(429).send('Запрос уже обрабатывается, дождитесь завершения.');
  }

  activeRequests[requestKey] = true;

  res.on('finish', () => {
    delete activeRequests[requestKey];
  });

  next();
});

app.get('/getBrandsData', async (req, res) => {

  const queries = [
    { brand: 'Armbest (Новая)', table: 'product_sizesbestshoes' },
    { brand: 'BestShoes (Старая)', table: 'product_sizesbestshoes' },
    { brand: 'Best26 (Арташ)', table: 'product_sizesbestshoes' },
    { brand: 'Ozon (Armbest)', table: 'product_sizesbestshoes' },
    { brand: 'Ozon (BestShoes)', table: 'product_sizesbestshoes' }
  ];

  try {
    const results = await Promise.all(queries.map(async query => {
      const sql = `SELECT DISTINCT article, GROUP_CONCAT(size) AS sizes FROM products GROUP BY article, company_name`;
      const [rows] = await pool.query(sql);

      if (rows.length === 0) {
        console.log(`Нет данных для таблицы: ${query.table}`);
      }

      // Преобразуем данные в нужный формат
      const models = rows.map((row, index) => ({
        name: row.article,
        sizes: row.sizes.split(',').map(size => {
          if (size.includes('-')) {
            return size;
          } else {
            return Number(size);
          }
        }),
        id: index,
        brand: query.brand
      }));

      return { nameBrand: query.brand, models };
    }));

    res.json(results); // Отправляем результат клиенту
  } catch (err) {
    console.error('Ошибка получения данных:', err.message);
    res.status(500).send('Ошибка получения данных: ' + err.message); // Отправляем ошибку клиенту
  }
});

const writePDFs = async (rows) => {
    const writePromises = rows
      .filter(row => row.PDF)
      .map(async (row) => {
        const randomNumbers = Math.floor(1000 + Math.random() * 9000);
        const pdfPath = path.join(__dirname, `output${row.id}-${row.Model}[${randomNumbers}]${row.Size}.pdf`);
        await fs.promises.writeFile(pdfPath, row.PDF);
        return pdfPath;
      });
  
    return Promise.all(writePromises);
  };

app.post('/kyz', async (req, res) => {
    let { selectedBrand, filledInputs, user, placePrint, printerForHonestSign } = req.body;
    // const brandMappings = {
    //   'Ozon (Armbest)': { name: 'Ozon Armbest', table: 'delivery_armbest_ozon_' },
    //   'Ozon (BestShoes)': { name: 'Ozon BestShoes', table: 'delivery_bestshoes_ozon_' },
    //   'Armbest (Новая)': { name: 'Armbest', table: 'delivery_armbest_' },
    //   'BestShoes (Старая)': { name: 'BestShoes', table: 'delivery_bestshoes_' },
    //   'BestShoes': { name: 'BestShoes', table: 'delivery_bestshoes_' },
    //   'Best26 (Арташ)': { name: 'Best26', table: 'delivery_best26_' },
    // };
  
    // const placeMappings = {
    //   'Тест': 'delivery_test',
    //   'Пятигорск': 'pyatigorsk',
    //   'Лермонтово': 'lermontovo',
    // };
    
    const placeMappings = {
      'Тест': 'delivery_test',
      'Пятигорск': 'pyatigorsk',
      'Лермонтово': 'lermontovo',
    };

    const brands = {
        'Ozon (Armbest)': 'armbest',
        'Ozon (BestShoes)': 'bestshoes',
        'Armbest (Новая)': 'armbest',
        'BestShoes (Старая)': 'bestshoes',
        'Best26 (Арташ)': 'best26',
    };
  
    const brandDetails = brands[selectedBrand];
    let tableName;
    const normalizedBrand = selectedBrand.split(' ')[0];

    if (placePrint === 'Тест') {
        tableName = placeMappings['Тест'];
    } else {
        console.log(normalizedBrand.toLowerCase())
        const category =await getCategoryByModel(filledInputs[0]?.model); // Определяем категорию первой модели
        tableName = `${normalizedBrand.toLowerCase()}_${category}`;
        if (!tableName) {
            return res.status(400).json({ error: 'Не удалось определить таблицу для данной модели.' });
        }
    }
    if (!tableName || !normalizedBrand) {
      return res.status(400).json({ error: 'Некорректные данные о бренде или месте печати.' });
    }
  
    const shortageInfo = [];
    const successfulSign = [];
    const pdfPaths = [];
  
    try {
        const allPromises = await filledInputs.map(async (input) => {
          const { size, model, value } = input;
          const count = Number(value);
          if (isNaN(count) || count <= 0) {
            console.error(`Некорректное значение "value" для модели "${model}", размера "${size}".`);
        }
          // const formattedModel = ['Armbest'].includes(normalizedBrand) ? 'ЭВА' : model;
          console.log(`Обработка модели "${model}", размера "${size}" для бренда "${normalizedBrand}". Требуется: ${count}. tableName: ${tableName}`);
    
          // Запрос к базе данных для текущего размера
          const [waitingRows] = await pool.query(
              `SELECT PDF, id, Model, Size, Crypto FROM \`${tableName}\` 
              WHERE \`Size\` = ? AND \`Brand\` = ? AND \`Status\` = 'Waiting'
              AND \`Model\` = ? AND \`Locked\` = 0
              LIMIT ?`,
              [size, normalizedBrand, model, count]
          );
          if (waitingRows.length <= 0) {
              shortageInfo.push({ model, size, brand: normalizedBrand, required: count, available: waitingRows.length });
              console.log(`Недостаточно записей для модели "${model}", размера "${size}". Требуется: ${count}, доступно: ${waitingRows.length}`);
          } else if (waitingRows.length >= count) {
              successfulSign.push({ model, size, brand: normalizedBrand, required: count, available: waitingRows.length });
              const rowIds = waitingRows.slice(0, count).map(row => row.id);
      
              // Запись PDF
              const newPdfPaths = await writePDFs(waitingRows.slice(0, count));
              pdfPaths.push(...newPdfPaths);
              console.log(waitingRows.length);
  
              // Обновление статуса
              await pool.query(
                  `UPDATE \`${tableName}\`
                  SET \`Locked\` = 1, \`Status\` = ?, \`Date\` = ?, \`user\` = ?
                  WHERE \`id\` IN (?) AND \`Status\` = "Waiting" AND \`Locked\` = 0`,
                  ['Used', getFormattedDateTime(), user, rowIds.flat()]
              );
            }

      });
      
      await Promise.all(allPromises);
  
      if (pdfPaths.length > 0) {
        await Promise.all(allPromises);
        pdfPaths.sort((a, b) => extractSizeFromPath(a) - extractSizeFromPath(b));
        const mergedPdfPath = await mergePDFs(pdfPaths);
        console.log('Проверка 0: ', mergedPdfPath, printerForHonestSign)

        printPDF(mergedPdfPath, 'honestSign', printerForHonestSign);
        console.log("Все закончилось!")
        res.json({ success: true, data: { successfulSign, shortageInfo } });
      } else {
        res.json({ success: false, data: { successfulSign, shortageInfo } });
      }
    } catch (error) {
      console.error('Произошла ошибка:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Произошла ошибка при выполнении операции.' });
      }
    }
});
  
// Мое добро на добавление номеров поставок
// app.post('/addDelivery', async (req, res) => {
//   const { deliverynumber } = req.body;
//   console.log("Запрос ")
//   try {
//     await pool.query('INSERT INTO honestsignfordeliverytest (deliverynumber) VALUES (?)', [deliverynumber])
//     res.status(200).send({ message: 'Поставка добавлена успешно' });
//   } catch (error) {
//     console.error('Ошибка добавления поставки:', error);
//     res.status(500).send({ error: 'Ошибка добавления поставки' });
//   }
// })

// app.post('/api/checkDelivery', async (req, res) => {
//   console.log('/api/checkDelivery')
//   const { deliverynumber } = req.body;
//   console.log(deliverynumber)
//   try {
//     const [rows] = await pool.query('SELECT 1 FROM honestsignfordeliverytest WHERE deliverynumber = ?', [deliverynumber]);
//     if (rows.length > 0) {
//       res.status(200).send({ exists: true });
//     } else {
//       res.status(200).send({ exists: false });
//     }
//   } catch (error) {
//     console.error('Ошибка проверки поставки:', error);
//     res.status(500).send({ error: 'Ошибка проверки поставки' });
//   }
// });

// Функция для печати PDF файла
async function printPDF(filePath, type, placePrint) {
    console.log('Проверка 1: ', filePath, type, placePrint)
    if (!placePrint) {
        console.error('Ошибка: Не указан принтер!');
        return;
    }
    const resolvedPath = path.resolve(filePath);
    let command = '';
    command = `"C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe" "${resolvedPath}" "${placePrint}" "" ""`;

    console.log('Выполняемая команда:', command);
    const { stdout, stderr } = await execCommand(command);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
    console.log('Печать завершена успешно');
}

// app.get('/getApiById', async (req, res) => {
//   const { id, company_name, category } = req.query; // Извлечение параметров запроса

//   try {
//     const today = new Date(); // Текущая дата
//     // Запрос для получения токена и даты истечения подписки
//     const [rows] = await db.query(
//       `SELECT token, expiration_date FROM apitokens 
//            WHERE id = ? AND company_name = ? AND category = ?`,
//       [id, company_name, category]
//     );

//     if (rows.length > 0) {
//       const { token, expiration_date } = rows[0];
//       // Преобразуем expiration_date в объект Date
//       const expirationDate = new Date(expiration_date);
//       // Проверяем дату истечения подписки
//       if (expirationDate > today) {
//         res.json({ token });
//       } else {
//         res.status(404).json({ error: 'Подписка истекла' });
//       }
//     } else {
//       res.status(404).json({ error: 'Информация не найдена' });
//     }
//   } catch (err) {
//     console.error('Ошибка выполнения запроса:', err.message);
//     res.status(500).json({ error: 'Ошибка выполнения запроса' });
//   }
// });

app.get('/api/report', async (req, res) => {
  const { brand } = req.query;

  if (!brand) {
    return res.status(400).json({ error: 'Brand is required' });
  }

  // Сопоставление бренда с таблицей в базе данных
  const tableName = getTableForBrand(brand);
  if (!tableName) {
    return res.status(400).json({ error: 'Invalid brand' });
  }

  // Запрос, который учитывает доставку (delivery_number)
  const query = `
    SELECT 
      Size,
      Model,
      deliverynumber,
      COUNT(*) as Quantity
    FROM ${tableName}
    WHERE Status = 'Waiting'
    GROUP BY Size, Model, deliverynumber
    ORDER BY Size, deliverynumber;
  `;

  try {
    // Выполнение запроса в пуле для выбранной базы данных
    let rows = await pool.execute(query); // Запрос для базы данных
    // Если данных нет
    if (!rows[0].length) {
      return res.status(404).json({ error: 'No data found' });
    }

    res.json(rows[0]);  // Отправка данных
  } catch (err) {
    console.error('[ERROR] Ошибка при выполнении запроса:', err.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Функция для сопоставления бренда с таблицей в базе данных
const getTableForBrand = (brand) => {
  const tableMap = {
    'Armbest': 'delivery_armbest_ozon_pyatigorsk',  // Пример сопоставления для Armbest
    'BestShoes': 'delivery_bestshoes_pyatigorsk',
    'Best26': 'delivery_best26_pyatigorsk',
    'Ozon Armbest': 'delivery_armbest_ozon_pyatigorsk',
    'Ozon BestShoes': 'delivery_bestshoes_ozon_pyatigorsk'
  };
  return tableMap[brand];
};

function getFormattedDateTime() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getCurrentTimestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
  const year = String(now.getFullYear()).slice(-2); // Последние 2 цифры года
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${day}.${month}.${year}.${hour}.${minute}.${second}`;
}

// Запуск сервера
app.listen(portExpress, () => {
  console.log(`Express is running on port https://localhost:${portExpress}`);
});

server.listen(portSocket, () => {
  console.log(`WebSocket is running on port https://localhost:${portSocket}`);
});