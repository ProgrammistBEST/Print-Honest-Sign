// Библиотека
const express = require("express");
const app = express();
const portExpress = 6501;
// const portExpress = process.env.PORT || 6501;
const portSocket = 6502;
const fs = require("fs");
const cors = require("cors");
// const sqlite3 = require('sqlite3').verbose();
const multer = require("multer");
const path = require("path");
// const os = require('os');
const { processPDF } = require("./utils/pdfProcessor.js");
const { exec } = require("child_process");
const { PDFDocument } = require("pdf-lib");
const { pool, userPool } = require("./config/connectdb.js");
// const stringSimilarity = require('string-similarity');
const { getPrinters } = require("pdf-to-printer");
// const mysql = require('mysql2');
// const iconv = require('iconv-lite');

////////////////// Импортируем функции //////////////////////
const {
  getInfoAboutAllHonestSign,
} = require("./controllers/infoHSController.js");
const {
  getPrintedHonestSign,
} = require("./controllers/printedHSController.js");
const {
  getCategoryByModel,
  getTablesName,
} = require("./controllers/models.js");
const { compareFiles } = require("./utils/compareFiles.js");

// const { general_article, get_article } = require('./models/scriptsArticles.js');
// const { kyz } = require('./controllers/kyzController.js');

app.use(cors());
app.use(express.json());

const util = require("util");
const execCommand = util.promisify(exec);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")));
}

// Для работы с сокетами
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Client connected");
});

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Обслуживание статических файлов!
// app.use(express.static(path.join(__dirname, '../frontend/public')));
// app.use('/frontend', express.static(path.join(__dirname, './frontend')));

app.get("/api/printers", async (req, res) => {
  try {
    const printers = await getPrinters();
    console.log(printers);
    const printersNames = printers.map((printer) => printer.name);
    res.json(printersNames);
  } catch (error) {
    res.status(500).json({ error: "Не удалось получить список принтеров" });
  }
});

// Роуты
app.get("/api/printedHonestSign", getPrintedHonestSign);
app.get("/api/InfoAboutAllHonestSign", getInfoAboutAllHonestSign);
app.post("/api/compare", upload.single("file"), compareFiles);

// Добавление моделей
app.post("/api/models/add", async (req, res) => {
  const models = req.body;
  if (!Array.isArray(models) || models.length === 0) {
    return res
      .status(400)
      .send({ error: "Массив моделей пуст или отсутствует" });
  }

  const addedModels = [];
  const existingModels = [];

  try {
    for (const model of models) {
      const { article, size, brand } = model;
      console.log(article, size, brand);
      // Проверка данных модели
      if (!article || !size || !brand) {
        return res.status(400).send({ error: "Некорректные данные модели" });
      }

      // Определение таблицы на основе бренда
      let table;
      switch (brand) {
        case "bestshoes":
          table = "product_sizesbestshoes";
          break;
        case "best26":
          table = "product_sizesbest26";
          break;
        case "armbest":
          table = "product_sizesarmbest";
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
        await pool.query(
          `INSERT INTO ${table} (vendor_code, tech_size) VALUES (?, ?)`,
          [article, size]
        );
        addedModels.push({ article, size, brand });
      }
    }

    // Формирование ответа
    if (existingModels.length > 0 && addedModels.length === 0) {
      // Все модели уже существуют
      return res.status(409).send({
        message: "Все указанные модели уже существуют",
        existingModels,
      });
    } else if (existingModels.length > 0) {
      // Некоторые модели уже существуют
      return res.status(200).send({
        message: "Часть моделей добавлена, часть уже существует",
        addedModels,
        existingModels,
      });
    } else {
      // Все модели успешно добавлены
      return res.status(200).send({
        message: "Все модели успешно добавлены",
        addedModels,
      });
    }
  } catch (error) {
    console.error("Ошибка добавления поставки:", error);
    res.status(500).send({ error: "Ошибка добавления поставки" });
  }
});

