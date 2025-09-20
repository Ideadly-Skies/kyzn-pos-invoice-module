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

/* ---------- Health Check ---------- */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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
    // console.error(e); 
    res.status(500).json({ error: 'failed_to_fetch_products' });
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
      `SELECT * FROM invoices
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
    // console.error(e); 
    res.status(500).json({ error: 'failed_to_fetch_invoices' });
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
      `SELECT * FROM invoices WHERE id = $1`,
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
    // console.error(e);
    return res.status(500).json({ error: 'failed_to_fetch_invoice' });
  }
});


app.post('/invoices', async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    // console.log('Creating invoice with payload:', JSON.stringify(body, null, 2));
    
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

    // Updated SQL to include all new fields
    const invSql = `
      INSERT INTO invoices (
        code, date, payment_terms, customer_name, client_email,
        client_street, client_city, client_post_code, client_country,
        sender_street, sender_city, sender_post_code, sender_country,
        salesperson, notes, status, description, total
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *
    `;
    
    const { rows: [inv] } = await client.query(invSql, [
      body.code,
      new Date(body.date),
      body.paymentTerms || 30,
      body.customerName,
      body.clientEmail || null,
      body.clientAddress?.street || body.clientStreet || null,
      body.clientAddress?.city || body.clientCity || null,
      body.clientAddress?.postCode || body.clientPostCode || null,
      body.clientAddress?.country || body.clientCountry || null,
      body.senderAddress?.street || body.senderStreet || null,
      body.senderAddress?.city || body.senderCity || null,
      body.senderAddress?.postCode || body.senderPostCode || null,
      body.senderAddress?.country || body.senderCountry || null,
      body.salesperson,
      body.notes || null,
      body.status, // 'paid' | 'pending' | 'draft'
      body.description || null,
      total
    ]);

    // console.log('Created invoice:', inv);

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
    // console.error('Error creating invoice:', e); 
    res.status(500).json({ error: 'failed_to_create_invoice', details: e.message });
  } finally {
    client.release();
  }
});

app.patch('/invoices/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    // console.log('Updating invoice', id, 'with payload:', JSON.stringify(body, null, 2));
    
    // Build dynamic SQL for only provided fields
    const updates = [];
    const values = [id];
    let paramCount = 1;
    
    if (body.customerName !== undefined) {
      updates.push(`customer_name = $${++paramCount}`);
      values.push(body.customerName);
    }
    if (body.clientEmail !== undefined) {
      updates.push(`client_email = $${++paramCount}`);
      values.push(body.clientEmail);
    }
    if (body.salesperson !== undefined) {
      updates.push(`salesperson = $${++paramCount}`);
      values.push(body.salesperson);
    }
    if (body.notes !== undefined) {
      updates.push(`notes = $${++paramCount}`);
      values.push(body.notes);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${++paramCount}`);
      values.push(body.description);
    }
    if (body.status !== undefined) {
      updates.push(`status = $${++paramCount}`);
      values.push(body.status);
    }
    if (body.paymentTerms !== undefined) {
      updates.push(`payment_terms = $${++paramCount}`);
      values.push(body.paymentTerms);
    }
    if (body.date !== undefined) {
      updates.push(`date = $${++paramCount}`);
      values.push(new Date(body.date));
    }
    
    // Address fields
    if (body.clientStreet !== undefined) {
      updates.push(`client_street = $${++paramCount}`);
      values.push(body.clientStreet);
    }
    if (body.clientCity !== undefined) {
      updates.push(`client_city = $${++paramCount}`);
      values.push(body.clientCity);
    }
    if (body.clientPostCode !== undefined) {
      updates.push(`client_post_code = $${++paramCount}`);
      values.push(body.clientPostCode);
    }
    if (body.clientCountry !== undefined) {
      updates.push(`client_country = $${++paramCount}`);
      values.push(body.clientCountry);
    }
    if (body.senderStreet !== undefined) {
      updates.push(`sender_street = $${++paramCount}`);
      values.push(body.senderStreet);
    }
    if (body.senderCity !== undefined) {
      updates.push(`sender_city = $${++paramCount}`);
      values.push(body.senderCity);
    }
    if (body.senderPostCode !== undefined) {
      updates.push(`sender_post_code = $${++paramCount}`);
      values.push(body.senderPostCode);
    }
    if (body.senderCountry !== undefined) {
      updates.push(`sender_country = $${++paramCount}`);
      values.push(body.senderCountry);
    }
    
    // Handle items updates if provided
    let hasItemsUpdate = false;
    if (body.items && Array.isArray(body.items)) {
      hasItemsUpdate = true;
    }

    if (updates.length === 0 && !hasItemsUpdate) {
      return res.status(400).json({ error: 'no_fields_to_update' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      let inv;
      // Update invoice fields if there are any updates
      if (updates.length > 0) {
        const { rows: [updatedInv] } = await client.query(
          `UPDATE invoices SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
          values
        );
        if (!updatedInv) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'not_found' });
        }
        inv = updatedInv;
      } else {
        // Get existing invoice if we're only updating items
        const { rows: [existingInv] } = await client.query(
          'SELECT * FROM invoices WHERE id = $1',
          [id]
        );
        if (!existingInv) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'not_found' });
        }
        inv = existingInv;
      }
      
      // Handle items update
      if (hasItemsUpdate) {
        // console.log('Updating items for invoice:', id, 'New items:', body.items);
        
        // Delete existing items
        await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
        
        // Calculate new total
        let total = 0;
        const items = [];
        
        // Insert new items
        const itemSql = `
          INSERT INTO invoice_items (invoice_id, product_id, name, quantity, unit_price, line_total)
          VALUES ($1,$2,$3,$4,$5,$6)
          RETURNING id, product_id, name, quantity, unit_price, line_total
        `;
        
        for (const it of body.items) {
          // Skip empty items
          if (!it.name || !it.name.trim()) continue;
          
          // Pull product name if only id provided
          let name = it.name;
          if (!name && it.productId) {
            const { rows: [p] } = await client.query('SELECT name FROM products WHERE id = $1', [it.productId]);
            name = p?.name;
          }
          
          const qty = Number(it.quantity || 1);
          const price = Number(it.unitPrice || it.price || 0);
          const line = qty * price;
          total += line;

          const { rows: [ritem] } = await client.query(itemSql, [
            inv.id, it.productId || null, name, qty, price, line
          ]);
          items.push(ritem);
        }
        
        // Update total in invoice
        const { rows: [finalInv] } = await client.query(
          'UPDATE invoices SET total = $1 WHERE id = $2 RETURNING *',
          [total, id]
        );
        inv = finalInv;
        
        // console.log('Updated items:', items);
        // console.log('New total:', total);
      }
      
      await client.query('COMMIT');
      res.json(inv);
    } catch (e) {
      await client.query('ROLLBACK');
      // console.error('Error in PATCH transaction:', e);
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    // console.error('Error updating invoice:', e); 
    res.status(500).json({ error: 'failed_to_update_invoice', details: e.message });
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
    // console.error(e);
    return res.status(500).json({ error: 'failed_to_delete_invoice' });
  } finally {
    client.release();
  }
});

/* ---------- Revenue/Analytics ---------- */
app.get('/revenue', async (req, res) => {
  try {
    const bucket = req.query.bucket || 'daily'; // daily, weekly, monthly
    const limit = Math.min(toInt(req.query.limit, 30), 100);
    
    let sql;
    let dateFormat;
    let groupBy;
    
    switch (bucket) {
      case 'weekly':
        dateFormat = "DATE_TRUNC('week', date)";
        groupBy = "DATE_TRUNC('week', date)";
        break;
      case 'monthly':
        dateFormat = "DATE_TRUNC('month', date)";
        groupBy = "DATE_TRUNC('month', date)";
        break;
      default: // daily
        dateFormat = "DATE_TRUNC('day', date)";
        groupBy = "DATE_TRUNC('day', date)";
        break;
    }
    
    sql = `
      SELECT 
        ${dateFormat} as period,
        SUM(total) as revenue,
        COUNT(*) as invoice_count,
        AVG(total) as avg_invoice_value
      FROM invoices 
      WHERE status = 'paid'
      GROUP BY ${groupBy}
      ORDER BY period DESC
      LIMIT $1
    `;
    
    const { rows } = await pool.query(sql, [limit]);
    
    // Format the response
    const data = rows.map(row => ({
      period: row.period.toISOString().split('T')[0], // YYYY-MM-DD format
      revenue: Number(row.revenue || 0),
      invoiceCount: Number(row.invoice_count || 0),
      avgInvoiceValue: Number(row.avg_invoice_value || 0)
    })).reverse(); // Reverse to get chronological order
    
    res.json({ data, bucket, total: rows.length });
  } catch (e) {
    // console.error('Revenue query error:', e);
    res.status(500).json({ error: 'failed_to_fetch_revenue' });
  }
});

// start our backend
const port = process.env.PORT || 5000;
app.listen(port, () => {
  // console.log(`ϟϟϟ Server started on http://localhost:${port} ϟϟϟ`)
})