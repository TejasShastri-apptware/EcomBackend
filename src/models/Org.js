import pool from "../config/db.js";

export const Org = {

  findById: async (id) => {
    const [rows] = await pool.query(
      "SELECT * FROM organization WHERE org_id = ?",
      [id]
    );
    return rows[0];
  },

 
  findByName: async (name) => {
    const [rows] = await pool.query(
      "SELECT org_id, org_name, org_email, org_contact FROM organization WHERE org_name = ?",
      [name]
    );
    return rows[0];
  },


  findAll: async () => {
    const [rows] = await pool.query("SELECT * FROM organization");
    return rows;
  },


  create: async ({ org_name, org_contact, org_email }) => {
    const [result] = await pool.query(
      "INSERT INTO organization (org_name, org_contact, org_email) VALUES (?, ?, ?)",
      [org_name, org_contact, org_email]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const [result] = await pool.query(
      "UPDATE organization SET ? WHERE org_id = ?",
      [data, id]
    );
    return result.affectedRows > 0;
  }
};
