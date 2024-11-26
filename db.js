require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { table } = require('console');

const pool = new Pool(JSON.parse(process.env.PG_CONFIG));

const createTable = async () => {
  try {
    const res = await pool.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.tables
                WHERE table_schema = 'users' AND table_name = 'users' 
            )    
        `);

    const tableExists = res.rows[0].exists;
    
    if (!tableExists) {
      const schemaFile = path.resolve(__dirname, './db_schema/user.schema.sql');
      const schemaSQL = fs.readFileSync(schemaFile, 'utf-8');
      await pool.query(schemaSQL);
    } else {
      console.log('Table already exists.');
    }
  } catch (error) {
    console.error('Error creating table:', error);
  }
};

const connectDB = async () => {
  try {
    await pool.connect();
    console.log('Connected to PostgreSQL.');
    await createTable();
  } catch (error) {
    console.error('Connection error', error);
  }
};

module.exports = { pool, connectDB };
