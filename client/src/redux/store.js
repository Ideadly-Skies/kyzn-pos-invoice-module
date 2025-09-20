import { configureStore } from '@reduxjs/toolkit';
import invoicesReducer from './invoiceSlice';

const store = configureStore({
  reducer: {
    invoices: invoicesReducer,
  },
});

export default store;