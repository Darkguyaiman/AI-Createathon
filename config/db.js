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

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

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
      connectionLimit: parsePositiveInt(process.env.DB_CONNECTION_LIMIT, 20),
      waitForConnections: true,
      queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0', 10) || 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    // 4. Check if tables exist. If admins doesn't exist, seed database
    const [tables] = await pool.query(`SHOW TABLES LIKE 'admins'`);
    if (tables.length === 0) {
      console.log('Database tables not found. Initializing schema from schema.sql...');
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        console.log('Database initialized successfully.');
      } else {
        console.error('schema.sql file not found. Could not initialize database.');
      }
    } else {
      console.log('Database tables verified.');
      // Ensure 'role' column exists in 'admins' table
      const [columns] = await pool.query(`SHOW COLUMNS FROM \`admins\` LIKE 'role'`);
      if (columns.length === 0) {
        console.log('Adding "role" column to "admins" table...');
        await pool.query(`ALTER TABLE \`admins\` ADD COLUMN \`role\` VARCHAR(20) DEFAULT 'normal' NOT NULL;`);
        // Update the default admin to be super admin
        await pool.query(`UPDATE \`admins\` SET \`role\` = 'super' WHERE \`username\` = 'admin';`);
        console.log('"role" column added and configured.');
      }

      const [participantStudentIdColumns] = await pool.query(`SHOW COLUMNS FROM \`participants\` LIKE 'student_id'`);
      const [participantEmailColumns] = await pool.query(`SHOW COLUMNS FROM \`participants\` LIKE 'email'`);

      if (participantStudentIdColumns.length === 0 && participantEmailColumns.length > 0) {
        console.log('Renaming participant "email" column to "student_id"...');
        await pool.query(`ALTER TABLE \`participants\` CHANGE COLUMN \`email\` \`student_id\` VARCHAR(100) UNIQUE NOT NULL;`);
        console.log('Participant student ID column configured.');
      } else if (participantStudentIdColumns.length === 0) {
        console.log('Adding participant "student_id" column...');
        await pool.query(`ALTER TABLE \`participants\` ADD COLUMN \`student_id\` VARCHAR(100) UNIQUE NOT NULL AFTER \`name\`;`);
        console.log('Participant student ID column added.');
      }

      const scoringColumns = [
        ['score_creativity_innovation', 'judge_name'],
        ['score_effective_ai', 'score_creativity_innovation'],
        ['score_technical_quality', 'score_effective_ai'],
        ['score_presentation', 'score_technical_quality'],
        ['score_practicality_impact', 'score_presentation']
      ];

      for (const [columnName, afterColumn] of scoringColumns) {
        const [scoreColumns] = await pool.query(`SHOW COLUMNS FROM \`judge_scores\` LIKE ?`, [columnName]);
        if (scoreColumns.length === 0) {
          console.log(`Adding judge scoring column "${columnName}"...`);
          await pool.query(`ALTER TABLE \`judge_scores\` ADD COLUMN \`${columnName}\` INT DEFAULT 0 AFTER \`${afterColumn}\`;`);
        }
      }

      const [oldInnovationColumns] = await pool.query(`SHOW COLUMNS FROM \`judge_scores\` LIKE 'score_innovation'`);
      if (oldInnovationColumns.length > 0) {
        await pool.query(`
          UPDATE \`judge_scores\`
          SET
            \`score_creativity_innovation\` = ROUND(\`score_innovation\` * 3),
            \`score_effective_ai\` = ROUND(\`score_design\` * 2.5),
            \`score_technical_quality\` = ROUND(\`score_execution\` * 2),
            \`score_presentation\` = 0,
            \`score_practicality_impact\` = 0
          WHERE \`score_creativity_innovation\` = 0
            AND \`score_effective_ai\` = 0
            AND \`score_technical_quality\` = 0
            AND \`score_presentation\` = 0
            AND \`score_practicality_impact\` = 0
        `);
      }
    }
  } catch (error) {
    console.error('Error initializing MySQL database:', error.message);
    console.error('Please make sure MySQL server is running and configured correctly in your .env file.');
  }
}

// Helper query function
async function query(sql, params = []) {
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
