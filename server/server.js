// boot-strappers: load variables 
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// init express server
const app = express()
app.use(cors())
app.use(express.json())

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

/* ---------- tiny helpers ---------- */
function toInt(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function bucketView(bucket) {
  return bucket === 'weekly' ? 'revenue_weekly'
       : bucket === 'monthly' ? 'revenue_monthly'
       : 'revenue_daily';
}

/* ---------- routes ------------ */
/* ---------- Products -------------- */
app.get('/products', async (req, res) => {
  try {
    const q = (req.query.query || '').toString().trim();
    const limit = Math.min(toInt(req.query.limit, 10), 50);
    const page = Math.max(toInt(req.query.page, 1), 1);

    const where = q ? `WHERE name ILIKE $1` : '';
    const args = q ? [`%${q}%`] : [];

    const countSql = `SELECT COUNT(*)::int AS c FROM products ${where}`;
    const { rows: cntRows } = await pool.query(countSql, args);

    const off = (page - 1) * limit;
    const { rows } = await pool.query(
      `SELECT id, name, price, stock, image_url
       FROM products ${where}
       ORDER BY name ASC
       LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
      [...args, limit, off]
    );

    res.json({ items: rows, page, totalPages: Math.max(1, Math.ceil(cntRows[0].c / limit)) });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'failed_to_fetch_products' });
  }
});

// start our backend
const port = process.env.PORT || 5000;
app.listen(port, () => {console.log(`ϟϟϟ Server started on http://localhost:${port} ϟϟϟ`)})