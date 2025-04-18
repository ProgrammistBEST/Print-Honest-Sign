const { pool } = require("../config/connectdb");

const kyz = async (req, res) => {
  const {
    selectedBrand,
    filledInputs,
    user,
    placePrint,
    printerForHonestSign,
    printerForBarcode,
  } = req.body;

  const brandMappings = {
    "Ozon (Armbest)": { name: "Ozon Armbest", table: "delivery_armbest_ozon_" },
    "Ozon (BestShoes)": {
      name: "Ozon BestShoes",
      table: "delivery_bestshoes_ozon_",
    },
    "Armbest (Новая)": { name: "Armbest", table: "delivery_armbest_" },
    "BestShoes (Старая)": { name: "BestShoes", table: "delivery_bestshoes_" },
    BestShoes: { name: "BestShoes", table: "delivery_bestshoes_" },
    "Best26 (Арташ)": { name: "Best26", table: "delivery_best26_" },
  };

  const placeMappings = {
    Тест: "delivery_test",
    Пятигорск: "pyatigorsk",
    Лермонтово: "lermontovo",
  };

  const brandDetails = brandMappings[selectedBrand] || {};
  let tableName =
    placePrint === "Тест"
      ? placeMappings["Тест"]
      : `${brandDetails.table}${placeMappings[placePrint]}`;
  const normalizedBrand = brandDetails.name;

  if (!tableName || !normalizedBrand) {
    return res
      .status(400)
      .json({ error: "Некорректные данные о бренде или месте печати." });
  }

  const shortageInfo = [];
  const successfulSign = [];
  const pdfPaths = [];

  try {
    const allPromises = filledInputs.map(async (input) => {
      const { size, model, value } = input;
      const count = Number(value);
      const formattedModel = ["Armbest"].includes(normalizedBrand)
        ? "Multimodel"
        : model;

      const [waitingRows] = await pool.query(
        `SELECT * FROM \`${tableName}\` 
           WHERE \`size\` = ? AND \`brand\` = ? AND \`status\` = "Waiting" 
             AND \`model\` = ? AND \`locked\` = 0 
           LIMIT ?`,
        [size, normalizedBrand, formattedModel, count]
      );

      const dateToday = getFormattedDateTime();

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
          const pdfPath = path.join(
            __dirname,
            `output${row.id}-${row.Model}[${randomNumbers}]${row.Size}.pdf`
          );
          fs.writeFileSync(pdfPath, row.PDF);
          pdfPaths.push(pdfPath);
        }
        await pool.query(
          `UPDATE \`${tableName}\` 
             SET \`locked\` = 1, \`status\` = ?, \`date_used\` = ?, \`user\` = ? 
             WHERE \`id\` = ? AND \`model\` = ? AND \`color\` = ? AND \`crypto\` = ? 
               AND \`brand\` = ? AND \`size\` = ? AND \`status\` = ? 
               AND \`locked\` = 0`,
          [
            "Used",
            dateToday,
            user,
            row.id,
            row.model,
            row.color,
            row.crypto,
            row.brand,
            row.size,
            "Waiting",
          ]
        );
      });

      await Promise.all(updatePromises);
    });

    await Promise.all(allPromises);

    if (pdfPaths.length > 0) {
      pdfPaths.sort((a, b) => extractSizeFromPath(a) - extractSizeFromPath(b));
      const mergedPdfPath = await mergePDFs(pdfPaths);

      printPDF(mergedPdfPath, "honestSign", printerForHonestSign);
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
};

module.exports = { kyz };
