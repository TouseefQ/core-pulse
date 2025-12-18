import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const { Pool } = pg;

// ⚠️ We use 127.0.0.1 to avoid IPv6 issues on Windows
const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL 
  : 'postgresql://user:password@127.0.0.1:5432/core_pulse_db';

const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

// Auto-create tables on startup
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tracked_urls (
        id SERIAL PRIMARY KEY,
        url TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audits (
        id SERIAL PRIMARY KEY,
        url_id INTEGER REFERENCES tracked_urls(id),
        lcp_score NUMERIC,
        cls_score NUMERIC,
        fid_score NUMERIC,
        performance_score INTEGER,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Database Tables Ready");
  } catch (err) {
    console.error("❌ DB Init Failed:", err);
  }
};

initDB();

// Route 1: Track a new URL
app.post('/api/track', async (req, res) => {
  const { url } = req.body;
  try {
    // Upsert (Insert if not exists, otherwise do nothing)
    await pool.query('INSERT INTO tracked_urls (url) VALUES ($1) ON CONFLICT (url) DO NOTHING', [url]);
    res.json({ message: 'Tracking started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 2: Get History
app.get('/api/history', async (req, res) => {
  const { url } = req.query;
  try {
    const result = await pool.query(`
      SELECT a.* FROM audits a
      JOIN tracked_urls t ON a.url_id = t.id
      WHERE t.url = $1
      ORDER BY a.recorded_at ASC
    `, [url]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('🚀 Server running on port 5000'));