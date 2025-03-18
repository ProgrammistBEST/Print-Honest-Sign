const mysql = require('mysql2/promise');
require('dotenv').config();

// Настройки для подключения к базе данных
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 1,
    idleTimeout: 30000,
});
  
const userPool = mysql.createPool({
    host: process.env.USER_DB_HOST,
    user: process.env.USER_DB_USER,
    password: process.env.USER_DB_PASSWORD,
    database: process.env.USER_DB_NAME,
    waitForConnections: true,
    queueLimit: 0,
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
    pool, userPool
};