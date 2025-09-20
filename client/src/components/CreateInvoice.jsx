import React, { useState } from 'react'
import { motion } from 'framer-motion'
import AddItem from './AddItem'
import { v4 as uuidv4 } from "uuid";
import { useDispatch } from 'react-redux';
import { loadInvoices, filterInvoice } from '../redux/invoiceSlice';
import { createInvoice as apiCreateInvoice, patchInvoice } from '../api/invoices';
import {
  validateSenderStreetAddress, validateSenderPostCode, validateSenderCity,
  validateCLientEmail, validateCLientName, validateClientCity, validateClientPostCode,
  validateClientStreetAddress, validateItemCount, validateItemName, validateItemPrice,
  validateSenderCountry, validateClientCountry
} from '../functions/createInvoiceValidator'

function CreateInvoice({ openCreateInvoice, setOpenCreateInvoice, invoice, type }) {
  const dispatch = useDispatch()

  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isValidatorActive, setIsValidatorActive] = useState(false)

  const [filterValue, setfilterValue] = useState('')
  const deliveryTimes = [
    { text: 'Next 1 day', value: 1 },
    { text: 'Next 7 day', value: 7 },
    { text: 'Next 14 day', value: 14 },
    { text: 'Next 30 day', value: 30 },
  ]
  const [senderStreet, setSenderStreet] = useState('')
  const [senderCity, setSenderCity] = useState('')
  const [senderPostCode, setSenderPostCode] = useState('')
  const [senderCountry, setSenderCountry] = useState('')

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')

  const [clientStreet, setClientStreet] = useState('')
  const [clientCity, setClientCity] = useState('')
  const [clientPostCode, setClientPostCode] = useState('')
  const [clientCountry, setClientCountry] = useState('')
  const [description, setDescription] = useState('')

  const [selectDeliveryDate, setSelectDeliveryDate] = useState('')
  const [paymentTerms, setpaymentTerms] = useState(deliveryTimes[0].value)

  // NEW
  const [salesperson, setSalesperson] = useState('')
  const [status, setStatus] = useState('pending')

  const [item, setItem] = useState([
    { name: "", quantity: 1, price: 0, total: 0, id: uuidv4() }
  ])

  const onDelete = (id) => {
    setItem((pervState) => pervState.filter((el) => el.id !== id))
  }

  const handelOnChange = (id, e) => {
    let data = [...item]
    let foundData = data.find((el) => el.id === id)

    // FIXED condition
    if (e.target.name === 'quantity' || e.target.name === 'price') {
      foundData[e.target.name] = e.target.value
      foundData['total'] = (
        Number(foundData.quantity) * Number(foundData.price)
      ).toFixed(2)
    } else {
      foundData[e.target.name] = e.target.value
    }

    setItem(data);
  }

  const onSubmit = async () => {
    if (type === 'edit') {
      console.log("Editing existing invoice...");
      
      const editPayload = {
        customerName: clientName,
        salesperson,
        notes: description || '',
        status,
      };

      console.log("Edit payload to send:", JSON.stringify(editPayload, null, 2));

      try {
        console.log("Sending PATCH request to API...");
        const result = await patchInvoice(invoice.id, editPayload);
        console.log("Invoice updated successfully:", result);
        
        console.log("Reloading invoices...");
        await dispatch(loadInvoices({ limit: 10 }));
        
        console.log("Applying filter...");
        dispatch(filterInvoice({ status: filterValue }));
        
        console.log("Closing modal...");
        setOpenCreateInvoice(false);
        
        // Optionally show success message
        alert('Invoice updated successfully!');
      } catch (e) {
        console.error("Failed to update invoice:", e);
        console.error("Error details:", {
          message: e.message,
          stack: e.stack,
          payload: editPayload
        });
        alert(`Failed to update invoice: ${e.message}`);
      }
    } else {
      console.log("Creating new invoice...");

      const payload = {
        code: `INV-${Date.now()}`,
        date: selectDeliveryDate ? new Date(selectDeliveryDate) : new Date(),
        customerName: clientName,
        salesperson,
        status,
        notes: description || '',
        items: item
          .filter(it => (it.name && String(it.name).trim()) || it.productId)
          .map(it => ({
            productId: it.productId ?? undefined,
            name: it.name ?? undefined,
            quantity: Number(it.quantity || 1),
            unitPrice: Number(it.price || 0),
          })),
      };

      console.log("Payload to send:", JSON.stringify(payload, null, 2));

      try {
        console.log("Sending POST request to API...");
        const result = await apiCreateInvoice(payload);
        console.log("Invoice created successfully:", result);
        
        console.log("Reloading invoices...");
        await dispatch(loadInvoices({ limit: 10 }));
        
        console.log("Applying filter...");
        dispatch(filterInvoice({ status: filterValue }))
        
        console.log("Closing modal...");
        setOpenCreateInvoice(false)
      } catch (e) {
        console.error("Failed to create invoice:", e);
        console.error("Error details:", {
          message: e.message,
          stack: e.stack,
          payload
        });
        alert(`Failed to create invoice: ${e.message}`);
      }
    }
  }

  if (type === 'edit' && isFirstLoad) {
    const updatedItemsArray = invoice.items.map((obj, index) => {
      return { ...obj, id: index + 1 };
    });

    setClientName(invoice.clientName)
    setClientCity(invoice.clientAddress.city)
    setClientStreet(invoice.clientAddress.street)
    setClientPostCode(invoice.clientAddress.postCode)
    setClientCountry(invoice.clientAddress.country)
    setClientEmail(invoice.clientEmail)
    setpaymentTerms(invoice.paymentTerms)
    setDescription(invoice.description)
    setSenderCity(invoice.senderAddress.city)
    setSenderStreet(invoice.senderAddress.street)
    setSenderCountry(invoice.senderAddress.country)
    setSenderPostCode(invoice.senderAddress.postCode)
    setSalesperson(invoice.salesperson || '')
    setStatus(invoice.status || 'pending')
    setItem(updatedItemsArray)
    setIsFirstLoad(false)
  }

  function itemsValidator() {
    const itemName = item.map(i => validateItemName(i.name))
    const itemCount = item.map(i => validateItemCount(i.quantity))
    const itemPrice = item.map(i => validateItemPrice(i.price))
    const allItemsElement = itemCount.concat(itemPrice, itemName)
    return (allItemsElement.includes(false) === true ? false : true)
  }

  function validator() {
    const salesValid = salesperson && salesperson.trim().length > 0;
    
    // For edit mode, only validate the fields that can be updated
    if (type === 'edit') {
      return validateCLientName(clientName) && salesValid;
    }
    
    // For create mode, validate all fields
    if (
      validateSenderStreetAddress(senderStreet) && validateSenderPostCode(senderPostCode) &&
      validateSenderCity(senderCity) && validateCLientEmail(clientEmail) &&
      validateCLientName(clientName) && validateClientCity(clientCity) &&
      validateClientPostCode(clientPostCode) && validateClientStreetAddress(clientStreet) &&
      validateSenderCountry(senderCountry) && validateClientCountry(clientCountry) && 
      salesValid && itemsValidator()
    ) { return true }
    return false
  }

  function debugValidation() {
    const salesValid = salesperson && salesperson.trim().length > 0;
    
    if (type === 'edit') {
      return {
        clientName: validateCLientName(clientName),
        salesperson: salesValid,
      };
    }
    
    return {
      senderStreet: validateSenderStreetAddress(senderStreet),
      senderPostCode: validateSenderPostCode(senderPostCode),
      senderCity: validateSenderCity(senderCity),
      clientEmail: validateCLientEmail(clientEmail),
      clientName: validateCLientName(clientName),
      clientCity: validateClientCity(clientCity),
      clientPostCode: validateClientPostCode(clientPostCode),
      clientStreet: validateClientStreetAddress(clientStreet),
      senderCountry: validateSenderCountry(senderCountry),
      clientCountry: validateClientCountry(clientCountry),
      salesperson: salesValid,
      items: itemsValidator()
    }
  }

  return (
    <div onClick={(e) => { if (e.target !== e.currentTarget) return; setOpenCreateInvoice(false); }}
        className='fixed top-0 bottom-0 left-0 right-0 bg-[#000005be]'>

        <motion.div
            key='createInvoice-sidebar'
            initial={{ x: -500, opacity: 0 }}
            animate={{ opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 40, duration: .4 } }}
            exit={{ x: -700, transition: { duration: .2 } }}
            className='scrollbar-hide flex flex-col dark:text-white dark:bg-[#141625] bg-white md:pl-[150px] py-16 px-6 h-screen md:w-[768px] md:rounded-r-3xl'
        >
            <h1 className='font-semibold dark:text-white text-3xl'>
                {type == 'edit' ? 'Edit' : 'Create'} Invoice
            </h1>

            <form
                id="invoice-form"
                autoComplete="off"
                className='overflow-y-scroll scrollbar-hide my-14'
                onSubmit={(e) => {
                    e.preventDefault();
                    console.log("Form submission triggered");
                    setIsValidatorActive(true);
                    const ok = validator();
                    if (!ok) {
                        console.warn('Form validation failed:', debugValidation());
                        return;
                    }
                    console.log("Form validation passed, calling onSubmit");
                    onSubmit();
                }}
            >
                {/* Bill From */}
                {type === 'edit' && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Note:</strong> In edit mode, only Customer Name, Salesperson, Status, and Description can be modified due to backend limitations.
                        </p>
                    </div>
                )}
                
                <h1 className=' text-[#7c5dfa] mb-4 font-medium'>
                    Bill From
                </h1>

                <div className=' grid grid-cols-3 mx-1  space-y-4 '>
                    <div className=' flex flex-col col-span-3'>
                        <label className=' text-gray-400 font-light'>
                            Street Address {type === 'edit' && <span className="text-xs">(Read-only)</span>}
                        </label>
                        <input 
                            value={senderStreet} 
                            id='senderStreet' 
                            onChange={(e) => setSenderStreet(e.target.value)} 
                            type='text' 
                            disabled={type === 'edit'}
                            className={`dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg  focus:outline-purple-400 border-gray-300 focus:outline-none  dark:border-gray-800 ${type === 'edit' ? 'opacity-50 cursor-not-allowed' : ''} ${isValidatorActive && !validateSenderStreetAddress(senderStreet) && ' border-red-500 dark:border-red-500 outline-red-500 border-2'}`} 
                        />
                    </div>

                    <div className=' flex flex-col mr-4 col-span-1'>
                        <label className=' text-gray-400 font-light'>
                            City {type === 'edit' && <span className="text-xs">(Read-only)</span>}
                        </label>
                        <input 
                            type='text' 
                            value={senderCity} 
                            onChange={(e) => setSenderCity(e.target.value)} 
                            disabled={type === 'edit'}
                            className={`dark:bg-[#1e2139] py-2 px-4 border-[.2px] focus:outline-none  rounded-lg  focus:outline-purple-400 border-gray-300 ${type === 'edit' ? 'opacity-50 cursor-not-allowed' : ''} ${isValidatorActive && !validateSenderCity(senderCity) && 'border-red-500 dark:border-red-500 outline-red-500 border-2'} dark:border-gray-800`} 
                        />
                    </div>
                    <div className=' flex flex-col mr-4 col-span-1'>
                        <label className=' text-gray-400 font-light'>
                            Post Code {type === 'edit' && <span className="text-xs">(Read-only)</span>}
                        </label>
                        <input 
                            type='text' 
                            value={senderPostCode} 
                            onChange={(e) => setSenderPostCode(e.target.value)} 
                            disabled={type === 'edit'}
                            className={` dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg focus:outline-none  focus:outline-purple-400 border-gray-300 ${type === 'edit' ? 'opacity-50 cursor-not-allowed' : ''} ${isValidatorActive && !validateSenderPostCode(senderPostCode) && 'border-red-500 dark:border-red-500 outline-red-500 border-2'} dark:border-gray-800`} 
                        />
                    </div>
                    <div className=' flex flex-col col-span-1'>
                        <label className=' text-gray-400 font-light'>
                            Country {type === 'edit' && <span className="text-xs">(Read-only)</span>}
                        </label>
                        <input 
                            type='text' 
                            value={senderCountry} 
                            onChange={(e) => setSenderCountry(e.target.value)} 
                            disabled={type === 'edit'}
                            className={` dark:bg-[#1e2139] py-2 px-4 border-[.2px] focus:outline-none  rounded-lg  focus:outline-purple-400 ${type === 'edit' ? 'opacity-50 cursor-not-allowed' : ''} ${isValidatorActive && !validateSenderCountry(senderCountry) && 'border-red-500 dark:border-red-500 outline-red-500 border-2'} border-gray-300 dark:border-gray-800`} 
                        />
                    </div>
                </div>

                {/* Bill To */}
                <h1 className=' text-[#7c5dfa] my-4 mt-10 font-medium'>
                    Bill To
                </h1>

                <div className=' grid grid-cols-3 mx-1   space-y-4 '>
                    <div className=' flex flex-col col-span-3'>
                        <label className=' text-gray-400 font-light'>
                            Client Name
                        </label>
                        <input type='text' value={clientName} onChange={(e) => setClientName(e.target.value)} className={` dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg  focus:outline-purple-400 border-gray-300 focus:outline-none ${isValidatorActive && !validateCLientName(clientName) && 'border-red-500 dark:border-red-500 outline-red-500 border-2'}   dark:border-gray-800`} />
                    </div>

                    <div className=' flex flex-col   col-span-3'>
                        <label className=' text-gray-400 font-light'>
                            Client Email {type === 'edit' && <span className="text-xs">(Read-only)</span>}
                        </label>
                        <input 
                            type='text' 
                            value={clientEmail} 
                            onChange={(e) => setClientEmail(e.target.value)} 
                            disabled={type === 'edit'}
                            className={` dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg  focus:outline-purple-400 border-gray-300 focus:outline-none ${type === 'edit' ? 'opacity-50 cursor-not-allowed' : ''} ${isValidatorActive && !validateCLientEmail(clientEmail) && 'border-red-500 dark:border-red-500 outline-red-500 border-2'}   dark:border-gray-800`} 
                        />
                    </div>

                    <div className=' flex flex-col col-span-3'>
                        <label className=' text-gray-400 font-light'>
                            Street Address
                        </label>
                        <input type='text' value={clientStreet} onChange={(e) => setClientStreet(e.target.value)} className={` dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg  focus:outline-purple-400 border-gray-300 focus:outline-none ${isValidatorActive && !validateClientStreetAddress(clientStreet) && 'border-red-500 dark:border-red-500 outline-red-500 border-2'}   dark:border-gray-800`} />
                    </div>

                    <div className=' flex flex-col mr-4 col-span-1'>
                        <label className=' text-gray-400 font-light'>
                            City
                        </label>
                        <input type='text' value={clientCity} onChange={(e) => setClientCity(e.target.value)} className={` dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg  focus:outline-purple-400 border-gray-300 focus:outline-none ${isValidatorActive && !validateClientCity(clientCity) && 'border-red-500 dark:border-red-500 outline-red-500 border-2'}   dark:border-gray-800`} />
                    </div>
                    <div className=' flex flex-col mr-4 col-span-1'>
                        <label className=' text-gray-400 font-light'>
                            Post Code
                        </label>
                        <input type='text' value={clientPostCode} onChange={(e) => setClientPostCode(e.target.value)}
                            className={` dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg  focus:outline-purple-400 border-gray-300 focus:outline-none ${isValidatorActive && !validateClientPostCode(clientPostCode) && 'border-red-500 dark:border-red-500 outline-red-500 border-2'}   dark:border-gray-800`}
                        />
                    </div>
                    <div className=' flex flex-col col-span-1'>
                        <label className=' text-gray-400 font-light'>
                            Country
                        </label>
                        <input type='text' value={clientCountry} onChange={(e) => setClientCountry(e.target.value)}
                            className={` dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg  focus:outline-purple-400 border-gray-300 focus:outline-none ${isValidatorActive && !validateClientCountry(clientCountry) && 'border-red-500 dark:border-red-500 outline-red-500 border-2'}   dark:border-gray-800`} />
                    </div>
                </div>

                <div className='grid mx-1 grid-cols-2 mt-8 gap-4 md:gap-6'>
                    {/* InvoiceDate */}
                    <div className='flex flex-col '>
                    <label className='text-gray-400 font-light'>Invoice Date</label>
                    <input type='date' value={selectDeliveryDate} onChange={(e) => setSelectDeliveryDate(e.target.value)} className='dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg focus:outline-purple-400 border-gray-300 focus:outline-none dark:border-gray-800 dark:text-white mr-4' />
                    </div>

                    <div className='mx-auto w-full'>
                    <label className='text-gray-400 font-light'>Payment Terms</label>
                    <select value={paymentTerms} onChange={(e) => setpaymentTerms(e.target.value)} className='appearance-none w-full py-2 px-4 border-[.2px] rounded-lg focus:outline-none dark:bg-[#1e2139] dark:text-white dark:border-gray-800 focus:outline-purple-400 border-gray-300 select-status' >
                        {deliveryTimes.map(time => (
                        <option key={time.value} value={time.value}>{time.text}</option>
                        ))}
                    </select>
                    </div>

                    {/* Salesperson */}
                    <div className='flex flex-col'>
                        <label className='text-gray-400 font-light'>Salesperson</label>
                        <input
                            type='text'
                            value={salesperson}
                            onChange={(e) => setSalesperson(e.target.value)}
                            className={`dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg focus:outline-purple-400 border-gray-300 focus:outline-none dark:border-gray-800 ${isValidatorActive && !salesperson ? 'border-red-500 dark:border-red-500 outline-red-500 border-2' : ''}`}
                            placeholder='Enter salesperson name'
                        />
                    </div>

                    {/* Status */}
                    <div className='flex flex-col'>
                        <label className='text-gray-400 font-light'>Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className='appearance-none w-full py-2 px-4 border-[.2px] rounded-lg focus:outline-none dark:bg-[#1e2139] dark:text-white dark:border-gray-800 focus:outline-purple-400 border-gray-300'
                        >
                            <option value='draft'>draft</option>
                            <option value='pending'>pending</option>
                            <option value='paid'>paid</option>
                        </select>
                    </div>
                </div>

                    {/* Description */}
                    <div className=' mx-1 mt-4 flex flex-col '>
                        <label className=' text-gray-400 font-light'>
                            Description
                        </label>
                        <input value={description} onChange={(e) => setDescription(e.target.value)} type='text' className=' dark:bg-[#1e2139] py-2 px-4 border-[.2px] rounded-lg focus:outline-none   focus:outline-purple-400 border-gray-300 dark:border-gray-800 dark:text-white' />
                    </div>

                    <h2 className='text-2xl text-gray-500 mt-10 '>Item List</h2>
                    {type === 'edit' && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Items cannot be modified in edit mode due to backend limitations.
                            </p>
                        </div>
                    )}
                    {item.map((itemDetails, index) => (
                        <div key={itemDetails.id} className={`border-b pb-2 border-gray-300 mb-4 ${type === 'edit' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <AddItem isValidatorActive={isValidatorActive} handelOnChange={handelOnChange} setItem={setItem} onDelete={onDelete} itemDetails={itemDetails} />
                        </div>
                    ))}

                    {type !== 'edit' && (
                        <button
                            onClick={() => {
                            setItem((state) => [...state, { name: "", quantity: 1, price: 0, total: 0, id: uuidv4() }])
                        }}
                            className='bg-gray-200 hover:opacity-80 mx-auto py-2 items-center dark:text-white dark:bg-[#252945] justify-center rounded-xl w-full mt-6'>
                            + Add New Item
                        </button>
                    )}
            </form>

                    <div className='flex justify-between'>
                        <button
                            type="button"
                            onClick={() => setOpenCreateInvoice(false)}
                            className='bg-gray-200 hover:opacity-80 mx-auto py-4 dark:text-white dark:bg-[#252945] px-8 rounded-full '>
                            Discard
                        </button>

                        <button
                            type="submit"
                            form="invoice-form"
                            className='text-white hover:opacity-80 mx-auto py-4 bg-[#7c5dfa] px-8 rounded-full '>
                            {type === 'edit' ? 'Update Invoice' : 'Save & Send'}
                        </button>
                    </div>
        </motion.div>
    </div>
  )
}

export default CreateInvoice
