const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  multipleStatements: true // Required to run the schema file which has multiple queries
};

let pool;

async function initDatabase() {
  try {
    // 1. Establish connection to MySQL without specifying database name first
    console.log(`Connecting to MySQL at ${dbConfig.host}:${dbConfig.port}...`);
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });

    const dbName = process.env.DB_NAME || 'ai_createathon';

    // 2. Create the database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.end();

    // 3. Create connection pool with database name specified
    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0
    });

    // 4. Check if tables exist. If admins doesn't exist, seed database
    const [tables] = await pool.query(`SHOW TABLES LIKE 'admins'`);
    if (tables.length === 0) {
      console.log('Database tables not found. Initializing schema from schema.sql...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        console.log('Database initialized successfully.');
      } else {
        console.error('schema.sql file not found. Could not initialize database.');
      }
    } else {
      console.log('Database tables verified.');
    }
  } catch (error) {
    console.error('Error initializing MySQL database:', error.message);
    console.error('Please make sure MySQL server is running and configured correctly in your .env file.');
  }
}

// Helper query function
async function query(sql, params) {
  if (!pool) {
    throw new Error('Database pool not initialized. Run initDatabase first.');
  }
  const [results] = await pool.execute(sql, params);
  return results;
}

module.exports = {
  initDatabase,
  query,
  getPool: () => pool
};
