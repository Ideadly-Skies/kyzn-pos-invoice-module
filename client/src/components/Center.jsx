import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import arrowDown from '../assets/icon-arrow-down.svg';
import plus from '../assets/plus.png';
import InvoiceCard from './InvoiceCard';
import TimeSeriesGraph from './TimeSeriesGraph';
import { useDispatch, useSelector } from 'react-redux';
import {
  loadInvoices,
  filterInvoice,
  selectInvoices,
  selectInvoicesLoading,
  selectInvoicesError,
  selectNextCursor,
} from '../redux/invoiceSlice';
import CreateInvoice from './CreateInvoice';
import { useLocation } from 'react-router-dom';

function Center() {
  const location = useLocation();
  const controls = useAnimation();
  const dispatch = useDispatch();

  const filterOptions = ['paid', 'pending', 'draft'];
  const [isDropdown, setIsDropdown] = useState(false);
  const [openCreateInvoice, setOpenCreateInvoice] = useState(false);
  const [filterValue, setFilterValue] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const invoices = useSelector(selectInvoices);
  const loading = useSelector(selectInvoicesLoading);
  const error = useSelector(selectInvoicesError);
  const nextCursor = useSelector(selectNextCursor);

  // Calculate pagination
  const totalPages = Math.ceil(invoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = invoices.slice(startIndex, endIndex);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue]);

  // Reset to first page when invoices change (e.g., after creating/editing)
  useEffect(() => {
    setCurrentPage(1);
  }, [invoices.length]);

  // 1) Load from backend on first mount
  useEffect(() => {
    dispatch(loadInvoices({ limit: 10 }));
  }, [dispatch]);

  // 2) Apply filter (pure client-side on the already-fetched list)
  useEffect(() => {
    dispatch(filterInvoice({ status: filterValue }));
  }, [filterValue, dispatch]);

  // keep your nice animation
  useEffect(() => {
    controls.start({
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 200, damping: 20 },
    });
  }, [controls]);

  const transition = { stiffness: 200 };
  const variants = {
    open: { opacity: 1, x: -20, duration: 200, transition },
    close: { opacity: 0, x: -100, duration: 500, transition },
  };

  const onToggleFilter = () => setIsDropdown((s) => !s);
  const onSelectFilter = (value) =>
    setFilterValue((prev) => (prev === value ? '' : value));

  const onLoadMore = () => {
    if (nextCursor && !loading) {
      dispatch(loadInvoices({ cursor: nextCursor, limit: 10 }));
    }
  };

  return (
    <div>
      <div className="dark:bg-[#141625] scrollbar-hide duration-300 min-h-screen bg-[#f8f8fb] py-[34px] px-2 md:px-8 lg:px-12 lg:py-[72px]">
        <motion.div
          key={location.pathname}
          initial={{ x: '0' }}
          animate={{ x: 0 }}
          exit={{ x: '-150%' }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl flex flex-col mx-auto my-auto"
        >
          {/* Header */}
          <div className="min-w-full max-h-[64px] flex items-center justify-between">
            <div>
              <h1 className="lg:text-4xl md:text-2xl text-xl dark:text-white tracking-wide font-semibold">
                Invoices
              </h1>
              <p className="text-gray-500 font-light">
                {loading && invoices.length === 0
                  ? 'Loading…'
                  : totalPages > 1 
                    ? `Showing ${startIndex + 1}-${Math.min(endIndex, invoices.length)} of ${invoices.length} invoices`
                    : `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} found`}
              </p>
              {error && (
                <p className="text-red-500 text-sm mt-1">Error: {error}</p>
              )}
            </div>

            <div className="flex max-h-full items-center">
              <div className="flex items-center">
                <p className="hidden md:block dark:text-white font-medium">
                  Filter by status
                </p>
                <p className="md:hidden dark:text-white font-medium">Filter</p>
                <div onClick={onToggleFilter} className="cursor-pointer ml-3">
                  <motion.img
                    src={arrowDown}
                    animate={
                      isDropdown
                        ? { transition, rotate: -180 }
                        : { transition, rotate: 0 }
                    }
                  />
                </div>
              </div>

              {isDropdown && (
                <motion.div
                  variants={variants}
                  animate={isDropdown ? 'open' : 'close'}
                  className="w-40 bg-white dark:bg-[#1E2139] dark:text-white flex px-6 py-4 flex-col top-[160px] lg:top-[120px] absolute shadow-2xl rounded-xl space-y-2"
                >
                  {filterOptions.map((item) => (
                    <div
                      key={item}
                      onClick={() => onSelectFilter(item)}
                      className="items-center cursor-pointer flex space-x-2"
                    >
                      <input
                        value={item}
                        checked={filterValue === item}
                        type="checkbox"
                        className="accent-[#7c5dfa]"
                        readOnly
                      />
                      <p>{item}</p>
                    </div>
                  ))}
                </motion.div>
              )}

              <button
                onClick={() => setOpenCreateInvoice(true)}
                className="hover:opacity-80 ml-4 md:ml-10 flex items-center py-2 px-2 md:space-x-3 space-x-2 bg-[#7c5dfa] rounded-full"
              >
                <img src={plus} alt="" />
                <p className="md:block hidden text-white font-semibold text-lg">
                  New invoice
                </p>
                <p className="md:hidden block text-white font-semibold text-base">
                  New
                </p>
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="mt-10">
            {/* Page indicator for multiple pages */}
            {totalPages > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Page</span>
                  <span className="bg-[#7c5dfa] text-white px-3 py-1 rounded-full text-sm font-medium">
                    {currentPage} of {totalPages}
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {currentInvoices.length} invoice{currentInvoices.length !== 1 ? 's' : ''} on this page
                </div>
              </motion.div>
            )}

            <div className="space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="space-y-4"
                >
                  {currentInvoices.map((invoice, index) => (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0, y: -30 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { delay: Math.min(index * 0.1, 0.4), duration: 0.4 },
                      }}
                      exit={{ opacity: 0, y: 30 }}
                      transition={{ duration: 0.3 }}
                    >
                      <InvoiceCard invoice={invoice} />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            {loading && invoices.length > 0 && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-gray-500 text-center py-4"
              >
                Loading…
              </motion.p>
            )}

            {!loading && invoices.length === 0 && !error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center py-12"
              >
                <p className="text-gray-500 text-lg">No invoices found.</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or create a new invoice.</p>
              </motion.div>
            )}

            {/* Pagination Controls */}
            {!loading && invoices.length > 0 && totalPages > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex justify-center items-center space-x-2 mt-8 py-4"
              >
                {/* Previous Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                      : 'bg-white text-gray-700 hover:bg-[#7c5dfa] hover:text-white shadow-sm dark:bg-[#1E2139] dark:text-white dark:hover:bg-[#7c5dfa] border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  ← Previous
                </motion.button>

                {/* Page Numbers */}
                <div className="flex space-x-1">
                  {(() => {
                    const maxVisible = 5;
                    const pages = [];
                    
                    if (totalPages <= maxVisible) {
                      // Show all pages if total is small
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Show smart pagination with ellipsis
                      if (currentPage <= 3) {
                        pages.push(1, 2, 3, 4, '...', totalPages);
                      } else if (currentPage >= totalPages - 2) {
                        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                      } else {
                        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                      }
                    }

                    return pages.map((pageNum, index) => (
                      pageNum === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 py-2 text-gray-500 dark:text-gray-400">
                          ...
                        </span>
                      ) : (
                        <motion.button
                          key={pageNum}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-lg font-medium transition-all duration-200 ${
                            currentPage === pageNum
                              ? 'bg-[#7c5dfa] text-white shadow-md transform scale-105 border border-[#7c5dfa]'
                              : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-[#7c5dfa] hover:text-[#7c5dfa] shadow-sm dark:bg-[#1E2139] dark:text-white dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          {pageNum}
                        </motion.button>
                      )
                    ));
                  })()}
                </div>

                {/* Next Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                      : 'bg-white text-gray-700 hover:bg-[#7c5dfa] hover:text-white shadow-sm dark:bg-[#1E2139] dark:text-white dark:hover:bg-[#7c5dfa] border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  Next →
                </motion.button>
              </motion.div>
            )}

            {/* Load More for Backend Pagination (if needed) */}
            {nextCursor && !loading && (
              <button
                onClick={onLoadMore}
                className="self-center mt-4 px-4 py-2 rounded-md bg-gray-200 dark:bg-[#252945] dark:text-white hover:opacity-80"
              >
                Load more from server
              </button>
            )}
          </div>

          {/* Time Series Graph */}
          <TimeSeriesGraph />
        </motion.div>
      </div>

      <AnimatePresence>
        {openCreateInvoice && (
          <CreateInvoice
            openCreateInvoice={openCreateInvoice}
            setOpenCreateInvoice={setOpenCreateInvoice}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Center;
