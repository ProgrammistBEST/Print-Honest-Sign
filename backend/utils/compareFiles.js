const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { pool } = require('../config/connectdb');

// Настройка multer для сохранения файлов на диск
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        // Убедитесь, что папка существует
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Функция для сравнения данных
const compareFiles = async (req, res) => {
    const { brand, placePrint } = req.body;
    const uploadedFile = req.file;

    if (!uploadedFile) {
        return res.status(400).json({ error: 'Файл не загружен' });
    }

    if (!brand) {
        return res.status(400).json({ error: 'Brand is required' });
    }

    const brandMapping = {
        'Ozon Armbest': { name: 'Ozon Armbest', table: 'delivery_armbest_ozon_' },
        'Ozon BestShoes': { name: 'Ozon BestShoes', table: 'delivery_bestshoes_ozon_' },
        'Best26': { name: 'Best26', table: 'delivery_best26_' },
        'BestShoes': { name: 'BestShoes', table: 'delivery_bestshoes_' },
        'Armbest': { name: 'Armbest', table: 'delivery_armbest_' },
    };

    const placeMappings = {
        'Тест': 'delivery_test',
        'Пятигорск': 'pyatigorsk',
        'Лермонтово': 'lermontovo'
    };

    const brandDetails = brandMapping[brand] || {};
    if (!placeMappings[placePrint]) {
        return res.status(400).json({ error: 'Некорректное место печати' });
    }

    let tableName = placePrint === 'Тест' ? placeMappings['Тест'] : `${brandDetails.table}${placeMappings[placePrint]}`;
    const normalizedBrand = brandDetails.name;
    if (!tableName || !normalizedBrand) {
        return res.status(400).json({ error: 'Некорректные данные о бренде или месте' });
    }

    try {
        // Чтение файла Excel
        let workbook;
        if (uploadedFile.path) {
            workbook = XLSX.readFile(uploadedFile.path); // Чтение файла с диска
        } else if (uploadedFile.buffer) {
            const data = new Uint8Array(uploadedFile.buffer); // Чтение из буфера
            workbook = XLSX.read(data, { type: 'array' });
        } else {
            throw new Error('Не удалось получить доступ к файлу');
        }

        // Чтение первой страницы
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Преобразование данных в JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Создание объектов из данных Excel (начиная с 4 строки)
        const cards = parseExcelDataToObjects(jsonData);

        // Данные из базы данных
        const dataDB = await getDataFromDB(tableName);
        // Сравнение данных из заказа чз и базы данных
        const result = compareData(cards, dataDB);

        // Генерация Excel-файла и отправка его клиенту
        generateExcel(res, result, brandDetails.name);
    } catch (error) {
        console.error('[ERROR]', error);
        res.status(500).json({ error: 'Ошибка при обработке файла' });
    }
};

// Функция преобразования cards в upperData
function transformCards(cards) {
    const result = []
    cards.forEach(card => {
        card.sizes.forEach(size => {
            result.push({
                Model: card.vendorCode,
                Size: size.techSize,
                Quantity: size.count
            })
        })
    })
    return result
}

// Функция для сравнения данных из двух источников
function compareData(cards, dataDB) {
    const result = [];
    // Извлекаем массив данных из dataDB (первый элемент массива)
    const dataDBArray = Array.isArray(dataDB[0]) ? dataDB[0] : [];

    // Преобразуем dataDB в Map для быстрого доступа
    const dataDBMap = new Map();
    dataDBArray.forEach(item => {
        const { Model, Size, Quantity } = item;

        // Проверяем, что Model и Size существуют
        if (Model && Size) {
            const key = `${Model}-${Size}`; // Ключ: "Модель-Размер"
            dataDBMap.set(key, Quantity);
        }
    });

    // Проходим по всем записям в cards
    cards = transformCards(cards)
    cards.forEach(card => {
        const { Model, Size, Quantity } = card;

        // Формируем ключ для поиска в dataDBMap
        const key = `${Model}-${Size}`;

        // Получаем количество из dataDB или устанавливаем 0, если записи нет
        const dbQuantity = dataDBMap.get(key) || 0;

        // Вычисляем необходимое количество
        const requiredQuantity = Quantity - dbQuantity;

        // Добавляем результат в массив
        result.push({
            Модель: Model,
            Размер: Size,
            "Кол-во В Заказе": Quantity, // Количество в заказе
            "Кол-во В БД": dbQuantity,  // Количество в БД
            Необходимо: requiredQuantity > 0 ? requiredQuantity : 0 // Необходимо (не меньше 0)
        });
    });
    return result;
}

