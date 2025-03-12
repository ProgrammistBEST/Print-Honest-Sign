// Библиотека
const express = require('express');
const app = express();
const portExpress = process.env.PORT || 6501;
const portSocket = 6502;
const fs = require('fs');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const os = require('os');
const { processPDF } = require('./utils/pdfProcessor.js');
const { exec } = require('child_process');
const { PDFDocument } = require('pdf-lib');
const { pool, userPool } = require('./config/connectdb.js');
const { general_article, get_article } = require('./models/scriptsArticles.js');
const stringSimilarity = require('string-similarity');
const { getPrinters } = require('pdf-to-printer');
const mysql = require('mysql2');
const iconv = require('iconv-lite');
const { getInfoAboutAllHonestSign } = require('./controllers/infoHSController.js'); // Импортируем функцию
const { getPrintedHonestSign } = require('./controllers/printedHSController.js'); // Импортируем функцию
const { compareFiles } = require('./utils/compareFiles.js'); // Импортируем функцию
// const { kyz } = require('./controllers/kyzController.js'); // Импортируем функцию
app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
const util = require('util');
const execCommand = util.promisify(exec);

// Для работы с сокетами
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer();

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
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
app.get('/api/printedHonestSign', getPrintedHonestSign); // Используем функцию для маршрута
app.get('/api/InfoAboutAllHonestSign', getInfoAboutAllHonestSign); // Используем функцию для маршрута
app.post('/api/compare', upload.single('file'), compareFiles); // Используем функцию для маршрута

async function mergePDFs(pdfPaths) {
  const mergedPdf = await PDFDocument.create(); // Создаём новый PDF-документ

  for (const pdfPath of pdfPaths) {
    const pdfBytes = fs.readFileSync(pdfPath); // Читаем содержимое каждого PDF-файла
    const pdfDoc = await PDFDocument.load(pdfBytes); // Загружаем PDF-документ
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices()); // Копируем страницы
    copiedPages.forEach((page) => mergedPdf.addPage(page)); // Добавляем страницы в новый PDF
  }

    const mergedPdfBytes = await mergedPdf.save(); // Сохраняем объединённый PDF

  const mergedPdfPath = path.join(__dirname, '../frontend/public/pdfs', getCurrentTimestamp() + 'merged.pdf'); // Путь к объединённому файлу
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

// Получение ЧЗ для финального скачивания документов
app.post('/api/getlineToFinishDocument', (req, res) => {
  const { kyz, size, brand } = req.body;
  // Валидация входных данных
  if (!kyz || !size || !brand) {
    return res.status(400).json({ error: 'Некорректные входные данные' });
  }
  const sql = 'SELECT data FROM lines WHERE line = ? AND size = ? AND brand = ?';
  pool.query(sql, [kyz, size, brand], (error, result) => {
    if (error) {
      console.error('Ошибка запроса:', error);
      res.status(500).json({ error: 'Ошибка запроса' });
      return;
    }
    if (!result) {
      return res.status(404).json({ error: 'Данные не найдены' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.send(result.data);
  });
});

// Сохранение информации о поставке в базе данных SaveDataAboutDelivery
app.post('/api/SaveDataKyzToDB', (req, res) => {
  const { date, delivery, quantity } = req.body;
  if (typeof delivery !== 'string') {
    return res.status(400).json({ error: 'Delivery must be a string' });
  }
  const stmt = saveDataAboutDelivery.prepare('INSERT INTO DeliveryData (date, delivery, quantity) VALUES (?, ?, ?)');
  stmt.query(date, delivery, quantity, function (err) {
    if (err) {
      console.error('Ошибка при выполнении запроса', err);
      res.status(500).json({ error: 'Ошибка при выполнении запроса' });
    } else {
      res.status(200).json({ message: 'Data added successfully', id: this.lastID });
    }
  });
  stmt.finalize();
});

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

app.post('/api/FindHonestSign', async (req, res) => {
  const { model, size, crypto, brand, placePrint } = req.body;
  if (!model || !size || !crypto) {
    res.send('Данные указаны неправильно')
    res.status(500).send('Ошибка базы данных');
    return
  }
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM honestsignfordeliverytest WHERE Model = ? AND Size = ? AND Crypto = ? AND Locked = 1 AND Status = "Used" AND Brand = ?',
      [model, size, crypto, brand]
    );

    if (rows.length > 0) {
      if (rows[0].PDF) {
        const pdfPath = path.join(__dirname, `outputt.pdf`);
        fs.writeFileSync(pdfPath, rows[0].PDF);
        printPDF(pdfPath, 'honestSign', placePrint);
      } else {
      }
    } else {
      res.status(404).send('Честный знак не найден');
    }
  } catch (err) {
    console.error('Ошибка базы данных:', err);
    res.status(500).send('Ошибка базы данных');
  }
});

app.post('/api/getAllHonestSign', async (req, res) => {
  console.log(req.body);
  const { brand } = req.body;

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM honestsignfordeliverytest WHERE Locked = 0 AND Status = "Waiting" AND Brand = ?',
      [brand]
    );
    console.log(rows)
    if (rows.length > 0) {
      console.log('Найдено:', rows);
      const mergedPdf = await PDFDocument.create();

      for (const row of rows) {
        if (row.PDF) {
          const pdf = await PDFDocument.load(row.PDF);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => {
            mergedPdf.addPage(page);
          });
          console.log(row.Model + "`" + row.Size + "`");
        }
      }
      const mergedPdfBytes = await mergedPdf.save();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=merged_output.pdf');
      res.send(Buffer.from(mergedPdfBytes));
    } else {
      console.log('!!!');
      res.status(404).send('Нет данных для указанного бренда');
    }
  } catch (err) {
    console.error('Ошибка базы данных:', err);
    res.status(500).send('Ошибка базы данных');
  }
});

