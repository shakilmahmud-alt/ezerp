import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Search, X, Printer } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CustomSelect from '../components/CustomSelect';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAuth } from '../context/AuthContext';

const StoreDelivery = () => {
  const { user } = useAuth();
  const [view, setView] = useState('list');
  const [requisitions, setRequisitions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listSearch, setListSearch] = useState('');
  
  const [listFromDate, setListFromDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [listToDate, setListToDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State
  const [isChallanWise, setIsChallanWise] = useState(false);
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRcvChallan, setSelectedRcvChallan] = useState('');
  const [rcvChallans, setRcvChallans] = useState([]);
  
  const [selectedStore, setSelectedStore] = useState('');
  const [stores, setStores] = useState([]);
  
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [barcodeSearch, setBarcodeSearch] = useState('');
  
  const [formProduct, setFormProduct] = useState(null); // the product currently being searched
  const [deliveryQty, setDeliveryQty] = useState('');
  const [items, setItems] = useState([]);

  // Product Selection Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [challanProducts, setChallanProducts] = useState([]);

  const barcodeInputRef = useRef(null);
  const deliveryQtyRef = useRef(null);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (view === 'list') {
      fetchRequisitions();
    }
  }, [view, listFromDate, listToDate]);

  useEffect(() => {
    if (view === 'add' && isChallanWise) {
      fetchPurchaseReceives();
    }
  }, [view, isChallanWise, fromDate, toDate]);

  useEffect(() => {
    if (selectedRcvChallan) {
      loadChallanProducts(selectedRcvChallan);
    } else {
      setChallanProducts([]);
    }
  }, [selectedRcvChallan]);

  const loadChallanProducts = async (prId) => {
    if (!prId) {
      setChallanProducts([]);
      return;
    }
    try {
      const { data: itemsData, error } = await supabase
        .from('purchase_receive_items')
        .select('*')
        .eq('purchase_receive_id', prId);

      if (error) throw error;

      if (itemsData && itemsData.length > 0) {
        const prodIds = itemsData.map(i => i.product_id).filter(Boolean);
        const { data: prods } = await supabase
          .from('products')
          .select('id, code, item_name, barcode, user_define_barcode, wh_stock, purchase_price, mrp')
          .in('id', prodIds);

        const prodMap = {};
        if (prods) {
          prods.forEach(p => { prodMap[p.id] = p; });
        }

        const merged = itemsData.map(item => ({
          ...item,
          products: prodMap[item.product_id] || item.products || null
        }));

        setChallanProducts(merged);
      } else {
        setChallanProducts([]);
      }
    } catch (err) {
      console.error('Error loading challan items', err);
    }
  };

  const openProductModal = async () => {
    if (isChallanWise) {
      if (!selectedRcvChallan) {
        toast.error('Please select a Rcv. Challan first');
        return;
      }
      if (challanProducts.length === 0) {
        await loadChallanProducts(selectedRcvChallan);
      }
      setShowProductModal(true);
      setModalSearch('');
    } else {
      setIsLoading(true);
      try {
        const { data: prods, error } = await supabase
          .from('products')
          .select('id, code, item_name, barcode, user_define_barcode, wh_stock, purchase_price, mrp')
          .order('item_name')
          .limit(200);

        if (error) throw error;

        if (prods) {
          const formatted = prods.map(p => ({
            id: p.id,
            product_id: p.id,
            products: p,
            rcv_qty: '-',
            pur_price: p.purchase_price,
            sale_price: p.mrp
          }));
          setChallanProducts(formatted);
        }
        setShowProductModal(true);
        setModalSearch('');
      } catch (err) {
        console.error(err);
        toast.error('Failed to load products');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const selectModalProduct = (item) => {
    const prod = item.products || item;
    const centralStock = prod.wh_stock !== undefined && prod.wh_stock !== null ? Number(prod.wh_stock) : 0;

    const targetProduct = {
      ...prod,
      c_stock: centralStock,
      purchase_price: item.pur_price !== undefined && item.pur_price !== null ? item.pur_price : (prod.purchase_price || 0),
      mrp: item.sale_price !== undefined && item.sale_price !== null ? item.sale_price : (prod.mrp || 0)
    };

    setFormProduct(targetProduct);
    setBarcodeSearch(prod.barcode || prod.user_define_barcode || prod.code || '');
    setDeliveryQty('');
    setShowProductModal(false);

    setTimeout(() => {
      deliveryQtyRef.current?.focus();
    }, 100);

    toast.success(`Selected "${prod.item_name}"`, { id: 'product-select' });
  };

  const fetchRequisitions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('requisitions')
        .select(`
          id,
          requisition_no,
          challan_no,
          requisition_date,
          status,
          stores ( name )
        `)
        .gte('requisition_date', listFromDate)
        .lte('requisition_date', listToDate)
        .not('requisition_no', 'like', 'SDR%')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== '42P01') throw error;
        else console.log('requisitions table does not exist yet.');
      }
      setRequisitions(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load store deliveries');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const { data: storeList } = await supabase.from('stores').select('id, name').order('name');
      const { data: shopList } = await supabase.from('shops').select('id, name').order('name');
      const all = [...(storeList || []), ...(shopList || [])];
      const unique = [];
      const seen = new Set();
      for (const s of all) {
        if (s && s.id && !seen.has(s.id)) {
          seen.add(s.id);
          unique.push(s);
        }
      }
      setStores(unique);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPurchaseReceives = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_receives')
        .select('id, reference_no, purchase_date, last_challan_no')
        .gte('purchase_date', fromDate)
        .lte('purchase_date', toDate)
        .eq('status', 'Saved');
      
      if (data) {
        const unique = [];
        const seen = new Set();
        for (const item of data) {
           if (!seen.has(item.last_challan_no)) {
             seen.add(item.last_challan_no);
             unique.push(item);
           }
        }
        setRcvChallans(unique);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBarcodeSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const queryStr = barcodeSearch ? barcodeSearch.trim() : '';
    if (!queryStr) return;

    if (isChallanWise && !selectedRcvChallan) {
      toast.error('Please select a Rcv. Challan first');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Search product by exact barcode, user_barcode, or item_code
      let { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', queryStr);

      if (!prodData || prodData.length === 0) {
        const { data: userBarcodeData } = await supabase
          .from('products')
          .select('*')
          .eq('user_barcode', queryStr);
        if (userBarcodeData && userBarcodeData.length > 0) prodData = userBarcodeData;
      }

      if (!prodData || prodData.length === 0) {
        const { data: itemCodeData } = await supabase
          .from('products')
          .select('*')
          .or(`item_code.eq.${queryStr},barcode.ilike.%${queryStr}%`);
        if (itemCodeData && itemCodeData.length > 0) prodData = itemCodeData;
      }

      if (!prodData || prodData.length === 0) {
        toast.error(`Product with barcode "${queryStr}" not found in database`);
        setIsLoading(false);
        return;
      }

      const prod = prodData[0];

      // 2. If Challan Wise Delivery is enabled, verify product belongs to selected challan
      if (isChallanWise && selectedRcvChallan) {
        const { data: rcvItems, error: rcvErr } = await supabase
          .from('purchase_receive_items')
          .select('id, rcv_qty')
          .eq('purchase_receive_id', selectedRcvChallan)
          .eq('product_id', prod.id);

        if (rcvErr || !rcvItems || rcvItems.length === 0) {
          toast.error('This product does not exist in the selected Purchase Challan.');
          setIsLoading(false);
          return;
        }
      }

      // 3. Central Store Stock (wh_stock) for Store Delivery
      const centralStock = prod.wh_stock !== undefined && prod.wh_stock !== null ? Number(prod.wh_stock) : 0;

      const targetProduct = {
        ...prod,
        c_stock: centralStock
      };

      // Populate form fields ONLY. Delivery Quantity remains BLANK. DO NOT auto-add to list.
      setFormProduct(targetProduct);
      setBarcodeSearch('');
      setDeliveryQty('');

      // Focus Delivery Quantity input field for manual quantity entry
      setTimeout(() => {
        deliveryQtyRef.current?.focus();
      }, 100);

      toast.success(`Product "${prod.item_name}" details loaded`);

    } catch (err) {
      console.error(err);
      toast.error('Error finding product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDeliveryQty = () => {
    if (!formProduct) return toast.error('No product selected');
    if (!deliveryQty || isNaN(deliveryQty) || Number(deliveryQty) <= 0) {
      return toast.error('Please enter a valid delivery quantity');
    }

    const qtyNum = Number(deliveryQty);
    const centralStock = Number(formProduct.c_stock ?? formProduct.wh_stock ?? 0);

    // Central Store Stock Warning Validation
    if (qtyNum > centralStock) {
      return toast.error(`Delivery quantity (${qtyNum} pcs) cannot exceed Central Store Stock (${centralStock} pcs)!`);
    }

    const existingIdx = items.findIndex(i => i.product_id === formProduct.id);
    if (existingIdx > -1) {
      const updated = [...items];
      const newQty = updated[existingIdx].delQty + qtyNum;
      if (newQty > centralStock) {
        return toast.error(`Total delivery quantity (${newQty} pcs) cannot exceed Central Store Stock (${centralStock} pcs)!`);
      }
      updated[existingIdx].delQty = newQty;
      updated[existingIdx].costValue = (formProduct.purchase_price || 0) * newQty;
      updated[existingIdx].saleValue = (formProduct.mrp || 0) * newQty;
      setItems(updated);
      toast.success(`Updated "${formProduct.item_name}" quantity to ${newQty} pcs`);
    } else {
      const newItem = {
        id: `temp-${Date.now()}`,
        product_id: formProduct.id,
        code: formProduct.barcode || formProduct.code,
        barcode: formProduct.barcode || formProduct.code,
        productName: formProduct.item_name,
        delQty: qtyNum,
        cStock: centralStock,
        cpu: formProduct.purchase_price || 0,
        salePrice: formProduct.mrp || 0,
        costValue: (formProduct.purchase_price || 0) * qtyNum,
        saleValue: (formProduct.mrp || 0) * qtyNum
      };
      setItems([...items, newItem]);
      toast.success(`Added "${formProduct.item_name}" (${qtyNum} pcs) to delivery list`);
    }

    // Reset form product & refocus barcode search input
    setFormProduct(null);
    setDeliveryQty('');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  const handleStatusUpdate = async (id, newStatus, currentStatus) => {
    if (newStatus === 'Cancelled') {
      const confirmCancel = window.confirm(
        'Are you sure you want to Cancel this delivery?\nAll items in this delivery will be returned back to Central Store stock.'
      );
      if (!confirmCancel) return;
    }

    setIsLoading(true);
    try {
      if (newStatus === 'Cancelled' && currentStatus !== 'Cancelled') {
        // 1. Fetch items for this delivery
        const { data: reqItems, error: itemsErr } = await supabase
          .from('requisition_items')
          .select('product_id, approve_qty, req_qty')
          .eq('requisition_id', id);

        if (itemsErr) throw itemsErr;

        // 2. Restore stock to Central Store (wh_stock in products table)
        if (reqItems && reqItems.length > 0) {
          for (const item of reqItems) {
            const qtyToReturn = Number(item.approve_qty || item.req_qty || 0);
            if (qtyToReturn > 0 && item.product_id) {
              const { data: prod } = await supabase
                .from('products')
                .select('wh_stock')
                .eq('id', item.product_id)
                .single();

              if (prod) {
                const currentWh = Number(prod.wh_stock || 0);
                await supabase
                  .from('products')
                  .update({ wh_stock: currentWh + qtyToReturn })
                  .eq('id', item.product_id);
              }
            }
          }
        }
      }

      // 3. Update status in requisitions table
      const { error } = await supabase
        .from('requisitions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      if (newStatus === 'Cancelled') {
        toast.success('Store Delivery cancelled and stock restored to Central Store!');
      } else {
        toast.success(`Delivery ${newStatus} successfully`);
      }

      fetchRequisitions();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintExistingDelivery = async (req) => {
    setIsLoading(true);
    try {
      const { data: reqItems } = await supabase
        .from('requisition_items')
        .select('*, products(item_name, barcode, mrp)')
        .eq('requisition_id', req.id);

      if (!reqItems || reqItems.length === 0) {
        toast.error('No items found for this delivery');
        return;
      }

      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let displayChallanNo = req.challan_no || req.requisition_no || '';
      if (!displayChallanNo.startsWith('#')) displayChallanNo = `#${displayChallanNo}`;

      const currentUserName = user?.name || user?.username || (localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user'))?.name || JSON.parse(localStorage.getItem('erp_user'))?.username : '') || 'Admin';
      const displayName = (currentUserName === 'msmraqeeb@gmail.com' || currentUserName === 'admin@email.com') ? 'Admin' : currentUserName;

      // 1. Top Middle
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(46, 111, 64);
      doc.text('EZ ERP', pageWidth / 2, 13, { align: 'center' });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      doc.text('House: 352, Lane: 05, 2nd floor, Baridhara DOHS, Dhaka-1212, Bangladesh', pageWidth / 2, 18, { align: 'center' });

      // 2. Right Side
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(46, 111, 64);
      doc.text('STORE DELIVERY CHALLAN', pageWidth - 14, 13, { align: 'right' });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.text(`Challan No: ${displayChallanNo}`, pageWidth - 14, 18.5, { align: 'right' });
      doc.text(`Delivery Date: ${req.requisition_date?.split('T')[0] || ''}`, pageWidth - 14, 23, { align: 'right' });
      doc.text(`Delivery To: ${req.stores?.name || 'N/A'}`, pageWidth - 14, 27.5, { align: 'right' });

      // 3. Left Side
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.text('Store Name:', 14, 18.5);
      doc.setFont("helvetica", "normal");
      doc.text(`${req.stores?.name || 'N/A'}`, 42, 18.5);

      doc.setFont("helvetica", "bold");
      doc.text('Reference No:', 14, 23);
      doc.setFont("helvetica", "normal");
      doc.text(`${req.requisition_no || 'N/A'}`, 42, 23);

      doc.setFont("helvetica", "bold");
      doc.text('Delivery From:', 14, 27.5);
      doc.setFont("helvetica", "normal");
      doc.text('Central Store', 42, 27.5);

      // 4. Table
      const tableCols = ["SL", "Barcode", "Item Name", "CPU", "Sale Price", "Del Qty", "C. Stock", "Cost Value", "Sale Value"];
      let totalDelQty = 0;
      let totalCostVal = 0;
      let totalSaleVal = 0;

      const tableRows = reqItems.map((i, idx) => {
        const qty = Number(i.approve_qty || i.req_qty || 0);
        const cpu = Number(i.cpu || 0);
        const mrp = Number(i.products?.mrp || i.mrp || 0);
        const costVal = Number(i.cost_value || (cpu * qty));
        const saleVal = mrp * qty;

        totalDelQty += qty;
        totalCostVal += costVal;
        totalSaleVal += saleVal;

        return [
          idx + 1,
          i.products?.barcode || i.barcode || '-',
          i.products?.item_name || i.product_name || '',
          cpu.toFixed(2),
          mrp.toFixed(2),
          qty,
          Number(i.bal_qty || 0),
          costVal.toFixed(2),
          saleVal.toFixed(2)
        ];
      });

      tableRows.push(['Total', '', '', '', '', totalDelQty, '', totalCostVal.toFixed(2), totalSaleVal.toFixed(2)]);

      autoTable(doc, {
        head: [tableCols],
        body: tableRows,
        startY: 32,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 30, 30] },
        headStyles: { fillColor: [46, 111, 64], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'left', cellWidth: 30 },
          2: { halign: 'left', cellWidth: 'auto' },
          3: { halign: 'right', cellWidth: 24 },
          4: { halign: 'right', cellWidth: 24 },
          5: { halign: 'right', cellWidth: 22 },
          6: { halign: 'right', cellWidth: 22 },
          7: { halign: 'right', cellWidth: 28 },
          8: { halign: 'right', cellWidth: 28 }
        },
        didParseCell: function (data) {
          if (data.section === 'head') {
            if (data.column.index === 0) data.cell.styles.halign = 'center';
            if (data.column.index === 1 || data.column.index === 2) data.cell.styles.halign = 'left';
          }
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 245, 240];
          }
        },
        margin: { top: 10, left: 14, right: 14 }
      });

      const finalY = doc.lastAutoTable.finalY || 80;
      const sigY = Math.max(finalY + 26, pageHeight - 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setLineWidth(0.4);
      doc.setDrawColor(120, 120, 120);
      doc.setTextColor(40, 40, 40);

      // Posted By
      doc.line(20, sigY, 70, sigY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(2, 132, 199);
      doc.text(displayName, 45, sigY - 2, { align: 'center' });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text('Posted By', 45, sigY + 5, { align: 'center' });

      // Checked By
      doc.setFont("helvetica", "bold");
      doc.line(pageWidth / 2 - 25, sigY, pageWidth / 2 + 25, sigY);
      doc.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });

      // Authorized Signature
      doc.setFont("helvetica", "bold");
      doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
      doc.text('Authorized Signature', pageWidth - 45, sigY + 5, { align: 'center' });

      const cleanFilename = String(displayChallanNo).replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`StoreDelivery_${cleanFilename}.pdf`);
      toast.success('Delivery PDF downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to print delivery');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (status = 'Pending') => {
    if (!selectedStore) return toast.error('Please select Delivery To (Store)');
    if (items.length === 0) return toast.error('No items to deliver');

    setIsLoading(true);
    try {
      // Get the shop_id for the selected store
      let shopId = null;
      const matchedStore = stores.find(s => s.name === selectedStore || s.id === selectedStore);
      if (matchedStore) {
        shopId = matchedStore.id;
      } else {
        const { data: storeData } = await supabase.from('stores').select('id, name').eq('name', selectedStore).maybeSingle();
        if (storeData) {
          shopId = storeData.id;
        } else {
          const { data: shopData } = await supabase.from('shops').select('id, name').eq('name', selectedStore).maybeSingle();
          if (shopData) shopId = shopData.id;
        }
      }

      // Generate a new Challan No
      const todayStr = new Date().toISOString().slice(0,10).replace(/-/g,''); 
      const random3 = Math.floor(100 + Math.random() * 900);
      const challanNo = `DLV${todayStr}${random3}`;
      
      const reqNo = `REQ${todayStr}${random3}`; // fallback for requisition_no

      const { data: deliveryData, error: deliveryErr } = await supabase
        .from('requisitions')
        .insert({
          requisition_no: reqNo,
          challan_no: challanNo,
          shop_id: shopId,
          requisition_date: deliveryDate,
          status: status
        })
        .select()
        .single();

      if (deliveryErr) throw deliveryErr;

      // Insert items
      const itemPayload = items.map(item => ({
        requisition_id: deliveryData.id,
        product_id: item.product_id,
        barcode: item.barcode,
        product_code: item.code,
        product_name: item.productName,
        cpu: item.cpu,
        mrp: item.salePrice,
        req_qty: item.delQty,
        approve_qty: item.delQty,
        cost_value: item.costValue,
        bal_qty: item.cStock // mapping cStock to bal_qty just to save it
      }));

      const { error: itemsErr } = await supabase.from('requisition_items').insert(itemPayload);
      if (itemsErr) throw itemsErr;

      // Deduct from Central Store (wh_stock)
      for (const item of items) {
        const { data: prod } = await supabase
          .from('products')
          .select('wh_stock')
          .eq('id', item.product_id)
          .single();
        if (prod) {
          const currentWh = Number(prod.wh_stock || 0);
          const newWh = Math.max(0, currentWh - Number(item.delQty || 0));
          await supabase
            .from('products')
            .update({ wh_stock: newWh })
            .eq('id', item.product_id);
        }
      }

      toast.success(`Delivery saved successfully! Challan No: ${challanNo}`);
      generatePDF(challanNo);
      handleReset();
      setView('list');

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save delivery. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormProduct(null);
    setDeliveryQty('');
    setItems([]);
    setBarcodeSearch('');
    setSelectedRcvChallan('');
    setSelectedStore('');
    setIsChallanWise(false);
  };

  const generatePDF = (savedChallanNo = null, isDuplicate = false, isPreview = false) => {
    const duplicate = isDuplicate === true;
    const preview = isPreview === true || (typeof savedChallanNo !== 'string' && !savedChallanNo);

    if (items.length === 0) return toast.error('No items to preview');
    
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let displayChallanNo = '';
    if (typeof savedChallanNo === 'string' && savedChallanNo.trim()) {
      displayChallanNo = savedChallanNo.trim();
    } else {
      const dateObj = new Date();
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      displayChallanNo = `#DLV${yyyy}${mm}${dd}001`;
    }

    if (!displayChallanNo.startsWith('#')) {
      displayChallanNo = `#${displayChallanNo}`;
    }

    const selectedChallanObj = rcvChallans.find(c => c.id === selectedRcvChallan);
    const refText = selectedChallanObj ? (selectedChallanObj.last_challan_no || selectedChallanObj.reference_no) : 'N/A';

    const currentUserName = user?.name || user?.username || (localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user'))?.name || JSON.parse(localStorage.getItem('erp_user'))?.username : '') || 'Admin';
    const displayName = (currentUserName === 'msmraqeeb@gmail.com' || currentUserName === 'admin@email.com') ? 'Admin' : currentUserName;

    const renderPageContent = (docInstance, isSecondCopy = false) => {
      // 1. Top Middle / Center: Company Name & Address
      docInstance.setFont("helvetica", "bold");
      docInstance.setFontSize(16);
      docInstance.setTextColor(46, 111, 64); // Project theme green #2e6f40
      docInstance.text('EZ ERP', pageWidth / 2, 13, { align: 'center' });

      docInstance.setFont("helvetica", "normal");
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(70, 70, 70);
      docInstance.text('House: 352, Lane: 05, 2nd floor, Baridhara DOHS, Dhaka-1212, Bangladesh', pageWidth / 2, 18, { align: 'center' });

      // 2. Right Side: STORE DELIVERY CHALLAN Details
      docInstance.setFont("helvetica", "bold");
      docInstance.setFontSize(11);
      docInstance.setTextColor(46, 111, 64);
      docInstance.text('STORE DELIVERY CHALLAN', pageWidth - 14, 13, { align: 'right' });

      docInstance.setFont("helvetica", "normal");
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(30, 30, 30);
      docInstance.text(`Challan No: ${displayChallanNo}`, pageWidth - 14, 18.5, { align: 'right' });
      docInstance.text(`Delivery Date: ${deliveryDate}`, pageWidth - 14, 23, { align: 'right' });
      docInstance.text(`Delivery To: ${selectedStore || 'N/A'}`, pageWidth - 14, 27.5, { align: 'right' });

      if (duplicate || isSecondCopy) {
        docInstance.setFont("helvetica", "bold");
        docInstance.setFontSize(9);
        docInstance.setTextColor(220, 38, 38); // Bold Red
        docInstance.text('[DUPLICATE]', pageWidth - 14, 32, { align: 'right' });
      } else if (preview) {
        docInstance.setFont("helvetica", "bold");
        docInstance.setFontSize(9);
        docInstance.setTextColor(2, 132, 199);
        docInstance.text('[PREVIEW]', pageWidth - 14, 32, { align: 'right' });
      }

      // 3. Left Side: Store & Reference Info
      docInstance.setFont("helvetica", "bold");
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(30, 30, 30);
      docInstance.text('Store Name:', 14, 18.5);
      docInstance.setFont("helvetica", "normal");
      docInstance.text(`${selectedStore || 'N/A'}`, 42, 18.5);

      docInstance.setFont("helvetica", "bold");
      docInstance.text('Reference No:', 14, 23);
      docInstance.setFont("helvetica", "normal");
      docInstance.text(`${refText}`, 42, 23);

      docInstance.setFont("helvetica", "bold");
      docInstance.text('Delivery From:', 14, 27.5);
      docInstance.setFont("helvetica", "normal");
      docInstance.text('Central Store', 42, 27.5);

      // 4. Table Columns: SL, Barcode, Item Name, CPU, Sale Price, Del Qty, C. Stock, Cost Value, Sale Value
      const tableCols = [
        "SL",
        "Barcode",
        "Item Name",
        "CPU",
        "Sale Price",
        "Del Qty",
        "C. Stock",
        "Cost Value",
        "Sale Value"
      ];

      let totalDelQty = 0;
      let totalCostVal = 0;
      let totalSaleVal = 0;

      const tableRows = items.map((item, idx) => {
        const delQty = Number(item.delQty || 0);
        const cpu = Number(item.cpu || 0);
        const salePrice = Number(item.salePrice || 0);
        const cStock = Number(item.cStock || 0);
        const costVal = Number(item.costValue || (cpu * delQty));
        const saleVal = Number(item.saleValue || (salePrice * delQty));

        totalDelQty += delQty;
        totalCostVal += costVal;
        totalSaleVal += saleVal;

        return [
          idx + 1,
          item.barcode || item.code || '-',
          item.productName || '',
          cpu.toFixed(2),
          salePrice.toFixed(2),
          delQty,
          cStock,
          costVal.toFixed(2),
          saleVal.toFixed(2)
        ];
      });

      // Add Summary Row
      tableRows.push([
        'Total',
        '',
        '',
        '',
        '',
        totalDelQty,
        '',
        totalCostVal.toFixed(2),
        totalSaleVal.toFixed(2)
      ]);

      const startY = (duplicate || isSecondCopy || preview) ? 35 : 32;

      autoTable(docInstance, {
        head: [tableCols],
        body: tableRows,
        startY: startY,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 1.8,
          textColor: [30, 30, 30]
        },
        headStyles: {
          fillColor: [46, 111, 64], // Project Brand Green
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'right'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'left', cellWidth: 30 },
          2: { halign: 'left', cellWidth: 'auto' },
          3: { halign: 'right', cellWidth: 24 },
          4: { halign: 'right', cellWidth: 24 },
          5: { halign: 'right', cellWidth: 22 },
          6: { halign: 'right', cellWidth: 22 },
          7: { halign: 'right', cellWidth: 28 },
          8: { halign: 'right', cellWidth: 28 }
        },
        didParseCell: function (data) {
          if (data.section === 'head') {
            if (data.column.index === 0) data.cell.styles.halign = 'center';
            if (data.column.index === 1 || data.column.index === 2) data.cell.styles.halign = 'left';
          }
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 245, 240];
          }
        },
        margin: { top: 10, left: 14, right: 14 }
      });

      const finalY = docInstance.lastAutoTable.finalY || startY + 50;

      // 5. Signatures at bottom: Posted By (with auto profile name above line), Checked By, Authorized Signature
      const sigY = Math.max(finalY + 26, pageHeight - 20);

      docInstance.setFont("helvetica", "normal");
      docInstance.setFontSize(8.5);
      docInstance.setLineWidth(0.4);
      docInstance.setDrawColor(120, 120, 120);
      docInstance.setTextColor(40, 40, 40);

      // 1. Posted By with auto logged-in profile name
      docInstance.line(20, sigY, 70, sigY);
      docInstance.setFont("helvetica", "normal");
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(2, 132, 199);
      docInstance.text(displayName, 45, sigY - 2, { align: 'center' });

      docInstance.setFont("helvetica", "bold");
      docInstance.setTextColor(40, 40, 40);
      docInstance.text('Posted By', 45, sigY + 5, { align: 'center' });

      // 2. Checked By
      docInstance.setFont("helvetica", "bold");
      docInstance.line(pageWidth / 2 - 25, sigY, pageWidth / 2 + 25, sigY);
      docInstance.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });

      // 3. Authorized Signature
      docInstance.setFont("helvetica", "bold");
      docInstance.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
      docInstance.text('Authorized Signature', pageWidth - 45, sigY + 5, { align: 'center' });
    };

    renderPageContent(doc, false);

    const cleanFilename = String(displayChallanNo).replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`StoreDelivery_${cleanFilename}.pdf`);
  };

  const generateExcel = () => {
    if (items.length === 0) return toast.error('No items to preview');
    
    const wsData = [
      ['Code', 'Barcode', 'Product Name', 'Del. Qty', 'C. Stock', 'CPU', 'Sale Price', 'Cost Value', 'Sale Value'],
      ...items.map(i => [i.code, i.barcode, i.productName, i.delQty, i.cStock, i.cpu, i.salePrice, i.costValue, i.saleValue])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Store Delivery");
    XLSX.writeFile(wb, `Store_Delivery_${deliveryDate}.xlsx`);
  };

  // ---------------- Render List View ----------------
  if (view === 'list') {
    return (
      <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
        <LoadingOverlay isLoading={isLoading} message="Processing Store Delivery... Please wait" />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Store Delivery
          </h2>
          <button 
            className="btn-theme" 
            onClick={() => setView('add')}
            style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            + New Delivery
          </button>
        </div>

        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>From Date</label>
              <input 
                type="date" 
                value={listFromDate} 
                onChange={(e) => setListFromDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>TO Date</label>
              <input 
                type="date" 
                value={listToDate} 
                onChange={(e) => setListToDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
          <input 
            type="text" 
            placeholder="Search deliveries by shop name, challan no, requisition no, or status..." 
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            style={{ width: '100%', padding: '10px', border: 'none', borderBottom: '1px solid var(--border-color)', outline: 'none', marginBottom: '20px' }}
          />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 10px' }}>SL</th>
                  <th style={{ padding: '12px 10px' }}>Shop Name/Delivery To</th>
                  <th style={{ padding: '12px 10px' }}>Challan No</th>
                  <th style={{ padding: '12px 10px' }}>Requisition No</th>
                  <th style={{ padding: '12px 10px' }}>Delivery Date</th>
                  <th style={{ padding: '12px 10px' }}>Status</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {requisitions
                  .filter(req => {
                    if (!listSearch.trim()) return true;
                    const q = listSearch.toLowerCase();
                    const sName = (req.stores?.name || stores.find(s => String(s.id) === String(req.shop_id))?.name || '').toLowerCase();
                    const cNo = (req.challan_no || '').toLowerCase();
                    const rNo = (req.requisition_no || '').toLowerCase();
                    const st = (req.status || '').toLowerCase();
                    return sName.includes(q) || cNo.includes(q) || rNo.includes(q) || st.includes(q);
                  })
                  .length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No deliveries found.</td>
                  </tr>
                ) : (
                  requisitions
                    .filter(req => {
                      if (!listSearch.trim()) return true;
                      const q = listSearch.toLowerCase();
                      const sName = (req.stores?.name || stores.find(s => String(s.id) === String(req.shop_id))?.name || '').toLowerCase();
                      const cNo = (req.challan_no || '').toLowerCase();
                      const rNo = (req.requisition_no || '').toLowerCase();
                      const st = (req.status || '').toLowerCase();
                      return sName.includes(q) || cNo.includes(q) || rNo.includes(q) || st.includes(q);
                    })
                    .map((req, idx) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>{idx + 1}</td>
                      <td style={{ padding: '10px', fontWeight: 500 }}>
                        {req.stores?.name || stores.find(s => String(s.id) === String(req.shop_id))?.name || (req.shop_id ? (stores.find(s => s.id === req.shop_id)?.name) : '') || 'Banani Model Town'}
                      </td>
                      <td style={{ padding: '10px' }}>{req.challan_no || '-'}</td>
                      <td style={{ padding: '10px' }}>{req.requisition_no}</td>
                      <td style={{ padding: '10px' }}>{req.requisition_date?.split('T')[0]}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem',
                          backgroundColor: req.status === 'Delivered' ? '#dcfce7' : req.status === 'Hold' ? '#fef3c7' : req.status === 'Cancelled' ? '#fee2e2' : '#f1f5f9',
                          color: req.status === 'Delivered' ? '#166534' : req.status === 'Hold' ? '#92400e' : req.status === 'Cancelled' ? '#dc2626' : '#475569',
                          fontWeight: req.status === 'Cancelled' ? 600 : 500
                        }}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handlePrintExistingDelivery(req)}
                          title="Print / Download PDF"
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem'
                          }}
                        >
                          <Printer size={14} />
                          Print
                        </button>
                        <select
                          value={req.status}
                          onChange={(e) => handleStatusUpdate(req.id, e.target.value, req.status)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: req.status === 'Cancelled' ? '1px solid #fca5a5' : '1px solid #ccc',
                            fontSize: '0.8rem',
                            outline: 'none',
                            backgroundColor: (req.status === 'Received' || req.status === 'Cancelled') ? '#f3f4f6' : '#fff',
                            color: req.status === 'Cancelled' ? '#dc2626' : 'inherit',
                            cursor: (req.status === 'Received' || req.status === 'Cancelled') ? 'not-allowed' : 'pointer'
                          }}
                          disabled={req.status === 'Received' || req.status === 'Cancelled'}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Hold">Hold</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                          {req.status === 'Received' && <option value="Received">Received</option>}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- Render Add View ----------------
  
  const totalQty = items.reduce((sum, i) => sum + i.delQty, 0);
  const totalValue = items.reduce((sum, i) => sum + i.saleValue, 0);

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <LoadingOverlay isLoading={isLoading} message="Saving Store Delivery... Please wait" />
      
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        Store Delivery
      </h2>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        
        {/* Left Sidebar Form */}
        <div style={{ width: '300px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '15px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={isChallanWise} 
              onChange={(e) => setIsChallanWise(e.target.checked)} 
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
            />
            Rcv. Challan Wise Delivery
          </label>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width: '100%', border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TO Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ width: '100%', border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none' }} />
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rcv. Challan</label>
            <CustomSelect 
              value={selectedRcvChallan}
              onChange={e => setSelectedRcvChallan(e.target.value)}
              style={{ width: '100%', border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none', color: 'var(--accent-primary)', fontWeight: 'bold' }}
            >
              <option value="">-- Select a Challan --</option>
              {rcvChallans.map(c => (
                <option key={c.id} value={c.id}>{c.last_challan_no || c.reference_no}</option>
              ))}
            </CustomSelect>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Delivery To <span style={{color: 'red'}}>*</span></label>
            <CustomSelect 
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              style={{ width: '100%', border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none' }}
            >
              <option value="">-- Select a Store --</option>
              {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </CustomSelect>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Delivery Date</label>
            <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={{ width: '100%', border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none' }} />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Barcode</label>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <input 
                ref={barcodeInputRef}
                type="text" 
                placeholder="Barcode Scan / Press Enter" 
                value={barcodeSearch}
                onChange={e => setBarcodeSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!barcodeSearch.trim()) {
                      openProductModal();
                    } else {
                      handleBarcodeSearch(e);
                    }
                  }
                }}
                style={{ flex: 1, border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none', backgroundColor: '#f9fafb' }} 
              />
              <button 
                type="button" 
                onClick={openProductModal}
                title="Search and select product from challan"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--accent-primary, #2e6f40)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Search size={16} />
              </button>
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Product</label>
            <div style={{ padding: '5px 0', borderBottom: '1px dotted var(--border-color)', minHeight: '25px', fontSize: '0.85rem' }}>
              {formProduct ? formProduct.item_name : ''}
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CPU</label>
            <div style={{ padding: '5px 0', borderBottom: '1px dotted var(--border-color)', minHeight: '25px', fontSize: '0.85rem' }}>
              {formProduct ? formProduct.purchase_price : ''}
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sale Price</label>
            <div style={{ padding: '5px 0', borderBottom: '1px dotted var(--border-color)', minHeight: '25px', fontSize: '0.85rem' }}>
              {formProduct ? formProduct.mrp : ''}
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Stock</label>
            <div style={{ padding: '5px 0', borderBottom: '1px dotted var(--border-color)', minHeight: '25px', fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
              {formProduct ? `${formProduct.c_stock} pcs` : ''}
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Delivery Quantity</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                ref={deliveryQtyRef}
                type="number" 
                value={deliveryQty}
                onChange={e => setDeliveryQty(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDeliveryQty();
                  }
                }}
                placeholder="Qty"
                style={{ flex: 1, border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none' }} 
              />
              <button 
                type="button"
                onClick={handleAddDeliveryQty}
                className="btn-theme"
                style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '4px' }}
              >
                Add
              </button>
            </div>
          </div>

        </div>
        
        {/* Right Content Table */}
        <div style={{ flex: 1, backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
                <tr>
                  <th style={{ padding: '10px' }}>Code</th>
                  <th style={{ padding: '10px' }}>Barcode</th>
                  <th style={{ padding: '10px' }}>Item Name</th>
                  <th style={{ padding: '10px' }}>Del Qty</th>
                  <th style={{ padding: '10px' }}>C.Stock</th>
                  <th style={{ padding: '10px' }}>CPU</th>
                  <th style={{ padding: '10px' }}>Sale Price</th>
                  <th style={{ padding: '10px' }}>Cost Value</th>
                  <th style={{ padding: '10px' }}>Sale Value</th>
                  <th style={{ padding: '10px', width: '30px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No items added yet.</td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 10px' }}>{item.code}</td>
                      <td style={{ padding: '8px 10px' }}>{item.barcode}</td>
                      <td style={{ padding: '8px 10px' }}>{item.productName}</td>
                      <td style={{ padding: '8px 10px' }}>{item.delQty}</td>
                      <td style={{ padding: '8px 10px' }}>{item.cStock}</td>
                      <td style={{ padding: '8px 10px' }}>{item.cpu}</td>
                      <td style={{ padding: '8px 10px' }}>{item.salePrice}</td>
                      <td style={{ padding: '8px 10px' }}>{item.costValue.toFixed(2)}</td>
                      <td style={{ padding: '8px 10px' }}>{item.saleValue.toFixed(2)}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <button onClick={() => setItems(items.filter(i => i.id !== item.id))} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Action Buttons Footer */}
          <div style={{ padding: '20px', display: 'flex', gap: '10px', justifyContent: 'center', borderTop: '1px solid var(--border-color)' }}>
            <button onClick={() => generatePDF(null, false, true)} style={{ padding: '8px 20px', backgroundColor: '#e5e7eb', color: '#4b5563', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Preview</button>
            <button onClick={generateExcel} style={{ padding: '8px 20px', backgroundColor: '#f3f4f6', color: '#9ca3af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Preview excel</button>
            <button onClick={() => handleSave('Pending')} disabled={isLoading} className="btn-theme" style={{ padding: '8px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isLoading ? 'Saving...' : 'Save'}
            </button>
            <button onClick={handleReset} style={{ padding: '8px 20px', backgroundColor: '#f3f4f6', color: '#9ca3af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Reset</button>
            <button onClick={() => setView('list')} className="btn-theme" style={{ padding: '8px 20px', backgroundColor: '#06b6d4', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
          </div>
          
        </div>

      </div>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg, #fff)',
            width: '850px',
            maxWidth: '95%',
            maxHeight: '85vh',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            border: '1px solid var(--border-color, #e2e8f0)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '15px 20px',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(46,111,64,0.05)'
            }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--accent-primary, #2e6f40)', fontSize: '1.1rem', fontWeight: 600 }}>
                  Select Product {isChallanWise ? `from Challan (${rcvChallans.find(c => String(c.id) === String(selectedRcvChallan))?.last_challan_no || rcvChallans.find(c => String(c.id) === String(selectedRcvChallan))?.reference_no || 'Selected Challan'})` : '(All Products)'}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>
                  Click on any product row to select it for store delivery (Single Selection)
                </span>
              </div>
              <X 
                size={20} 
                style={{ cursor: 'pointer', color: 'var(--text-secondary, #64748b)' }} 
                onClick={() => setShowProductModal(false)} 
              />
            </div>
            
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Search size={18} style={{ color: 'var(--text-secondary, #64748b)' }} />
              <input 
                type="text" 
                placeholder="Search products by code, barcode, or name..." 
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-color, #f8fafc)',
                  color: 'var(--text-primary, #0f172a)',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color, #e2e8f0)', color: 'var(--text-secondary, #64748b)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '60px' }}>Select</th>
                    <th style={{ padding: '10px 8px' }}>Code</th>
                    <th style={{ padding: '10px 8px' }}>Barcode</th>
                    <th style={{ padding: '10px 8px' }}>Product Name</th>
                    {isChallanWise && <th style={{ padding: '10px 8px', textAlign: 'right' }}>Rcv. Qty</th>}
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>CPU</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>MRP</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>C. Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {challanProducts
                    .filter(item => {
                      const prod = item.products || item;
                      if (!modalSearch.trim()) return true;
                      const q = modalSearch.toLowerCase();
                      return (
                        (prod?.item_name && prod.item_name.toLowerCase().includes(q)) ||
                        (prod?.code && prod.code.toLowerCase().includes(q)) ||
                        (prod?.barcode && prod.barcode.toLowerCase().includes(q)) ||
                        (prod?.user_define_barcode && prod.user_define_barcode.toLowerCase().includes(q))
                      );
                    })
                    .length === 0 ? (
                    <tr>
                      <td colSpan={isChallanWise ? 8 : 7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary, #64748b)' }}>
                        {isChallanWise ? 'No matching products found in this challan.' : 'No matching products found.'}
                      </td>
                    </tr>
                  ) : (
                    challanProducts
                      .filter(item => {
                        const prod = item.products || item;
                        if (!modalSearch.trim()) return true;
                        const q = modalSearch.toLowerCase();
                        return (
                          (prod?.item_name && prod.item_name.toLowerCase().includes(q)) ||
                          (prod?.code && prod.code.toLowerCase().includes(q)) ||
                          (prod?.barcode && prod.barcode.toLowerCase().includes(q)) ||
                          (prod?.user_define_barcode && prod.user_define_barcode.toLowerCase().includes(q))
                        );
                      })
                      .map((item, idx) => {
                        const prod = item.products || item;
                        const isSelected = formProduct && String(formProduct.id) === String(prod?.id);
                        return (
                          <tr 
                            key={idx}
                            onClick={() => selectModalProduct(item)}
                            style={{
                              borderBottom: '1px solid var(--border-color, #f1f5f9)',
                              cursor: 'pointer',
                              backgroundColor: isSelected ? 'rgba(46,111,64,0.1)' : 'transparent',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? 'rgba(46,111,64,0.1)' : 'transparent';
                            }}
                          >
                            <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                              <input 
                                type="radio" 
                                name="selectedStoreDeliveryProduct"
                                checked={Boolean(isSelected)}
                                readOnly
                                style={{ cursor: 'pointer', accentColor: 'var(--accent-primary, #2e6f40)' }}
                              />
                            </td>
                            <td style={{ padding: '10px 8px', fontWeight: 600 }}>{prod?.code || '-'}</td>
                            <td style={{ padding: '10px 8px' }}>{prod?.barcode || prod?.user_define_barcode || '-'}</td>
                            <td style={{ padding: '10px 8px' }}>{prod?.item_name || '-'}</td>
                            {isChallanWise && <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{item.rcv_qty || 0}</td>}
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(item.pur_price || prod?.purchase_price || 0).toFixed(2)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(item.sale_price || prod?.mrp || 0).toFixed(2)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-primary, #2e6f40)' }}>
                              {Number(prod?.wh_stock) || 0}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: 'var(--card-bg, #fff)' }}>
              <button 
                type="button"
                onClick={() => setShowProductModal(false)}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#e2e8f0',
                  color: '#334155',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500
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

export default StoreDelivery;
