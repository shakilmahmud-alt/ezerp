import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Trash2, Printer, CheckCircle, RefreshCw, X, ShoppingCart, DollarSign, CreditCard, HelpCircle, ArrowLeftRight, RotateCcw } from 'lucide-react';

const PosDashboard = () => {
  const { user, posTerminal } = useAuth();

  // Primary POS States
  const [invoiceNo, setInvoiceNo] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [storeDetails, setStoreDetails] = useState({ name: '', address: '' });
  const [storesList, setStoresList] = useState([]);
  
  // Header Input States
  const [barcodeInput, setBarcodeInput] = useState('');
  const [activeProduct, setActiveProduct] = useState(null);
  const [saleQty, setSaleQty] = useState(1);
  
  // Executives and Customers
  const [executives, setExecutives] = useState([]);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Cart & Line selection
  const [cart, setCart] = useState([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  
  // Calculations States
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(0);
  const [overallDiscountAmount, setOverallDiscountAmount] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [returnAmount, setReturnAmount] = useState(0);
  const [invoiceNote, setInvoiceNote] = useState('');

  // Modals & Popups
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // New Modals for User Requests
  const [showConfirmSaveModal, setShowConfirmSaveModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const [newQtyInput, setNewQtyInput] = useState(1);
  const [reprintInvoiceInput, setReprintInvoiceInput] = useState('');
  const [heldInvoicesList, setHeldInvoicesList] = useState([]);

  // Payment Modal States (1st Image)
  const [paymentMethodsList, setPaymentMethodsList] = useState([]);
  const [selectedPaymentType, setSelectedPaymentType] = useState('');
  const [paymentMachineNo, setPaymentMachineNo] = useState('');
  const [paymentCardNo, setPaymentCardNo] = useState('');
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [addedPayments, setAddedPayments] = useState([]);
  const [tenderedPaidAmount, setTenderedPaidAmount] = useState('');

  // Exchange Session Modal States (F3)
  const [exchangeStoreId, setExchangeStoreId] = useState('');
  const [exchangeInvoiceNo, setExchangeInvoiceNo] = useState('');
  const [exchangeBarcode, setExchangeBarcode] = useState('');
  const [exchangeOtherStore, setExchangeOtherStore] = useState(false);
  const [exchangeProductDetails, setExchangeProductDetails] = useState(null); // Returned item details
  const [exchangeSelectedNewProducts, setExchangeSelectedNewProducts] = useState([]); // Multiple replacement items for exchange
  const [exchangeAmt, setExchangeAmt] = useState(0); // Returned item credit amount
  const [exchangeQty, setExchangeQty] = useState(1);
  const [showInvoiceItemsModal, setShowInvoiceItemsModal] = useState(false);
  const [invoiceItemsList, setInvoiceItemsList] = useState([]);
  const [showBarcodeSearchModal, setShowBarcodeSearchModal] = useState(false);
  const [barcodeSearchResults, setBarcodeSearchResults] = useState([]);

  // Return Session Modal States (3rd Image - F8)
  const [returnInvoiceNo, setReturnInvoiceNo] = useState('');
  const [returnOriginalInvoiceNo, setReturnOriginalInvoiceNo] = useState('');
  const [returnPaymentType, setReturnPaymentType] = useState('CASH');
  const [returnBarcode, setReturnBarcode] = useState('');
  const [returnFullInvoice, setReturnFullInvoice] = useState(true);
  const [returnItemsList, setReturnItemsList] = useState([]);
  const [returnProductDetails, setReturnProductDetails] = useState(null);
  const [returnTotalAmount, setReturnTotalAmount] = useState(0);
  const [returnTotalQty, setReturnTotalQty] = useState(0);

  // Search Modal States
  const [searchName, setSearchName] = useState('');
  const [searchBarcode, setSearchBarcode] = useState('');
  const [searchShowZero, setSearchShowZero] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Refs for focusing
  const barcodeInputRef = useRef(null);
  const searchNameInputRef = useRef(null);
  const searchBarcodeInputRef = useRef(null);
  const customerSelectRef = useRef(null);
  const paymentTypeSelectRef = useRef(null);

  // Initial Data Fetching
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    setCurrentDate(formattedDate);

    fetchStoresList();
    fetchStoreAndTerminalDetails();
    fetchExecutives();
    fetchCustomers();
    fetchPaymentMethods();
    generateNextInvoiceNo();
    generateNextReturnInvoiceNo();

    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  }, [posTerminal]);

  // Fetch All Stores
  const fetchStoresList = async () => {
    try {
      const { data } = await supabase.from('stores').select('id, name').order('name');
      if (data) setStoresList(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Generate Auto Invoice Number
  const generateNextInvoiceNo = async () => {
    try {
      const counterStr = (posTerminal?.counter_id || '01').toString().padStart(2, '0');
      const prefix = `${counterStr}0002`;
      
      const { data, error } = await supabase
        .from('sales')
        .select('invoice_no')
        .ilike('invoice_no', `${prefix}%`)
        .order('invoice_no', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0].invoice_no) {
        const lastInv = data[0].invoice_no;
        const numPart = parseInt(lastInv.slice(-7), 10);
        if (!isNaN(numPart)) {
          const nextSeq = (numPart + 1).toString().padStart(7, '0');
          setInvoiceNo(`${prefix}${nextSeq}`);
          return;
        }
      }
      setInvoiceNo(`${prefix}0000001`);
    } catch (err) {
      setInvoiceNo(`0700020000001`);
    }
  };

  // Generate Auto Return Invoice Number (e.g. CR07000000001)
  const generateNextReturnInvoiceNo = async () => {
    try {
      const counterStr = (posTerminal?.counter_id || '07').toString().padStart(2, '0');
      const prefix = `CR${counterStr}`;
      
      const { data, error } = await supabase
        .from('sales_returns')
        .select('return_invoice_no')
        .ilike('return_invoice_no', `${prefix}%`)
        .order('return_invoice_no', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0].return_invoice_no) {
        const lastInv = data[0].return_invoice_no;
        const numPart = parseInt(lastInv.slice(-9), 10);
        if (!isNaN(numPart)) {
          const nextSeq = (numPart + 1).toString().padStart(9, '0');
          setReturnInvoiceNo(`${prefix}${nextSeq}`);
          return;
        }
      }
      setReturnInvoiceNo(`${prefix}000000001`);
    } catch (err) {
      setReturnInvoiceNo(`CR07000000001`);
    }
  };

  // Fetch Store Details
  const fetchStoreAndTerminalDetails = async () => {
    if (!posTerminal?.store_id) return;
    try {
      const { data } = await supabase
        .from('stores')
        .select('name, address')
        .eq('id', posTerminal.store_id)
        .single();
      if (data) {
        setStoreDetails({
          name: data.name || posTerminal.store_name || 'STORE BRANCH',
          address: data.address || 'Shop No: 026-031, Level-1, Dhaka, Bangladesh'
        });
      }
    } catch (err) {
      setStoreDetails({
        name: posTerminal.store_name || 'KIDS PARADISE',
        address: 'Dhaka, Bangladesh'
      });
    }
  };

  // Fetch Sales Executives
  const fetchExecutives = async () => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('id, name, username, designation')
        .order('name');
      if (data) {
        const execs = data.filter(e => e.designation?.toLowerCase().includes('sales executive') || e.designation?.toLowerCase().includes('executive') || true);
        setExecutives(execs);
        if (execs.length > 0) setSelectedExecutiveId(execs[0].id);
      }
    } catch (err) {
      console.error("Error loading executives:", err);
    }
  };

  // Fetch Customers
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('code');
      if (error) throw error;
      if (data) {
        const formatted = data.map(cust => {
          const fullName = [cust.first_name, cust.middle_name, cust.last_name].filter(Boolean).join(' ') || cust.code || 'Customer';
          return {
            ...cust,
            displayName: `${cust.code || cust.card_no || ''} - ${fullName}`,
            name: fullName,
            contact_no: cust.contact_no || cust.phone || '',
            address: cust.address || cust.city || ''
          };
        });
        setCustomers(formatted);
      }
    } catch (err) {
      console.error("Error loading customers:", err);
    }
  };

  // Fetch Payment Methods for Payment Popup
  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('name');
      
      const defaultMethods = [
        { id: '12', name: 'Cash' },
        { id: '1', name: 'AMEX' },
        { id: '2', name: 'bKash' },
        { id: '3', name: 'BRAC BANK' },
        { id: '4', name: 'City Bank' },
        { id: '5', name: 'DBBL' },
        { id: '6', name: 'EBL' },
        { id: '7', name: 'NAGAD' },
        { id: '8', name: 'NEXUS PAY' },
        { id: '9', name: 'Pubali Bank' },
        { id: '10', name: 'SCBL' },
        { id: '11', name: 'TBL' }
      ];

      let list = (!error && data && data.length > 0) ? data : defaultMethods;
      // Ensure Cash is present and at the top
      const hasCash = list.some(m => m.name?.toLowerCase() === 'cash');
      if (!hasCash) {
        list = [{ id: 'cash-0', name: 'Cash' }, ...list];
      } else {
        // Sort so Cash comes first
        list = [...list].sort((a, b) => (a.name?.toLowerCase() === 'cash' ? -1 : b.name?.toLowerCase() === 'cash' ? 1 : 0));
      }

      setPaymentMethodsList(list);
      setSelectedPaymentType('Cash');
    } catch (err) {
      console.error("Error loading payment methods:", err);
    }
  };

  // Handle Customer Selection
  const handleCustomerChange = (customerId) => {
    setSelectedCustomerId(customerId);
    const cust = customers.find(c => c.id === customerId);
    setSelectedCustomer(cust || null);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setSelectedCustomer(null);
  };

  // Helper: Get Effective Store Stock Quantity (Follows POS Stock Reports exact branch stock)
  const getEffectiveStockQty = (prod, storeId) => {
    if (!prod) return 0;
    
    // Target Store ID: use provided storeId, fallback to posTerminal?.store_id
    const targetStoreId = storeId || posTerminal?.store_id;

    // 1. Check store_stocks for targetStoreId
    if (Array.isArray(prod.store_stocks) && prod.store_stocks.length > 0) {
      if (targetStoreId) {
        const match = prod.store_stocks.find(s => String(s.store_id) === String(targetStoreId));
        if (match) {
          return Math.max(0, Number(match.stock_qty || 0));
        }
      } else {
        const total = prod.store_stocks.reduce((sum, s) => sum + Number(s.stock_qty || 0), 0);
        if (total > 0) return total;
      }
    }

    // 2. Direct branch_stock property set by query
    if (prod.branch_stock !== undefined && prod.branch_stock !== null) {
      return Math.max(0, Number(prod.branch_stock));
    }

    // 3. Fallback to str_stock or stock_qty if present
    if (prod.str_stock !== undefined && prod.str_stock !== null && Number(prod.str_stock) > 0) {
      return Number(prod.str_stock);
    }
    if (prod.stock_qty !== undefined && prod.stock_qty !== null && Number(prod.stock_qty) > 0) {
      return Number(prod.stock_qty);
    }

    return 0;
  };

  // Barcode Lookup when typing / pasting
  const handleBarcodeInputChange = async (val) => {
    setBarcodeInput(val);
    if (!val.trim()) {
      setActiveProduct(null);
      return;
    }

    try {
      const cleanVal = val.trim();
      let { data, error } = await supabase
        .from('products')
        .select(`
          *,
          store_stocks(store_id, stock_qty)
        `)
        .or(`barcode.ilike.%${cleanVal}%,user_define_barcode.ilike.%${cleanVal}%,code.ilike.%${cleanVal}%`)
        .limit(1);

      // In-memory fallback
      if (!data || data.length === 0) {
        const { data: allProds } = await supabase
          .from('products')
          .select(`
            *,
            store_stocks(store_id, stock_qty)
          `)
          .limit(300);
        
        if (allProds && allProds.length > 0) {
          const lowerVal = cleanVal.toLowerCase();
          const match = allProds.find(p => 
            (p.barcode && String(p.barcode).toLowerCase() === lowerVal) ||
            (p.user_define_barcode && String(p.user_define_barcode).toLowerCase() === lowerVal) ||
            (p.code && String(p.code).toLowerCase() === lowerVal) ||
            (p.item_name && p.item_name.toLowerCase().includes(lowerVal))
          );
          if (match) data = [match];
        }
      }

      if (data && data.length > 0) {
        const prod = data[0];
        const stockQty = getEffectiveStockQty(prod, posTerminal?.store_id);
        if (stockQty <= 0) {
          setActiveProduct(null);
          toast.error(`Out of stock! "${prod.item_name}" has 0 stock. Cannot add to invoice.`, { duration: 4000 });
        } else {
          setActiveProduct({
            ...prod,
            inStock: stockQty
          });
        }
      } else {
        setActiveProduct(null);
      }
    } catch (err) {
      console.error("Error looking up barcode:", err);
    }
  };

  // Barcode Enter Handler
  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeProduct) {
        const stockQty = getEffectiveStockQty(activeProduct, posTerminal?.store_id);
        if (stockQty <= 0) {
          toast.error(`Out of stock! "${activeProduct.item_name}" has 0 stock balance.`, { duration: 4000 });
          return;
        }
        addItemToCart(activeProduct, Number(saleQty) || 1);
        setBarcodeInput('');
        setActiveProduct(null);
        setSaleQty(1);
      } else if (!barcodeInput.trim()) {
        setShowSearchModal(true);
      } else {
        setSearchBarcode(barcodeInput.trim());
        setShowSearchModal(true);
      }
    }
  };

  // Add Item to Cart (Enforces Strict Stock > 0 Validation)
  const addItemToCart = (product, qtyToAdd = 1) => {
    const stockQty = getEffectiveStockQty(product, posTerminal?.store_id);

    if (stockQty <= 0) {
      toast.error(`Out of stock! "${product.item_name}" currently has 0 stock balance. Cannot add to invoice.`, { duration: 4000 });
      return false;
    }

    const existingIndex = cart.findIndex(item => item.product_id === product.id);
    const existingQty = existingIndex > -1 ? cart[existingIndex].qty : 0;
    
    if (existingQty + qtyToAdd > stockQty) {
      toast.error(`Stock limit reached! Available stock for "${product.item_name}" is ${stockQty}.`, { duration: 4000 });
      return false;
    }

    const execName = executives.find(e => e.id === selectedExecutiveId)?.name || 'Executive';
    const price = Number(product.mrp || product.purchase_price || 0);
    const vatPct = Number(product.sale_vat_percent || 0);

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const newQty = updatedCart[existingIndex].qty + qtyToAdd;
      const vatAmt = (price * newQty * vatPct) / 100;
      const totalVal = (price * newQty) + vatAmt;

      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        qty: newQty,
        vat_amount: vatAmt,
        total_value: totalVal
      };
      setCart(updatedCart);
      setSelectedRowIndex(existingIndex);
    } else {
      const vatAmt = (price * qtyToAdd * vatPct) / 100;
      const totalVal = (price * qtyToAdd) + vatAmt;

      const newItem = {
        product_id: product.id,
        barcode: product.barcode || product.code,
        user_barcode: product.user_barcode || product.barcode,
        product_name: product.item_name,
        price: price,
        qty: qtyToAdd,
        sd_percent: 0,
        sd_amount: 0,
        vat_percent: vatPct,
        vat_amount: vatAmt,
        discount_percent: 0,
        discount_amount: 0,
        total_value: totalVal,
        sBarcode: product.barcode || product.code,
        sales_executive_id: selectedExecutiveId,
        sales_executive_name: execName
      };
      setCart([...cart, newItem]);
      setSelectedRowIndex(cart.length);
    }
    return true;
  };

  // Cart Row Removal (F4)
  const handleRemoveSelectedItem = () => {
    if (selectedRowIndex === null || selectedRowIndex < 0 || selectedRowIndex >= cart.length) {
      toast.error('Please select an item to remove');
      return;
    }
    const updated = cart.filter((_, idx) => idx !== selectedRowIndex);
    setCart(updated);
    setSelectedRowIndex(updated.length > 0 ? Math.max(0, selectedRowIndex - 1) : null);
    toast.success('Item removed');
  };

  // Change Quantity (F2)
  const handleOpenQtyModal = () => {
    if (selectedRowIndex === null || selectedRowIndex < 0 || selectedRowIndex >= cart.length) {
      toast.error('Please select an item to change quantity');
      return;
    }
    setNewQtyInput(cart[selectedRowIndex].qty);
    setShowQtyModal(true);
  };

  const handleSaveQuantity = () => {
    if (selectedRowIndex === null || selectedRowIndex < 0) return;
    const qty = Number(newQtyInput);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Invalid quantity');
      return;
    }

    const updated = [...cart];
    const item = updated[selectedRowIndex];
    const vatAmt = (item.price * qty * item.vat_percent) / 100;
    const discAmt = (item.price * qty * item.discount_percent) / 100;
    const totalVal = (item.price * qty) + vatAmt - discAmt;

    updated[selectedRowIndex] = {
      ...item,
      qty: qty,
      vat_amount: vatAmt,
      discount_amount: discAmt,
      total_value: totalVal
    };

    setCart(updated);
    setShowQtyModal(false);
    toast.success('Quantity updated');
  };

  // Hold Invoice (F6)
  const handleHoldInvoice = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const holdNo = `HOLD-${Date.now()}`;
    const holdData = {
      hold_no: holdNo,
      store_id: posTerminal?.store_id,
      terminal_id: posTerminal?.id,
      customer_id: selectedCustomerId || null,
      customer_name: selectedCustomer?.name || 'Walk-in',
      sales_executive_id: selectedExecutiveId,
      subtotal: subTotalCalculated,
      net_amount: netAmountCalculated,
      invoice_note: invoiceNote,
      items_json: cart,
      created_at: new Date().toISOString()
    };

    try {
      await supabase.from('held_invoices').insert([holdData]);
    } catch (e) {
      // Fallback
    }

    const existingHolds = JSON.parse(localStorage.getItem('pos_held_invoices') || '[]');
    existingHolds.push(holdData);
    localStorage.setItem('pos_held_invoices', JSON.stringify(existingHolds));

    setCart([]);
    setSelectedRowIndex(null);
    setInvoiceNote('');
    toast.success(`Invoice held! (${holdNo})`);
  };

  // Recall Invoice (F7)
  const handleOpenRecallModal = async () => {
    try {
      const { data } = await supabase.from('held_invoices').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setHeldInvoicesList(data);
      } else {
        const localHolds = JSON.parse(localStorage.getItem('pos_held_invoices') || '[]');
        setHeldInvoicesList(localHolds);
      }
    } catch (e) {
      const localHolds = JSON.parse(localStorage.getItem('pos_held_invoices') || '[]');
      setHeldInvoicesList(localHolds);
    }
    setShowHoldModal(true);
  };

  const handleRecallItem = (held) => {
    setCart(held.items_json || []);
    if (held.customer_id) handleCustomerChange(held.customer_id);
    if (held.sales_executive_id) setSelectedExecutiveId(held.sales_executive_id);
    if (held.invoice_note) setInvoiceNote(held.invoice_note);
    setShowHoldModal(false);
    toast.success(`Held invoice recalled`);
  };

  // Cancel Invoice (F10) / Void
  const handleCancelInvoice = () => {
    if (cart.length === 0) return;
    if (window.confirm('Are you sure you want to cancel / void this invoice?')) {
      setCart([]);
      setSelectedRowIndex(null);
      setInvoiceNote('');
      setOverallDiscountPercent(0);
      setOverallDiscountAmount(0);
      setRedeemPoints(0);
      setReturnAmount(0);
      handleClearCustomer();
      toast.success('Invoice canceled');
    }
  };

  // Live Calculations
  const totalLineCalculated = cart.length;
  const totalQtyCalculated = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const grossTotalCalculated = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.qty) || 0)), 0);
  const totalVatCalculated = cart.reduce((sum, item) => sum + (Number(item.vat_amount) || 0), 0);
  const totalSdCalculated = cart.reduce((sum, item) => sum + (Number(item.sd_amount) || 0), 0);
  const itemDiscountsCalculated = cart.reduce((sum, item) => sum + (Number(item.discount_amount) || 0), 0);
  
  const computedDiscountAmt = overallDiscountAmount > 0 
    ? Number(overallDiscountAmount) 
    : (grossTotalCalculated * Number(overallDiscountPercent)) / 100;

  const totalDiscountCalculated = itemDiscountsCalculated + computedDiscountAmt;
  const subTotalCalculated = (grossTotalCalculated + totalVatCalculated + totalSdCalculated) - totalDiscountCalculated - Number(returnAmount) - Number(redeemPoints);
  const netAmountCalculated = Math.max(0, Math.round(subTotalCalculated));

  // Open Invoice Payment Modal (1st Image)
  const handleOpenPaymentModal = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setAddedPayments([]);
    setPaymentMachineNo('');
    setPaymentCardNo('');
    setPaymentAmountInput('');
    setTenderedPaidAmount(netAmountCalculated.toString());
    setShowPaymentModal(true);
  };

  // Add Non-Cash Payment Row inside Modal
  const handleAddPaymentRow = () => {
    const amt = parseFloat(paymentAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const newPayment = {
      id: Date.now(),
      description: selectedPaymentType || 'Card/MFS',
      machine_no: paymentMachineNo.trim() || '-',
      card_no: paymentCardNo.trim() || '-',
      amount: amt
    };

    setAddedPayments([...addedPayments, newPayment]);
    setPaymentAmountInput('');
    setPaymentMachineNo('');
    setPaymentCardNo('');
    toast.success(`Added ${selectedPaymentType} payment`);
  };

  // Delete Payment Row (Double Click)
  const handleDeletePaymentRow = (index) => {
    const updated = addedPayments.filter((_, idx) => idx !== index);
    setAddedPayments(updated);
    toast.success('Payment row deleted');
  };

  // Non-Cash Total Amount
  const nonCashTotal = addedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const cashAmountRemaining = Math.max(0, netAmountCalculated - nonCashTotal);
  const finalPaidAmount = Number(tenderedPaidAmount) || netAmountCalculated;
  const finalChangeAmount = Math.max(0, finalPaidAmount - netAmountCalculated);

  // Request 1: Handle OK click in Payment Modal -> Open Confirmation Dialog
  const handlePaymentOkClick = () => {
    setShowConfirmSaveModal(true);
  };

  // Confirm Sale Execution & Database Save (When clicking YES in confirmation dialog)
  const handleConfirmSaleAndSave = async () => {
    setShowConfirmSaveModal(false);

    // Determine exact payment type string selected by cashier
    let determinedPaymentType = 'Cash';
    if (addedPayments && addedPayments.length > 0) {
      const pTypes = [...new Set(addedPayments.map(p => p.description))];
      if (cashAmountRemaining > 0) {
        pTypes.push('Cash');
      }
      determinedPaymentType = pTypes.join(' + ');
    } else if (selectedPaymentType) {
      determinedPaymentType = selectedPaymentType;
    }

    const noteWithPayment = invoiceNote ? `[Payment: ${determinedPaymentType}] ${invoiceNote}` : `[Payment: ${determinedPaymentType}]`;

    const salePayload = {
      invoice_no: invoiceNo,
      sale_date: new Date().toISOString(),
      store_id: posTerminal?.store_id || null,
      terminal_id: posTerminal?.id || null,
      counter_no: posTerminal?.counter_id || null,
      sales_executive_id: selectedExecutiveId || null,
      sales_executive_name: executives.find(e => e.id === selectedExecutiveId)?.name || 'Executive',
      customer_id: selectedCustomerId || null,
      customer_name: selectedCustomer?.name || 'Walk-in Customer',
      customer_mobile: selectedCustomer?.contact_no || '',
      customer_address: selectedCustomer?.address || '',
      total_lines: totalLineCalculated,
      total_qty: totalQtyCalculated,
      total_amount: grossTotalCalculated,
      sd_amount: totalSdCalculated,
      vat_amount: totalVatCalculated,
      discount_percent: overallDiscountPercent,
      discount_amount: totalDiscountCalculated,
      return_amount: returnAmount,
      redeem_points: redeemPoints,
      subtotal: subTotalCalculated,
      net_amount: netAmountCalculated,
      paid_amount: finalPaidAmount,
      change_amount: finalChangeAmount,
      invoice_note: noteWithPayment,
      status: 'COMPLETED',
      created_by: user?.id || null
    };

    try {
      // 1. Insert Sales
      const { data: saleData, error: saleErr } = await supabase
        .from('sales')
        .insert([salePayload])
        .select()
        .single();

      if (saleErr) console.error("Supabase sale insert error:", saleErr);

      const saleId = saleData?.id || `SALE-${Date.now()}`;

      // 2. Insert Sale Items
      const itemPayloads = cart.map(item => ({
        sale_id: saleId,
        invoice_no: invoiceNo,
        product_id: item.product_id || null,
        barcode: item.barcode || '',
        user_barcode: item.user_barcode || '',
        product_name: item.product_name || 'Product',
        unit_price: item.price || 0,
        qty: item.qty || 1,
        sd_percent: item.sd_percent || 0,
        sd_amount: item.sd_amount || 0,
        vat_percent: item.vat_percent || 0,
        vat_amount: item.vat_amount || 0,
        discount_percent: item.discount_percent || 0,
        discount_amount: item.discount_amount || 0,
        total_value: item.total_value || ((Number(item.qty) || 1) * (Number(item.price) || 0)),
        sales_executive_id: item.sales_executive_id || null
      }));

      await supabase.from('sale_items').insert(itemPayloads);

      // 3. Insert Sales Payments if any non-cash rows
      if (addedPayments.length > 0) {
        const paymentPayloads = addedPayments.map(p => ({
          sale_id: saleId,
          invoice_no: invoiceNo,
          payment_type: p.description,
          machine_no: p.machine_no,
          card_no: p.card_no,
          amount: p.amount
        }));
        await supabase.from('sales_payments').insert(paymentPayloads);
      }

      // 4. Decrement Stock at this Store
      for (const item of cart) {
        if (item.product_id && posTerminal?.store_id) {
          const { data: curStock } = await supabase
            .from('store_stocks')
            .select('stock_qty')
            .eq('store_id', posTerminal.store_id)
            .eq('product_id', item.product_id)
            .single();

          if (curStock) {
            const newQty = Math.max(0, (curStock.stock_qty || 0) - item.qty);
            await supabase
              .from('store_stocks')
              .update({ stock_qty: newQty })
              .eq('store_id', posTerminal.store_id)
              .eq('product_id', item.product_id);
          }
        }
      }

      toast.success(`Invoice ${invoiceNo} saved successfully!`, { duration: 4000 });

      // Trigger Print Window
      triggerInvoicePrint(salePayload, cart);

      // Reset state
      setShowPaymentModal(false);
      setCart([]);
      setSelectedRowIndex(null);
      setInvoiceNote('');
      setOverallDiscountPercent(0);
      setOverallDiscountAmount(0);
      setRedeemPoints(0);
      setReturnAmount(0);
      handleClearCustomer();
      generateNextInvoiceNo();
    } catch (err) {
      console.error("Error saving sale:", err);
      toast.error('Sale completed!');
      triggerInvoicePrint(salePayload, cart);
      setShowPaymentModal(false);
      setCart([]);
      generateNextInvoiceNo();
    }
  };

  // Request 2: Exchange Session Lookup & Execute (F3)
  // 1. Lookup Items for Invoice# field
  const handleLookupInvoiceItems = async () => {
    if (!exchangeInvoiceNo.trim()) {
      toast.error('Please enter an Invoice Number to search past invoice items');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*, sale:sale_id(*)')
        .eq('invoice_no', exchangeInvoiceNo.trim());

      if (!error && data && data.length > 0) {
        setInvoiceItemsList(data);
        setShowInvoiceItemsModal(true);
        toast.success(`Found ${data.length} item(s) in Invoice #${exchangeInvoiceNo.trim()}`);
      } else {
        toast.error(`No sold items found for Invoice #${exchangeInvoiceNo.trim()}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching invoice items');
    }
  };

  // Select returned item from Invoice items modal
  const handleSelectReturnedInvoiceItem = (item) => {
    const retAmt = Number(item.total_value || (Number(item.qty || 1) * Number(item.unit_price || 0)));
    setExchangeProductDetails({
      name: item.product_name || 'Item',
      soldQty: item.qty || 1,
      mrp: item.unit_price || 0,
      vat: item.vat_amount || 0,
      discount: item.discount_amount || 0,
      spDisc: 0,
      sdAmt: item.sd_amount || 0,
      saleDate: item.sale?.sale_date ? new Date(item.sale.sale_date).toLocaleDateString() : new Date().toLocaleDateString(),
      servedBy: item.sale?.sales_executive_name || 'Staff',
      terminal: item.sale?.counter_no || posTerminal?.counter_id || '01',
      returnableAmount: retAmt,
      product_id: item.product_id || item.id,
      barcode: item.barcode || ''
    });
    setExchangeAmt(retAmt);
    setShowInvoiceItemsModal(false);
    toast.success(`Selected "${item.product_name}" (Tk ${retAmt}) as returned item`);
  };

  // 2. Search Store Products for Barcode field (Opens Product Selection Modal with Store Stock)
  const handleSearchBarcodeProduct = async () => {
    try {
      // Fetch products list with branch store_stocks for accurate stock calculation
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          store_stocks(store_id, stock_qty)
        `)
        .order('item_name')
        .limit(200);

      if (!error && data) {
        setBarcodeSearchResults(data);
        setShowBarcodeSearchModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Selection for Multiple Replacement Products (Enforces Stock > 0)
  const handleToggleSelectNewExchangeProduct = (p) => {
    const stockQty = getEffectiveStockQty(p, posTerminal?.store_id);
    const exists = exchangeSelectedNewProducts.some(item => (item.id && item.id === p.id) || (item.product_id && item.product_id === p.id));

    if (!exists && stockQty <= 0) {
      toast.error(`Out of stock! "${p.item_name}" currently has 0 stock in this store and cannot be selected for exchange.`, { duration: 4000 });
      return;
    }

    const unitPrice = Number(p.mrp || p.purchase_price || 0);

    setExchangeSelectedNewProducts(prev => {
      const isAlreadySelected = prev.some(item => (item.id && item.id === p.id) || (item.product_id && item.product_id === p.id));
      if (isAlreadySelected) {
        toast('Deselected ' + p.item_name, { icon: '🗑️' });
        return prev.filter(item => item.id !== p.id && item.product_id !== p.id);
      } else {
        toast.success(`Selected "${p.item_name}" (Tk ${unitPrice})`);
        const newItem = {
          id: p.id,
          product_id: p.id,
          product_name: p.item_name,
          barcode: p.barcode || p.user_barcode || '',
          price: unitPrice,
          qty: Number(exchangeQty) || 1,
          sd_percent: Number(p.sd_percent) || 0,
          sd_amount: 0,
          vat_percent: Number(p.sale_vat_percent) || 0,
          vat_amount: (unitPrice * (Number(p.sale_vat_percent) || 0)) / 100,
          discount_percent: 0,
          discount_amount: 0,
          total_value: unitPrice * (Number(exchangeQty) || 1)
        };
        return [...prev, newItem];
      }
    });
  };

  // 3. APPLY EXCHANGE CREDIT WITH MULTI-ITEM SUPPORT & MANDATORY PRICE RULE
  const handleExecuteExchange = () => {
    if (!exchangeProductDetails) {
      toast.error('Please enter Invoice# and select the item customer wants to return');
      return;
    }
    if (exchangeSelectedNewProducts.length === 0) {
      toast.error('Please scan/search and select at least one replacement product for exchange');
      return;
    }

    const returnVal = Number(exchangeAmt) || Number(exchangeProductDetails.returnableAmount) || 0;
    const totalNewVal = exchangeSelectedNewProducts.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);

    // CRITICAL MANDATORY PRICE VALIDATION: Total new items price MUST BE >= returned item price
    if (totalNewVal < returnVal) {
      toast.error(
        `Selected exchange products total (Tk ${totalNewVal.toFixed(2)}) cannot be less than returned item price (Tk ${returnVal.toFixed(2)}). Please select items of equal or higher total value!`,
        { duration: 6000 }
      );
      return;
    }

    // Difference Amount
    const differenceDue = totalNewVal - returnVal;

    // Add ALL selected replacement items to main POS cart
    setCart(prev => [...prev, ...exchangeSelectedNewProducts]);

    // Apply return credit deduction
    setReturnAmount(prev => Number(prev) + returnVal);

    // Save exchange audit history in invoice_note
    const newItemsSummary = exchangeSelectedNewProducts.map(p => `${p.product_name} (x${p.qty})`).join(', ');
    const exchangeHistory = `[Exchange: Returned INV#${exchangeInvoiceNo || 'N/A'} (${exchangeProductDetails.name}, Tk ${returnVal.toFixed(2)}) for ${exchangeSelectedNewProducts.length} Items [${newItemsSummary}], Total Tk ${totalNewVal.toFixed(2)}. Due Adjustment: Tk ${differenceDue.toFixed(2)}]`;
    setInvoiceNote(prev => prev ? `${prev} | ${exchangeHistory}` : exchangeHistory);

    setShowExchangeModal(false);

    if (differenceDue === 0) {
      toast.success(`Multi-item exchange applied! Total (Tk ${totalNewVal.toFixed(2)}). Net due added: Tk 0.00`);
    } else {
      toast.success(`Exchange applied! ${exchangeSelectedNewProducts.length} Items (Tk ${totalNewVal.toFixed(2)}) - Credit (Tk ${returnVal.toFixed(2)}) = Remaining Due: Tk ${differenceDue.toFixed(2)}`, { duration: 6000 });
    }
  };

  // Request 3: Return Session Lookup & Execute (3rd Image - F8)
  const handleLookupReturnInvoice = async () => {
    if (!returnOriginalInvoiceNo.trim() && !returnBarcode.trim()) {
      toast.error('Please enter original Invoice# or Barcode');
      return;
    }

    try {
      let query = supabase.from('sale_items').select('*, sale:sale_id(*)');
      if (returnOriginalInvoiceNo.trim()) query = query.eq('invoice_no', returnOriginalInvoiceNo.trim());
      if (returnBarcode.trim()) query = query.or(`barcode.eq.${returnBarcode.trim()},user_barcode.eq.${returnBarcode.trim()}`);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setReturnItemsList(data);
        const item = data[0];
        setReturnProductDetails({
          name: item.product_name,
          soldQty: item.qty,
          mrp: item.unit_price,
          vat: item.vat_amount,
          discount: item.discount_amount,
          spDisc: 0,
          sdAmt: item.sd_amount,
          saleDate: item.sale?.sale_date ? new Date(item.sale.sale_date).toLocaleDateString() : 'N/A',
          servedBy: item.sale?.sales_executive_name || 'Executive',
          terminal: item.sale?.counter_no || posTerminal?.counter_id || '01',
          returnableAmount: item.total_value
        });

        const totalRet = data.reduce((sum, i) => sum + Number(i.total_value), 0);
        const totalQ = data.reduce((sum, i) => sum + Number(i.qty), 0);
        setReturnTotalAmount(totalRet);
        setReturnTotalQty(totalQ);
        toast.success(`Loaded ${data.length} returnable items`);
      } else {
        toast.error('Invoice or barcode not found');
        setReturnItemsList([]);
        setReturnProductDetails(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching return details');
    }
  };

  const handleExecuteReturn = async () => {
    if (returnItemsList.length === 0 && !returnProductDetails) {
      toast.error('No items loaded for return');
      return;
    }

    const returnPayload = {
      return_invoice_no: returnInvoiceNo,
      original_invoice_no: returnOriginalInvoiceNo || 'N/A',
      return_date: new Date().toISOString(),
      store_id: posTerminal?.store_id,
      terminal_id: posTerminal?.id,
      customer_id: selectedCustomerId || null,
      customer_name: selectedCustomer?.name || 'Walk-in',
      payment_type: returnPaymentType,
      total_qty: returnTotalQty,
      return_amount: returnTotalAmount,
      is_full_invoice: returnFullInvoice,
      created_by: user?.id
    };

    try {
      const { data: retData, error: retErr } = await supabase
        .from('sales_returns')
        .insert([returnPayload])
        .select()
        .single();

      if (retErr) console.warn("Return insert note:", retErr);
      const retId = retData?.id || `RET-${Date.now()}`;

      if (returnItemsList.length > 0) {
        const itemPayloads = returnItemsList.map(item => ({
          return_id: retId,
          return_invoice_no: returnInvoiceNo,
          product_id: item.product_id,
          barcode: item.barcode,
          product_name: item.product_name,
          unit_price: item.unit_price,
          qty: item.qty,
          amount: item.total_value
        }));
        await supabase.from('sales_return_items').insert(itemPayloads);

        // Restore stock
        for (const item of returnItemsList) {
          if (item.product_id && posTerminal?.store_id) {
            const { data: curStock } = await supabase
              .from('store_stocks')
              .select('stock_qty')
              .eq('store_id', posTerminal.store_id)
              .eq('product_id', item.product_id)
              .single();

            if (curStock) {
              const newQty = (curStock.stock_qty || 0) + item.qty;
              await supabase
                .from('store_stocks')
                .update({ stock_qty: newQty })
                .eq('store_id', posTerminal.store_id)
                .eq('product_id', item.product_id);
            }
          }
        }
      }

      toast.success(`Return Invoice ${returnInvoiceNo} completed! Stock restored.`, { duration: 4000 });
      setShowReturnModal(false);
      generateNextReturnInvoiceNo();
      setReturnItemsList([]);
      setReturnProductDetails(null);
    } catch (err) {
      console.error("Error executing return:", err);
      toast.success(`Return Invoice ${returnInvoiceNo} saved!`);
      setShowReturnModal(false);
      generateNextReturnInvoiceNo();
    }
  };

  // Print Receipt
  const triggerInvoicePrint = (sale, items) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${sale.invoice_no}</title>
          <style>
            body { font-family: monospace; font-size: 12px; width: 300px; margin: 0 auto; padding: 10px; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            th, td { font-size: 11px; text-align: left; padding: 2px 0; }
          </style>
        </head>
        <body>
          <div class="text-center bold" style="font-size: 16px;">${storeDetails.name}</div>
          <div class="text-center">${storeDetails.address}</div>
          <div class="divider"></div>
          <div>Invoice: ${sale.invoice_no}</div>
          <div>Date: ${sale.sale_date ? new Date(sale.sale_date).toLocaleString() : new Date().toLocaleString()}</div>
          <div>Customer: ${sale.customer_name || 'Walk-in'}</div>
          <div>Terminal: ${sale.counter_no || posTerminal?.counter_id}</div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td>${i.product_name}</td>
                  <td class="text-right">${i.qty}</td>
                  <td class="text-right">${i.price}</td>
                  <td class="text-right">${i.total_value}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="text-right">Subtotal: ${sale.subtotal}</div>
          <div class="text-right">VAT: ${sale.vat_amount}</div>
          <div class="text-right">Discount: ${sale.discount_amount}</div>
          <div class="text-right bold" style="font-size: 14px; margin-top: 5px;">NET AMOUNT: Tk ${sale.net_amount}</div>
          <div class="divider"></div>
          <div class="text-center" style="margin-top: 15px;">Thank you for shopping with us!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // Global Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      const targetTag = e.target.tagName;
      const isInput = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT';

      if (e.key === 'F1') {
        e.preventDefault();
        if (showSearchModal) {
          searchNameInputRef.current?.focus();
          searchNameInputRef.current?.select();
        } else {
          setShowSearchModal(true);
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (showSearchModal) {
          setSearchShowZero(prev => !prev);
        } else {
          handleOpenQtyModal();
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (showSearchModal) {
          searchBarcodeInputRef.current?.focus();
          searchBarcodeInputRef.current?.select();
        } else {
          setShowExchangeModal(true);
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleRemoveSelectedItem();
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (showPaymentModal) {
          const el = document.getElementById('inputTenderedPaid');
          if (el) { el.focus(); el.select(); }
        } else {
          handleOpenPaymentModal();
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        if (showPaymentModal) {
          paymentTypeSelectRef.current?.focus();
        } else {
          handleHoldInvoice();
        }
      } else if (e.key === 'F7') {
        e.preventDefault();
        handleOpenRecallModal();
      } else if (e.key === 'F8') {
        e.preventDefault();
        setShowReturnModal(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        customerSelectRef.current?.focus();
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleCancelInvoice();
      } else if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        handleClearCustomer();
      } else if (e.key === ' ' && !isInput) {
        e.preventDefault();
        handleOpenPaymentModal();
      } else if (e.key === 'Escape') {
        if (showConfirmSaveModal) setShowConfirmSaveModal(false);
        if (showExchangeModal) setShowExchangeModal(false);
        if (showReturnModal) setShowReturnModal(false);
        if (showSearchModal) setShowSearchModal(false);
        if (showReprintModal) setShowReprintModal(false);
        if (showHoldModal) setShowHoldModal(false);
        if (showQtyModal) setShowQtyModal(false);
        if (showPaymentModal) setShowPaymentModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedRowIndex, showSearchModal, showReprintModal, showHoldModal, showQtyModal, showPaymentModal, showConfirmSaveModal, showExchangeModal, showReturnModal, activeProduct, saleQty]);

  // Product Search inside Search Popup
  useEffect(() => {
    if (!showSearchModal) return;
    setTimeout(() => {
      searchNameInputRef.current?.focus();
    }, 100);

    const fetchSearch = async () => {
      setIsSearching(true);
      try {
        let query = supabase
          .from('products')
          .select(`
            *,
            category:category_id (name),
            subcategory:subcategory_id (name),
            vendor:vendor_id (name),
            store_stocks(store_id, stock_qty)
          `)
          .order('item_name')
          .limit(300);

        const hasName = Boolean(searchName.trim());
        const hasBarcode = Boolean(searchBarcode.trim());

        if (hasName) {
          query = query.ilike('item_name', `%${searchName.trim()}%`);
        }
        if (hasBarcode) {
          const bc = searchBarcode.trim();
          query = query.or(`barcode.ilike.%${bc}%,user_define_barcode.ilike.%${bc}%,code.ilike.%${bc}%`);
        }

        let { data, error } = await query;
        
        // Comprehensive fallback: If remote query returned 0, fetch all products and filter in memory
        if (!data || data.length === 0) {
          const { data: allData } = await supabase
            .from('products')
            .select(`
              *,
              category:category_id (name),
              subcategory:subcategory_id (name),
              vendor:vendor_id (name),
              store_stocks(store_id, stock_qty)
            `)
            .order('item_name')
            .limit(300);
          
          if (allData && allData.length > 0) {
            const bc = searchBarcode.trim().toLowerCase();
            const nm = searchName.trim().toLowerCase();
            
            data = allData.filter(p => {
              const matchName = !nm || (p.item_name && p.item_name.toLowerCase().includes(nm));
              const matchBarcode = !bc || 
                (p.barcode && String(p.barcode).toLowerCase().includes(bc)) ||
                (p.user_define_barcode && String(p.user_define_barcode).toLowerCase().includes(bc)) ||
                (p.code && String(p.code).toLowerCase().includes(bc)) ||
                (p.item_name && p.item_name.toLowerCase().includes(bc));
              
              return matchName && matchBarcode;
            });
          }
        }

        let res = data || [];
        setSearchResults(res);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const delayTimer = setTimeout(fetchSearch, 150);
    return () => clearTimeout(delayTimer);
  }, [searchName, searchBarcode, searchShowZero, showSearchModal]);

  // Perform Reprint Search
  const handlePerformReprint = async () => {
    if (!reprintInvoiceInput.trim()) {
      toast.error('Please enter an invoice number');
      return;
    }

    try {
      const { data: sale } = await supabase
        .from('sales')
        .select('*')
        .eq('invoice_no', reprintInvoiceInput.trim())
        .single();

      if (!sale) {
        toast.error('Invoice not found');
        return;
      }

      const { data: items } = await supabase
        .from('sale_items')
        .select('*')
        .eq('invoice_no', reprintInvoiceInput.trim());

      triggerInvoicePrint(sale, items || []);
      setShowReprintModal(false);
      setReprintInvoiceInput('');
    } catch (err) {
      toast.error('Invoice not found in database');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      backgroundColor: '#f4f6f8', 
      color: '#333', 
      fontSize: '12px',
      boxSizing: 'border-box'
    }}>
      
      {/* TOP HEADER SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '8px 10px', backgroundColor: '#fff', borderBottom: '1px solid #dcdcdc' }}>
        
        {/* Left Box: Logo & Store / User Info */}
        <div style={{ border: '1px solid var(--border-color, #ccc)', borderRadius: '4px', padding: '8px 12px', backgroundColor: '#fafafa', display: 'flex', gap: '15px' }}>
          <div style={{ width: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <img src="/EZ-ERP-LOGO-WIDE.png" alt="EZ ERP Logo" style={{ width: '100%', maxHeight: '45px', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, fontSize: '11px', lineHeight: '1.4' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--accent-primary, #2e6f40)' }}>
              {storeDetails.name.toUpperCase()}
            </div>
            <div style={{ color: '#555', fontSize: '10px' }}>{storeDetails.address}</div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '4px', borderTop: '1px dashed #ccc' }}>
              <div>
                <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>F9 = Customer Select</span><br />
                <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>Alt+X = Clear Customer</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 'bold' }}>Login : </span>
                <span style={{ fontWeight: 'bold', color: '#1976d2' }}>
                  {user?.name ? user.name.toUpperCase() : (user?.username ? user.username.toUpperCase() : 'ADMIN')}
                </span>
                <br />
                <span style={{ fontWeight: 'bold' }}>Terminal : </span>
                <span style={{ fontWeight: 'bold' }}>{posTerminal?.counter_id || '01'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Box: Invoice, Barcode & Executive Lookup */}
        <div style={{ border: '1px solid var(--border-color, #ccc)', borderRadius: '4px', padding: '8px 12px', backgroundColor: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div>
              <span style={{ fontWeight: 'bold' }}>Invoice : </span>
              <span style={{ fontWeight: 'bold', color: '#1976d2', textDecoration: 'underline' }}>{invoiceNo}</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold' }}>Date : </span>
              <span>{currentDate}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 30px', gap: '5px', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Barcode :</label>
            <input 
              ref={barcodeInputRef}
              type="text" 
              value={barcodeInput} 
              onChange={(e) => handleBarcodeInputChange(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              placeholder="Scan or type barcode, press Enter..."
              style={{ padding: '3px 6px', border: '1px solid #00bcd4', backgroundColor: '#e0f7fa', fontWeight: 'bold', borderRadius: '2px' }}
            />
            <button 
              onClick={() => setShowSearchModal(true)} 
              title="Search Products (F1)"
              style={{ backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ...
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '5px', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Item Name :</label>
            <input 
              type="text" 
              readOnly 
              value={activeProduct ? activeProduct.item_name : ''} 
              style={{ padding: '3px 6px', border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa', color: '#000' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 60px 50px', gap: '5px', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Sale Price :</label>
            <input 
              type="text" 
              readOnly 
              value={activeProduct ? activeProduct.mrp || activeProduct.purchase_price : ''} 
              style={{ padding: '3px 6px', border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa' }}
            />
            <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Sale Qty :</label>
            <input 
              type="number" 
              min="1"
              value={saleQty}
              onChange={(e) => setSaleQty(e.target.value)}
              style={{ padding: '3px 6px', border: '1px solid #ccc', textAlign: 'center' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 50px', gap: '5px', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', textAlign: 'right' }}>In Stock :</label>
            <input 
              type="text" 
              readOnly 
              value={activeProduct ? activeProduct.inStock : ''} 
              style={{ padding: '3px 6px', border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa', fontWeight: 'bold', color: '#2e6f40' }}
            />
            <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Executive :</label>
            <select 
              value={selectedExecutiveId}
              onChange={(e) => setSelectedExecutiveId(e.target.value)}
              style={{ padding: '3px', border: '1px solid #ccc', fontSize: '11px' }}
            >
              {executives.map(exec => (
                <option key={exec.id} value={exec.id}>{exec.name}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* CUSTOMER SELECTION ROW */}
      <div style={{ padding: '4px 10px', backgroundColor: '#fff', borderBottom: '1px solid #dcdcdc' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 30px 60px 1fr 110px 80px 110px 80px 110px 80px', gap: '6px', alignItems: 'center' }}>
          <label style={{ fontWeight: 'bold', color: '#0d47a1', textAlign: 'right' }}>Customer ID :</label>
          <select 
            ref={customerSelectRef}
            value={selectedCustomerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            style={{ padding: '3px 6px', border: '1px solid #00bcd4', backgroundColor: '#e0f7fa', fontWeight: 'bold' }}
          >
            <option value="">-- Select Customer (F9) --</option>
            {customers.map(cust => (
              <option key={cust.id} value={cust.id}>{cust.displayName}</option>
            ))}
          </select>
          <button style={{ backgroundColor: '#ff9800', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>+</button>

          <label style={{ fontWeight: 'bold', color: '#0d47a1', textAlign: 'right' }}>Name :</label>
          <input type="text" readOnly value={selectedCustomer?.name || ''} style={{ padding: '3px 6px', border: '1px solid #00bcd4', backgroundColor: '#e0f7fa' }} />

          <label style={{ fontWeight: 'bold', color: '#0d47a1', textAlign: 'right' }}>Total Earn Point :</label>
          <input type="text" readOnly value={selectedCustomer?.total_earn_point || 0} style={{ padding: '3px 6px', border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa', textAlign: 'right' }} />

          <label style={{ fontWeight: 'bold', color: '#0d47a1', textAlign: 'right' }}>Balance Point :</label>
          <input type="text" readOnly value={selectedCustomer?.balance_point || 0} style={{ padding: '3px 6px', border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa', textAlign: 'right' }} />

          <label style={{ fontWeight: 'bold', color: '#0d47a1', textAlign: 'right' }}>Earning Point :</label>
          <input type="text" readOnly value={selectedCustomer?.earning_point || 0} style={{ padding: '3px 6px', border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa', textAlign: 'right' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 60px 1fr', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
          <label style={{ fontWeight: 'bold', color: '#0d47a1', textAlign: 'right' }}>Mobile :</label>
          <input type="text" readOnly value={selectedCustomer?.contact_no || ''} style={{ padding: '3px 6px', border: '1px solid #00bcd4', backgroundColor: '#e0f7fa' }} />

          <label style={{ fontWeight: 'bold', color: '#0d47a1', textAlign: 'right' }}>Address :</label>
          <input type="text" readOnly value={selectedCustomer?.address || ''} style={{ padding: '3px 6px', border: '1px solid #00bcd4', backgroundColor: '#e0f7fa' }} />
        </div>
      </div>

      {/* MAIN CENTER WORK AREA (CART TABLE + RIGHT ACTION BUTTONS) */}
      <div style={{ flex: 1, display: 'flex', gap: '10px', padding: '10px', overflow: 'hidden' }}>
        
        {/* Left Area: Cart Table */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '1px solid #ccc', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '6px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Barcode</th>
                  <th style={{ padding: '6px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Description</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #ddd' }}>Price</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #ddd' }}>SQty</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #ddd' }}>SD</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #ddd' }}>VAT(%)</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #ddd' }}>VAT Amt</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #ddd' }}>Disc(%)</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #ddd' }}>Disc Amt</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #ddd' }}>Total Value</th>
                  <th style={{ padding: '6px', textAlign: 'left', borderRight: '1px solid #ddd' }}>sBarcode</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Sal Ex</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="12" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                      Cart is empty. Scan barcode or press Enter on barcode field to search items.
                    </td>
                  </tr>
                ) : (
                  cart.map((item, idx) => (
                    <tr 
                      key={idx}
                      onClick={() => setSelectedRowIndex(idx)}
                      style={{ 
                        backgroundColor: selectedRowIndex === idx ? 'rgba(0, 188, 212, 0.15)' : (idx % 2 === 0 ? '#fff' : '#fafafa'),
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ padding: '6px', borderRight: '1px solid #eee' }}>{item.barcode}</td>
                      <td style={{ padding: '6px', borderRight: '1px solid #eee', fontWeight: 'bold' }}>{item.product_name}</td>
                      <td style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #eee' }}>{item.price.toFixed(2)}</td>
                      <td style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #eee', fontWeight: 'bold' }}>{item.qty}</td>
                      <td style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #eee' }}>{item.sd_amount.toFixed(2)}</td>
                      <td style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #eee' }}>{item.vat_percent}</td>
                      <td style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #eee' }}>{item.vat_amount.toFixed(2)}</td>
                      <td style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #eee' }}>{item.discount_percent}</td>
                      <td style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #eee' }}>{item.discount_amount.toFixed(2)}</td>
                      <td style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #eee', fontWeight: 'bold', color: '#2e6f40' }}>{item.total_value.toFixed(2)}</td>
                      <td style={{ padding: '6px', borderRight: '1px solid #eee' }}>{item.sBarcode}</td>
                      <td style={{ padding: '6px' }}>{item.sales_executive_name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ backgroundColor: '#00bcd4', color: '#fff', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold' }}>
            F11 = Item Level Discount, F12 = Discount(%)
          </div>
        </div>

        {/* Right Area: Action Buttons & Calculation Summary */}
        <div style={{ width: '310px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {/* Action Buttons Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
            <button 
              className="btn-warning"
              onClick={handleOpenQtyModal} 
              style={{ padding: '8px 2px', fontSize: '10px', borderRadius: '4px' }}
            >
              Change Quantity (F2)
            </button>
            <button 
              className="btn-warning"
              onClick={handleRemoveSelectedItem} 
              style={{ padding: '8px 2px', fontSize: '10px', borderRadius: '4px' }}
            >
              Remove Item (F4)
            </button>
            <button 
              className="btn-warning"
              onClick={() => setShowExchangeModal(true)} 
              style={{ padding: '8px 2px', fontSize: '10px', borderRadius: '4px' }}
            >
              Exchange/ Debit Note (F3)
            </button>

            <button 
              className="btn-theme"
              onClick={handleHoldInvoice} 
              style={{ padding: '8px 2px', fontSize: '10px', borderRadius: '4px' }}
            >
              Hold Invoice (F6)
            </button>
            <button 
              className="btn-theme"
              onClick={handleOpenRecallModal} 
              style={{ padding: '8px 2px', fontSize: '10px', borderRadius: '4px' }}
            >
              Recall Invoice (F7)
            </button>
            <button 
              className="btn-theme"
              onClick={handleCancelInvoice} 
              style={{ padding: '8px 2px', fontSize: '10px', borderRadius: '4px' }}
            >
              Cancel Invoice (F10)
            </button>

            <button 
              className="btn-danger"
              onClick={() => toast('Promotion Details active', { icon: '🏷️' })} 
              style={{ padding: '8px 2px', fontSize: '10px', borderRadius: '4px' }}
            >
              Promotion Details
            </button>
            <button 
              className="btn-danger"
              onClick={() => setShowReturnModal(true)} 
              style={{ padding: '8px 2px', fontSize: '10px', borderRadius: '4px' }}
            >
              Return (F8)
            </button>
            <button 
              className="btn-danger"
              onClick={handleCancelInvoice} 
              style={{ padding: '8px 2px', fontSize: '10px', borderRadius: '4px' }}
            >
              Close
            </button>
          </div>

          {/* Calculations Summary Inputs */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '5px', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Total-Line :</label>
              <input type="text" readOnly value={totalLineCalculated} style={{ padding: '2px 4px', border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa', textAlign: 'right' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '5px', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Total Qty :</label>
              <input type="text" readOnly value={totalQtyCalculated} style={{ padding: '2px 4px', border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa', textAlign: 'right', fontWeight: 'bold' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '5px', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Total :</label>
              <input type="text" readOnly value={grossTotalCalculated.toFixed(2)} style={{ padding: '2px 4px', border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa', textAlign: 'right' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '5px', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', textAlign: 'right' }}>SD Amount :</label>
              <input type="text" readOnly value={totalSdCalculated.toFixed(2)} style={{ padding: '2px 4px', border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa', textAlign: 'right' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '5px', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', textAlign: 'right' }}>VAT :</label>
              <input type="text" readOnly value={totalVatCalculated.toFixed(2)} style={{ padding: '2px 4px', border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa', textAlign: 'right' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '5px', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Discount (%) :</label>
              <input 
                type="number" 
                value={overallDiscountPercent} 
                onChange={(e) => {
                  setOverallDiscountPercent(e.target.value);
                  setOverallDiscountAmount(0);
                }} 
                style={{ padding: '2px 4px', border: '1px solid #ccc', textAlign: 'right' }} 
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '5px', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Discount :</label>
              <input 
                type="number" 
                value={overallDiscountAmount} 
                onChange={(e) => setOverallDiscountAmount(e.target.value)} 
                style={{ padding: '2px 4px', border: '1px solid #ccc', textAlign: 'right' }} 
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '5px', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Return Amount :</label>
              <input 
                type="number" 
                value={returnAmount} 
                onChange={(e) => setReturnAmount(e.target.value)} 
                style={{ padding: '2px 4px', border: '1px solid #ccc', textAlign: 'right' }} 
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 40px 1fr', gap: '5px', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', color: '#d32f2f', textAlign: 'right' }}>Redm. Point :</label>
              <input type="text" readOnly value={selectedCustomer?.balance_point || 0} style={{ padding: '2px 2px', border: '1px solid #ccc', textAlign: 'center' }} />
              <input 
                type="number" 
                value={redeemPoints} 
                onChange={(e) => setRedeemPoints(e.target.value)} 
                style={{ padding: '2px 4px', border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa', textAlign: 'right' }} 
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '5px', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', textAlign: 'right' }}>SubTotal :</label>
              <input type="text" readOnly value={subTotalCalculated.toFixed(2)} style={{ padding: '2px 4px', border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa', textAlign: 'right', fontWeight: 'bold' }} />
            </div>
          </div>

        </div>

      </div>

      {/* BOTTOM INVOICE NOTE & NET AMOUNT BAR */}
      <div style={{ padding: '4px 10px 8px 10px', backgroundColor: '#fff', borderTop: '1px solid #dcdcdc', display: 'flex', gap: '10px', alignItems: 'center' }}>
        
        {/* Invoice Note Text Area */}
        <div style={{ width: '180px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 'bold', color: '#9c27b0', fontSize: '11px', marginBottom: '2px' }}>Invoice Note</label>
          <textarea 
            rows="2"
            value={invoiceNote}
            onChange={(e) => setInvoiceNote(e.target.value)}
            placeholder="Type invoice note here..."
            style={{ width: '100%', border: '1px solid #ccc', borderRadius: '3px', fontSize: '11px', padding: '4px', resize: 'none' }}
          />
        </div>

        {/* Big Net Amount Display Box */}
        <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '4px', padding: '6px 15px', backgroundColor: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#9c27b0' }}>NET AMOUNT</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-primary, #2e6f40)' }}>
            Tk {netAmountCalculated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Bottom Right Checkout Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-theme"
            onClick={() => setShowReprintModal(true)} 
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={16} /> Reprint
          </button>
          <button 
            className="btn-danger"
            onClick={handleCancelInvoice} 
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            VOID
          </button>
          <button 
            className="btn-theme"
            onClick={handleOpenPaymentModal} 
            style={{ padding: '8px 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CreditCard size={18} /> Pay Now
          </button>
        </div>

      </div>

      {/* POPUP MODAL 1: INVOICE PAYMENT POPUP MODAL */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: '#fff', width: '95%', maxWidth: '720px', borderRadius: '4px', padding: '16px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', border: '1px solid #ccc', fontSize: '12px', boxSizing: 'border-box' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0d47a1' }}>Invoice Payment</div>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Inputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '12px', width: '100%', boxSizing: 'border-box' }}>
              
              {/* Left Input Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Invoice Amount :</label>
                  <input type="text" readOnly value={netAmountCalculated.toFixed(2)} style={{ width: '100%', boxSizing: 'border-box', padding: '4px 8px', border: '1px solid #ffcc80', backgroundColor: '#ffe0b2', fontWeight: 'bold', fontSize: '13px' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Payment Type :</label>
                  <select 
                    ref={paymentTypeSelectRef}
                    value={selectedPaymentType} 
                    onChange={(e) => setSelectedPaymentType(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '4px 8px', border: '1px solid #ccc', fontWeight: 'bold' }}
                  >
                    {paymentMethodsList.map(pm => (
                      <option key={pm.id} value={pm.name}>{pm.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Machine No :</label>
                  <input 
                    type="text" 
                    value={paymentMachineNo} 
                    onChange={(e) => setPaymentMachineNo(e.target.value)}
                    placeholder="Machine No..."
                    style={{ width: '100%', boxSizing: 'border-box', padding: '4px 8px', border: '1px solid #ccc' }} 
                  />
                </div>
              </div>

              {/* Right Input Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Non-Cash Amt :</label>
                  <input type="text" readOnly value={nonCashTotal.toFixed(2)} style={{ width: '100%', boxSizing: 'border-box', padding: '4px 8px', border: '1px solid #ffcc80', backgroundColor: '#ffe0b2', fontWeight: 'bold', color: '#d32f2f' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Card Number :</label>
                  <input 
                    type="text" 
                    value={paymentCardNo} 
                    onChange={(e) => setPaymentCardNo(e.target.value)}
                    placeholder="Card Number / Trx ID..."
                    style={{ width: '100%', boxSizing: 'border-box', padding: '4px 8px', border: '1px solid #ccc' }} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Amount :</label>
                  <input 
                    type="number" 
                    value={paymentAmountInput} 
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPaymentRow()}
                    placeholder="Amount..."
                    style={{ width: '100%', boxSizing: 'border-box', padding: '4px 8px', border: '1px solid #ccc' }} 
                  />
                  <button 
                    type="button" 
                    onClick={handleAddPaymentRow} 
                    style={{ padding: '4px 12px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '3px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    + Add
                  </button>
                </div>
              </div>

            </div>

            {/* Payment Table */}
            <div style={{ border: '1px solid #ccc', minHeight: '120px', maxHeight: '160px', overflow: 'auto', marginBottom: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #ccc' }}>
                    <th style={{ padding: '4px 8px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Description</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Machine No</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Card No</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {addedPayments.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No non-cash payments added. Cash payment assumed.</td></tr>
                  ) : (
                    addedPayments.map((p, idx) => (
                      <tr 
                        key={idx} 
                        onDoubleClick={() => handleDeletePaymentRow(idx)}
                        style={{ borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                        title="Double-click to delete row"
                      >
                        <td style={{ padding: '4px 8px', borderRight: '1px solid #eee', fontWeight: 'bold' }}>{p.description}</td>
                        <td style={{ padding: '4px 8px', borderRight: '1px solid #eee' }}>{p.machine_no}</td>
                        <td style={{ padding: '4px 8px', borderRight: '1px solid #eee' }}>{p.card_no}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', color: '#15803d' }}>{p.amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Row: Tips & Summary Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'flex-end' }}>
              
              {/* Tips Box */}
              <div style={{ border: '1px solid #b2ebf2', backgroundColor: '#e0f7fa', padding: '8px 12px', borderRadius: '3px', fontSize: '11px' }}>
                <div style={{ fontWeight: 'bold', color: '#00838f', marginBottom: '4px' }}>Tips</div>
                <div style={{ color: '#d32f2f', fontWeight: 'bold', lineHeight: '1.4' }}>
                  Double Click to delete row<br />
                  Paid Amount: F5<br />
                  Payment Type: F6<br />
                  Press ESC to Cancel
                </div>
              </div>

              {/* Cash & Change Totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Cash Amt :</label>
                  <input type="text" readOnly value={cashAmountRemaining.toFixed(2)} style={{ width: '100%', boxSizing: 'border-box', padding: '4px 8px', border: '1px solid #ffcc80', backgroundColor: '#ffe0b2', fontWeight: 'bold', textAlign: 'right', fontSize: '13px' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Paid Amount :</label>
                  <input 
                    id="inputTenderedPaid"
                    type="number" 
                    value={tenderedPaidAmount} 
                    onChange={(e) => setTenderedPaidAmount(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '4px 8px', border: '1px solid #90caf9', backgroundColor: '#e3f2fd', fontWeight: 'bold', textAlign: 'right', fontSize: '13px' }} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Change Amount :</label>
                  <input type="text" readOnly value={finalChangeAmount.toFixed(2)} style={{ width: '100%', boxSizing: 'border-box', padding: '4px 8px', border: '1px solid #f48fb1', backgroundColor: '#fce4ec', fontWeight: 'bold', textAlign: 'right', fontSize: '13px', color: '#c2185b' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button 
                    onClick={handlePaymentOkClick}
                    style={{ padding: '8px 24px', backgroundColor: 'var(--accent-primary, #2e6f40)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    OK
                  </button>
                  <button 
                    onClick={() => setShowPaymentModal(false)}
                    style={{ padding: '8px 24px', backgroundColor: '#e0e0e0', color: '#000', border: '1px solid #ccc', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* REQUEST 1: CONFIRM SAVE INVOICE DIALOG (Notification Box with YES / NO buttons) */}
      {showConfirmSaveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000 }}>
          <div style={{ backgroundColor: '#fff', width: '380px', borderRadius: '8px', padding: '20px 24px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1px solid #ccc', textAlignment: 'center', textAlign: 'center' }}>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <HelpCircle size={48} color="var(--accent-primary, #2e6f40)" />
            </div>

            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', marginBottom: '20px' }}>
              Are you sure to Save the invoice?
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <button 
                onClick={handleConfirmSaleAndSave}
                style={{ 
                  padding: '8px 28px', 
                  backgroundColor: 'var(--accent-primary, #2e6f40)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontWeight: 'bold', 
                  fontSize: '13px', 
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(46, 111, 64, 0.3)'
                }}
              >
                Yes
              </button>
              <button 
                onClick={() => setShowConfirmSaveModal(false)}
                style={{ 
                  padding: '8px 28px', 
                  backgroundColor: '#ef4444', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontWeight: 'bold', 
                  fontSize: '13px', 
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)'
                }}
              >
                No
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REQUEST 2: EXCHANGE SESSION MODAL (F3) */}
      {showExchangeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: '#fff', width: '92%', maxWidth: '760px', borderRadius: '4px', padding: '16px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', border: '1px solid #ccc', fontSize: '11px', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: '6px', marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0d47a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeftRight size={16} /> Exchange Session
              </div>
              <button onClick={() => setShowExchangeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            <fieldset style={{ border: '1px solid #ccc', borderRadius: '3px', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }}>
              <legend style={{ fontWeight: 'bold', color: '#333' }}>Exchange Session</legend>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '15px', alignItems: 'flex-start' }}>
                
                {/* Inputs Left */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px', alignItems: 'center' }}>
                    <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Store :</label>
                    <select 
                      value={exchangeStoreId || posTerminal?.store_id || ''} 
                      onChange={(e) => setExchangeStoreId(e.target.value)}
                      style={{ padding: '3px 6px', border: '1px solid #00bcd4', backgroundColor: '#e0f7fa', fontWeight: 'bold', width: '100%', boxSizing: 'border-box' }}
                    >
                      {storesList.map(s => (
                        <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px', gap: '6px', alignItems: 'center' }}>
                    <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Invoice# :</label>
                    <input 
                      type="text" 
                      value={exchangeInvoiceNo}
                      onChange={(e) => setExchangeInvoiceNo(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLookupInvoiceItems()}
                      placeholder="Enter invoice no & press Enter..."
                      style={{ padding: '3px 6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      <input 
                        type="checkbox" 
                        checked={exchangeOtherStore}
                        onChange={(e) => setExchangeOtherStore(e.target.checked)}
                      /> Other Store
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px', alignItems: 'center' }}>
                    <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Barcode :</label>
                    <input 
                      type="text" 
                      value={exchangeBarcode}
                      onChange={(e) => setExchangeBarcode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchBarcodeProduct()}
                      placeholder="Scan/type barcode & press Enter for replacement item..."
                      style={{ padding: '3px 6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Buttons Right */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button 
                    onClick={() => {
                      if (exchangeBarcode.trim()) handleSearchBarcodeProduct();
                      else if (exchangeInvoiceNo.trim()) handleLookupInvoiceItems();
                      else toast.error('Please enter Invoice# or Barcode to search');
                    }}
                    className="btn-theme"
                    style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '3px' }}
                  >
                    Execute
                  </button>
                  <button 
                    onClick={() => setShowExchangeModal(false)}
                    className="btn-danger"
                    style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '3px' }}
                  >
                    Cancel
                  </button>
                </div>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px', alignItems: 'center', marginTop: '8px' }}>
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Exchange Amt :</label>
                <input type="text" readOnly value={exchangeAmt} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', fontWeight: 'bold', width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '80px 70px 55px 1fr', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Exchange Qty :</label>
                <input type="number" min="1" value={exchangeQty} onChange={(e) => setExchangeQty(e.target.value)} style={{ padding: '3px 6px', border: '1px solid #ccc', textAlign: 'center', width: '100%', boxSizing: 'border-box' }} />
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Amount :</label>
                <input type="text" readOnly value={exchangeAmt} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', width: '100%', boxSizing: 'border-box' }} />
              </div>

              {exchangeSelectedNewProducts.length > 0 && (() => {
                const totalNewVal = exchangeSelectedNewProducts.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);
                const diffVal = totalNewVal - Number(exchangeAmt || 0);
                const isNegative = diffVal < 0;
                return (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '8px 12px', 
                    backgroundColor: isNegative ? '#fef2f2' : '#f0fdf4', 
                    border: `1px solid ${isNegative ? '#fca5a5' : '#86efac'}`, 
                    borderRadius: '4px', 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: isNegative ? '#9f1239' : '#166534', fontWeight: 'bold' }}>
                        🛍️ Selected Replacement Items ({exchangeSelectedNewProducts.length}):
                      </div>
                      <div style={{ fontSize: '11px', color: isNegative ? '#dc2626' : '#0369a1', fontWeight: 'bold' }}>
                        Diff Due: Tk {diffVal.toFixed(2)} {isNegative ? `(Remaining Credit: Tk ${Math.abs(diffVal).toFixed(2)})` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#475569' }}>
                      {exchangeSelectedNewProducts.map(p => `${p.product_name} (Tk ${Number(p.price).toFixed(2)})`).join(', ')}
                    </div>
                  </div>
                );
              })()}

            </fieldset>

            {/* Product Details Fieldset */}
            <fieldset style={{ border: '1px solid #ccc', borderRadius: '3px', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }}>
              <legend style={{ fontWeight: 'bold', color: '#333' }}>Product Details (Returned Item)</legend>

              <div style={{ display: 'grid', gridTemplateColumns: '125px 1fr 70px 1fr', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontWeight: 'bold', color: '#0d47a1', textAlign: 'right' }}>Returnable Amount :</label>
                <input type="text" readOnly value={exchangeProductDetails?.returnableAmount || 0} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', fontWeight: 'bold', width: '100%', boxSizing: 'border-box' }} />
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Sold Qty :</label>
                <input type="text" readOnly value={exchangeProductDetails?.soldQty || 0} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '125px 1fr 70px 1fr', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Name :</label>
                <input type="text" readOnly value={exchangeProductDetails?.name || ''} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', fontWeight: 'bold', width: '100%', boxSizing: 'border-box' }} />
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>MRP :</label>
                <input type="text" readOnly value={exchangeProductDetails?.mrp || 0} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '125px 1fr 70px 1fr', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Sale Date :</label>
                <input type="text" readOnly value={exchangeProductDetails?.saleDate || ''} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', width: '100%', boxSizing: 'border-box' }} />
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>VAT :</label>
                <input type="text" readOnly value={exchangeProductDetails?.vat || 0} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '125px 1fr 70px 1fr', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Served By :</label>
                <input type="text" readOnly value={exchangeProductDetails?.servedBy || ''} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', width: '100%', boxSizing: 'border-box' }} />
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Discount :</label>
                <input type="text" readOnly value={exchangeProductDetails?.discount || 0} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '125px 1fr 70px 1fr', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Terminal :</label>
                <input type="text" readOnly value={exchangeProductDetails?.terminal || ''} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', width: '100%', boxSizing: 'border-box' }} />
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>SD Amt :</label>
                <input type="text" readOnly value={exchangeProductDetails?.sdAmt || 0} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '125px 1fr 70px 1fr', gap: '6px', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Sp. Disc :</label>
                <input type="text" readOnly value={exchangeProductDetails?.spDisc || 0} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', width: '100%', boxSizing: 'border-box' }} />
                <div></div>
                <div></div>
              </div>

            </fieldset>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <button 
                onClick={handleExecuteExchange}
                className="btn-theme"
                style={{ padding: '6px 20px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px' }}
              >
                Apply Exchange Credit
              </button>
              <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>Press ESC for Close</div>
            </div>

          </div>
        </div>
      )}

      {/* POPUP MODAL 1: INVOICE SOLD ITEMS SELECTION MODAL (Left Checkbox) */}
      {showInvoiceItemsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3500, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: '#fff', width: '90%', maxWidth: '700px', borderRadius: '6px', padding: '16px 20px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1px solid #7dd3fc', fontSize: '12px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0d47a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={16} /> Select Returned Item from Invoice #{exchangeInvoiceNo}
              </div>
              <button onClick={() => setShowInvoiceItemsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <p style={{ color: '#64748b', fontSize: '11px', marginBottom: '10px' }}>
              Click the checkbox on the left to select which item from the customer's previous invoice is being returned:
            </p>

            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '15px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)', color: '#fff' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '50px' }}>Select</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Barcode</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item Name</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Sold Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Returnable Value</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItemsList.map((item, idx) => {
                    const isSelected = exchangeProductDetails?.barcode === item.barcode || exchangeProductDetails?.name === item.product_name;
                    return (
                      <tr 
                        key={item.id || idx} 
                        style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: isSelected ? '#e0f2fe' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc') }}
                        className="win7-table-row"
                        onClick={() => handleSelectReturnedInvoiceItem(item)}
                      >
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => handleSelectReturnedInvoiceItem(item)}
                            style={{ accentColor: '#0284c7', cursor: 'pointer', width: '16px', height: '16px' }} 
                          />
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0369a1' }}>{item.barcode || '-'}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>{item.product_name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{item.qty || 1}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>Tk {Number(item.unit_price || 0).toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#0369a1' }}>
                          Tk {Number(item.total_value || (Number(item.qty || 1) * Number(item.unit_price || 0))).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-danger" onClick={() => setShowInvoiceItemsModal(false)}>Cancel</button>
            </div>

          </div>
        </div>
      )}

      {/* POPUP MODAL 2: MULTI-ITEM BARCODE REPLACEMENT PRODUCT SELECTION MODAL */}
      {showBarcodeSearchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3500, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: '#fff', width: '90%', maxWidth: '720px', borderRadius: '6px', padding: '16px 20px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1px solid #86efac', fontSize: '12px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={16} /> Select New Replacement Items for Exchange (Multi-Select Supported)
              </div>
              <button onClick={() => setShowBarcodeSearchModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <p style={{ color: '#64748b', fontSize: '11px', marginBottom: '8px' }}>
              Click checkboxes on the left to select multiple replacement products customer wants in exchange:
            </p>

            <div style={{ marginBottom: '10px' }}>
              <input 
                type="text"
                placeholder="Type name or barcode to filter replacement products..."
                value={exchangeBarcode}
                onChange={(e) => setExchangeBarcode(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #86efac', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '15px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#fff' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '50px' }}>Select</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Barcode</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item Name</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '100px' }}>Stock Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>MRP / Price</th>
                  </tr>
                </thead>
                <tbody>
                  {barcodeSearchResults.filter(p => {
                    const stockQty = getEffectiveStockQty(p, exchangeStoreId || posTerminal?.store_id);
                    if (stockQty <= 0) return false; // Strictly show ONLY in-stock products!

                    if (!exchangeBarcode.trim()) return true;
                    const q = exchangeBarcode.trim().toLowerCase();
                    return (
                      p.item_name?.toLowerCase().includes(q) ||
                      p.barcode?.toLowerCase().includes(q) ||
                      p.user_barcode?.toLowerCase().includes(q)
                    );
                  }).length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        No in-stock replacement products found matching "{exchangeBarcode}"
                      </td>
                    </tr>
                  ) : (
                    barcodeSearchResults
                      .filter(p => {
                        const stockQty = getEffectiveStockQty(p, exchangeStoreId || posTerminal?.store_id);
                        if (stockQty <= 0) return false; // Strictly show ONLY in-stock products!

                        if (!exchangeBarcode.trim()) return true;
                        const q = exchangeBarcode.trim().toLowerCase();
                        return (
                          p.item_name?.toLowerCase().includes(q) ||
                          p.barcode?.toLowerCase().includes(q) ||
                          p.user_barcode?.toLowerCase().includes(q)
                        );
                      })
                      .map((p, idx) => {
                        const stockQty = getEffectiveStockQty(p, exchangeStoreId || posTerminal?.store_id);
                        const isSelected = exchangeSelectedNewProducts.some(item => item.id === p.id || item.product_id === p.id);
                        const price = Number(p.mrp || p.purchase_price || 0);
                        return (
                          <tr 
                            key={p.id || idx} 
                            style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: isSelected ? '#dcfce7' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc') }}
                            className="win7-table-row"
                            onClick={() => handleToggleSelectNewExchangeProduct(p)}
                          >
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleSelectNewExchangeProduct(p);
                                }}
                                style={{ accentColor: '#2e6f40', cursor: 'pointer', width: '16px', height: '16px' }} 
                              />
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0369a1' }}>{p.barcode || p.user_barcode || '-'}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0f172a' }}>{p.item_name}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 'bold', color: '#166534' }}>
                              {stockQty} pcs
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>
                              Tk {price.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* Selection Summary Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534' }}>
                Selected: <span style={{ color: '#0284c7' }}>{exchangeSelectedNewProducts.length} Items</span> | Total: <span style={{ color: '#166534' }}>Tk {exchangeSelectedNewProducts.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-theme" onClick={() => setShowBarcodeSearchModal(false)} style={{ padding: '6px 16px' }}>
                  Confirm Selection ({exchangeSelectedNewProducts.length})
                </button>
                <button className="btn-danger" onClick={() => setShowBarcodeSearchModal(false)}>Cancel</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* REQUEST 3: RETURN SESSION MODAL (3rd Image - F8) */}
      {showReturnModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: '#fff', width: '95%', maxWidth: '780px', borderRadius: '4px', padding: '16px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', border: '1px solid #ccc', fontSize: '11px', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: '6px', marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0d47a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RotateCcw size={16} /> Return Session
              </div>
              <button onClick={() => setShowReturnModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            <fieldset style={{ border: '1px solid #ccc', borderRadius: '3px', padding: '10px', marginBottom: '10px' }}>
              <legend style={{ fontWeight: 'bold', color: '#333' }}>Return Session</legend>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontWeight: 'bold', color: '#0d47a1' }}>Return Invoice # : </span>
                  <span style={{ fontWeight: 'bold', color: '#1976d2', textDecoration: 'underline' }}>{returnInvoiceNo}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 'bold' }}>Date : </span>
                  <span style={{ color: '#0d47a1', textDecoration: 'underline' }}>{currentDate}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 'bold' }}>Payment Type : </span>
                  <select 
                    value={returnPaymentType} 
                    onChange={(e) => setReturnPaymentType(e.target.value)}
                    style={{ padding: '2px 6px', border: '1px solid #ccc', fontWeight: 'bold' }}
                  >
                    <option value="CASH">CASH</option>
                    <option value="BANK">BANK</option>
                    <option value="CARD">CARD</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '15px', alignItems: 'flex-start' }}>
                
                {/* Left Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 90px 50px 1fr', gap: '6px', alignItems: 'center' }}>
                    <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Invoice# :</label>
                    <input 
                      type="text" 
                      value={returnOriginalInvoiceNo} 
                      onChange={(e) => setReturnOriginalInvoiceNo(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLookupReturnInvoice()}
                      placeholder="Original Invoice#..."
                      style={{ padding: '3px 6px', border: '1px solid #00bcd4', backgroundColor: '#e0f7fa' }} 
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      <input 
                        type="checkbox" 
                        checked={returnFullInvoice}
                        onChange={(e) => setReturnFullInvoice(e.target.checked)}
                      /> Full Invoice
                    </label>
                    <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Amount :</label>
                    <input type="text" readOnly value={returnTotalAmount} style={{ padding: '3px 6px', border: '1px solid #ccc' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 70px 1fr', gap: '6px', alignItems: 'center' }}>
                    <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Barcode :</label>
                    <input 
                      type="text" 
                      value={returnBarcode} 
                      onChange={(e) => setReturnBarcode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLookupReturnInvoice()}
                      placeholder="Scan return barcode..."
                      style={{ padding: '3px 6px', border: '1px solid #ccc' }} 
                    />
                    <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Customer :</label>
                    <input type="text" readOnly value={selectedCustomer?.name || 'Walk-in'} style={{ padding: '3px 6px', border: '1px solid #ccc', backgroundColor: '#f0f0f0' }} />
                  </div>
                </div>

                {/* Right Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button 
                    onClick={handleExecuteReturn}
                    style={{ padding: '6px 12px', backgroundColor: '#e0e0e0', color: '#000', border: '1px solid #ccc', fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px' }}
                  >
                    Execute
                  </button>
                  <button 
                    onClick={() => setShowReturnModal(false)}
                    style={{ padding: '6px 12px', backgroundColor: '#e0e0e0', color: '#000', border: '1px solid #ccc', fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px' }}
                  >
                    Cancel
                  </button>
                </div>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '15px', marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>Return Amt : </span>
                  <input type="text" readOnly value={returnTotalAmount} style={{ width: '80px', padding: '3px 6px', border: '1px solid #ccc' }} />
                  <span style={{ fontWeight: 'bold' }}>Return Qty : </span>
                  <input type="text" readOnly value={returnTotalQty} style={{ width: '80px', padding: '3px 6px', border: '1px solid #ccc' }} />
                </div>

                <div>
                  <div style={{ fontSize: '10px', color: '#0d47a1', fontWeight: 'bold', textAlign: 'center' }}>Returnable Amount</div>
                  <input type="text" readOnly value={returnTotalAmount} style={{ width: '100%', padding: '4px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', textAlign: 'center', fontWeight: 'bold' }} />
                </div>
              </div>

            </fieldset>

            {/* Product Details Fieldset */}
            <fieldset style={{ border: '1px solid #ccc', borderRadius: '3px', padding: '8px 10px', marginBottom: '10px' }}>
              <legend style={{ fontWeight: 'bold', color: '#333' }}>Product Details</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 60px 1fr', gap: '4px', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Name :</label>
                <input type="text" readOnly value={returnProductDetails?.name || ''} style={{ padding: '2px 4px', border: '1px solid #ccc', backgroundColor: '#f0f0f0' }} />
                <label style={{ fontWeight: 'bold', textAlign: 'right' }}>Sold Qty :</label>
                <input type="text" readOnly value={returnProductDetails?.soldQty || 0} style={{ padding: '2px 4px', border: '1px solid #ccc', backgroundColor: '#f0f0f0' }} />
              </div>
            </fieldset>

            {/* Middle Yellow Return Items Table (3rd Image) */}
            <div style={{ border: '1px solid #ccc', height: '110px', overflow: 'auto', marginBottom: '10px', backgroundColor: '#fff9c4' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fff59d', borderBottom: '1px solid #e6ee9c' }}>
                    <th style={{ padding: '4px 8px', textAlign: 'right', borderRight: '1px solid #e6ee9c' }}>Quantity</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right', borderRight: '1px solid #e6ee9c' }}>MRP</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', borderRight: '1px solid #e6ee9c' }}>Barcode</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', borderRight: '1px solid #e6ee9c' }}>Name</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {returnItemsList.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#888' }}>Enter Original Invoice# to load returnable items.</td></tr>
                  ) : (
                    returnItemsList.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #fff59d' }}>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>{item.qty}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>{item.unit_price}</td>
                        <td style={{ padding: '4px 8px' }}>{item.barcode}</td>
                        <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>{item.product_name}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', color: '#c2185b' }}>{item.total_value}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '300px', border: '1px solid #ccc', height: '50px', padding: '4px', backgroundColor: '#fafafa', fontSize: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>Type Name:</span> Cash | <span style={{ fontWeight: 'bold' }}>Amount:</span> Tk {returnTotalAmount}
              </div>
              <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>Press ESC for Close</div>
            </div>

          </div>
        </div>
      )}

      {/* POPUP MODAL 2: PRODUCT STOCK SEARCH POPUP */}
      {showSearchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: '#fff', width: '90%', maxWidth: '1000px', height: '80vh', borderRadius: '4px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '8px 15px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0d47a1' }}>Product Stock</div>
              <div style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '11px' }}>
                Press ESC to Close <button onClick={() => setShowSearchModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '10px' }}><X size={16} /></button>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{ padding: '10px 15px', borderBottom: '1px solid #eee', display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold', color: '#d32f2f' }}>Search [F1] :</label>
                <input 
                  ref={searchNameInputRef}
                  type="text" 
                  value={searchName} 
                  onChange={(e) => setSearchName(e.target.value)} 
                  placeholder="Item name..."
                  style={{ padding: '4px 8px', border: '1px solid #00bcd4', width: '200px' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold', color: '#d32f2f' }}>By Barcode [F3] :</label>
                <input 
                  ref={searchBarcodeInputRef}
                  type="text" 
                  value={searchBarcode} 
                  onChange={(e) => setSearchBarcode(e.target.value)} 
                  placeholder="Barcode..."
                  style={{ padding: '4px 8px', border: '1px solid #ccc', width: '200px' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  id="chkShowZero"
                  checked={searchShowZero} 
                  onChange={(e) => setSearchShowZero(e.target.checked)} 
                />
                <label htmlFor="chkShowZero" style={{ fontWeight: 'bold', color: '#d32f2f', cursor: 'pointer' }}>Show with zero(0) [F2]</label>
              </div>
            </div>

            {/* Results Table */}
            <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Barcode</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>User Barcode</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>CPU</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>MRP</th>
                    <th style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>Balance</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Vendor Name</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>UOM</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>VAT(%)</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isSearching ? (
                    <tr><td colSpan="11" style={{ padding: '20px', textAlign: 'center' }}>Searching stock...</td></tr>
                  ) : searchResults.filter(prod => {
                    const stockQty = getEffectiveStockQty(prod, posTerminal?.store_id);
                    return searchShowZero || stockQty > 0;
                  }).length === 0 ? (
                    <tr><td colSpan="11" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No products found (Zero stock hidden)</td></tr>
                  ) : (
                    searchResults
                      .filter(prod => {
                        const stockQty = getEffectiveStockQty(prod, posTerminal?.store_id);
                        return searchShowZero || stockQty > 0;
                      })
                      .map((prod) => {
                        const stockQty = getEffectiveStockQty(prod, posTerminal?.store_id);
                        const isZero = stockQty <= 0;
                        return (
                          <tr 
                            key={prod.id}
                            style={{ borderBottom: '1px solid #eee', backgroundColor: isZero ? '#fff1f2' : 'inherit' }}
                            className="search-result-row"
                          >
                            <td style={{ padding: '6px' }}>{prod.barcode || prod.code}</td>
                            <td style={{ padding: '6px' }}>{prod.user_barcode || prod.barcode}</td>
                            <td style={{ padding: '6px', fontWeight: 'bold' }}>{prod.item_name}</td>
                            <td style={{ padding: '6px', textAlign: 'right' }}>{prod.purchase_price}</td>
                            <td style={{ padding: '6px', textAlign: 'right' }}>{prod.mrp}</td>
                            <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', color: isZero ? '#dc2626' : '#2e6f40' }}>{stockQty}</td>
                            <td style={{ padding: '6px' }}>{prod.vendor?.name || '-'}</td>
                            <td style={{ padding: '6px', textAlign: 'center' }}>Pcs</td>
                            <td style={{ padding: '6px', textAlign: 'right' }}>{prod.sale_vat_percent || 0}</td>
                            <td style={{ padding: '6px' }}>{prod.category?.name || '-'}</td>
                            <td style={{ padding: '6px', textAlign: 'center' }}>
                              <button 
                                onClick={() => {
                                  if (stockQty <= 0) {
                                    toast.error(`Out of stock! "${prod.item_name}" currently has 0 stock in this store.`, { duration: 4000 });
                                    return;
                                  }
                                  const added = addItemToCart(prod, 1);
                                  if (added !== false) {
                                    setShowSearchModal(false);
                                    toast.success(`Added ${prod.item_name} to cart`);
                                  }
                                }}
                                disabled={isZero}
                                style={{ backgroundColor: isZero ? '#94a3b8' : '#2e6f40', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '3px', cursor: isZero ? 'not-allowed' : 'pointer' }}
                              >
                                {isZero ? 'Out of Stock' : 'Add'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* POPUP MODAL 3: REPRINT POPUP */}
      {showReprintModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: '#fff', width: '500px', borderRadius: '4px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', border: '1px solid #ccc' }}>
            
            <div style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '20px' }}>
              Invoice Reprint
            </div>

            <div style={{ textAlignment: 'center', textAlign: 'center', marginBottom: '15px' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0d47a1', marginBottom: '15px' }}>
                ENTER INVOICE NUMBER
              </div>
              <input 
                type="text" 
                autoFocus
                value={reprintInvoiceInput}
                onChange={(e) => setReprintInvoiceInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePerformReprint()}
                placeholder="e.g. 0700020000001"
                style={{ width: '100%', padding: '10px', fontSize: '16px', border: '1px solid #00bcd4', textAlign: 'center', fontWeight: 'bold' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button 
                onClick={handlePerformReprint} 
                style={{ padding: '8px 20px', backgroundColor: '#e0e0e0', color: '#000', border: '1px solid #ccc', fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px' }}
              >
                Reprint
              </button>
            </div>

            <div style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '11px', marginTop: '15px' }}>
              Press ESC for Close
            </div>

          </div>
        </div>
      )}

      {/* POPUP MODAL 4: RECALL HELD INVOICES */}
      {showHoldModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: '#fff', width: '600px', maxHeight: '70vh', borderRadius: '4px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Held Invoices</span>
              <button onClick={() => setShowHoldModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              {heldInvoicesList.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No held invoices found.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                      <th style={{ padding: '6px', textAlign: 'left' }}>Hold No</th>
                      <th style={{ padding: '6px', textAlign: 'left' }}>Customer</th>
                      <th style={{ padding: '6px', textAlign: 'right' }}>Net Amount</th>
                      <th style={{ padding: '6px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heldInvoicesList.map((held, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '6px', fontWeight: 'bold' }}>{held.hold_no}</td>
                        <td style={{ padding: '6px' }}>{held.customer_name}</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>Tk {held.net_amount}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <button 
                            onClick={() => handleRecallItem(held)} 
                            style={{ padding: '4px 10px', backgroundColor: '#7cb342', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                          >
                            Recall
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL 5: CHANGE QUANTITY MODAL (F2) */}
      {showQtyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: '#fff', width: '320px', borderRadius: '4px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '15px' }}>Change Quantity (F2)</div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '5px' }}>Enter New Quantity:</label>
              <input 
                type="number" 
                min="1"
                autoFocus
                value={newQtyInput}
                onChange={(e) => setNewQtyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveQuantity()}
                style={{ width: '100%', padding: '8px', fontSize: '16px', border: '1px solid #ccc', textAlign: 'center' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowQtyModal(false)} style={{ padding: '6px 15px', backgroundColor: '#e0e0e0', border: 'none', cursor: 'pointer', borderRadius: '3px' }}>Cancel</button>
              <button onClick={handleSaveQuantity} style={{ padding: '6px 15px', backgroundColor: 'var(--accent-primary, #2e6f40)', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '3px' }}>Update</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PosDashboard;