async function mergePDFs(pdfPaths) {
  const mergedPdf = await PDFDocument.create(); // Создаём новый PDF-документ
  for (const pdfPath of pdfPaths) {
    const pdfBytes = fs.readFileSync(pdfPath); // Читаем содержимое каждого PDF-файла
    const pdfDoc = await PDFDocument.load(pdfBytes); // Загружаем PDF-документ
    const copiedPages = await mergedPdf.copyPages(
      pdfDoc,
      pdfDoc.getPageIndices()
    ); // Копируем страницы
    copiedPages.forEach((page) => mergedPdf.addPage(page)); // Добавляем страницы в новый PDF
  }

  const mergedPdfBytes = await mergedPdf.save(); // Сохраняем объединённый PDF

  const mergedPdfPath = path.join(
    __dirname,
    getCurrentTimestamp() + "merged.pdf"
  ); // Путь к объединённому файлу
  fs.writeFileSync(mergedPdfPath, mergedPdfBytes); // Записываем объединённый файл на диск

  // Удаляем использованные PDF-файлы
  for (const pdfPath of pdfPaths) {
    fs.unlinkSync(pdfPath); // Синхронное удаление файла
  }
  console.log(mergedPdfPath);
  return mergedPdfPath; // Возвращаем путь к объединённому PDF
}

function extractSizeFromPath(filePath) {
  const match = filePath.match(/\[\](\d+)\.pdf$/); // Ищем число после "[]", перед ".pdf"
  return match ? parseInt(match[1], 10) : null; // Возвращаем число или null, если не найдено
}

app.post("/api/CheckUser", async (req, res) => {
  const { user } = req.body;
  try {
    // Выполняем запрос к базе данных MySQL
    const [rows] = await userPool.execute(
      "SELECT * FROM programm_users WHERE pswd = ?",
      [user]
    );

    if (rows.length > 0) {
      res.send(rows);
    } else {
      res.status(500).send("Ошибка");
    }
  } catch (error) {
    res.status(500).send("Не найдено");
  }
});

function convertDateToServerFormat(clientDate) {
  // Разделение даты и времени
  const [datePart, timePart] = clientDate.split(" ");
  const [day, month] = datePart.split(".");
  const [hours, minutes, seconds] = timePart.split(":");

  // Получение текущего года
  const year = new Date().getFullYear();
  const formattedSeconds = seconds ? seconds : "00";

  // Форматирование даты в серверный формат
  return `${year}-${month}-${day} ${hours}:${minutes}:${formattedSeconds}`;
}

