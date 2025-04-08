// Импортируем библиотеки в глобальной области видимости
const pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
const pdfLib = require("pdf-lib");
const { PDFDocument } = pdfLib;
const {
  getCategoryByModel,
  getTableName,
} = require("../controllers/models.js");

// Настройки для подключения к базе данных
const { pool } = require("../config/connectdb.js");

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
    const textContent = textContentPage.items
      .map((item) => item.str)
      .join("\n");
    extractedTexts.push(textContent);
  }
  return { extractedTexts, pdf };
}

// Проверка, является ли текст числом в пределах от 24 до 48
function isValidSize(text) {
  let value = parseFloat(text);
  return (
    (!isNaN(value) && value >= 24 && value <= 48) ||
    ["35-36", "40-41", "41-42", "46-47", "47-48"].includes(text)
  );
}

// Сохранение всех данных в базу данных
async function saveAllDataToDB(
  connection,
  pageDataList,
  brandData,
  placePrint
) {
  let Brand = brandData;
  let Color;

  console.log("Brand, placePrint: ", Brand, placePrint);
  let DateNow = new Date();
  DateNow =
    DateNow.getFullYear() +
    "-" +
    ("0" + (DateNow.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + DateNow.getDate()).slice(-2) +
    " " +
    ("0" + DateNow.getHours()).slice(-2) +
    ":" +
    ("0" + DateNow.getMinutes()).slice(-2) +
    ":" +
    ("0" + DateNow.getSeconds()).slice(-2);

  let tableName;

  if (placePrint == "Тест") {
    if (Brand === "Ozon (Armbest)" || Brand === "Ozon Armbest") {
      Brand = "Ozon Armbest";
      tableName = "delivery_test";
    } else if (Brand === "Ozon (BestShoes)" || Brand === "Ozon BestShoes") {
      Brand = "Ozon BestShoes";
      tableName = "delivery_test";
    } else if (Brand === "Armbest (Новая)" || Brand === "Armbest") {
      Brand = "Armbest";
      tableName = "delivery_test";
    } else if (Brand === "BestShoes (Старая)" || Brand === "BestShoes") {
      Brand = "BestShoes";
      tableName = "delivery_test";
    } else if (Brand === "Best26 (Арташ)" || Brand === "Best26") {
      Brand = "Best26";
      tableName = "delivery_test";
    }
  } else if (Brand === "Ozon (Armbest)" || Brand === "Ozon Armbest") {
    Brand = "Ozon Armbest";
    mainBrand = "ARMBEST";

    if (placePrint == "Пятигорск") {
      tableName = "delivery_armbest_ozon_pyatigorsk";
    } else if (placePrint == "Лермонтово") {
      tableName = "delivery_armbest_ozon_lermontovo";
    }
  } else if (Brand == "Ozon (BestShoes)" || Brand === "Ozon BestShoes") {
    Brand = "Ozon BestShoes";
    mainBrand = "BESTSHOES";

    if (placePrint == "Пятигорск") {
      tableName = "delivery_bestshoes_ozon_pyatigorsk";
    } else if (placePrint == "Лермонтово") {
      tableName = "delivery_bestshoes_ozon_lermontovo";
    }
  } else if (Brand == "Armbest (Новая)" || Brand === "Armbest") {
    tableName = "delivery_armbest_pyatigorsk";
    Brand = "Armbest";

    if (placePrint == "Пятигорск") {
      tableName = "delivery_armbest_pyatigorsk";
    } else if (placePrint == "Лермонтово") {
      tableName = "delivery_armbest_lermontovo";
    }
  } else if (Brand == "BestShoes (Старая)" || Brand === "BestShoes") {
    Brand = "BestShoes";

    if (placePrint == "Пятигорск") {
      tableName = "delivery_bestshoes_pyatigorsk";
    } else if (placePrint == "Лермонтово") {
      tableName = "delivery_bestshoes_lermontovo";
    }
  } else if (Brand == "Best26 (Арташ)" || Brand === "Best26") {
    Brand = "Best26";

    if (placePrint == "Пятигорск") {
      tableName = "delivery_best26_pyatigorsk";
    } else if (placePrint == "Лермонтово") {
      tableName = "delivery_best26_lermontovo";
    }
  }

  for (let { pageData, Crypto, Size, Model } of pageDataList) {
    if (Model === "" || Model === " ") {
      Model = "Multimodel";
      Color = "Multicolor";
    } else {
      Color = "Multicolor";
    }

    let category = await getCategoryByModel(
      Model.split(/[-/]/)[0].trim(),
      Size
    );
    let tableName = `${Brand.toLowerCase()}_${category}`;

    if (!category && placePrint != "Тест") {
      console.error(
        `Ошибка: Не удалось определить категорию для модели "${Model}".`
      );
      continue;
    } else if (!tableName && placePrint != "Тест") {
      console.error(
        `Ошибка: Не удалось определить таблицу для категории "${category}".`
      );
      continue;
    } else if (category == "not_defined" && placePrint != "Тест") {
      console.error(
        `Ошибка: Не удалось определить таблицу для модели "${Model.split(/[-/]/)[0].trim()}".`
      );
    }

    if (placePrint == "Тест") {
      if (Brand === "Ozon (Armbest)" || Brand === "Ozon Armbest") {
        Brand = "Ozon Armbest";
        tableName = "delivery_test";
      } else if (Brand === "Ozon (BestShoes)" || Brand === "Ozon BestShoes") {
        Brand = "Ozon BestShoes";
        tableName = "delivery_test";
      } else if (Brand === "Armbest (Новая)" || Brand === "Armbest") {
        Brand = "Armbest";
        tableName = "delivery_test";
      } else if (Brand === "BestShoes (Старая)" || Brand === "BestShoes") {
        Brand = "BestShoes";
        tableName = "delivery_test";
      } else if (Brand === "Best26 (Арташ)" || Brand === "Best26") {
        Brand = "Best26";
        tableName = "delivery_test";
      }
    }

    try {
      const insertQuery = `INSERT INTO ${tableName} (model, color, pdf, size, crypto, brand, date_upload, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      const checkQuery = `SELECT 1 FROM ${tableName} WHERE model = ? AND color = ? AND size = ? AND crypto = ? AND brand = ?`;

      const [rows] = await connection.execute(checkQuery, [
        Model,
        Color,
        Size,
        Crypto,
        Brand,
      ]);
      if (rows.length === 0) {
        await connection.execute(insertQuery, [
          Model,
          Color,
          pageData,
          Size,
          Crypto,
          Brand,
          DateNow,
          "Waiting",
        ]);
      } else {
        console.log("Найдено совпадение для:", Model, Size, Crypto, Brand);
      }
    } catch (error) {
      console.error("Ошибка при выполнении запроса:", error);
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

// Функция обработки PDF
let countPages = 0;
async function processPDF(
  fileBuffer,
  brandData,
  placePrint,
  io,
  MultiModel,
  totalPages,
  countLoad
) {
  try {
    const data = new Uint8Array(fileBuffer);
    const { extractedTexts } = await extractTextFromPDF(data);

    // subscribers.forEach(chatId => {
    //   let message = `Запущена загрузка честного знака на ${brandData} в количестве ${extractedTexts.length} шт.`;
    //   // bot.telegram.sendMessage(chatId, message);
    //   console.log(message)
    // });

    const pdfBytes = new Uint8Array(fileBuffer);
    const pageSize = 100;
    let startPage = 0;

    while (startPage < extractedTexts.length) {
      const pageDataList = await Promise.all(
        extractedTexts
          .slice(startPage, startPage + pageSize)
          .map(async (text, pageIndex) => {
            const linesArray = text.split("\n");
            let Crypto = linesArray
              .filter((line) => line.startsWith("(01)"))
              .join("\n");
            let Size = "";
            let Model = "";
            // console.log('Переменные: ',extractedTexts.length, startPage, pageSize, countLoad, Math.round(((startPage + pageSize) / countLoad) * 100))
            const progress = Math.round((countPages / totalPages) * 100);
            io.emit("upload_status", {
              progress,
              message: `Загружено ${countPages} из ${totalPages}`,
            });

            if (linesArray.length > 1 && brandData == "Armbest") {
              const secondLine = linesArray[4] || "";
              if (isValidSize(secondLine)) {
                Size = secondLine;
                Model = "Multimodel";
              } else {
                Size = linesArray[2] || "";
                Model = "Multimodel";
              }
            } else if (linesArray.length > 1 && brandData == "Best26") {
              const secondLine = linesArray[4] || "";
              const thirdLine = linesArray[2] || "";
              if (isValidSize(secondLine)) {
                Size = secondLine;
                Model = thirdLine;
              } else {
                Size = linesArray[2] || "";
                Model = thirdLine;
              }
            } else if (linesArray.length > 1 && brandData == "BestShoes") {
              const secondLine = linesArray[4] || "";
              const thirdLine = linesArray[2] || "";
              const modelLine = linesArray[0] || "";
              if (isValidSize(secondLine)) {
                Size = secondLine;
                Model = modelLine;
              } else {
                Size = linesArray[2] || "";
                Model = modelLine;
              }
            } else if (
              (linesArray.length > 1 && brandData == "Ozon Armbest") ||
              (linesArray.length > 1 && brandData == "Ozon BestShoes")
            ) {
              const secondLine = linesArray[4] || "";
              const thirdLine = linesArray[2] || "";
              if (isValidSize(secondLine)) {
                Size = secondLine;
                Model = thirdLine;
              } else {
                Size = linesArray[2] || "";
                Model = "Multimodel";
              }
            }

            if (MultiModel === true) {
              Model = "ЭВА";
            }

            // Создаем новый PDF-документ с одной страницей
            const pageBytes = await createSinglePagePDF(
              pdfBytes,
              startPage + pageIndex
            );
            return {
              pageData: pageBytes,
              pageNumber: startPage + pageIndex + 1,
              Crypto,
              Size,
              Model,
            };
          })
      );

      countPages += pageSize;

      // Записываем данные в базу данных
      await saveAllDataToDB(pool, pageDataList, brandData, placePrint);
      // Перемещаемся к следующей порции страниц
      startPage += pageSize;
      console.log(startPage);
    }
    // subscribers.forEach(chatId => {
    //   let message = `Для ${brandData} добавлено ${extractedTexts.length} шт. честного знака.`;
    //   // bot.telegram.sendMessage(chatId, message);
    //   console.log(message)
    // });
  } catch (err) {
    console.error(
      "Ошибка при обработке PDF и сохранении данных в базу данных:",
      err
    );
    io.emit("upload_status", {
      progress: 0,
      message: `Ошибка: ${err.message}`,
    });
  }
}

// Экспорт функции processPDF
module.exports = {
  processPDF,
};
