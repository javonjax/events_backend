require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool(JSON.parse(process.env.PG_CONFIG));

pool.connect((err) => {
    if (err) {
        console.error('Connection error', err)
    } else {
        console.log('Connected to PostgreSQL');
    }
});

module.exports = pool;
