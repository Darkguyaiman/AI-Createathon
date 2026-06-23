const db = require('./db');

function createSessionStore(session) {
  const MySQLStore = require('express-mysql-session')(session);

  return new MySQLStore({
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
    expiration: 24 * 60 * 60 * 1000,
    createDatabaseTable: false,
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data'
      }
    }
  }, db.getPool());
}

module.exports = createSessionStore;
