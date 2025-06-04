const { pool } = require("../config/connectdb");
const infoUploadFiles = async (req, res) => {
  try {
    console.log(req);
    const response = await pool.query("SELECT * FROM upload_logs LIMIT 10");
    res.json(response);
  } catch (error) {
    console.error("Ошибка запроса:", error);
    res.status(500).json({
      error: "Ошибка сервера",
      details: error.message,
    });
  }
};

module.exports = { infoUploadFiles };