// Обновление статуса киза
app.put('/api/kyzUpdatestatus', (req, res) => {
  const { line, dateNow } = req.body;
  const stmt = MainDbForKyz.prepare("UPDATE lines SET Status = 'Used', created_at = ? WHERE line = ?");
  stmt.run(dateNow, line, function (err) {
    if (err) {
      console.error('Error during update:', err);
      res.status(500).json({ message: 'Database error', error: err });
    } else {
      res.json({ message: 'Status updated successfully', changes: this.changes });
    }
  });
  stmt.finalize();
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
  let { selectedBrand, user, placePrint, date, Model, Size } = req.body;
  let mainBrand;
  let tableName;
  console.log(selectedBrand, user, placePrint, date, Model, Size)
  if (placePrint == 'Тест') {
    tableName = 'delivery_test';
  } else if (selectedBrand === 'Ozon (Armbest)' || selectedBrand == 'Ozon Armbest') {
    selectedBrand = 'Ozon Armbest';
    mainBrand = 'ARMBEST';

    if (placePrint == 'Пятигорск') {
      tableName = 'delivery_armbest_ozon_pyatigorsk';
    } else if (placePrint == 'Лермонтово') {
      tableName = 'delivery_armbest_ozon_lermontovo';
    }

  } else if (selectedBrand == 'Ozon (BestShoes)' || selectedBrand == 'Ozon BestShoes') {
    selectedBrand = 'OZON';
    mainBrand = 'BESTSHOES';

    if (placePrint == 'Пятигорск') {
      tableName = 'delivery_bestshoes_ozon_pyatigorsk';
    } else if (placePrint == 'Лермонтово') {
      tableName = 'delivery_bestshoes_ozon_lermontovo';
    }

  } else if (selectedBrand == 'Armbest (Новая)' || selectedBrand == 'Armbest') {
    tableName = 'delivery_armbest_pyatigorsk';
    selectedBrand = 'Armbest';

    if (placePrint == 'Пятигорск') {
      tableName = 'delivery_armbest_pyatigorsk';
    } else if (placePrint == 'Лермонтово') {
      tableName = 'delivery_armbest_lermontovo';
    }

  } else if (selectedBrand == 'BestShoes (Старая)' || selectedBrand == 'BestShoes') {
    selectedBrand = 'BestShoes';

    if (placePrint == 'Пятигорск') {
      tableName = 'delivery_bestshoes_pyatigorsk';
    } else if (placePrint == 'Лермонтово') {
      tableName = 'delivery_bestshoes_lermontovo';
    }

  } else if (selectedBrand == 'Best26 (Арташ)' || selectedBrand == 'Best26') {
    selectedBrand = 'Best26';

    if (placePrint == 'Пятигорск') {
      tableName = 'delivery_best26_pyatigorsk';
    } else if (placePrint == 'Лермонтово') {
      tableName = 'delivery_best26_lermontovo';
    }
  };

  const serverDate = convertDateToServerFormat(date);
  console.log(tableName, selectedBrand, placePrint);

  try {
    const [result] = await pool.query(
      `UPDATE \`${tableName}\` SET Status = 'Waiting', Locked = 0 WHERE Date = ? AND Brand = ? AND user = ? AND Model = ? AND Size = ?`,
      [serverDate, selectedBrand, user, Model, Size]
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

// Загрузка нового киза
app.post('/uploadNewKyz', upload.single('file'), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).send({ message: 'Файл не загружен.' });
    }

    const fileName = req.file.originalname;
    const fileBuffer = req.file.buffer;
    const brandData = JSON.parse(req.body.brandData);
    // const deliveryNumber = JSON.parse(req.body.deliveryNumber);
    const placePrint = JSON.parse(req.body.placePrint);
    console.log("req.body: ", req.body);

    await processPDF(fileBuffer, fileName, brandData, placePrint, io);
    res.status(200).send({ message: 'Файл успешно загружен.' });

  } catch (err) {
    console.error('Error processing file:', err);
    res.status(500).send({ message: 'Ошибка загрузки файла.' });
  }
});

