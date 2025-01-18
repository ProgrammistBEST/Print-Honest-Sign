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

const receivingTokens = mysql.createPool({
    host: '192.168.100.170',  // хост базы данных
    user: 'root',  // имя пользователя базы данных
    password: 'root',  // пароль от базы данных
    database: 'test',  // название базы данных
    waitForConnections: true,
    queueLimit: 0
});

// Проверка соединения и логирование результата
pool.getConnection()
.then((connection) => {
    console.log('2 Успешное подключение к базе данных MySQL: storagesigns');
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

receivingTokens.getConnection()
.then((connection) => {
    console.log('Успешное подключение к базе данных MySQL: test');
    connection.release();
})
.catch((err) => {
    console.error('Ошибка при подключении к базе данных', err.message);
});

// Экспорт функции processPDF
module.exports = {
    pool,userPool,receivingTokens
};

// function triggerChangeStatus() {
//   var ss = SpreadsheetApp.getActiveSpreadsheet(), 
//       sheet = ss.getActiveSheet(), 
//       range = sheet.getActiveRange(),
//       c = range.getColumn(), 
//       r = range.getRow(), 
//       v = range.getValue();

//   if (sheet.getSheetName() == "Фильтр" && c == Prod_test_LIB.getDevNameFilterCol('Статус') && r > Prod_test_LIB.getDevNameFilterRow('Формулы')){
//     for (var i = 1; i < v.length; i++) {
//       var currentStatus = v[i][Prod_test_LIB.getDevNameFilterCol('Статус') - 1];
      
//       // Если статус "На проектировании" и это не активная строка, переводим её в "На паузе"
//       if (currentStatus == "На проектировании" && i + 1 !== r) {
//         sheet.getRange(i + 1, Prod_test_LIB.getDevNameFilterCol('Статус')).setValue("На паузе");
//       }
//     }
//     Prod_test_LIB.constructorTriggerChangeStatus(ss, sheet, range, c, r, v);
//   }
// }