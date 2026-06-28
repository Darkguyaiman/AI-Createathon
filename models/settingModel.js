const db = require('../config/db');

const cache = new Map();
const CACHE_TTL_MS = parseInt(process.env.SETTINGS_CACHE_TTL_MS || '1000', 10) || 1000;

async function getValue(key) {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const rows = await db.query('SELECT value_name FROM settings WHERE key_name = ?', [key]);
  const value = rows[0] ? rows[0].value_name : null;
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

async function isVotingActive() {
  return (await getValue('voting_active')) === 'true';
}

async function setValue(key, value) {
  const result = await db.query('UPDATE settings SET value_name = ? WHERE key_name = ?', [value, key]);
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

async function toggleVotingActive() {
  await db.query(`
    UPDATE settings
    SET value_name = IF(value_name = 'true', 'false', 'true')
    WHERE key_name = 'voting_active'
  `);

  const rows = await db.query("SELECT value_name FROM settings WHERE key_name = 'voting_active'");
  const newValue = rows[0] ? rows[0].value_name : 'false';
  cache.set('voting_active', { value: newValue, expiresAt: Date.now() + CACHE_TTL_MS });
  return newValue === 'true';
}

module.exports = {
  getValue,
  isVotingActive,
  setValue,
  toggleVotingActive
};