// Получение данных из базы данных для подсчета колличества чз
async function getDataFromDB(tableName) {
    // Запрос, который учитывает доставку (delivery_number)
    const query = `
    SELECT 
        Model,
        Size, 
        COUNT(*) as Quantity
    FROM ${tableName}
    WHERE Status = 'Waiting'
    GROUP BY Size, Model
    ORDER BY Size;
    `;

    try {
        // Выполнение запроса в пуле для выбранной базы данных
        let rows = await pool.execute(query); // Запрос для базы данных
        // Если данных нет
        if (!rows[0].length) {
            return 'No data found'
        }
        return rows
    } catch (err) {
        console.error('[ERROR] Ошибка при выполнении запроса:', err.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Функция для получения данных файлов
function parseExcelDataToObjects(data) {
    const cards = [];
    let currentSizes = []; // Текущие размеры для использования, если в строке пустое значение в столбце A
    const defaultSizes = generateSizes(34, 45); // Стандартный размерный ряд (34-45)

    for (let i = 4; i < data.length; i++) { // Начинаем с 4 строки
        const row = data[i];
        const vendorCode = row[0]; // Первый столбец A - артикул
        const sizeRange = row.slice(3, 15); // Столбцы D-O

        if (!vendorCode) {
            // Если в столбце A пустое значение
            const sizes = parseSizeRange(sizeRange);
            if (sizes.length > 0) {
                currentSizes = sizes; // Обновляем текущие размеры
            } else {
                continue; // Пропускаем строки без размеров
            }
        } else {
            // Если есть артикул, определяем размеры
            const sizes = (currentSizes.length > 0 ? currentSizes : defaultSizes).map((size, index) => {
                const count = parseInt(sizeRange[index]) || 0; // Количество берется из столбца D-O
                return { techSize: size, count };
            }).filter(size => size.count > 0); // Убираем размеры с нулевым количеством

            if (sizes.length > 0) {
                cards.push({
                    vendorCode: String(vendorCode).trim(),
                    sizes,
                });
            }
        }
    }
    return cards;
}

// Функция для обработки диапазона размеров
function parseSizeRange(sizeRange) {
    const sizes = [];
    sizeRange.forEach(cell => {
        if (cell) {
            if (typeof cell === 'string' && cell.includes('-')) {
                // Если это диапазон, например "35-36"
                sizes.push(cell); // Добавляем строку диапазона, не разбивая
            } else if (!isNaN(cell)) {
                // Если это отдельный размер
                sizes.push(cell.toString()); // Добавляем как строку
            }
        }
    });
    return sizes;
}

// Функция для создания стандартного размерного ряда
function generateSizes(start, end) {
    const sizes = [];
    for (let i = start; i <= end; i++) {
        sizes.push(i.toString()); // Преобразуем числа в строки
    }
    return sizes;
}

// Генерация конечного excel файла
function generateExcel(res, data, brandDetails) {
    const fileName = `comparison_${brandDetails}.xlsx`

    // Создаем лист Excel
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Устанавливаем ширину столбцов
    const columnWidths = calculateColumnWidths(data);
    worksheet['!cols'] = columnWidths;

    // Создаем книгу Excel
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comparison Results');

    // Сохраняем файл во временную директорию
    const filePath = `${__dirname}/${fileName}`;
    XLSX.writeFile(workbook, filePath);

    // Отправляем файл клиенту
    res.download(filePath, fileName, (err) => {
        if (err) {
            console.error('[ERROR] Failed to send file:', err);
            res.status(500).json({ error: 'Ошибка при отправке файла' });
        }

        // Удаляем временный файл после отправки
        try {
            require('fs').unlinkSync(filePath);
        } catch (deleteErr) {
            console.error('[ERROR] Failed to delete temporary file:', deleteErr);
        }
    });
}

// Функция для расчета ширины столбцов
function calculateColumnWidths(data) {
    const columns = ['Модель ', 'Размер ', 'Кол-во В Заказе', 'Кол-во В БД', 'Необходимо '];
    const widths = {};

    // Инициализируем начальные значения ширины
    columns.forEach(col => {
        widths[col] = col.length; // Минимальная ширина — длина названия столбца
    });

    // Проходим по данным и находим максимальную длину значений в каждом столбце
    data.forEach(row => {
        columns.forEach(col => {
            const value = row[col];
            const length = String(value).length;
            if (length > widths[col]) {
                widths[col] = length;
            }
        });
    });

    // Преобразуем объект в массив ширин
    return columns.map(col => ({ wch: widths[col] }));
}


module.exports = { compareFiles };