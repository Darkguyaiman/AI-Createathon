const db = require('../config/db');

async function findAllWithAuthors() {
  return db.query(`
    SELECT p.*, a.username as author
    FROM posts p
    LEFT JOIN admins a ON p.admin_id = a.id
    ORDER BY p.created_at DESC
  `);
}

async function findRecentWithAuthors(limit = 3) {
  const safeLimit = Math.max(parseInt(limit, 10) || 3, 1);

  return db.query(`
    SELECT p.*, a.username as author
    FROM posts p
    LEFT JOIN admins a ON p.admin_id = a.id
    ORDER BY p.created_at DESC
    LIMIT ${safeLimit}
  `);
}

async function findById(id) {
  const posts = await db.query('SELECT * FROM posts WHERE id = ?', [id]);
  return posts[0];
}

async function create({ title, content, imagePath, adminId }) {
  return db.query(
    'INSERT INTO posts (title, content, image_path, admin_id) VALUES (?, ?, ?, ?)',
    [title, content, imagePath, adminId]
  );
}

async function update(id, { title, content, imagePath, adminId }) {
  return db.query(
    'UPDATE posts SET title = ?, content = ?, image_path = ?, admin_id = ? WHERE id = ?',
    [title, content, imagePath, adminId, id]
  );
}

async function remove(id) {
  return db.query('DELETE FROM posts WHERE id = ?', [id]);
}

module.exports = {
  findAllWithAuthors,
  findRecentWithAuthors,
  findById,
  create,
  update,
  remove
};
