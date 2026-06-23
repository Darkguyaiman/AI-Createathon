const db = require('../config/db');

async function getValue(key) {
  const rows = await db.query('SELECT value_name FROM settings WHERE key_name = ?', [key]);
  return rows[0] ? rows[0].value_name : null;
}

async function isVotingActive() {
  return (await getValue('voting_active')) === 'true';
}

async function setValue(key, value) {
  return db.query('UPDATE settings SET value_name = ? WHERE key_name = ?', [value, key]);
}

async function toggleVotingActive() {
  const currentValue = await getValue('voting_active');
  const newValue = currentValue === 'true' ? 'false' : 'true';

  await setValue('voting_active', newValue);
  return newValue === 'true';
}

module.exports = {
  getValue,
  isVotingActive,
  setValue,
  toggleVotingActive
};
