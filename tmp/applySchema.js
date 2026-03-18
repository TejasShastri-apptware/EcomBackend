/**
 * Apply Schema2.sql against furndatabase, then populate with Populate.sql.
 * Run from EcomBackend/: node tmp/applySchema.js
 */
require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "..", "..", "Schema Details", "Schema2.sql");
const populatePath = path.join(__dirname, "..", "..", "Schema Details", "Populate.sql");

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        multipleStatements: true,
    });

    try {
        await connection.query("SET foreign_key_checks = 0");

        // --- Step 0: Drop all existing tables for a clean slate ---
        const tables = [
            "order_items", "orders", "cart_items", "wishlists",
            "product_tags", "product_images", "products",
            "tags", "categories", "addresses", "users",
            "roles", "organization"
        ];
        for (const t of tables) {
            await connection.query(`DROP TABLE IF EXISTS \`${t}\``);
        }
        console.log("🗑️   Dropped all existing tables.");

        // --- Step 1: Apply schema ---
        console.log("📐  Applying schema...");
        let schemaSql = fs.readFileSync(schemaPath, "utf8");
        schemaSql = schemaSql
            .replace(/drop database.*?;/gi, "")
            .replace(/create DATABASE.*?;/gi, "")
            .replace(/use\s+furn2\s*;/gi, "");

        await connection.query(schemaSql);
        await connection.query("SET foreign_key_checks = 1");
        console.log("✅  Schema applied.");

        // --- Step 2: Seed data ---
        console.log("🌱  Seeding data...");
        let populateSql = fs.readFileSync(populatePath, "utf8");
        populateSql = populateSql.replace(/^\s*USE\s+\w+;/im, "");

        await connection.query("SET foreign_key_checks = 0");
        await connection.query(populateSql);
        await connection.query("SET foreign_key_checks = 1");
        console.log("✅  Data seeded successfully. DB is ready for testing.");

    } catch (err) {
        console.error("❌  Failed:", err.message);
        console.error("   Code:", err.code, "| SQL:", err.sql ? err.sql.substring(0, 300) : "N/A");
    } finally {
        await connection.end();
    }
}

run();
