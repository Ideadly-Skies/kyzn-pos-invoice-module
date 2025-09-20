// src/redux/invoiceSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchInvoices as apiFetchInvoices,
  fetchInvoiceById as apiFetchInvoiceById,
} from '../api/invoices';

// ───────────────────────────────────────────────────────────────────────────────
// Async thunks - loadInvoices from the backend
// ───────────────────────────────────────────────────────────────────────────────
export const loadInvoices = createAsyncThunk(
  'invoices/loadInvoices',
  async ({ cursor = null, limit = 10 } = {}) => {
    return await apiFetchInvoices({ cursor, limit });
  }
);

export const loadInvoiceById = createAsyncThunk(
  'invoices/loadInvoiceById',
  async (id) => {
    return await apiFetchInvoiceById(id);
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
    updateInvoice(state, action) {
      const updatedInvoice = action.payload;
      const id = String(updatedInvoice.id);
      
      console.log('Redux updateInvoice action called with:', updatedInvoice);
      
      // Update in allInvoice array
      const targetIndex = state.allInvoice.findIndex((i) => String(i.id) === id);
      if (targetIndex !== -1) {
        state.allInvoice[targetIndex] = updatedInvoice;
        console.log('Updated invoice in allInvoice array at index:', targetIndex);
      }

      // Update in filteredInvoice array
      const filteredIndex = state.filteredInvoice.findIndex((i) => String(i.id) === id);
      if (filteredIndex !== -1) {
        state.filteredInvoice[filteredIndex] = updatedInvoice;
        console.log('Updated invoice in filteredInvoice array at index:', filteredIndex);
      }

      // Update invoiceById if it's the current invoice
      if (state.invoiceById && String(state.invoiceById.id) === id) {
        console.log('Updating current invoiceById from:', state.invoiceById, 'to:', updatedInvoice);
        state.invoiceById = updatedInvoice;
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
      })
      .addCase(loadInvoiceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadInvoiceById.fulfilled, (state, action) => {
        const inv = action.payload;
        // upsert into the list
        const map = new Map(state.allInvoice.map(i => [String(i.id), i]));
        map.set(String(inv.id), inv);
        state.allInvoice = Array.from(map.values());
        state.filteredInvoice = state.allInvoice;
        state.invoiceById = inv;
        state.loading = false;
      })
      .addCase(loadInvoiceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to load invoice';
      })
  },
});

export const {
  filterInvoice,
  getInvoiceById,
  clearInvoices,
  updateInvoiceStatus,
  updateInvoice,
  deleteInvoice,
} = slice.actions;

export default slice.reducer;

export const selectInvoices = (s) => s.invoices.filteredInvoice;
export const selectInvoiceById = (s) => s.invoices.invoiceById;
export const selectInvoicesLoading = (s) => s.invoices.loading;
export const selectNextCursor = (s) => s.invoices.nextCursor;
export const selectInvoicesError = (s) => s.invoices.error;