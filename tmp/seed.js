/**
 * Seed script — runs Populate.sql against furndatabase.
 * Usage: node tmp/seed.js  (from EcomBackend/)
 * 
 * Safe to run multiple times: truncates all tables first.
 */
require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        multipleStatements: true,
    });

    try {
        // Disable FK checks so we can truncate in any order
        await connection.query("SET foreign_key_checks = 0");

        const tables = [
            "order_items", "orders", "cart_items", "wishlists",
            "product_tags", "product_images", "products",
            "tags", "categories", "addresses", "users",
            "roles", "organization"
        ];
        for (const t of tables) {
            await connection.query(`TRUNCATE TABLE \`${t}\``);
            console.log(`  Truncated ${t}`);
        }

        await connection.query("SET foreign_key_checks = 1");

        // Run the populate SQL (strip the USE statement)
        const sqlPath = path.join(__dirname, "..", "..", "Schema Details", "Populate.sql");
        let sql = fs.readFileSync(sqlPath, "utf8");
        sql = sql.replace(/^\s*USE\s+\w+;/im, "");

        await connection.query(sql);
        console.log("\n✅  Database seeded successfully.");
    } catch (err) {
        console.error("❌  Seed failed:", err.message);
        console.error("   SQL state:", err.sqlState, "| Code:", err.code);
    } finally {
        await connection.end();
    }
}

seed();