// Получение списка успешных доставок
app.get('/api/getdeliveryinfo/:id', (req, res) => {
  const deliveryId = req.params.id;
  saveDataAboutDelivery.get('SELECT * FROM DeliveryData WHERE id = ?', [deliveryId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.status(200).json(row);
  });
});

// Получить размер
app.get('/api/getWbSizeArmbest', (req, res) => {
  const skus = req.query.skus;
  db.get(`SELECT tech_size FROM product_sizesArmbest WHERE skus = ?`, [skus], (err, row) => {
    if (err) {
      res.status(500).send(err);
    } else if (row) {
      res.json({ tech_size: row.tech_size });
    } else {
      res.status(404).send('Размер не найден');
    }
  });
});

app.get('/api/getWbSizeBest26', (req, res) => {
  const skus = req.query.skus;
  db.get(`SELECT tech_size FROM product_sizesBest26 WHERE skus = ?`, [skus], (err, row) => {
    if (err) {
      res.status(500).send(err);
    } else if (row) {
      res.json({ tech_size: row.tech_size });
    } else {
      res.status(404).send('Размер не найден');
    }
  });
});

app.get('/api/getWbSizeBestShoes', (req, res) => {
  const skus = req.query.skus;
  db.get(`SELECT tech_size FROM product_sizesBestShoes WHERE skus = ?`, [skus], (err, row) => {
    if (err) {
      res.status(500).send(err);
    } else if (row) {
      res.json({ tech_size: row.tech_size });
    } else {
      res.status(404).send('Размер не найден');
    }
  });
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
  console.log('Запрос на сервер');

  const queries = [
    { brand: 'Armbest (Новая)', table: 'product_sizesArmbest' },
    { brand: 'BestShoes (Старая)', table: 'product_sizesbestshoes' },
    { brand: 'Best26 (Арташ)', table: 'product_sizesBestShoes' },
    { brand: 'Ozon (Armbest)', table: 'product_sizesozonarm' },
    { brand: 'Ozon (BestShoes)', table: 'product_sizesBestShoes' }
  ];

  try {
    const results = await Promise.all(queries.map(async query => {
      const sql = `SELECT vendor_code, GROUP_CONCAT(tech_size) AS sizes FROM ${query.table} GROUP BY vendor_code`;

      const [rows] = await pool.query(sql);

      if (rows.length === 0) {
        console.log(`Нет данных для таблицы: ${query.table}`);
      }

      // Преобразуем данные в нужный формат
      const models = rows.map((row, index) => ({
        name: row.vendor_code,
        sizes: row.sizes.split(',').map(size => {
          if (size.includes('-')) {
            return size; // Оставляем размер строкой
          } else {
            return Number(size); // Преобразуем в число
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

// Получение номера поставок
app.get('/getNumbersDeliveries', async (req, res) => {
  const query = 'SELECT DISTINCT deliverynumber FROM honestsignfordeliverytest WHERE deliverynumber IS NOT NULL';
  try {
    const [result] = await pool.query(query);
    res.json(result);
  } catch (error) {
    console.error('Ошибка выполнения запроса для номеров поставки:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.post('/kyz', async (req, res) => {
    const { selectedBrand, filledInputs, user, placePrint, printerForHonestSign, printerForBarcode } = req.body;
  
    const brandMappings = {
      'Ozon (Armbest)': { name: 'Ozon Armbest', table: 'delivery_armbest_ozon_' },
      'Ozon (BestShoes)': { name: 'Ozon BestShoes', table: 'delivery_bestshoes_ozon_' },
      'Armbest (Новая)': { name: 'Armbest', table: 'delivery_armbest_' },
      'BestShoes (Старая)': { name: 'BestShoes', table: 'delivery_bestshoes_' },
      'BestShoes': { name: 'BestShoes', table: 'delivery_bestshoes_' },
      'Best26 (Арташ)': { name: 'Best26', table: 'delivery_best26_' },
    };
  
    const placeMappings = {
      'Тест': 'delivery_test',
      'Пятигорск': 'pyatigorsk',
      'Лермонтово': 'lermontovo',
    };
  
    const brandDetails = brandMappings[selectedBrand] || {};
    let tableName = placePrint === 'Тест' ? placeMappings['Тест'] : `${brandDetails.table}${placeMappings[placePrint]}`;
    const normalizedBrand = brandDetails.name;
  
    if (!tableName || !normalizedBrand) {
      return res.status(400).json({ error: 'Некорректные данные о бренде или месте печати.' });
    }
  
    const shortageInfo = [];
    const successfulSign = [];
    const pdfPaths = [];
    const imagesBarckodePDF = [];
  
    try {
      const allPromises = filledInputs.map(async (input) => {
        const { size, model, value } = input;
        const count = Number(value);
        const formattedModel = ['Armbest'].includes(normalizedBrand) ? 'Multimodel' : model;
  
        const [waitingRows] = await pool.query(
          `SELECT * FROM \`${tableName}\` 
           WHERE \`Size\` = ? AND \`Brand\` = ? AND \`Status\` = "Waiting" 
             AND \`Model\` = ? AND \`Locked\` = 0 
           LIMIT ?`,
          [size, normalizedBrand, formattedModel, count]
        );
        console.log('Executing query with params:', size, normalizedBrand, formattedModel, count);
        const dateToday = getFormattedDateTime();
        console.log('waitingRows:', waitingRows);
        if (waitingRows.length < count) {
          console.log('Shortage detected for model:', model, 'size:', size);
        }
        if (waitingRows.length < count) {
          shortageInfo.push({
            model,
            size,
            brand: normalizedBrand,
            required: count,
            available: waitingRows.length,
          });
          return;
        }
  
        successfulSign.push({
          model,
          size,
          brand: normalizedBrand,
          required: count,
          available: waitingRows.length,
        });
  
        const updatePromises = waitingRows.slice(0, count).map(async (row) => {
          if (row.PDF) {
            const randomNumbers = Math.floor(1000 + Math.random() * 9000);
            const pdfPath = path.join(__dirname, `output${row.id}-${row.Model}[${randomNumbers}]${row.Size}.pdf`);
            fs.writeFileSync(pdfPath, row.PDF);
            pdfPaths.push(pdfPath);
          }
          await pool.query(
            `UPDATE \`${tableName}\` 
             SET \`Locked\` = 1, \`Status\` = ?, \`Date\` = ?, \`user\` = ? 
             WHERE \`id\` = ? AND \`Model\` = ? AND \`color\` = ? AND \`Crypto\` = ? 
               AND \`Brand\` = ? AND \`Size\` = ? AND \`Status\` = ? 
               AND \`Locked\` = 0`,
            ['Used', dateToday, user, row.id, row.Model, row.color, row.Crypto, row.Brand, row.Size, 'Waiting']
          );
        });
  
        await Promise.all(updatePromises);
      });
  
      await Promise.all(allPromises);
  
      if (pdfPaths.length > 0) {
          pdfPaths.sort((a, b) => extractSizeFromPath(a) - extractSizeFromPath(b));
        let mergedPdfPath = await mergePDFs(pdfPaths);
          // printPDF(mergedPdfPath, 'honestSign', printerForHonestSign);
          mergedPdfPath = mergedPdfPath.split('\\').pop();
          console.log(mergedPdfPath)
          const pdfUrl = `http://localhost:6500/pdfs/${mergedPdfPath}`;

        res.json({ success: true, data: { successfulSign, shortageInfo }, mergedPdfPath: pdfUrl });
      } else {
        res.json({ success: false, data: { successfulSign, shortageInfo } });
      }
    } catch (error) {
      console.error('Произошла ошибка:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Произошла ошибка при выполнении операции.' });
      }
    }
}) // Используем функцию для маршрута

// Мое добро на добавление номеров поставок
app.post('/addDelivery', async (req, res) => {
  const { deliverynumber } = req.body;
  console.log("Запрос ")
  try {
    await pool.query('INSERT INTO honestsignfordeliverytest (deliverynumber) VALUES (?)', [deliverynumber])
    res.status(200).send({ message: 'Поставка добавлена успешно' });
  } catch (error) {
    console.error('Ошибка добавления поставки:', error);
    res.status(500).send({ error: 'Ошибка добавления поставки' });
  }
})

app.post('/api/checkDelivery', async (req, res) => {
  console.log('/api/checkDelivery')
  const { deliverynumber } = req.body;
  console.log(deliverynumber)
  try {
    const [rows] = await pool.query('SELECT 1 FROM honestsignfordeliverytest WHERE deliverynumber = ?', [deliverynumber]);
    if (rows.length > 0) {
      res.status(200).send({ exists: true });
    } else {
      res.status(200).send({ exists: false });
    }
  } catch (error) {
    console.error('Ошибка проверки поставки:', error);
    res.status(500).send({ error: 'Ошибка проверки поставки' });
  }
});

// Функция для печати PDF файла
async function printPDF(filePath, type, placePrint) {

    if (!placePrint) {
        console.error('Ошибка: Не указан принтер!');
        return;
    }
    
    const resolvedPath = path.resolve(filePath);
  let command = '';
  if (type == 'barcode') {
    command = `"C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe" /h /t "${resolvedPath}" "${placePrint}" "" ""`;
  } else if (type == 'honestSign') {
    command = `'C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe' /h /t "${resolvedPath}" "${placePrint}" "" ""`;
}
    console.log('resolvedPath: ', resolvedPath)
    console.log('command: ',command)
    console.log('type: ',type)
    console.log('filePath: ',filePath)

    try {
        const { stdout, stderr } = await execCommand(command);
        if (stderr) {
            console.warn('Предупреждение при печати:', stderr);
        }
        console.log('Печать завершена успешно');
    } catch (err) {
        console.error('Произошла ошибка при печати:', err);
    }
}

app.get('/getApiById', async (req, res) => {
  const { id, company_name, category } = req.query; // Извлечение параметров запроса

  try {
    const today = new Date(); // Текущая дата

    // Запрос для получения токена и даты истечения подписки
    const [rows] = await db.query(
      `SELECT token, expiration_date FROM apitokens 
           WHERE id = ? AND company_name = ? AND category = ?`,
      [id, company_name, category]
    );

    if (rows.length > 0) {
      const { token, expiration_date } = rows[0];

      // Преобразуем expiration_date в объект Date
      const expirationDate = new Date(expiration_date);

      // Проверяем дату истечения подписки
      if (expirationDate > today) {
        res.json({ token });
      } else {
        res.status(404).json({ error: 'Подписка истекла' });
      }
    } else {
      res.status(404).json({ error: 'Информация не найдена' });
    }
  } catch (err) {
    console.error('Ошибка выполнения запроса:', err.message);
    res.status(500).json({ error: 'Ошибка выполнения запроса' });
  }
});

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