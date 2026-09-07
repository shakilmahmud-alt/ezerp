import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, Plus, Trash2, Send, FileText, Layers, Eye, 
  Printer, X, RefreshCw, Package, Store, Warehouse, 
  Check, CheckCircle2, AlertCircle, Sparkles, ArrowRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PosRequisition = () => {
  const { posTerminal, user } = useAuth();

  const [requisitionNo, setRequisitionNo] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [storeDetails, setStoreDetails] = useState({ id: '', name: '' });
  const [centralStoreId, setCentralStoreId] = useState(null);

  // Search & Product Selection
  const [productSearchInput, setProductSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reqQty, setReqQty] = useState(1);
  const [stockInfo, setStockInfo] = useState({ central: 0, local: 0 });
  const [dropdownIndex, setDropdownIndex] = useState(-1);

  // Requisition List Items
  const [reqItems, setReqItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentRequisitions, setRecentRequisitions] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  // Stock Browser Modal State ("All Products Stock List")
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockModalSearch, setStockModalSearch] = useState('');
  const [allProductsStock, setAllProductsStock] = useState([]);
  const [isLoadingStockModal, setIsLoadingStockModal] = useState(false);
  const [stockModalFilter, setStockModalFilter] = useState('all'); // 'all' | 'cs_available' | 'local_zero'
  const [stockModalQtys, setStockModalQtys] = useState({});

  // View Details Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingReq, setViewingReq] = useState(null);
  const [viewingReqItems, setViewingReqItems] = useState([]);
  const [isLoadingReqDetails, setIsLoadingReqDetails] = useState(false);

  // DOM Refs
  const searchInputRef = useRef(null);
  const reqQtyInputRef = useRef(null);
  const stockModalSearchRef = useRef(null);

  useEffect(() => {
    const today = new Date();
    setCurrentDate(today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    
    fetchStoreInfo();
    generateRequisitionNo();
  }, [posTerminal]);

  useEffect(() => {
    if (storeDetails.id || storeDetails.name) {
      fetchRecentRequisitions();
    }
  }, [storeDetails]);

  // Focus search input on page load
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Handle ESC key for modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isStockModalOpen) {
          setIsStockModalOpen(false);
          searchInputRef.current?.focus();
        } else if (isViewModalOpen) {
          setIsViewModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStockModalOpen, isViewModalOpen]);

  // Fetch Store and Central Store Info
  const fetchStoreInfo = async () => {
    try {
      const { data: stores } = await supabase.from('stores').select('*');
      if (stores && stores.length > 0) {
        const central = stores.find(s => s.name?.toLowerCase().includes('central') || s.is_central || s.shop_type === 'Warehouse');
        if (central) setCentralStoreId(central.id);

        const current = stores.find(s => s.id === posTerminal?.store_id) || stores[0];
        if (current) {
          setStoreDetails({ id: current.id, name: current.name });
        } else if (posTerminal?.store_name) {
          setStoreDetails({ id: posTerminal.store_id || 'store-1', name: posTerminal.store_name });
        }
      }
    } catch (err) {
      console.error("Error fetching stores:", err);
      if (posTerminal?.store_name) {
        setStoreDetails({ id: posTerminal.store_id || 'store-1', name: posTerminal.store_name });
      }
    }
  };

  // Generate Requisition Number
  const generateRequisitionNo = async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = `REQ${todayStr}`;

      const { data } = await supabase
        .from('store_requisitions')
        .select('requisition_no')
        .ilike('requisition_no', `${prefix}%`)
        .order('requisition_no', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].requisition_no) {
        const num = parseInt(data[0].requisition_no.slice(-3), 10);
        if (!isNaN(num)) {
          setRequisitionNo(`${prefix}${String(num + 1).padStart(3, '0')}`);
          return;
        }
      }
      setRequisitionNo(`${prefix}001`);
    } catch (e) {
      setRequisitionNo(`REQ${Date.now().toString().slice(-6)}`);
    }
  };

  // Fetch Recent Store Requisitions from store_requisitions table
  const fetchRecentRequisitions = async () => {
    setIsLoadingRecent(true);
    try {
      let query = supabase
        .from('store_requisitions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (storeDetails.name) {
        query = query.ilike('shop_name', `%${storeDetails.name}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        setRecentRequisitions(data);
      } else {
        const { data: allData } = await supabase
          .from('store_requisitions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        if (allData) setRecentRequisitions(allData);
      }
    } catch (e) {
      console.error("Error fetching recent requisitions:", e);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  // Calculate Product Stock Breakdown (Central Store vs Branch Store)
  const calculateStock = (prod, targetStoreId = storeDetails.id, centralId = centralStoreId) => {
    let centralStock = 0;
    if (centralId && Array.isArray(prod?.store_stocks)) {
      const csRow = prod.store_stocks.find(s => s.store_id === centralId);
      if (csRow) centralStock = Number(csRow.stock_qty || 0);
      else centralStock = Number(prod.wh_stock || 0);
    } else {
      centralStock = Number(prod.wh_stock || 0);
    }

    let localStock = 0;
    if (targetStoreId && Array.isArray(prod?.store_stocks)) {
      const locRow = prod.store_stocks.find(s => s.store_id === targetStoreId);
      if (locRow) localStock = Number(locRow.stock_qty || 0);
      else if (prod.str_stock !== undefined) {
        localStock = Number(prod.str_stock || 0);
      }
    } else if (prod.str_stock !== undefined) {
      localStock = Number(prod.str_stock || 0);
    }

    return {
      central: centralStock,
      local: localStock
    };
  };

  // Search Products live autocomplete
  useEffect(() => {
    if (!productSearchInput.trim()) {
      setSearchResults([]);
      setDropdownIndex(-1);
      return;
    }

    const searchProducts = async () => {
      try {
        const queryTerm = productSearchInput.trim();
        const { data } = await supabase
          .from('products')
          .select('*')
          .or(`barcode.eq.${queryTerm},user_define_barcode.eq.${queryTerm},code.eq.${queryTerm},item_name.ilike.%${queryTerm}%`)
          .limit(12);

        setSearchResults(data || []);
        setDropdownIndex(-1);
      } catch (err) {
        console.error("Search error:", err);
      }
    };

    const timer = setTimeout(searchProducts, 150);
    return () => clearTimeout(timer);
  }, [productSearchInput, storeDetails, centralStoreId]);

  // Select Product from search dropdown or exact barcode
  const handleSelectProduct = (prod) => {
    if (!prod) return;
    setSelectedProduct(prod);
    setSearchResults([]);
    setProductSearchInput(prod.item_name);

    const stocks = calculateStock(prod);
    setStockInfo(stocks);

    // Focus on Req Qty input so user can press Enter immediately
    setTimeout(() => {
      reqQtyInputRef.current?.focus();
      reqQtyInputRef.current?.select();
    }, 50);
  };

  // Handle KeyDown on Product Search Input
  const handleSearchKeyDown = async (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setDropdownIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setDropdownIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();

      // Case 1: Empty input -> Open "All Products Stock List" Modal
      if (!productSearchInput.trim()) {
        openStockModal();
        return;
      }

      // Case 2: Dropdown item highlighted
      if (dropdownIndex >= 0 && searchResults[dropdownIndex]) {
        handleSelectProduct(searchResults[dropdownIndex]);
        return;
      }

      // Case 3: If results available, select the first match
      if (searchResults.length > 0) {
        handleSelectProduct(searchResults[0]);
        return;
      }

      // Case 4: Query exact barcode, user_define_barcode, code or name from database
      try {
        const queryTerm = productSearchInput.trim();
        const { data } = await supabase
          .from('products')
          .select('*')
          .or(`barcode.eq.${queryTerm},user_define_barcode.eq.${queryTerm},code.eq.${queryTerm},item_name.ilike.%${queryTerm}%`)
          .limit(1);

        if (data && data.length > 0) {
          handleSelectProduct(data[0]);
        } else {
          toast.error(`No product found for "${queryTerm}"`);
        }
      } catch (err) {
        console.error("Barcode lookup error:", err);
      }
    }
  };

  // Open "All Products Stock List" Modal
  const openStockModal = async () => {
    setIsStockModalOpen(true);
    setStockModalSearch('');
    setStockModalFilter('all');
    fetchStockModalProducts();
    setTimeout(() => {
      stockModalSearchRef.current?.focus();
    }, 150);
  };

  // Fetch all products with stock for modal
  const fetchStockModalProducts = async () => {
    setIsLoadingStockModal(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          item_name,
          barcode,
          code,
          user_define_barcode,
          purchase_price,
          mrp,
          wh_stock,
          str_stock,
          category_id,
          category:category_id(name),
          store_stocks(store_id, stock_qty)
        `)
        .order('item_name', { ascending: true })
        .limit(500);

      if (error) throw error;
      setAllProductsStock(data || []);
      
      // Initialize default quantities
      const initialQtys = {};
      (data || []).forEach(p => {
        initialQtys[p.id] = 1;
      });
      setStockModalQtys(initialQtys);
    } catch (err) {
      console.error("Error fetching all stock:", err);
      toast.error("Failed to load product stock list");
    } finally {
      setIsLoadingStockModal(false);
    }
  };

  // Filter products in Stock Modal
  const filteredStockProducts = allProductsStock.filter(p => {
    const sTerm = stockModalSearch.trim().toLowerCase();
    const matchesSearch = !sTerm || 
      (p.item_name && p.item_name.toLowerCase().includes(sTerm)) ||
      (p.barcode && p.barcode.toLowerCase().includes(sTerm)) ||
      (p.code && p.code.toLowerCase().includes(sTerm)) ||
      (p.category?.name && p.category.name.toLowerCase().includes(sTerm));

    if (!matchesSearch) return false;

    const stocks = calculateStock(p);
    if (stockModalFilter === 'cs_available') {
      return stocks.central > 0;
    }
    if (stockModalFilter === 'local_zero') {
      return stocks.local <= 0;
    }
    return true;
  });

  // Add Item to Requisition from Modal
  const handleAddItemFromModal = (prod, e) => {
    if (e) e.stopPropagation();
    const qty = Number(stockModalQtys[prod.id]) || 1;
    if (qty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }

    const stocks = calculateStock(prod);
    const cpu = Number(prod.purchase_price || 0);
    const mrp = Number(prod.mrp || 0);

    const existingIdx = reqItems.findIndex(i => i.product_id === prod.id);
    if (existingIdx > -1) {
      const updated = [...reqItems];
      const newQ = updated[existingIdx].req_qty + qty;
      updated[existingIdx] = {
        ...updated[existingIdx],
        req_qty: newQ,
        cost_value: newQ * cpu
      };
      setReqItems(updated);
    } else {
      const newItem = {
        product_id: prod.id,
        barcode: prod.barcode || prod.code,
        product_code: prod.code || prod.barcode,
        product_name: prod.item_name,
        category: prod.category?.name || '',
        cpu: cpu,
        mrp: mrp,
        central_stock: stocks.central,
        local_stock: stocks.local,
        req_qty: qty,
        cost_value: cpu * qty
      };
      setReqItems(prev => [...prev, newItem]);
    }

    toast.success(`Added ${qty}x ${prod.item_name} to Requisition!`, { duration: 2500 });
  };

  // Add Item to Requisition Table from Search Box
  const handleAddItemToReq = async () => {
    let prod = selectedProduct;
    if (!prod) {
      const queryTerm = productSearchInput.trim();
      if (!queryTerm) {
        toast.error('Please scan or search a product first');
        searchInputRef.current?.focus();
        return;
      }

      // Try looking up the typed barcode/code/name directly
      try {
        const { data } = await supabase
          .from('products')
          .select('*')
          .or(`barcode.eq.${queryTerm},user_define_barcode.eq.${queryTerm},code.eq.${queryTerm},item_name.ilike.%${queryTerm}%`)
          .limit(1);

        if (data && data.length > 0) {
          prod = data[0];
          const stocks = calculateStock(prod);
          setStockInfo(stocks);
        } else {
          toast.error(`No product found for "${queryTerm}"`);
          searchInputRef.current?.focus();
          return;
        }
      } catch (err) {
        console.error("Lookup error:", err);
        toast.error(`Error searching product "${queryTerm}"`);
        return;
      }
    }

    const qty = Number(reqQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Enter valid requisition quantity');
      reqQtyInputRef.current?.focus();
      return;
    }

    const cpu = Number(prod.purchase_price || 0);
    const mrp = Number(prod.mrp || 0);
    const stocks = calculateStock(prod);

    const existingIdx = reqItems.findIndex(i => i.product_id === prod.id);
    if (existingIdx > -1) {
      const updated = [...reqItems];
      const newQ = updated[existingIdx].req_qty + qty;
      updated[existingIdx] = {
        ...updated[existingIdx],
        req_qty: newQ,
        cost_value: newQ * cpu
      };
      setReqItems(updated);
    } else {
      const newItem = {
        product_id: prod.id,
        barcode: prod.barcode || prod.user_define_barcode || prod.code,
        product_code: prod.code || prod.barcode,
        product_name: prod.item_name,
        category: prod.category?.name || '',
        cpu: cpu,
        mrp: mrp,
        central_stock: stocks.central,
        local_stock: stocks.local,
        req_qty: qty,
        cost_value: cpu * qty
      };
      setReqItems(prev => [...prev, newItem]);
    }

    // Reset and refocus search input for continuous fast entry
    setSelectedProduct(null);
    setProductSearchInput('');
    setReqQty(1);
    setStockInfo({ central: 0, local: 0 });
    toast.success(`Added ${qty}x ${prod.item_name} to Requisition!`);
    searchInputRef.current?.focus();
  };

  // Inline Qty Change in Requisition Table
  const handleItemQtyChange = (index, newQty) => {
    const val = parseFloat(newQty);
    const updated = [...reqItems];
    const qty = isNaN(val) || val < 0 ? 0 : val;
    updated[index] = {
      ...updated[index],
      req_qty: qty,
      cost_value: qty * updated[index].cpu
    };
    setReqItems(updated);
  };

  // Remove Item from Requisition Table
  const handleRemoveItem = (index) => {
    const updated = reqItems.filter((_, idx) => idx !== index);
    setReqItems(updated);
    toast.success('Item removed');
  };

  // Clear Requisition Draft
  const handleClearDraft = () => {
    if (reqItems.length === 0) return;
    if (window.confirm('Are you sure you want to clear the entire requisition list?')) {
      setReqItems([]);
      setSelectedProduct(null);
      setProductSearchInput('');
      setReqQty(1);
      toast.success('Requisition list cleared');
      searchInputRef.current?.focus();
    }
  };

  // Submit Requisition to Central Store
  const handleSubmitRequisition = async () => {
    if (reqItems.length === 0) {
      toast.error('Requisition list is empty. Add products first.');
      return;
    }

    // Filter out items with 0 qty
    const validItems = reqItems.filter(i => i.req_qty > 0);
    if (validItems.length === 0) {
      toast.error('Please specify a requisition quantity greater than 0 for your items.');
      return;
    }

    setIsSubmitting(true);
    const totalQty = validItems.reduce((sum, i) => sum + i.req_qty, 0);
    const totalCost = validItems.reduce((sum, i) => sum + i.cost_value, 0);
    const preparedByName = user?.name || user?.username || 'BRANCH MANAGER';
    const shopName = storeDetails.name || posTerminal?.store_name || 'BRANCH STORE';

    const reqPayload = {
      requisition_no: requisitionNo,
      shop_name: shopName,
      requisition_date: new Date().toISOString().slice(0, 10),
      vendor: 'ANY',
      prepared_by: preparedByName,
      status: 'Pending', // Pending approval in Central Store
      total_qty: totalQty,
      total_value: totalCost,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      // 1. Insert into store_requisitions table (used by RequisitionApproval.jsx)
      const { data: sReqData, error: sReqErr } = await supabase
        .from('store_requisitions')
        .insert([reqPayload])
        .select()
        .single();

      if (sReqErr) {
        console.error("store_requisitions insert error:", sReqErr);
        toast.error(`Error saving requisition: ${sReqErr.message}`);
        setIsSubmitting(false);
        return;
      }

      const reqId = sReqData?.id;

      // 2. Insert items into store_requisition_items table
      const itemPayloads = validItems.map(item => ({
        requisition_id: reqId,
        barcode: item.barcode,
        product_code: item.product_code,
        product_name: item.product_name,
        category: item.category || '',
        cpu: item.cpu,
        mrp: item.mrp,
        bal_qty: item.local_stock,
        stock_in_cs: item.central_stock,
        req_qty: item.req_qty,
        app_qty: item.req_qty,
        cost_value: item.cost_value,
        is_approved: true
      }));

      const { error: itemsErr } = await supabase
        .from('store_requisition_items')
        .insert(itemPayloads);

      if (itemsErr) {
        console.warn("store_requisition_items insert note:", itemsErr);
      }

      // 3. Dual insert into requisitions table as backward compatible fallback
      try {
        const { data: rData } = await supabase.from('requisitions').insert([{
          shop_id: storeDetails.id,
          requisition_no: requisitionNo,
          requisition_date: new Date().toISOString().slice(0, 10),
          status: 'Pending',
          created_at: new Date().toISOString()
        }]).select().single();

        if (rData) {
          const rItems = validItems.map(item => ({
            requisition_id: rData.id,
            product_id: item.product_id,
            req_qty: item.req_qty,
            approve_qty: item.req_qty,
            barcode: item.barcode,
            product_code: item.product_code,
            product_name: item.product_name,
            cpu: item.cpu,
            mrp: item.mrp,
            cost_value: item.cost_value,
            bal_qty: item.local_stock
          }));
          await supabase.from('requisition_items').insert(rItems);
        }
      } catch (e) {
        console.warn("Dual fallback sync note:", e);
      }

      toast.success(`Requisition ${requisitionNo} submitted successfully to Central Store!`, { duration: 4500 });

      // Reset
      setReqItems([]);
      await generateRequisitionNo();
      await fetchRecentRequisitions();
      searchInputRef.current?.focus();
    } catch (err) {
      console.error("Error submitting requisition:", err);
      toast.error('Failed to submit requisition');
    } finally {
      setIsSubmitting(false);
    }
  };

  // View Details of a Past Requisition
  const handleViewDetails = async (req) => {
    setViewingReq(req);
    setIsViewModalOpen(true);
    setIsLoadingReqDetails(true);

    try {
      const { data, error } = await supabase
        .from('store_requisition_items')
        .select('*')
        .eq('requisition_id', req.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setViewingReqItems(data || []);
    } catch (err) {
      console.error("Error loading req details:", err);
      toast.error('Failed to load requisition items');
    } finally {
      setIsLoadingReqDetails(false);
    }
  };

  // Generate and Download PDF Requisition Challan
  const handlePrintSlip = async (req) => {
    try {
      let itemsToPrint = [];
      const { data, error } = await supabase
        .from('store_requisition_items')
        .select('*')
        .eq('requisition_id', req.id);

      if (!error && data && data.length > 0) {
        itemsToPrint = data;
      } else {
        itemsToPrint = viewingReqItems;
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Top Green Banner
      doc.setFillColor(46, 111, 64);
      doc.rect(0, 0, pageWidth, 22, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("EZ ERP MANAGEMENT INFORMATION SYSTEM (MIS)", 14, 11);

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.text("CENTRAL INVENTORY & POS SALES ANALYTICS", 14, 17);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("STORE REQUISITION CHALLAN", pageWidth - 14, 14, { align: 'right' });

      // User info
      const loggedInUser = JSON.parse(localStorage.getItem('erp_user') || '{}');
      const preparedByName = 
        req.prepared_by ||
        loggedInUser?.user_metadata?.full_name || 
        loggedInUser?.user_metadata?.name || 
        loggedInUser?.full_name || 
        loggedInUser?.name || 
        loggedInUser?.username || 
        (loggedInUser?.email ? loggedInUser.email.split('@')[0] : 'Super Admin');

      const reqDate = req.requisition_date 
        ? new Date(req.requisition_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      // 2. Metadata Section below Banner
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);

      doc.text(`Requisition No: ${req.requisition_no} | Date: ${reqDate}`, 14, 30);
      doc.text(`Store / Branch: ${req.shop_name || 'All'} | Status: ${req.status || 'Pending'}`, 14, 35);
      doc.text(`Generated On: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: 'right' });
      doc.text(`Printed By: ${preparedByName}`, pageWidth - 14, 35, { align: 'right' });

      // 3. Table
      const head = [['SL', 'Barcode', 'Product Name', 'CPU (Tk)', 'MRP (Tk)', 'Central Stock', 'Branch Stock', 'Req Qty', 'Cost Value (Tk)']];
      
      let totalReqQty = 0;
      let totalCostValue = 0;

      const body = (itemsToPrint || []).map((item, idx) => {
        const cpu = parseFloat(item.cpu || 0);
        const mrp = parseFloat(item.mrp || 0);
        const cs = parseFloat(item.stock_in_cs || 0);
        const bs = parseFloat(item.bal_qty || 0);
        const reqQty = parseFloat(item.req_qty || item.app_qty || 0);
        const costVal = parseFloat(item.cost_value || (cpu * reqQty) || 0);

        totalReqQty += reqQty;
        totalCostValue += costVal;

        return [
          idx + 1,
          item.barcode || item.product_code || '',
          item.product_name || '',
          cpu.toFixed(2),
          mrp.toFixed(2),
          cs.toFixed(2),
          bs.toFixed(2),
          reqQty,
          costVal.toFixed(2)
        ];
      });

      // Total summary row
      body.push([
        'Total',
        '',
        `${itemsToPrint.length} Items`,
        '',
        '',
        '',
        '',
        totalReqQty,
        totalCostValue.toFixed(2)
      ]);

      autoTable(doc, {
        head,
        body,
        startY: 40,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          valign: 'middle',
          overflow: 'linebreak',
          textColor: [50, 50, 50]
        },
        headStyles: {
          fillColor: [46, 111, 64],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 32 },
          2: { halign: 'left', cellWidth: 'auto' },
          3: { halign: 'right', cellWidth: 26 },
          4: { halign: 'right', cellWidth: 26 },
          5: { halign: 'right', cellWidth: 28 },
          6: { halign: 'right', cellWidth: 28 },
          7: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
          8: { halign: 'right', fontStyle: 'bold', cellWidth: 32 }
        },
        didParseCell: function (data) {
          if (data.section === 'head') {
            if (data.column.index === 0) data.cell.styles.halign = 'center';
            if (data.column.index === 1) data.cell.styles.halign = 'center';
            if (data.column.index === 2) data.cell.styles.halign = 'left';
            if (data.column.index >= 3) data.cell.styles.halign = 'right';
          }
          if (data.row.index === body.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 245, 240];
            data.cell.styles.textColor = [10, 60, 20];
          }
        },
        margin: { top: 10, left: 14, right: 14 }
      });

      // 4. Bottom Signatures
      const finalY = doc.lastAutoTable?.finalY || 100;
      const sigY = Math.max(finalY + 22, pageHeight - 24);

      doc.setDrawColor(160, 174, 192);

      // Prepared By (Left)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(preparedByName, 47.5, sigY - 2.5, { align: 'center' });

      doc.line(20, sigY, 75, sigY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Prepared By', 47.5, sigY + 5, { align: 'center' });

      // Checked By (Middle)
      doc.line(pageWidth / 2 - 27.5, sigY, pageWidth / 2 + 27.5, sigY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });

      // Authorized Signature (Right)
      doc.line(pageWidth - 75, sigY, pageWidth - 20, sigY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Authorized Signature', pageWidth - 47.5, sigY + 5, { align: 'center' });

      doc.save(`${req.requisition_no}_Challan.pdf`);
      toast.success(`Downloaded ${req.requisition_no} Requisition Slip PDF!`);
    } catch (err) {
      console.error("Error generating slip:", err);
      toast.error('Failed to generate PDF slip');
    }
  };

  const totalCostCalculated = reqItems.reduce((sum, i) => sum + (i.cost_value || 0), 0);
  const totalQtyCalculated = reqItems.reduce((sum, i) => sum + (i.req_qty || 0), 0);

  return (
    <div style={{ padding: '16px 20px', backgroundColor: '#f8fafc', minHeight: '100%', fontSize: '13px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Header */}
      <div style={{ 
        backgroundColor: '#fff', 
        padding: '16px 24px', 
        borderRadius: '10px', 
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
        marginBottom: '16px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            backgroundColor: '#ecfdf5', 
            padding: '10px', 
            borderRadius: '10px', 
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#0f172a' }}>
              Store Requisition Entry
            </h2>
            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span>Submit store stock requirements directly to Central Store</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ 
            backgroundColor: '#f1f5f9', 
            padding: '6px 14px', 
            borderRadius: '8px', 
            border: '1px solid #e2e8f0',
            textAlign: 'right' 
          }}>
            <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Requisition No</div>
            <div style={{ fontWeight: 'bold', color: '#059669', fontSize: '14px', letterSpacing: '0.5px' }}>{requisitionNo}</div>
          </div>

          <div style={{ 
            backgroundColor: '#eff6ff', 
            padding: '6px 14px', 
            borderRadius: '8px', 
            border: '1px solid #bfdbfe',
            textAlign: 'right' 
          }}>
            <div style={{ color: '#3b82f6', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Branch Store</div>
            <div style={{ fontWeight: 'bold', color: '#1e40af', fontSize: '14px' }}>
              {(storeDetails.name || posTerminal?.store_name || 'STORE').toUpperCase()}
            </div>
          </div>

          <div style={{ 
            backgroundColor: '#f8fafc', 
            padding: '6px 14px', 
            borderRadius: '8px', 
            border: '1px solid #e2e8f0',
            textAlign: 'right' 
          }}>
            <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Date</div>
            <div style={{ fontWeight: 'bold', color: '#334155', fontSize: '13px' }}>{currentDate}</div>
          </div>
        </div>
      </div>

      {/* Product Search & Entry Section */}
      <div style={{ 
        backgroundColor: '#fff', 
        padding: '20px 24px', 
        borderRadius: '10px', 
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
        marginBottom: '16px' 
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="#059669" />
            <span>Search & Add Products</span>
          </div>

          <button
            type="button"
            onClick={openStockModal}
            style={{
              padding: '5px 14px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            title="Browse all product stock levels (or press Enter on empty search box)"
          >
            <Warehouse size={14} /> Browse All Products Stock <span style={{ color: '#dc2626', fontSize: '11px', fontWeight: 'bold' }}>[Enter on Empty]</span>
          </button>
        </div>

        {/* Input Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px', gap: '14px', alignItems: 'flex-start', position: 'relative' }}>
          
          {/* Product Input Field */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', color: '#475569' }}>
              Product Name / Barcode : <span style={{ color: '#059669', fontWeight: 'normal' }}>(Press Enter on empty box for All Stock)</span>
            </label>
            
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={17} style={{ position: 'absolute', left: '12px', color: '#0284c7' }} />
              <input 
                ref={searchInputRef}
                type="text" 
                value={productSearchInput}
                onChange={(e) => {
                  setProductSearchInput(e.target.value);
                  if (selectedProduct) setSelectedProduct(null);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan Barcode or Type Product Name (Press Enter)..."
                style={{ 
                  width: '100%', 
                  padding: '10px 38px 10px 38px', 
                  border: '1.5px solid #0284c7', 
                  borderRadius: '6px', 
                  backgroundColor: '#f0f9ff', 
                  fontWeight: 'bold',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  boxShadow: '0 0 0 3px rgba(2, 132, 199, 0.1)'
                }}
              />

              {productSearchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setProductSearchInput('');
                    setSelectedProduct(null);
                    setSearchResults([]);
                    searchInputRef.current?.focus();
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Dropdown Live Results */}
            {searchResults.length > 0 && (
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                right: 0, 
                backgroundColor: '#fff', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', 
                zIndex: 100, 
                maxHeight: '260px', 
                overflowY: 'auto',
                marginTop: '4px'
              }}>
                {searchResults.map((prod, idx) => {
                  const stocks = calculateStock(prod);
                  const isHighlighted = idx === dropdownIndex;
                  return (
                    <div 
                      key={prod.id}
                      onClick={() => handleSelectProduct(prod)}
                      style={{ 
                        padding: '10px 14px', 
                        borderBottom: '1px solid #f1f5f9', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: isHighlighted ? '#f0fdf4' : '#fff'
                      }}
                      onMouseEnter={() => setDropdownIndex(idx)}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{prod.item_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '10px', marginTop: '2px' }}>
                          <span>Barcode: <strong>{prod.barcode || prod.code}</strong></span>
                          {prod.category?.name && <span>Cat: {prod.category.name}</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ textAlign: 'right', fontSize: '11px' }}>
                          <span style={{ color: '#15803d', fontWeight: 'bold' }}>CS: {stocks.central}</span>
                          <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                          <span style={{ color: '#1d4ed8', fontWeight: 'bold' }}>Store: {stocks.local}</span>
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#059669', fontSize: '13px' }}>
                          Tk {prod.mrp || 0}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Requisition Quantity Input */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', color: '#475569' }}>
              Req Qty (Pcs) :
            </label>
            <input 
              ref={reqQtyInputRef}
              type="number" 
              min="1"
              step="1"
              value={reqQty}
              onChange={(e) => setReqQty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItemToReq();
                }
              }}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1.5px solid #cbd5e1', 
                borderRadius: '6px', 
                textAlign: 'center', 
                fontWeight: 'bold',
                fontSize: '14px',
                outline: 'none',
                color: '#0f172a'
              }}
            />
          </div>

          {/* Add Item Button */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', visibility: 'hidden' }}>
              Action
            </label>
            <button 
              type="button"
              onClick={handleAddItemToReq}
              style={{ 
                width: '100%',
                padding: '10px 14px', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: '#059669',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                transition: 'background-color 0.15s ease'
              }}
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

        </div>

        {/* Selected Product Live Stock Preview Banner */}
        {selectedProduct && (
          <div style={{ 
            marginTop: '14px', 
            padding: '12px 18px', 
            backgroundColor: '#f0fdf4', 
            border: '1.5px solid #86efac', 
            borderRadius: '8px', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Package size={22} color="#059669" />
              <div>
                <div style={{ fontWeight: 'bold', color: '#065f46', fontSize: '14px' }}>
                  {selectedProduct.item_name}
                </div>
                <div style={{ fontSize: '11px', color: '#047857', display: 'flex', gap: '12px', marginTop: '2px' }}>
                  <span>Barcode: <strong>{selectedProduct.barcode || selectedProduct.code}</strong></span>
                  <span>CPU: <strong>Tk {selectedProduct.purchase_price || 0}</strong></span>
                  <span>MRP: <strong>Tk {selectedProduct.mrp || 0}</strong></span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ 
                backgroundColor: '#dcfce7', 
                padding: '6px 14px', 
                borderRadius: '6px', 
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Warehouse size={16} color="#15803d" />
                <div>
                  <div style={{ fontSize: '10px', color: '#166534', fontWeight: 600 }}>CENTRAL STORE STOCK</div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#15803d' }}>
                    {stockInfo.central} Pcs
                  </div>
                </div>
              </div>

              <div style={{ 
                backgroundColor: '#dbeafe', 
                padding: '6px 14px', 
                borderRadius: '6px', 
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Store size={16} color="#1d4ed8" />
                <div>
                  <div style={{ fontSize: '10px', color: '#1e40af', fontWeight: 600 }}>THIS BRANCH STOCK</div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1d4ed8' }}>
                    {stockInfo.local} Pcs
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Requisition Items Table */}
      <div style={{ 
        backgroundColor: '#fff', 
        borderRadius: '10px', 
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
        padding: '18px 22px', 
        marginBottom: '20px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Requisition Items List</span>
            <span style={{ 
              backgroundColor: '#e2e8f0', 
              color: '#334155', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '11px', 
              fontWeight: 'bold' 
            }}>
              {reqItems.length} items
            </span>
          </div>

          {reqItems.length > 0 && (
            <button
              type="button"
              onClick={handleClearDraft}
              style={{
                fontSize: '11px',
                color: '#dc2626',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Trash2 size={13} /> Clear Draft
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '9px 12px', textAlign: 'center', width: '40px' }}>SL</th>
                <th style={{ padding: '9px 12px', textAlign: 'left' }}>Barcode</th>
                <th style={{ padding: '9px 12px', textAlign: 'left' }}>Product Name</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>CPU (Tk)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>MRP (Tk)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', color: '#15803d', fontWeight: 'bold' }}>Central Stock</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', color: '#1d4ed8', fontWeight: 'bold' }}>This Store Stock</th>
                <th style={{ padding: '9px 12px', textAlign: 'center', width: '110px', fontWeight: 'bold' }}>Req Qty</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 'bold' }}>Cost Value (Tk)</th>
                <th style={{ padding: '9px 12px', textAlign: 'center', width: '60px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reqItems.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ padding: '35px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Package size={32} color="#cbd5e1" />
                      <div>No items added to requisition yet. Scan a barcode or search above.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                reqItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.1s ease' }}>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{item.barcode}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#0f172a' }}>{item.product_name}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>Tk {parseFloat(item.cpu || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>Tk {parseFloat(item.mrp || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: '#15803d' }}>{item.central_stock}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: '#1d4ed8' }}>{item.local_stock}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                      <input 
                        type="number" 
                        min="1"
                        step="1"
                        value={item.req_qty}
                        onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                        style={{
                          width: '75px',
                          padding: '4px 6px',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          border: '1.5px solid #94a3b8',
                          fontSize: '13px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: '#059669', fontSize: '13px' }}>
                      Tk {parseFloat(item.cost_value || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button 
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{ 
                          padding: '5px 8px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary & Submit Button */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderTop: '1.5px solid #e2e8f0', 
          paddingTop: '16px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              Total Unique Items: <strong style={{ color: '#0f172a', fontSize: '14px' }}>{reqItems.length}</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              Total Quantity: <strong style={{ color: '#0f172a', fontSize: '15px' }}>{totalQtyCalculated} Pcs</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              Total Cost Value: <strong style={{ color: '#059669', fontSize: '16px' }}>Tk {totalCostCalculated.toFixed(2)}</strong>
            </div>
          </div>

          <button 
            type="button"
            disabled={isSubmitting || reqItems.length === 0}
            onClick={handleSubmitRequisition}
            style={{ 
              padding: '11px 28px', 
              fontWeight: 'bold', 
              cursor: reqItems.length === 0 || isSubmitting ? 'not-allowed' : 'pointer',
              opacity: reqItems.length === 0 || isSubmitting ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              boxShadow: '0 2px 5px rgba(5, 150, 105, 0.25)'
            }}
          >
            <Send size={16} /> {isSubmitting ? 'Submitting Requisition...' : 'Submit Requisition to Central Store'}
          </button>
        </div>

      </div>

      {/* Recent Store Requisitions Status Table */}
      <div style={{ 
        backgroundColor: '#fff', 
        borderRadius: '10px', 
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
        padding: '18px 22px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color="#0284c7" />
            <span>Recent Store Requisitions Status</span>
          </div>

          <button
            type="button"
            onClick={fetchRecentRequisitions}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Requisition No</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Shop Name</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Qty</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cost Value (Tk)</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingRecent ? (
                <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading requisitions...</td></tr>
              ) : recentRequisitions.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No requisitions submitted yet.</td></tr>
              ) : (
                recentRequisitions.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#059669', fontFamily: 'monospace' }}>
                      {req.requisition_no}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>
                      {req.requisition_date ? new Date(req.requisition_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{req.shop_name || 'N/A'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold' }}>{req.total_qty || 0}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                      Tk {parseFloat(req.total_value || req.total_cost_value || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '3px 10px', 
                        borderRadius: '12px', 
                        fontSize: '11px', 
                        fontWeight: 'bold',
                        backgroundColor: req.status === 'Approved' ? '#dcfce7' : req.status === 'Cancelled' || req.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                        color: req.status === 'Approved' ? '#15803d' : req.status === 'Cancelled' || req.status === 'Rejected' ? '#b91c1c' : '#b45309'
                      }}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleViewDetails(req)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '11px',
                            color: '#334155'
                          }}
                          title="View Details"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintSlip(req)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '11px',
                            color: '#1d4ed8'
                          }}
                          title="Print Requisition Slip PDF"
                        >
                          <Printer size={13} /> Slip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: "All Products Stock List" (Stock Browser & Picker) */}
      {/* ========================================================= */}
      {isStockModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '1050px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Warehouse size={20} color="#059669" /> All Products Stock Directory
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Comparing stock for <strong>{(storeDetails.name || posTerminal?.store_name || 'Branch').toUpperCase()}</strong> vs <strong>Central Store</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Search & Filter Bar */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  ref={stockModalSearchRef}
                  type="text"
                  value={stockModalSearch}
                  onChange={(e) => setStockModalSearch(e.target.value)}
                  placeholder="Filter by product name, barcode, code, or category..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setStockModalFilter('all')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: stockModalFilter === 'all' ? '#0f172a' : '#f1f5f9',
                    color: stockModalFilter === 'all' ? '#fff' : '#475569'
                  }}
                >
                  All Items ({allProductsStock.length})
                </button>

                <button
                  type="button"
                  onClick={() => setStockModalFilter('cs_available')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: stockModalFilter === 'cs_available' ? '#059669' : '#f1f5f9',
                    color: stockModalFilter === 'cs_available' ? '#fff' : '#475569'
                  }}
                >
                  Central Store In-Stock (&gt; 0)
                </button>

                <button
                  type="button"
                  onClick={() => setStockModalFilter('local_zero')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: stockModalFilter === 'local_zero' ? '#2563eb' : '#f1f5f9',
                    color: stockModalFilter === 'local_zero' ? '#fff' : '#475569'
                  }}
                >
                  Branch Out-of-Stock (&le; 0)
                </button>
              </div>
            </div>

            {/* Modal Table Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1, borderBottom: '1px solid #cbd5e1' }}>
                  <tr>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '35px' }}>SL</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', width: '110px' }}>Barcode / Code</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', width: '110px' }}>Category</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', width: '75px' }}>CPU (Tk)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', width: '75px' }}>MRP (Tk)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', width: '100px', color: '#15803d', fontWeight: 'bold' }}>Central Stock</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', width: '100px', color: '#1d4ed8', fontWeight: 'bold' }}>Branch Stock</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '90px' }}>Req Qty</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '110px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingStockModal ? (
                    <tr><td colSpan="10" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading products stock data...</td></tr>
                  ) : filteredStockProducts.length === 0 ? (
                    <tr><td colSpan="10" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No matching products found.</td></tr>
                  ) : (
                    filteredStockProducts.map((p, idx) => {
                      const stocks = calculateStock(p);
                      const isAdded = reqItems.some(i => i.product_id === p.id);
                      const addedItem = reqItems.find(i => i.product_id === p.id);

                      return (
                        <tr 
                          key={p.id} 
                          style={{ 
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isAdded ? '#f0fdf4' : 'transparent',
                            cursor: 'pointer'
                          }}
                          onDoubleClick={() => handleAddItemFromModal(p)}
                        >
                          <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 600 }}>{p.barcode || p.code}</td>
                          <td style={{ padding: '8px', fontWeight: 'bold', color: '#0f172a' }}>{p.item_name}</td>
                          <td style={{ padding: '8px', color: '#64748b' }}>{p.category?.name || '-'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>Tk {p.purchase_price || 0}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>Tk {p.mrp || 0}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#15803d' }}>
                            <span style={{ 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              backgroundColor: stocks.central > 0 ? '#dcfce7' : '#fee2e2',
                              color: stocks.central > 0 ? '#15803d' : '#991b1b'
                            }}>
                              {stocks.central}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#1d4ed8' }}>
                            <span style={{ 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              backgroundColor: stocks.local > 0 ? '#dbeafe' : '#fef3c7',
                              color: stocks.local > 0 ? '#1e40af' : '#92400e'
                            }}>
                              {stocks.local}
                            </span>
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            <input 
                              type="number"
                              min="1"
                              step="1"
                              value={stockModalQtys[p.id] || 1}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                setStockModalQtys(prev => ({ ...prev, [p.id]: val }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '60px',
                                padding: '3px 4px',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                fontSize: '12px'
                              }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => handleAddItemFromModal(p, e)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: isAdded ? '#059669' : '#0284c7',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {isAdded ? (
                                <>
                                  <Check size={12} /> Added ({addedItem?.req_qty})
                                </>
                              ) : (
                                <>
                                  <Plus size={12} /> Add
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                Showing <strong>{filteredStockProducts.length}</strong> products | Double-click row to add with 1 Qty
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669' }}>
                  Requisition Items: {reqItems.length}
                </span>
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  style={{
                    padding: '6px 18px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: View Past Requisition Details Modal */}
      {/* ========================================================= */}
      {isViewModalOpen && viewingReq && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a' }}>
                  Requisition Details - {viewingReq.requisition_no}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Store: <strong>{viewingReq.shop_name}</strong> | Date: <strong>{viewingReq.requisition_date ? new Date(viewingReq.requisition_date).toLocaleDateString('en-GB') : ''}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Details Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>STATUS</div>
                  <div style={{ fontWeight: 'bold', color: viewingReq.status === 'Approved' ? '#15803d' : '#b45309' }}>
                    {viewingReq.status}
                  </div>
                </div>
                <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>PREPARED BY</div>
                  <div style={{ fontWeight: 'bold' }}>{viewingReq.prepared_by || 'Staff'}</div>
                </div>
                <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>TOTAL QUANTITY</div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{viewingReq.total_qty || 0} Pcs</div>
                </div>
                <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>TOTAL COST VALUE</div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#059669' }}>
                    Tk {parseFloat(viewingReq.total_value || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '8px', textAlign: 'center', width: '35px' }}>SL</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Barcode</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>CPU (Tk)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>MRP (Tk)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Central Stock</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Branch Stock</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Req Qty</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>App Qty</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Cost Value</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingReqDetails ? (
                    <tr><td colSpan="10" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading line items...</td></tr>
                  ) : viewingReqItems.length === 0 ? (
                    <tr><td colSpan="10" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No line items found.</td></tr>
                  ) : (
                    viewingReqItems.map((item, idx) => (
                      <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px', fontFamily: 'monospace' }}>{item.barcode}</td>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.product_name}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>Tk {parseFloat(item.cpu || 0).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>Tk {parseFloat(item.mrp || 0).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#15803d' }}>{item.stock_in_cs || 0}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#1d4ed8' }}>{item.bal_qty || 0}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{item.req_qty || 0}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: item.is_approved ? '#15803d' : '#dc2626' }}>
                          {item.app_qty !== undefined ? item.app_qty : item.req_qty}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>
                          Tk {parseFloat(item.cost_value || (item.cpu * (item.req_qty || 0))).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => handlePrintSlip(viewingReq)}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={14} /> Download PDF Slip
              </button>

              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                style={{
                  padding: '6px 18px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PosRequisition;
