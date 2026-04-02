import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

let curr = null;
curr = process.env.MYSQL_URL;
const pool = mysql.createPool(curr);
// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });
// Test connection
pool.getConnection()
  .then(connection => { 
    // console.log("Database connected successfully");
    if(curr) console.log("Database running on railway");
    else console.log("Database running locally(furn2)")
    connection.release();
  })
  .catch(err => {
    console.error("Database connection failed:", err.message);
  });

export default pool;

// why pool:
// Reuse connections, handle concurrency, prevents exhausting mysql threads