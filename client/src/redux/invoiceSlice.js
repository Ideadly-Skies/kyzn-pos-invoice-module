// src/redux/invoiceSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchInvoices as apiFetchInvoices } from '../api/invoices';

// ───────────────────────────────────────────────────────────────────────────────
// Async thunks - loadInvoices from the backend
// ───────────────────────────────────────────────────────────────────────────────
export const loadInvoices = createAsyncThunk(
  'invoices/loadInvoices',
  async ({ cursor = null, limit = 10 } = {}) => {
    return await apiFetchInvoices({ cursor, limit });
  }
);

// ─────────────────────────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────────────────────────
const slice = createSlice({
  name: 'invoices',
  initialState: {
    allInvoice: [],
    filteredInvoice: [],
    invoiceById: null,
    nextCursor: null,
    loading: false,
    error: null,
  },
  reducers: {
    filterInvoice(state, action) {
      const status = action.payload?.status || '';
      state.filteredInvoice = status
        ? state.allInvoice.filter((inv) => inv.status === status)
        : state.allInvoice;
    },
    getInvoiceById(state, action) {
      const id = String(action.payload.id);
      state.invoiceById =
        state.allInvoice.find((item) => String(item.id) === id) || null;
    },
    clearInvoices(state) {
      state.allInvoice = [];
      state.filteredInvoice = [];
      state.invoiceById = null;
      state.nextCursor = null;
      state.loading = false;
      state.error = null;
    },
    updateInvoiceStatus(state, action) {
      const { id, status } = action.payload;
      const target = state.allInvoice.find((i) => String(i.id) === String(id));
      if (target) target.status = status;

      state.filteredInvoice = state.filteredInvoice.map((i) =>
        String(i.id) === String(id) ? { ...i, status } : i
      );
      if (state.invoiceById && String(state.invoiceById.id) === String(id)) {
        state.invoiceById.status = status;
      }
    },
    deleteInvoice(state, action) {
      const id = String(action.payload.id);
      state.allInvoice = state.allInvoice.filter((i) => String(i.id) !== id);
      state.filteredInvoice = state.filteredInvoice.filter(
        (i) => String(i.id) !== id
      );
      if (state.invoiceById && String(state.invoiceById.id) === id) {
        state.invoiceById = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadInvoices.fulfilled, (state, action) => {
        const { items, nextCursor } = action.payload;

        // merge by id to avoid duplicates when paginating
        const map = new Map(state.allInvoice.map((i) => [String(i.id), i]));
        for (const it of items) map.set(String(it.id), it);
        state.allInvoice = Array.from(map.values());

        // default filtered view = all
        state.filteredInvoice = state.allInvoice;

        state.nextCursor = nextCursor ?? null;
        state.loading = false;
      })
      .addCase(loadInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to load invoices';
      });
  },
});

export const {
  filterInvoice,
  getInvoiceById,
  clearInvoices,
  updateInvoiceStatus,
  deleteInvoice,
} = slice.actions;

export default slice.reducer;

export const selectInvoices = (s) => s.invoices.filteredInvoice;
export const selectInvoiceById = (s) => s.invoices.invoiceById;
export const selectInvoicesLoading = (s) => s.invoices.loading;
export const selectNextCursor = (s) => s.invoices.nextCursor;
export const selectInvoicesError = (s) => s.invoices.error;