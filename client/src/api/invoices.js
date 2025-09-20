const API_URL = 'http://localhost:8080';

// fetch invoice over from the backend
export async function fetchInvoices({ cursor = null, limit = 10 } = {}) {
  const qs = new URLSearchParams();
  if (cursor) qs.set('cursor', cursor);
  qs.set('limit', String(limit));

  const res = await fetch(`${API_URL}/invoices?${qs.toString()}`);
  if (!res.ok) throw new Error(`GET /invoices failed: ${res.status}`);
  const data = await res.json();
  return {
    items: data.items.map(adaptInvoiceFromApi),
    nextCursor: data.nextCursor ?? null,
  };
}

// fetch invoice by id
export async function fetchInvoiceById(id) {
  const res = await fetch(`${API_URL}/invoices/${id}`);
  if (!res.ok) throw new Error(`GET /invoices/${id} failed: ${res.status}`);
  const inv = await res.json();
  return adaptInvoiceFromApi(inv);
}

// create invoice
export async function createInvoice(inv) {
  const body = adaptInvoiceToCreate(inv);

  const res = await fetch(`${API_URL}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 400) {
    const j = await res.json().catch(() => ({}));
    const err = new Error(j?.error || 'missing_fields');
    err.fields = j?.fields;
    throw err;
  }
  if (!res.ok) throw new Error(`POST /invoices failed: ${res.status}`);

  const created = await res.json();
  return adaptInvoiceFromApi(created);
}

// patch invoice
export async function patchInvoice(id, patch) {
  const payload = adaptPatchToApi(patch);

  const res = await fetch(`${API_URL}/invoices/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status === 404) throw new Error('not_found');
  if (!res.ok) throw new Error(`PATCH /invoices/${id} failed: ${res.status}`);

  const updated = await res.json();
  return adaptInvoiceFromApi({ ...updated, items: patch.items ?? [] });
}

// update invoice status
export async function updateInvoiceStatus(id, status) {
  return await patchInvoice(id, { status });
}

// delete invoice by id
export async function deleteInvoiceById(id) {
  const res = await fetch(`${API_URL}/invoices/${id}`, { method: 'DELETE' });
  if (res.status === 404) throw new Error('not_found');
  if (!res.ok) throw new Error(`DELETE /invoices/${id} failed: ${res.status}`);
  return { ok: true };
}

/** ---------------------------
 *  Adapters (API ↔ UI models)
 *  ---------------------------
*/
export function adaptInvoiceFromApi(inv) {
  return {
    id: String(inv.id),
    code: inv.code,
    createdAt: inv.date,                 
    paymentDue: inv.date,               
    description: inv.notes || '',
    clientName: inv.customer_name,       
    clientEmail: inv.customer_email || '', 
    salesperson: inv.salesperson ?? '',
    status: inv.status,
    senderAddress: inv.senderAddress || { street: '', city: '', postCode: '', country: '' },
    clientAddress: inv.clientAddress || { street: '', city: '', postCode: '', country: '' },
    total: Number(inv.total ?? 0),
    items: (inv.items || []).map(adaptItemFromApi),
  };
}

function adaptItemFromApi(ii) {
  return {
    id: ii.id,
    productId: ii.product_id ?? null,
    name: ii.name,
    quantity: Number(ii.quantity ?? 1),
    price: Number(ii.unit_price ?? 0),
    total: Number(ii.line_total ?? 0),
  };
}

/**
 * UI → POST /invoices body
 * Accepts a UI invoice shape and converts it to backend expectation.
 */
function adaptInvoiceToCreate(inv) {
  return {
    code: inv.code,
    date: toIso(inv.createdAt || inv.paymentDue),
    customerName: inv.clientName,
    salesperson: inv.salesperson ?? '',
    notes: inv.description || '',
    status: inv.status,
    items: (inv.items || []).map((it) => ({
      productId: it.productId ?? null,
      name: it.name ?? null,
      quantity: Number(it.quantity ?? 1),
      unitPrice: Number(it.price ?? 0),
    })),
  };
}

function adaptPatchToApi(patch) {
  const out = {};
  if ('customerName' in patch) out.customerName = patch.customerName;
  if ('salesperson' in patch) out.salesperson = patch.salesperson;
  if ('notes' in patch) out.notes = patch.notes;
  if ('status' in patch) out.status = patch.status;
  return out;
}

function toIso(d) {
  if (!d) return new Date().toISOString();
  const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  return new Date(dt).toISOString();
}