// Импортируем библиотеки в глобальной области видимости
const pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
const pdfLib = require('pdf-lib');
const { PDFDocument } = pdfLib;

// Настройки для подключения к базе данных
const { pool } = require('../config/connectdb.js');

// Извлечение текста из PDF
async function extractTextFromPDF(data) {
  const pdfjsLib = await pdfjsLibPromise;
  const { getDocument } = pdfjsLib;
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;
  const extractedTexts = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContentPage = await page.getTextContent();
    const textContent = textContentPage.items.map(item => item.str).join('\n');
    extractedTexts.push(textContent);
  }
  return { extractedTexts, pdf };
}

// Определение категории на основе модели
function getCategoryByModel(model) {
  const modelMapping = {
    men: ["065", "067", "080", "086"],
    women_slippers: ["072", "079", "073", "077", "075", "0076"],
    kids_crocs: ["084", "085", "094", "095"],
    women_crocs: ["090", "093", "096", "097", "098"],
    crocs_1: ["030", "031", "032", "033", "034", "035", "036"],
    crocs_2: ["040", "041"],
    winter_1: ["60", "61", "62", "63", "81", "82", "83", "84"],
    winter_2: ["90", "91", "70", "71", "72", "73"],
    winter_3: ["100", "110", "180", "380", "102", "103", "105"],
    winter_4: ["401", "402", "400", "411", "412", "410", "10", "32", "34", "36", "37", "80"],
    general: ["ЭВА"],
  };

  // Ищем категорию, к которой относится модель
  for (const [category, models] of Object.entries(modelMapping)) {
    if (models.includes(model)) {
      return category;
    }
  }

  return 'not_defined'; // Если модель не найдена
}

// Определение имени таблицы на основе категории
function getTableName(brand, category) {
  const tableMapping = {
    men: `${brand}_men`,
    women_slippers: `${brand}_women_slippers`,
    kids_crocs: `${brand}_kids_crocs`,
    women_crocs: `${brand}_women_crocs`,
    crocs_1: `${brand}_crocs_1`,
    crocs_2: `${brand}_crocs_2`,
    winter_1: `${brand}_winter_1`,
    winter_2: `${brand}_winter_2`,
    winter_3: `${brand}_winter_3`,
    winter_4: `${brand}_winter_4`,
    general: `${brand}_general`,
    not_defined: `${brand}_not_defined`,
  };

  return tableMapping[category] || null; // Возвращаем имя таблицы или null, если категория не найдена
}

// Проверка, является ли текст числом в пределах от 24 до 48
function isValidSize(text) {
  let value = parseFloat(text);
  return !isNaN(value) && (value >= 24 && value <= 48) || ['35-36', '40-41', '41-42', '46-47', '47-48'].includes(text);
}