// Обновление статуса киза
app.put("/api/returnKyz", async (req, res) => {
  let { id, brand, user, placePrint, date, model, size } = req.body;

  let tableName;

  const category = await getCategoryByModel(model, size);
  tableName = `${brand.toLowerCase()}_${category}`;

  if (placePrint == "Тест") {
    tableName = "delivery_test";
  }

  const serverDate = convertDateToServerFormat(date);
  console.log(tableName, brand, placePrint, serverDate, user, model, size);

  try {
    const [result] = await pool.query(
      `UPDATE \`${tableName}\` SET status = 'Waiting', locked = 0 WHERE id = ? AND model = ?`,
      [id, model]
    );
    res.json({
      message: "Status updated successfully",
      changes: result.affectedRows, // Количество измененных строк
    });
  } catch (err) {
    console.error("Error during update:", err);
    res.status(500).json({ message: "Database error", error: err });
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
    const copiedPages = await newPdfDoc.copyPages(
      pdfDoc,
      Array.from({ length: endPage - startPage }, (_, i) => startPage + i)
    );
    copiedPages.forEach((page) => newPdfDoc.addPage(page));
    const chunkBytes = await newPdfDoc.save();
    chunks.push(chunkBytes);
  }

  return { chunks, totalPages };
}

const stopFlags = new Map();

io.on("connection", (socket) => {
  console.log("Пользователь подключился:", socket.id);

  socket.on("stopUpload", () => {
    console.log("Пользователь хочет остановить загрузку:", socket.id);
    stopFlags.set(socket.id, true);
    socket.emit("uploadStopped", "Загрузка была остановлена.");
  });

  socket.on("disconnect", () => {
    stopFlags.delete(socket.id); // очищаем при отключении
  });
});

// Загрузка нового киза
app.post("/uploadNewKyz", upload.single("file"), async (req, res) => {
  const socketId = req.body.socketId;

  try {
    const arrayAddingModels = {};
    let countPages = 0;

    if (!req.file) {
      return res.status(400).send({ message: "Файл не загружен." });
    }

    const fileBuffer = req.file.buffer;
    const brandData = JSON.parse(req.body.brandData);
    const placePrint = JSON.parse(req.body.placePrint);
    const MultiModel = JSON.parse(req.body.MultiModel);
    const pdfBytes = new Uint8Array(fileBuffer);
    const { chunks, totalPages } = await splitPDFIntoChunks(pdfBytes, 500);
    console.log("chunks.length: ", chunks.length);
    for (let i = 0; i < chunks.length; i++) {
      if (stopFlags.get(socketId)) {
        stopFlags.delete(socketId);
        console.log("Пользователь остановил загрузку");
        io.to(socketId).emit(
          "uploadStopped",
          "Пользователь остановил загрузку."
        );
        return res
          .status(200)
          .send({ message: "Пользователь остановил загрузку." });
      }
      const chunkBytes = chunks[i];
      console.log(`Обработка части ${i + 1} из ${chunks.length}`);
      await processPDF(
        chunkBytes,
        brandData,
        placePrint,
        io,
        MultiModel,
        totalPages,
        countPages,
        arrayAddingModels,
        socketId,
        stopFlags
      );
    }

    countPages += 100;
    res.status(200).send({ message: "Файл успешно загружен." });
  } catch (err) {
    console.error("Error processing file:", err);
    res.status(500).send({ message: "Ошибка загрузки файла." });
  }
});

let activeRequests = {};

app.use((req, res, next) => {
  const requestKey = `${req.ip}-${req.originalUrl}`;

  if (activeRequests[requestKey]) {
    return res
      .status(429)
      .send("Запрос уже обрабатывается, дождитесь завершения.");
  }

  activeRequests[requestKey] = true;

  res.on("finish", () => {
    delete activeRequests[requestKey];
  });

  next();
});

app.get("/getBrands", async (req, res) => {
  try {
    const query = `
      SELECT brand FROM brands
    `;
    const brands = await pool.query(query);
    res.json(brands[0]); // Отправляем только массив данных
  } catch (err) {
    console.error("Ошибка получения данных:", err.message);
    res.status(500).send("Ошибка получения данных: " + err.message); // Отправляем ошибку клиенту
  }
});

app.get("/getModels", async (req, res) => {
  const { brand } = req.query;
  try {
    const query = `
      SELECT article_association AS article, size FROM models
      JOIN articles ON models.article_id = articles.article_id
      JOIN sizes ON models.size_id = sizes.size_id
      JOIN brands ON models.brand_id = brands.brand_id
      WHERE brand = ? AND models.category != 'Украшения для обуви' 
    `;
    const models = await pool.query(query, [brand]);

    // Группируем данные по полю article
    const groupedData = models[0]
      .reduce((acc, item) => {
        const existingArticle = acc.find(
          (entry) => entry.article === item.article
        );
        if (existingArticle) {
          // Если article уже существует, добавляем size в массив sizes
          existingArticle.sizes = [
            ...new Set([...existingArticle.sizes, item.size]),
          ];
        } else {
          // Если article новый, создаем новую запись
          acc.push({ article: item.article, sizes: [item.size] });
        }
        return acc;
      }, [])
      .map((entry) => {
        entry.sizes.sort(); // Сортируем массив sizes
        return entry;
      });

    // Отправляем сгруппированные данные клиенту
    res.json(groupedData);
  } catch (err) {
    console.error("Ошибка получения данных:", err.message);
    res.status(500).send("Ошибка получения данных: " + err.message); // Отправляем ошибку клиенту
  }
});

const writePDFs = async (rows) => {
  const writePromises = rows
    .filter((row) => row.pdf)
    .map(async (row) => {
      const randomNumbers = Math.floor(1000 + Math.random() * 9000);
      const pdfPath = path.join(
        __dirname,
        `output${row.id}-${row.model}[${randomNumbers}]${row.size}.pdf`
      );
      await fs.promises.writeFile(pdfPath, row.pdf);
      return pdfPath;
    });
  return Promise.all(writePromises);
};

app.post("/kyz", async (req, res) => {
  let { selectedBrand, filledInputs, user, placePrint, printerForHonestSign } =
    req.body;
  console.log(
    selectedBrand,
    filledInputs,
    user,
    placePrint,
    printerForHonestSign
  );
  if (!selectedBrand) {
    console.error("Парметр бренд в /kyz:", selectedBrand);
    res.status(404).json({ error: "Параметр бренд не передан" });
    return;
  }
  const placeMappings = {
    Тест: "delivery_test",
    Пятигорск: "pyatigorsk",
    Лермонтово: "lermontovo",
  };

  const shortageInfo = [];
  const successfulSign = [];
  const pdfPaths = [];

  try {
    const allPromises = await filledInputs.map(async (input, index) => {
      let tableName;

      const { size, model, value } = input;
      const count = Number(value);
      if (isNaN(count) || count <= 0) {
        console.error(
          `Некорректное значение "value" для модели "${model}", размера "${size}".`
        );
      }
      if (placePrint === "Тест") {
        tableName = placeMappings["Тест"];
      } else {
        console.log(selectedBrand.toLowerCase());
        console.log(`${filledInputs[index]?.model}, ${size}`);

        const category = await getCategoryByModel(
          filledInputs[index]?.model,
          size
        );
        tableName = `${selectedBrand.toLowerCase()}_${category}`;
        if (!tableName) {
          return res.status(400).json({
            error: "Не удалось определить таблицу для данной модели.",
          });
        }
      }
      if (!tableName || !selectedBrand) {
        return res
          .status(400)
          .json({ error: "Некорректные данные о бренде или месте печати." });
      }
      // const formattedModel = ['Armbest'].includes(selectedBrand) ? 'ЭВА' : model;
      console.log(
        `Обработка модели "${model}", размера "${size}" для бренда "${selectedBrand}". Требуется: ${count}. tableName: ${tableName}`
      );

      // Запрос к базе данных для текущего размера
      const [waitingRows] = await pool.query(
        `SELECT pdf, id, model, size, crypto FROM \`${tableName}\` 
              WHERE \`size\` = ? AND \`brand\` = ? AND \`status\` IN ('Waiting', 'Comeback')
              AND \`model\` = ? AND \`locked\` = 0
              LIMIT ?`,
        [size, selectedBrand, model, count]
      );
      if (waitingRows.length <= 0) {
        shortageInfo.push({
          model,
          size,
          brand: selectedBrand,
          required: count,
          available: waitingRows.length,
        });
        console.log(
          `Недостаточно записей для модели "${model}", размера "${size}". Требуется: ${count}, доступно: ${waitingRows.length}`
        );
      } else if (waitingRows.length >= count) {
        successfulSign.push({
          model,
          size,
          brand: selectedBrand,
          required: count,
          available: waitingRows.length,
        });
        const rowIds = waitingRows.slice(0, count).map((row) => row.id);

        // Запись PDF
        const newPdfPaths = await writePDFs(waitingRows.slice(0, count));
        pdfPaths.push(...newPdfPaths);
        console.log(user, rowIds, tableName);

        // Обновление статуса
        await pool.query(
          `UPDATE \`${tableName}\`
                  SET \`locked\` = 1, \`status\` = ?, \`date_used\` = ?, \`user\` = ?
                  WHERE \`id\` IN (?) AND \`status\` = "Waiting" AND \`locked\` = 0`,
          ["Used", getFormattedDateTime(), user, rowIds.flat()]
        );
      }
    });

    await Promise.all(allPromises);

    if (pdfPaths.length > 0) {
      await Promise.all(allPromises);
      pdfPaths.sort((a, b) => extractSizeFromPath(a) - extractSizeFromPath(b));
      const mergedPdfPath = await mergePDFs(pdfPaths);
      console.log("Проверка 0: ", mergedPdfPath, printerForHonestSign);

      printPDF(mergedPdfPath, "honestSign", printerForHonestSign, placePrint);
      console.log("Все закончилось!");
      res.json({ success: true, data: { successfulSign, shortageInfo } });
    } else {
      res.json({ success: false, data: { successfulSign, shortageInfo } });
    }
  } catch (error) {
    console.error("Произошла ошибка:", error);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Произошла ошибка при выполнении операции." });
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
async function printPDF(filePath, type, printer, placePrint) {
  if (!printer) {
    console.error("Ошибка: Не указан принтер!");
    return false;
  }
  console.log(placePrint, printer);
  const resolvedPath = path.resolve(filePath);

  if (placePrint === "Тест") {
    console.error(
      `Тестовый контур выдал положительный ответ: путь файла - ${resolvedPath}, печать для ${printer}`
    );
    return false;
  }

  let command = "";
  command = `"C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe" /h /t "${resolvedPath}" "${printer}" "" ""`;
  console.log("Выполняемая команда:", command);
  try {
    const { stdout, stderr } = await execCommand(command);
    console.log("stdout:", stdout);
    console.log("stderr:", stderr);
    console.log("Печать завершена успешно");
  } catch (err) {
    console.error(
      "Произошла ошибка, но она игнорируется, так как печать завершена"
    );
  }
}

const {
  getDataFromTable,
  getModelsForNull,
} = require("./utils/getDataHSUtils.js");

app.get("/api/report", async (req, res) => {
  try {
    const { brand } = req.query;

    if (!brand || typeof brand !== "string") {
      return res
        .status(400)
        .json({ error: 'Parameter "brand" is required and must be a string' });
    }

    const tablesName = await getTablesName(brand.toLowerCase());

    if (
      !Array.isArray(tablesName) ||
      !tablesName.every((table) => typeof table === "string")
    ) {
      return res.status(500).json({ error: "Invalid table names" });
    }

    const data = await Promise.all(
      tablesName.map(async (table) => {
        try {
          return await getDataFromTable(table);
        } catch (error) {
          console.error(
            `Error processing table for report ${table}:`,
            error.message
          );
          return [];
        }
      })
    );

    const flattenedData = data.flat();
    const allData = await getModelsForNull(flattenedData, brand);

    res.json(allData);
  } catch (error) {
    console.error("Error in /api/report:", error.message);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
});

function getFormattedDateTime() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Месяцы начинаются с 0
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getCurrentTimestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Месяцы начинаются с 0
  const year = String(now.getFullYear()).slice(-2); // Последние 2 цифры года
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  return `${day}.${month}.${year}.${hour}.${minute}.${second}`;
}

// Запуск сервера
app.listen(portExpress, () => {
  console.log(`Express is running on port https://localhost:${portExpress}`);
});

server.listen(portSocket, () => {
  console.log(`WebSocket is running on port https://localhost:${portSocket}`);
});

// Закрытие подключения к базе данных при завершении работы сервера
process.on("SIGINT", async () => {
  try {
    await pool.end();
    await userPool.end();
    console.log("Closed the database connection.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  try {
    await pool.end();
    await userPool.end();
    console.log("Closed the database connection.");
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
});
