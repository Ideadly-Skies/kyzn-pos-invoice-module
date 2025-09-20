// src/components/AddItem.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/solid';
import { validateItemCount, validateItemName, validateItemPrice } from '../functions/createInvoiceValidator';
import { searchProducts } from '../api/invoices';

// Simple debounce (local to this file)
function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

const toIDR = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
    .format(Number(n || 0));

function AddItem({ itemDetails, setItem, isValidatorActive, onDelete, handelOnChange }) {
  const [query, setQuery] = useState(itemDetails.name || '');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const boxRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Debounced search
  const runSearch = useMemo(
    () =>
      debounce(async (q) => {
        const term = String(q || '').trim();
        if (!term) {
          setResults([]);
          return;
        }
        setLoading(true);
        try {
          const items = await searchProducts({ query: term, limit: 8, page: 1 });
          setResults(items);
        } catch (e) {
          // console.error(e);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 250),
    []
  );

  // Trigger searches when query changes
  useEffect(() => {
    runSearch(query);
  }, [query, runSearch]);

  // Helper: patch this row inside parent state
  const setItemPatch = (patch) => {
    setItem((prev) =>
      prev.map((row) => (row.id === itemDetails.id ? { ...row, ...patch } : row))
    );
  };

  const onSelectProduct = (p) => {
    const price = Number(p.price ?? 0);
    const qty = Number(itemDetails.quantity || 1);
    setItemPatch({
      name: p.name,
      price,
      total: qty * price,
      productId: p.id,
      _productMeta: { stock: p.stock ?? 0, image_url: p.image_url || null },
    });
    setQuery(p.name);
    setOpen(false);
  };

  // Validators
  const hasNameError = isValidatorActive && !validateItemName(itemDetails.name);
  const hasQtyError = isValidatorActive && !validateItemCount(itemDetails.quantity);
  const hasPriceError = isValidatorActive && !validateItemPrice(itemDetails.price);

  return (
    <div className="flex dark:text-white justify-between items-start" ref={boxRef}>
      <div className="flex flex-wrap gap-x-2">
        {/* Item name with autocomplete */}
        <div className="flex px-2 py-2 flex-col items-start relative">
          <h1>Item Name</h1>
          <input
            name={`name_${itemDetails.id}`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setItemPatch({ name: e.target.value });
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            type="text"
            placeholder="Search product…"
            autoComplete="off"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className={`dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg focus:outline-purple-400 border-gray-300 focus:outline-none dark:border-gray-800 ${
              hasNameError ? 'border-red-500 dark:border-red-500 outline-red-500 border-2' : ''
            }`}
          />

          {/* Autocomplete dropdown */}
          {open && (loading || results.length > 0) && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 rounded-lg shadow-2xl bg-white dark:bg-[#1e2139] border border-gray-200 dark:border-gray-700 max-h-72 overflow-auto">
              {loading && <div className="px-3 py-2 text-sm">Searching…</div>}
              {!loading &&
                results.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => onSelectProduct(p)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#252945] flex items-center gap-3"
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gray-200" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-500">
                        Stock: {p.stock ?? 0} • Price: {toIDR(p.price ?? 0)}
                      </div>
                    </div>
                  </button>
                ))}
              {!loading && results.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">No results</div>
              )}
            </div>
          )}

          {hasNameError && <p className="mt-1 text-xs text-red-500">Item name required</p>}
        </div>

        {/* Qty */}
        <div className="flex px-2 py-2 flex-col items-start">
          <h1>Qty.</h1>
          <input
            name="quantity"
            type="number"
            min={1}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            onChange={(e) => {
              handelOnChange(itemDetails.id, e);
              const qty = Number(e.target.value || 0);
              setItemPatch({ total: qty * Number(itemDetails.price || 0) });
            }}
            value={itemDetails.quantity}
            className={`dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg focus:outline-purple-400 max-w-[80px] border-gray-300 focus:outline-none dark:border-gray-800 ${
              hasQtyError ? 'border-red-500 dark:border-red-500 outline-red-500 border-2' : ''
            }`}
          />
          {hasQtyError && <p className="mt-1 text-xs text-red-500">Quantity must be ≥ 1</p>}
        </div>

        {/* Price */}
        <div className="flex px-2 py-2 flex-col items-start">
          <h1>Price</h1>
          <input
            name="price"
            type="number"
            min={0}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            onChange={(e) => {
              handelOnChange(itemDetails.id, e);
              const price = Number(e.target.value || 0);
              setItemPatch({ total: price * Number(itemDetails.quantity || 0) });
            }}
            value={itemDetails.price}
            className={`dark:bg-[#1e2139] py-2 max-w-[120px] px-4 border-[.2px] rounded-lg focus:outline-purple-400 border-gray-300 focus:outline-none dark:border-gray-800 ${
              hasPriceError ? 'border-red-500 dark:border-red-500 outline-red-500 border-2' : ''
            }`}
          />
          {hasPriceError && <p className="mt-1 text-xs text-red-500">Price must be ≥ 0</p>}
        </div>

        {/* Total (read-only, formatted) */}
        <div className="flex px-2 py-2 flex-col items-start">
          <h1>Total</h1>
          <div className="max-w-[140px] dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg focus:outline-none border-gray-300 dark:border-gray-800 dark:text-white">
            {toIDR(itemDetails.total)}
          </div>
        </div>
      </div>

      <button onClick={() => onDelete(itemDetails.id)}>
        <TrashIcon className="text-gray-500 hover:text-red-500 cursor-pointer mt-6 h-6 w-6" />
      </button>
    </div>
  );
}

export default AddItem;