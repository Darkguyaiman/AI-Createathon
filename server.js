const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const createSessionStore = require('./config/sessionStore');
const { attachSessionLocals } = require('./middleware/viewLocals');
const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/publicRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/lenis', express.static(path.join(__dirname, 'node_modules', 'lenis', 'dist')));

db.initDatabase().then(() => {
  app.use(session({
    store: createSessionStore(session),
    secret: process.env.SESSION_SECRET || 'ai_createathon_super_secret_session_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  }));

  app.use(attachSessionLocals);
  app.use('/', publicRoutes);
  app.use('/admin', adminRoutes);

  app.listen(PORT, () => {
    console.log(`AI Createathon website running locally at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database pool on startup:', err.message);
});

module.exports = app;