// Сохранение всех данных в базу данных
async function saveAllDataToDB(connection, pageDataList, brandData, placePrint) {

  let Brand = brandData;
  let Color;
  
  console.log('Brand, placePrint: ', Brand, placePrint)
  let DateNow = new Date();
  DateNow = DateNow.getFullYear() + '-' +
    ('0' + (DateNow.getMonth() + 1)).slice(-2) + '-' +
    ('0' + DateNow.getDate()).slice(-2) + ' ' +
    ('0' + DateNow.getHours()).slice(-2) + ':' +
    ('0' + DateNow.getMinutes()).slice(-2) + ':' +
    ('0' + DateNow.getSeconds()).slice(-2);

  let tableName;

  if (placePrint == 'Тест') {
    if (Brand === 'Ozon (Armbest)' || Brand === 'Ozon Armbest') {
      Brand = 'Ozon Armbest'
      tableName = 'delivery_test';
    } else if (Brand === 'Ozon (BestShoes)' || Brand === 'Ozon BestShoes') {
      Brand = 'Ozon BestShoes'
      tableName = 'delivery_test';
    } else if (Brand === 'Armbest (Новая)' || Brand === 'Armbest') {
      Brand = 'Armbest'
      tableName = 'delivery_test';
    } else if (Brand === 'BestShoes (Старая)' || Brand === 'BestShoes') {
      Brand = 'BestShoes'
      tableName = 'delivery_test';
    } else if (Brand === 'Best26 (Арташ)' || Brand === 'Best26') {
      Brand = 'Best26'
      tableName = 'delivery_test';
    }
  } else if (Brand === 'Ozon (Armbest)' || Brand === 'Ozon Armbest') {
    Brand = 'Ozon Armbest';
    mainBrand = 'ARMBEST';

    if (placePrint == 'Пятигорск') {
      tableName = 'delivery_armbest_ozon_pyatigorsk';
    } else if (placePrint == 'Лермонтово') {
      tableName = 'delivery_armbest_ozon_lermontovo';
    }

  } else if (Brand == 'Ozon (BestShoes)' || Brand === 'Ozon BestShoes') {
    Brand = 'Ozon BestShoes';
    mainBrand = 'BESTSHOES';

    if (placePrint == 'Пятигорск') {
      tableName = 'delivery_bestshoes_ozon_pyatigorsk';
    } else if (placePrint == 'Лермонтово') {
      tableName = 'delivery_bestshoes_ozon_lermontovo';
    }

  } else if (Brand == 'Armbest (Новая)' || Brand === 'Armbest') {
    tableName = 'delivery_armbest_pyatigorsk';
    Brand = 'Armbest';

    if (placePrint == 'Пятигорск') {
      tableName = 'delivery_armbest_pyatigorsk';
    } else if (placePrint == 'Лермонтово') {
      tableName = 'delivery_armbest_lermontovo';
    }

  } else if (Brand == 'BestShoes (Старая)' || Brand === 'BestShoes') {
    Brand = 'BestShoes';

    if (placePrint == 'Пятигорск') {
      tableName = 'delivery_bestshoes_pyatigorsk';
    } else if (placePrint == 'Лермонтово') {
      tableName = 'delivery_bestshoes_lermontovo';
    }

  } else if (Brand == 'Best26 (Арташ)' || Brand === 'Best26') {
    Brand = 'Best26';

    if (placePrint == 'Пятигорск') {
      tableName = 'delivery_best26_pyatigorsk';
    } else if (placePrint == 'Лермонтово') {
      tableName = 'delivery_best26_lermontovo';
    }
  }

  for (let { pageData, Crypto, Size, Model } of pageDataList) {

    if (Model === '' || Model === ' ') {
      Model = 'Multimodel';
      Color = 'Multicolor';
    } else {
      Color = 'Multicolor';
    }

    let category = getCategoryByModel(Model.split(/[-/]/)[0].trim());
    let tableName = getTableName(Brand, category);
    if (!category && placePrint != 'Тест') {
        console.error(`Ошибка: Не удалось определить категорию для модели "${Model}".`);
        continue;
    } else if (!tableName && placePrint != 'Тест') {
        console.error(`Ошибка: Не удалось определить таблицу для категории "${category}".`);
        continue;
    } else if (category == 'not_defined' && placePrint != 'Тест') {
        console.error(`Ошибка: Не удалось определить таблицу для категории "${Model.split(/[-/]/)[0].trim()}".`);
    }
      
    if (placePrint == 'Тест') {
        if (Brand === 'Ozon (Armbest)' || Brand === 'Ozon Armbest') {
            Brand = 'Ozon Armbest'
            tableName = 'delivery_test';
        } else if (Brand === 'Ozon (BestShoes)' || Brand === 'Ozon BestShoes') {
            Brand = 'Ozon BestShoes'
            tableName = 'delivery_test';
        } else if (Brand === 'Armbest (Новая)' || Brand === 'Armbest') {
            Brand = 'Armbest'
            tableName = 'delivery_test';
        } else if (Brand === 'BestShoes (Старая)' || Brand === 'BestShoes') {
            Brand = 'BestShoes'
            tableName = 'delivery_test';
        } else if (Brand === 'Best26 (Арташ)' || Brand === 'Best26') {
            Brand = 'Best26'
            tableName = 'delivery_test';
        }
    }

    try {
      const insertQuery = `INSERT INTO ${tableName} (Model, Color, PDF, Size, Crypto, Brand, Date, Status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      const checkQuery = `SELECT 1 FROM ${tableName} WHERE Model = ? AND Color = ? AND Size = ? AND Crypto = ? AND Brand = ?`;

      const [rows] = await connection.execute(checkQuery, [Model, Color, Size, Crypto, Brand]);
      if (rows.length === 0) {
        await connection.execute(insertQuery, [Model, Color, pageData, Size, Crypto, Brand, DateNow, "Waiting"]);
      } else {
        console.log('Найдено совпадение для:', Model, Size, Crypto, Brand);
      }
    } catch (error) {
      console.error('Ошибка при выполнении запроса:', error);
    }
  }
}

// Создание нового PDF-документа
async function createSinglePagePDF(pdfBytes, pageIndex) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const newPdfDoc = await PDFDocument.create();
  const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);
  newPdfDoc.addPage(copiedPage);
  return await newPdfDoc.save();
}

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

  return chunks;
}
let pageForLoadingHonestSign = 0;
// Функция обработки PDF
async function processPDF(fileBuffer, brandData, placePrint, io, MultiModel, totalPages) {
  try {
    const data = new Uint8Array(fileBuffer);
    const { extractedTexts } = await extractTextFromPDF(data);

    // subscribers.forEach(chatId => {
    //   let message = `Запущена загрузка честного знака на ${brandData} в количестве ${extractedTexts.length} шт.`;
    //   // bot.telegram.sendMessage(chatId, message);
    //   console.log(message)
    // });

    const pdfBytes = new Uint8Array(fileBuffer);
    const pageSize = 50;
    let startPage = 0;

    while (startPage < extractedTexts.length) {
      pageForLoadingHonestSign += 1;
      const pageDataList = await Promise.all(extractedTexts.slice(startPage, startPage + pageSize).map(async (text, pageIndex) => {
        const linesArray = text.split('\n');
        let Crypto = linesArray.filter(line => line.startsWith('(01)')).join('\n');
        let Size = '';
        let Model = '';
        const progress = Math.round(((startPage + pageSize) / extractedTexts.length) * 100);
        io.emit('upload_status', { progress, message: `Загружено ${startPage} из ${totalPages}` });

        if (linesArray.length > 1 && brandData == 'Armbest') {
          const secondLine = linesArray[4] || '';
          if (isValidSize(secondLine)) {
            Size = secondLine;
            Model = 'Multimodel';
          } else {
            Size = linesArray[2] || '';
            Model = 'Multimodel';
          }
        } else if (linesArray.length > 1 && brandData == 'Best26') {
          const secondLine = linesArray[4] || '';
          const thirdLine = linesArray[2] || '';
          if (isValidSize(secondLine)) {
            Size = secondLine;
            Model = thirdLine;
          } else {
            Size = linesArray[2] || '';
            Model = thirdLine;
          }
        } else if (linesArray.length > 1 && brandData == 'BestShoes') {
          const secondLine = linesArray[4] || '';
          const thirdLine = linesArray[2] || '';
          const modelLine = linesArray[0] || '';
          if (isValidSize(secondLine)) {
            Size = secondLine;
            Model = modelLine;
          } else {
            Size = linesArray[2] || '';
            Model = modelLine;
          }
        } else if (linesArray.length > 1 && brandData == 'Ozon Armbest' ||
          linesArray.length > 1 && brandData == 'Ozon BestShoes') {
          const secondLine = linesArray[4] || '';
          const thirdLine = linesArray[2] || '';
          if (isValidSize(secondLine)) {
            Size = secondLine;
            Model = thirdLine;
          } else {
            Size = linesArray[2] || '';
            Model = 'Multimodel';
          }
        }

        // Создаем новый PDF-документ с одной страницей
        const pageBytes = await createSinglePagePDF(pdfBytes, startPage + pageIndex);
        return { pageData: pageBytes, pageNumber: startPage + pageIndex + 1, Crypto, Size, Model };
    
      }));
    
      // Записываем данные в базу данных
      await saveAllDataToDB(pool, pageDataList, brandData, placePrint);
      // Перемещаемся к следующей порции страниц
      startPage += pageSize;
      console.log(startPage)
    }
    // subscribers.forEach(chatId => {
    //   let message = `Для ${brandData} добавлено ${extractedTexts.length} шт. честного знака.`;
    //   // bot.telegram.sendMessage(chatId, message);
    //   console.log(message)
    // });
    io.emit('upload_status', { progress: 100, message: 'Загрузка завершена!' });

  } catch (err) {
    console.error('Ошибка при обработке PDF и сохранении данных в базу данных:', err);
    io.emit('upload_status', { progress: 0, message: `Ошибка: ${err.message}` });
  }
}

// Экспорт функции processPDF
module.exports = {
  processPDF
};