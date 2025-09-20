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

// fetch product for auto complete
export async function searchProducts({ query = '', limit = 8, page = 1 } = {}) {
  const qs = new URLSearchParams();
  if (query) qs.set('query', query);
  qs.set('limit', String(limit));
  qs.set('page', String(page));

  const res = await fetch(`${API_URL}/products?${qs.toString()}`);
  if (!res.ok) throw new Error(`GET /products failed: ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

// create invoice
export async function createInvoice(inv) {
  const payload = {
    code: inv.code,
    date: inv.date, // ISO string or yyyy-mm-dd is fine; backend casts to Date
    paymentTerms: inv.paymentTerms || 30,
    customerName: inv.customerName,
    clientEmail: inv.clientEmail || null,
    
    // Client address
    clientStreet: inv.clientAddress?.street || null,
    clientCity: inv.clientAddress?.city || null,
    clientPostCode: inv.clientAddress?.postCode || null,
    clientCountry: inv.clientAddress?.country || null,
    
    // Sender address
    senderStreet: inv.senderAddress?.street || null,
    senderCity: inv.senderAddress?.city || null,
    senderPostCode: inv.senderAddress?.postCode || null,
    senderCountry: inv.senderAddress?.country || null,
    
    salesperson: inv.salesperson,
    status: inv.status,      // 'paid' | 'pending' | 'draft'
    notes: inv.notes || null,
    description: inv.description || null,
    items: (inv.items || []).map(it => ({
      productId: it.productId ?? undefined,
      name: it.name ?? undefined,
      quantity: Number(it.quantity ?? 1),
      unitPrice: Number(it.price ?? it.unitPrice ?? 0),
    })),
  };

  const res = await fetch(`${API_URL}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`POST /invoices failed: ${res.status}`);
  return await res.json();
}

// patch invoice
export async function patchInvoice(id, patch) {
  const payload = adaptPatchToApi(patch);
  // console.log('PATCH payload being sent:', JSON.stringify(payload, null, 2));

  const res = await fetch(`${API_URL}/invoices/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status === 404) throw new Error('not_found');
  if (!res.ok) throw new Error(`PATCH /invoices/${id} failed: ${res.status}`);

  const updated = await res.json();
  // console.log('PATCH response received:', JSON.stringify(updated, null, 2));
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
    paymentDue: inv.payment_due || inv.date, // Use payment_due from DB or fallback to date
    paymentTerms: inv.payment_terms || 30,
    description: inv.description || inv.notes || '',
    clientName: inv.customer_name,       
    clientEmail: inv.client_email || '', 
    salesperson: inv.salesperson ?? '',
    status: inv.status,
    senderAddress: {
      street: inv.sender_street || '',
      city: inv.sender_city || '',
      postCode: inv.sender_post_code || '',
      country: inv.sender_country || ''
    },
    clientAddress: {
      street: inv.client_street || '',
      city: inv.client_city || '',
      postCode: inv.client_post_code || '',
      country: inv.client_country || ''
    },
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
  if ('clientEmail' in patch) out.clientEmail = patch.clientEmail;
  if ('salesperson' in patch) out.salesperson = patch.salesperson;
  if ('notes' in patch) out.notes = patch.notes;
  if ('description' in patch) out.description = patch.description;
  if ('status' in patch) out.status = patch.status;
  if ('paymentTerms' in patch) out.paymentTerms = patch.paymentTerms;
  if ('date' in patch) out.date = patch.date;
  
  // Include items for editing
  if ('items' in patch) out.items = patch.items;
  
  // Address fields
  if ('clientAddress' in patch) {
    if (patch.clientAddress?.street !== undefined) out.clientStreet = patch.clientAddress.street;
    if (patch.clientAddress?.city !== undefined) out.clientCity = patch.clientAddress.city;
    if (patch.clientAddress?.postCode !== undefined) out.clientPostCode = patch.clientAddress.postCode;
    if (patch.clientAddress?.country !== undefined) out.clientCountry = patch.clientAddress.country;
  }
  
  if ('senderAddress' in patch) {
    if (patch.senderAddress?.street !== undefined) out.senderStreet = patch.senderAddress.street;
    if (patch.senderAddress?.city !== undefined) out.senderCity = patch.senderAddress.city;
    if (patch.senderAddress?.postCode !== undefined) out.senderPostCode = patch.senderAddress.postCode;
    if (patch.senderAddress?.country !== undefined) out.senderCountry = patch.senderAddress.country;
  }
  
  return out;
}

function toIso(d) {
  if (!d) return new Date().toISOString();
  const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  return new Date(dt).toISOString();
}