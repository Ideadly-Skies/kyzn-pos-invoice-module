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
/* ---------- Products ---------- */
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

/* ---------- Invoices ---------- */
app.get('/invoices', async (req, res) => {
  try {
    const limit = Math.min(toInt(req.query.limit, 10), 50);
    const cursor = req.query.cursor ? Number(req.query.cursor) : null;

    const args = [];
    let where = '';
    if (cursor) { where = `WHERE id > $1`; args.push(cursor); }

    const { rows } = await pool.query(
      `SELECT id, code, date, customer_name, salesperson, notes, status, total
       FROM invoices
       ${where}
       ORDER BY id ASC
       LIMIT $${args.length + 1}`,
      [...args, limit + 1]
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // attach items for each invoice (simple N+1; fine for the test)
    for (const inv of items) {
      const { rows: its } = await pool.query(
        `SELECT id, product_id, name, quantity, unit_price, line_total
         FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC`,
        [inv.id]
      );
      inv.items = its;
    }

    res.json({ items, nextCursor: hasMore ? items[items.length - 1].id : null });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'failed_to_fetch_invoices' });
  }
});

// GET /invoices/:id  → return one invoice with its items
app.get('/invoices/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid_id', detail: 'id must be a positive integer' });
    }

    const { rows: invRows } = await pool.query(
      `SELECT id, code, date, customer_name, salesperson, notes, status, total
       FROM invoices
       WHERE id = $1`,
      [id]
    );
    if (invRows.length === 0) return res.status(404).json({ error: 'not_found' });

    const inv = invRows[0];

    const { rows: items } = await pool.query(
      `SELECT id, product_id, name, quantity, unit_price, line_total
       FROM invoice_items
       WHERE invoice_id = $1
       ORDER BY id ASC`,
      [id]
    );

    inv.items = items;
    return res.json(inv);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'failed_to_fetch_invoice' });
  }
});


app.post('/invoices', async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    // minimal validation per brief
    const missing = ['code','date','customerName','salesperson','status','items']
      .filter(k => body[k] == null || (k === 'items' && !Array.isArray(body[k]) || (Array.isArray(body[k]) && !body[k].length)));
    if (missing.length) return res.status(400).json({ error: `missing_fields`, fields: missing });

    await client.query('BEGIN');

    // compute total
    let total = 0;
    for (const it of body.items) {
      const unit = Number(it.unitPrice ?? 0);
      const qty = Number(it.quantity ?? 1);
      total += unit * qty;
    }

    const invSql = `
      INSERT INTO invoices (code, date, customer_name, salesperson, notes, status, total)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id, code, date, customer_name, salesperson, notes, status, total
    `;
    const { rows: [inv] } = await client.query(invSql, [
      body.code,
      new Date(body.date),
      body.customerName,
      body.salesperson,
      body.notes || null,
      body.status, // 'paid' | 'pending' | 'draft'
      total
    ]);

    const itemSql = `
      INSERT INTO invoice_items (invoice_id, product_id, name, quantity, unit_price, line_total)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id, product_id, name, quantity, unit_price, line_total
    `;
    const items = [];
    for (const it of body.items) {
      // pull product name if only id provided
      let name = it.name;
      if (!name && it.productId) {
        const { rows: [p] } = await client.query('SELECT name FROM products WHERE id = $1', [it.productId]);
        name = p?.name;
      }
      const qty = Number(it.quantity || 1);
      const price = Number(it.unitPrice || 0);
      const line = qty * price;

      const { rows: [ritem] } = await client.query(itemSql, [
        inv.id, it.productId, name, qty, price, line
      ]);
      items.push(ritem);

      // optional stock decrement
      if (it.productId) {
        await client.query('UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2', [qty, it.productId]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ ...inv, items });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e); res.status(500).json({ error: 'failed_to_create_invoice' });
  } finally {
    client.release();
  }
});

app.patch('/invoices/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { customerName, salesperson, notes, status } = req.body || {};
    const { rows: [inv] } = await pool.query(
      `UPDATE invoices
       SET customer_name = COALESCE($2, customer_name),
           salesperson   = COALESCE($3, salesperson),
           notes         = COALESCE($4, notes),
           status        = COALESCE($5, status)
       WHERE id = $1
       RETURNING id, code, date, customer_name, salesperson, notes, status, total`,
      [id, customerName, salesperson, notes, status]
    );
    if (!inv) return res.status(404).json({ error: 'not_found' });
    res.json(inv);
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'failed_to_update_invoice' });
  }
});

app.delete('/invoices/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid_id', detail: 'id must be a positive integer' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

    const { rowCount, rows } = await client.query(
      'DELETE FROM invoices WHERE id = $1 RETURNING id, code, date',
      [id]
    );

    await client.query('COMMIT');

    if (rowCount === 0) {
      return res.status(404).json({ error: 'not_found', detail: `invoice ${id} does not exist` });
    }

    // return visible confirmation
    return res.status(200).json({ deleted: true, invoice: rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    return res.status(500).json({ error: 'failed_to_delete_invoice' });
  } finally {
    client.release();
  }
});

// start our backend
const port = process.env.PORT || 5000;
app.listen(port, () => {console.log(`ϟϟϟ Server started on http://localhost:${port} ϟϟϟ`)})