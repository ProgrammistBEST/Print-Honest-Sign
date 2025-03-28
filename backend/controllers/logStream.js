// logger.js
const fs = require('fs');
const path = require('path');

// Функция для инициализации логирования
function initializeLogger(logDirectory = 'logs', logFileName = 'app.log') {
  // Создаем папку для логов, если её нет
  const logDirPath = path.join(__dirname, logDirectory);
  if (!fs.existsSync(logDirPath)) {
    fs.mkdirSync(logDirPath, { recursive: true });
  }

  // Путь к файлу логов
  const logFilePath = path.join(logDirPath, logFileName);

  // Создаем поток записи в файл
  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

  // Перехватываем stdout (обычные логи)
  console.log = function (...args) {
    const message = args.map(String).join(' ') + '\n';
    logStream.write(`[LOG] ${new Date().toISOString()}: ${message}`);
    process.stdout.write(message); // Выводим в консоль
  };

  // Перехватываем stderr (ошибки)
  console.error = function (...args) {
    const message = args.map(String).join(' ') + '\n';
    logStream.write(`[ERROR] ${new Date().toISOString()}: ${message}`);
    process.stderr.write(message); // Выводим в консоль
  };
}

module.exports = initializeLogger;