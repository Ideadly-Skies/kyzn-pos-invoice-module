// --------- invoiceInfo helper -----------
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import leftArrow from '../assets/icon-arrow-left.svg';
import { AnimatePresence, motion } from 'framer-motion';
import PaidStatus from './PaidStatus';
import { useDispatch, useSelector } from 'react-redux';

import {
  getInvoiceById,
  loadInvoiceById,
  selectInvoiceById,
  selectInvoicesLoading,
  selectInvoicesError,
} from '../redux/invoiceSlice';

import formatDate from '../functions/formatDate';
import DeleteModal from './DeleteModal';
import CreateInvoice from './CreateInvoice';

// convert to IDR
const toIDR = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
    .format(Number(n || 0));

function InvoiceInfo({ onDelete }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const invoiceId = location.search.substring(1);

  const invoice = useSelector(selectInvoiceById);
  const loading = useSelector(selectInvoicesLoading);
  const error = useSelector(selectInvoicesError);

  useEffect(() => {
    if (invoiceId) dispatch(getInvoiceById({ id: invoiceId }));
  }, [dispatch, invoiceId]);

  useEffect(() => {
    if (invoiceId && !invoice) dispatch(loadInvoiceById(invoiceId));
  }, [dispatch, invoiceId, invoice]);

  const onMakePaidClick = () => {
    // keep local behavior for now; PATCH can be wired later
    dispatch(getInvoiceById({ id: invoiceId }));
  };

  const onDeleteButtonClick = () => {
    navigate('/');
    setIsDeleteModalOpen(false);
    onDelete?.(invoiceId);
  };

  if (loading && !invoice) return <div className="p-6">loading…</div>;
  if (error && !invoice) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!invoice) return <div className="p-6">Not found.</div>;

  const sender = invoice.senderAddress || { street: '', city: '', postCode: '', country: '' };
  const client = invoice.clientAddress || { street: '', city: '', postCode: '', country: '' };

  return (
    <div>
      <motion.div
        key="invoice-info"
        initial={{ x: 0 }}
        animate={{ x: 0 }}
        exit={{ x: '200%' }}
        transition={{ duration: 0.5 }}
        className="dark:bg-[#141625] mx-auto duration-300 min-h-screen bg-[#f8f8fb] py-[34px] px-2 md:px-8 lg:px-12 max-w-3xl lg:py-[72px]"
      >
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center space-x-4 group dark:text-white font-thin">
            <img src={leftArrow} alt="" />
            <p className="group-hover:opacity-80">Go back</p>
          </button>

          <div className="mt-8 rounded-lg w-full flex items-center justify-between px-6 py-6 bg-white dark:bg-[#1e2139]">
            <div className="flex space-x-2 justify-between md:justify-start md:w-auto w-full items-center">
              <h1 className="text-gray-600 dark:text-gray-400">Status</h1>
              <PaidStatus type={invoice.status} />
            </div>
            <div className="md:block hidden">
              <button
                onClick={() => setIsEditOpen(true)}
                className="text-[#7e88c3] text-center dark:bg-[#252945] hover:opacity-80 bg-slate-100 p-3 px-7 rounded-full"
              >
                Edit
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="ml-3 text-center text-white bg-red-500 hover:opacity-80 p-3 px-7 rounded-full"
              >
                Delete
              </button>
              {invoice.status === 'pending' && (
                <button
                  onClick={onMakePaidClick}
                  className="ml-3 text-center text-white bg-[#7c5dfa] hover:opacity-80 p-3 px-7 rounded-full"
                >
                  Make as Paid
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg w-full px-6 py-6 bg-white dark:bg-[#1e2139]">
            <div className="flex flex-col md:flex-row items-start justify-between w-full ">
              <div>
                <h1 className="font-semibold dark:text-white text-xl">
                  <span className="text-[#7e88c3]">#</span>
                  {invoice.id}
                </h1>
                <p className="text-sm text-gray-500">{invoice.clientName}</p>
              </div>
              <div className="mt-4 md:mt-0 text-left text-gray-400 text-sm md:text-right flex flex-col items-center">
                <p>{sender.street}</p>
                <p>{sender.city}</p>
                <p>{sender.postCode}</p>
                <p>{sender.country}</p>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 w-full md:grid-cols-3">
              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="text-gray-400 font-thin">Invoice Date</h3>
                  <h1 className="text-lg font-semibold dark:text-white">{formatDate(invoice.createdAt)}</h1>
                </div>
                <div>
                  <h3 className="text-gray-400 font-thin">Payment Due</h3>
                  <h1 className="dark:text-white text-lg font-semibold">{formatDate(invoice.paymentDue)}</h1>
                </div>
              </div>

              <div>
                <p className="text-gray-400 font-thin">Bill to</p>
                <h1 className="dark:text-white text-lg font-semibold">{invoice.clientName}</h1>
                <p className="text-gray-400 font-thin">{client.street}</p>
                <p className="text-gray-400 font-thin">{client.city}</p>
                <p className="text-gray-400 font-thin">{client.postCode}</p>
                <p className="text-gray-400 font-thin">{client.country}</p>
              </div>

              <div className="mt-8 md:mt-0">
                <p className="text-gray-400 font-thin">Sent to</p>
                <h1 className="dark:text-white text-lg font-semibold">{invoice.clientEmail}</h1>
              </div>
            </div>

            {/* Items - mobile */}
            <div className="sm:hidden mt-10 bg-[#f9fafe] dark:bg-[#252945] rounded-lg rounded-b-none space-y-4 p-10">
              {invoice.items.map((item) => (
                <div key={item.name} className="justify-between text-lg dark:text-white flex">
                  <h1>{item.name}</h1>
                  <h1>{toIDR(item.total)}</h1>
                </div>
              ))}
            </div>

            {/* Items - desktop */}
            <div className="hidden sm:block mt-10 bg-[#f9fafe] dark:bg-[#252945] rounded-lg rounded-b-none space-y-4 p-10">
              {invoice.items.map((item) => (
                <div key={item.name} className="flex justify-around">
                  <div className="space-y-4">
                    <p className="text-gray-400 font-thin">Item name</p>
                    <h1 className="dark:text-white text-base font-semibold">{item.name}</h1>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-400 font-thin">Qty.</p>
                    <h1 className="dark:text-white text-base font-semibold">{item.quantity}</h1>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-400 font-thin">Item price</p>
                    <h1 className="dark:text-white text-base font-semibold">{toIDR(item.price)}</h1>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-400 font-thin">Total</p>
                    <h1 className="dark:text-white text-base font-semibold">{toIDR(item.total)}</h1>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-10 font-semibold text-white rounded-lg rounded-t-none justify-between flex dark:bg-black bg-gray-700">
              <h3 className="text-xl">Amount Due</h3>
              <h1 className="text-3xl">{toIDR(invoice.total)}</h1>
            </div>
          </div>
        </div>
      </motion.div>

      {isDeleteModalOpen && invoice && (
        <DeleteModal
          onDeleteButtonClick={onDeleteButtonClick}
          setIsDeleteModalOpen={setIsDeleteModalOpen}
          invoiceId={invoice.id}
        />
      )}
      <AnimatePresence>
        {isEditOpen && <CreateInvoice invoice={invoice} type="edit" setOpenCreateInvoice={setIsEditOpen} />}
      </AnimatePresence>
    </div>
  );
}

export default InvoiceInfo;