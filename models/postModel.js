const db = require('../config/db');

async function findAllWithAuthors() {
  return db.query(`
    SELECT p.*, a.username as author
    FROM posts p
    LEFT JOIN admins a ON p.admin_id = a.id
    ORDER BY p.created_at DESC
  `);
}

async function create({ title, content, imagePath, adminId }) {
  return db.query(
    'INSERT INTO posts (title, content, image_path, admin_id) VALUES (?, ?, ?, ?)',
    [title, content, imagePath, adminId]
  );
}

async function remove(id) {
  return db.query('DELETE FROM posts WHERE id = ?', [id]);
}

module.exports = {
  findAllWithAuthors,
  create,
  remove
};
