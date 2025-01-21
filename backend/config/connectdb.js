const mysql = require('mysql2/promise');

// Настройки для подключения к базе данных
const pool = mysql.createPool({
  host: '192.168.100.170',  // хост базы данных
  user: 'root',  // имя пользователя базы данных
  password: 'root',  // пароль от базы данных
  database: 'storagesigns',  // название базы данных
  waitForConnections: true,
  connectionLimit: 10,  // максимальное количество соединений
  queueLimit: 100 // сколько запросов можно поместить в очередь
});

const userPool = mysql.createPool({
    host: '192.168.100.170',  // хост базы данных
    user: 'root',  // имя пользователя базы данных
    password: 'root',  // пароль от базы данных
    database: 'bestserver',  // название базы данных
    waitForConnections: true,
    queueLimit: 0
});

// Проверка соединения и логирование результата
pool.getConnection()
.then((connection) => {
    console.log('connectdb - Успешное подключение к базе данных MySQL: storagesigns');
    connection.release();
})
.catch((err) => {
    console.error('Ошибка при подключении к базе данных', err.message);
});

userPool.getConnection()
.then((connection) => {
    console.log('Успешное подключение к базе данных MySQL: bestserver');
    connection.release();
})
.catch((err) => {
    console.error('Ошибка при подключении к базе данных', err.message);
});


// Экспорт функции processPDF
module.exports = {
    pool,userPool
};