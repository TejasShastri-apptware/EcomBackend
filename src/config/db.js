const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool(process.env.MYSQL_URL);

// Test connection
pool.getConnection()
  .then(connection => {
    console.log("Database connected successfully");
    connection.release();
  })
  .catch(err => {
    console.error("Database connection failed:", err.message);
  });

module.exports = pool;

// why pool:
// Reuse connections, handle concurrency, prevents exhausting mysql threads