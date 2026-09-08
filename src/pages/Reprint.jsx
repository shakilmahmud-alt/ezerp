import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext';

const SectionWrapper = ({ title, children, rightContent }) => (
  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', backgroundColor: 'var(--card-bg)', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
    {(title || rightContent) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
        {rightContent}
      </div>
    )}
    {children}
  </div>
);

const REPRINT_TYPES = [
  'Purchase Order',
  'Purchase Receive Challan',
  'Purchase Return Challan',
  'Store Delivery Challan',
  'Store Delivery Challan Summary',
  'DML Challan',
  'Store Delivery Receive Challan',
  'Circular Price Change',
  'Store Requisition(Ecom)',
  'Store Requisition'
];

// Helper to enrich items with product names and barcodes (compatible with REST API without nested joins)
const enrichItemsWithProducts = async (rawItems) => {
  if (!rawItems || rawItems.length === 0) return [];
  const productIds = [...new Set(rawItems.map(i => i.product_id).filter(Boolean))];
  if (productIds.length === 0) return rawItems;

  try {
    const { data: prods } = await supabase
      .from('products')
      .select('id, item_name, barcode, user_define_barcode, code, sale_vat_percent, mrp, purchase_price')
      .in('id', productIds);

    const map = {};
    if (prods) {
      prods.forEach(p => { map[p.id] = p; });
    }

    return rawItems.map(item => {
      const p = map[item.product_id];
      return {
        ...item,
        products: p ? {
          item_name: p.item_name,
          barcode: p.barcode || p.user_define_barcode || p.code || '-',
          sale_vat_percent: p.sale_vat_percent,
          mrp: p.mrp
        } : (item.products || null)
      };
    });
  } catch (err) {
    console.error("Error enriching items with products:", err);
    return rawItems;
  }
};

// Helper to resolve vendor name
const getVendorName = async (vendorId) => {
  if (!vendorId) return 'N/A';
  try {
    const { data } = await supabase.from('vendors').select('name').eq('id', vendorId).single();
    return data?.name || 'N/A';
  } catch {
    return 'N/A';
  }
};

const Reprint = () => {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  
  const [documentList, setDocumentList] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stores, setStores] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase.from('stores').select('id, name').eq('status', 'ACTIVE').order('name');
        if (data) setStores(data);
      } catch (err) {
        console.error("Failed to load stores");
      }
    };
    fetchInitialData();
  }, []);

  // Fetch document numbers when Type or Dates change
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!selectedType) {
        setDocumentList([]);
        return;
      }
      
      setIsLoading(true);
      try {
        let docs = [];
        
        // Dynamic fetch based on type
        if (selectedType === 'Purchase Order') {
          let query = supabase
            .from('purchase_orders')
            .select('po_number, delivery_to')
            .gte('order_date', fromDate)
            .lte('order_date', toDate);
            
          const { data, error } = await query;
          if (!error && data) {
            let filtered = data;
            if (selectedStore && selectedStore !== '-- All --' && selectedStore !== '') {
              const target = selectedStore.trim().toLowerCase();
              filtered = data.filter(d => {
                const del = (d.delivery_to || '').trim().toLowerCase();
                if (target === 'central store') {
                  return del === 'central store' || !del;
                }
                return del === target || del.includes(target);
              });
            }
            docs = [...new Set(filtered.map(d => d.po_number).filter(Boolean))];
          }
        } 
        else if (selectedType === 'DML Challan' || selectedType === 'Damage and Lost' || selectedType === 'Damage & Lost') {
          const { data, error } = await supabase
            .from('damage_and_lost')
            .select('id, reference_no, dml_date')
            .gte('dml_date', fromDate)
            .lte('dml_date', toDate);
            
          if (!error && data) {
            const arr = data.map(d => d.reference_no || String(d.id)).filter(Boolean);
            docs = [...new Set(arr)];
          }
        }
        else if (selectedType === 'Store Requisition(Ecom)' || selectedType === 'Store Requisition') {
          let query1 = supabase
            .from('requisitions')
            .select('requisition_no')
            .gte('requisition_date', fromDate)
            .lte('requisition_date', toDate);
            
          let query2 = supabase
            .from('store_requisitions')
            .select('requisition_no')
            .gte('requisition_date', fromDate)
            .lte('requisition_date', toDate);

          if (selectedStore && selectedStore !== '-- All --' && selectedStore !== '') {
            const s = stores.find(s => s.name === selectedStore);
            if (s) {
              query1 = query1.eq('shop_id', s.id);
              query2 = query2.eq('shop_id', s.id);
            }
          }
            
          const [{ data: d1 }, { data: d2 }] = await Promise.all([query1, query2]);
          docs = [...new Set([...(d1 || []).map(d => d.requisition_no), ...(d2 || []).map(d => d.requisition_no)].filter(Boolean))];
        }
        else if (selectedType === 'Purchase Receive Challan') {
          let query = supabase
            .from('purchase_receives')
            .select('last_challan_no, reference_no, delivery_to')
            .gte('purchase_date', fromDate)
            .lte('purchase_date', toDate)
            .eq('status', 'Saved');
            
          const { data, error } = await query;
          if (!error && data) {
            let filtered = data;
            if (selectedStore && selectedStore !== '-- All --' && selectedStore !== '') {
              const target = selectedStore.trim().toLowerCase();
              filtered = data.filter(d => {
                const del = (d.delivery_to || '').trim().toLowerCase();
                if (target === 'central store') {
                  return del === 'central store' || !del;
                }
                return del === target || del.includes(target);
              });
            }
            const arr = filtered.map(d => d.last_challan_no || d.reference_no).filter(Boolean);
            docs = [...new Set(arr)];
          }
        }
        else if (selectedType === 'Store Delivery Challan' || selectedType === 'Store Delivery Challan Summary') {
          let query = supabase
            .from('requisitions')
            .select('challan_no, requisition_no')
            .gte('requisition_date', fromDate)
            .lte('requisition_date', toDate)
            .not('status', 'eq', 'Receive Challan')
            .not('requisition_no', 'like', 'SDR%');
            
          if (selectedStore && selectedStore !== '-- All --') {
            if (selectedStore === 'Central Store') {
              // Central store is the sender, so show all delivery challans
            } else {
              // Delivery challans shouldn't show up for receiver stores
              query = query.eq('shop_id', '00000000-0000-0000-0000-000000000000');
            }
          }
          const { data, error } = await query;
          if (!error && data) {
            const arr = data.map(d => d.challan_no || d.requisition_no).filter(Boolean);
            docs = [...new Set(arr)];
          }
        }
        else if (selectedType === 'Store Delivery Receive Challan') {
          let query = supabase
            .from('requisitions')
            .select('requisition_no')
            .gte('requisition_date', fromDate)
            .lte('requisition_date', toDate)
            .eq('status', 'Receive Challan');
            
          if (selectedStore && selectedStore !== '-- All --') {
            const s = stores.find(s => s.name === selectedStore);
            if (s) {
              query = query.eq('shop_id', s.id);
            } else {
              query = query.eq('shop_id', '00000000-0000-0000-0000-000000000000');
            }
          }
          const { data, error } = await query;
          if (!error && data) docs = data.map(d => d.requisition_no).filter(Boolean);
        }
        else if (selectedType === 'Purchase Return Challan') {
          const { data, error } = await supabase
            .from('purchase_returns')
            .select('challan_no')
            .gte('return_date', fromDate)
            .lte('return_date', toDate);
          if (!error && data) docs = data.map(d => d.challan_no).filter(Boolean);
        }
        else if (selectedType === 'Circular Price Change') {
          let query = supabase
            .from('promotions')
            .select('circular_code, circular_name, valid_from, created_at')
            .gte('valid_from', fromDate)
            .lte('valid_from', toDate);

          const { data, error } = await query;
          let arr = [];
          if (!error && data) {
            arr = data.map(d => d.circular_code || d.circular_name).filter(Boolean);
          }

          try {
            const { data: cData } = await supabase
              .from('price_change_circulars')
              .select('circular_name, effective_date')
              .gte('effective_date', fromDate)
              .lte('effective_date', toDate);
            if (cData) {
              arr = [...arr, ...cData.map(c => c.circular_name).filter(Boolean)];
            }
          } catch (e) {}

          docs = [...new Set(arr)];
        }
        else {
          docs = [];
        }

        setDocumentList(docs);
        setSelectedDocument('');
      } catch (err) {
        console.error(err);
        toast.error("Failed to load documents");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [selectedType, fromDate, toDate, selectedStore, stores]);

  const getLabelForType = () => {
    if (!selectedType) return 'Document No';
    return `${selectedType} No`;
  };

  const handleReprint = async () => {
    if (!selectedType) {
      toast.error('Please select a Type');
      return;
    }
    if (!selectedDocument) {
      toast.error(`Please select a ${getLabelForType()}`);
      return;
    }

    setIsLoading(true);
    let headerInfo = {};
    let items = [];

    try {
      if (selectedType === 'Purchase Order') {
        const { data: po } = await supabase.from('purchase_orders').select('*').eq('po_number', selectedDocument).single();
        const { data: poItemsRaw } = await supabase.from('purchase_order_items').select('*').eq('purchase_order_id', po?.id);
        const poItems = await enrichItemsWithProducts(poItemsRaw || []);
        
        const vendorName = await getVendorName(po?.vendor_id);

        let docNumber = po?.po_number || selectedDocument;
        if (!docNumber.startsWith('#')) docNumber = `#${docNumber}`;

        let refNo = (po?.reference_no || po?.ref_no || '').trim();
        if (!refNo) refNo = 'N/A';

        headerInfo = {
          title: 'PURCHASE ORDER CHALLAN',
          docNo: docNumber,
          date: po?.order_date,
          orderNo: '',
          deliveryTo: po?.delivery_to || 'Central Store',
          vendorName: vendorName,
          remarks: refNo,
          isDuplicate: true
        };
        
        let totalQty = 0;
        let totalFreeQty = 0;
        let totalValue = 0;
        let totalDiscAmt = 0;
        let totalVat = 0;
        let totalAmount = 0;

        items = (poItems || []).map((i, idx) => {
          const qty = Number(i.qty || 0);
          const purPrice = Number(i.pur_price || 0);
          const mrp = Number(i.mrp_price || i.products?.mrp || 0);
          const disc = Number(i.disc_percent || 0);
          const freeQty = Number(i.free_qty || 0);
          const val = qty * purPrice;
          const discAmt = (val * disc) / 100;
          const rawVatRate = Number(i.products?.sale_vat_percent || 0);
          const vatRate = (rawVatRate > 0 && rawVatRate <= 1) ? Number((rawVatRate * 100).toFixed(2)) : rawVatRate;
          const vatAmt = ((val - discAmt) * vatRate) / 100;
          const lineAmt = val - discAmt + vatAmt;

          totalQty += qty;
          totalFreeQty += freeQty;
          totalValue += val;
          totalDiscAmt += discAmt;
          totalVat += vatAmt;
          totalAmount += lineAmt;

          return [
            idx + 1,
            i.products?.barcode || i.barcode || '-',
            i.products?.item_name || i.item_name || '',
            purPrice.toFixed(2),
            mrp.toFixed(2),
            qty,
            disc,
            freeQty,
            val.toFixed(2),
            discAmt.toFixed(2),
            vatAmt.toFixed(2),
            lineAmt.toFixed(2)
          ];
        });

        // Add Summary Row
        items.push([
          'Total',
          '',
          '',
          '',
          '',
          totalQty,
          '',
          totalFreeQty,
          totalValue.toFixed(2),
          totalDiscAmt.toFixed(2),
          totalVat.toFixed(2),
          totalAmount.toFixed(2)
        ]);

      } else if (selectedType === 'DML Challan' || selectedType === 'Damage and Lost' || selectedType === 'Damage & Lost') {
        let dml = null;
        const { data: d1 } = await supabase.from('damage_and_lost').select('*').eq('reference_no', selectedDocument).limit(1);
        if (d1 && d1.length > 0) {
          dml = d1[0];
        } else {
          const { data: d2 } = await supabase.from('damage_and_lost').select('*').eq('id', selectedDocument).limit(1);
          if (d2 && d2.length > 0) dml = d2[0];
        }

        const { data: dmlItemsRaw } = await supabase.from('damage_and_lost_items').select('*').eq('damage_and_lost_id', dml?.id);
        const dmlItems = await enrichItemsWithProducts(dmlItemsRaw || []);

        let docNumber = dml?.reference_no ? String(dml.reference_no) : `#DML-${dml?.id?.slice(0, 8)}`;
        if (!docNumber.startsWith('#') && !docNumber.startsWith('REF-')) {
          docNumber = `#${docNumber}`;
        }

        headerInfo = {
          title: 'DAMAGE AND LOST CHALLAN',
          docNo: docNumber,
          date: dml?.dml_date,
          orderNo: '',
          deliveryTo: 'Central Store',
          vendorName: '',
          remarks: dml?.reference_no || 'N/A'
        };

        let totalQty = 0;
        let totalAmount = 0;

        items = (dmlItems || []).map((i, idx) => {
          const qty = Number(i.dml_qty || 0);
          const cpu = Number(i.cpu || 0);
          const salePrice = Number(i.sale_price || i.products?.mrp || 0);
          const amt = Number(i.amount || (cpu * qty));

          totalQty += qty;
          totalAmount += amt;

          return [
            idx + 1,
            dml?.reference_no || '-',
            i.products?.barcode || i.products?.user_define_barcode || i.products?.code || i.barcode || '-',
            i.products?.item_name || i.item_name || '',
            cpu.toFixed(2),
            salePrice.toFixed(2),
            qty,
            'PCS',
            amt.toFixed(2),
            i.reason || ''
          ];
        });

        // Add Summary Row matching Image 2
        items.push([
          'Total',
          '',
          '',
          `${dmlItems.length} Items`,
          '',
          '',
          totalQty,
          'PCS',
          totalAmount.toFixed(2),
          ''
        ]);

      } else if (selectedType === 'Store Requisition(Ecom)' || selectedType === 'Store Requisition') {
        let req = null;
        let reqItems = [];
        let storeName = '';

        const { data: r1 } = await supabase.from('store_requisitions').select('*').eq('requisition_no', selectedDocument).limit(1);
        if (r1 && r1.length > 0) {
          req = r1[0];
          storeName = req.shop_name || stores.find(s => s.id === req.shop_id)?.name || '';
          const { data: itemsRaw } = await supabase.from('store_requisition_items').select('*').eq('requisition_id', req.id);
          reqItems = itemsRaw || [];
        } else {
          const { data: r2 } = await supabase.from('requisitions').select('*').eq('requisition_no', selectedDocument).single();
          req = r2;
          storeName = stores.find(s => s.id === req?.shop_id)?.name || '';
          const { data: reqItemsRaw } = await supabase.from('requisition_items').select('*').eq('requisition_id', req?.id);
          reqItems = await enrichItemsWithProducts(reqItemsRaw || []);
        }

        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: req?.requisition_no,
          date: req?.requisition_date,
          orderNo: '',
          deliveryTo: storeName,
          vendorName: '',
          remarks: ''
        };

        items = (reqItems || []).map((i, idx) => ([
          idx + 1,
          i.products?.barcode || i.barcode || '',
          i.products?.item_name || i.product_name || i.item_name || '',
          Number(i.req_qty || i.app_qty || 0).toFixed(2) + ' PCS',
          '0.00',
          Number(i.cpu || 0).toFixed(2),
          Number(i.products?.mrp || i.mrp || 0).toFixed(2),
          '0.00',
          Number(i.cost_value || (Number(i.cpu || 0) * Number(i.req_qty || i.app_qty || 0))).toFixed(2)
        ]));

      } else if (selectedType === 'Purchase Receive Challan') {
        let pr = null;
        const { data: prByLast } = await supabase.from('purchase_receives').select('*').eq('last_challan_no', selectedDocument).limit(1);
        if (prByLast && prByLast.length > 0) {
          pr = prByLast[0];
        } else {
          const { data: prByRef } = await supabase.from('purchase_receives').select('*').eq('reference_no', selectedDocument).limit(1);
          if (prByRef && prByRef.length > 0) pr = prByRef[0];
        }

        const { data: prItemsRaw } = await supabase.from('purchase_receive_items').select('*').eq('purchase_receive_id', pr?.id);
        const prItems = await enrichItemsWithProducts(prItemsRaw || []);

        const vendorName = await getVendorName(pr?.vendor_id);
        let poNumber = '';
        if (pr?.purchase_order_id) {
          const { data: poData } = await supabase.from('purchase_orders').select('po_number').eq('id', pr.purchase_order_id).single();
          if (poData?.po_number) poNumber = poData.po_number;
        }

        let docNumber = pr?.last_challan_no || selectedDocument;
        if (!docNumber.startsWith('#')) docNumber = `#${docNumber}`;

        let refNo = (pr?.reference_no || '').trim();
        if (!refNo) refNo = 'N/A';

        headerInfo = {
          title: 'PURCHASE RECEIVE CHALLAN',
          docNo: docNumber,
          date: pr?.purchase_date,
          orderNo: poNumber,
          deliveryTo: pr?.delivery_to || selectedStore || 'Central Store',
          vendorName: vendorName,
          remarks: refNo,
          isDuplicate: true
        };

        let totalPoQty = 0;
        let totalRcvQty = 0;
        let totalFreeQty = 0;
        let totalValue = 0;
        let totalDiscAmt = 0;
        let totalVat = 0;
        let totalAmount = 0;

        items = (prItems || []).map((i, idx) => {
          const poQty = Number(i.po_qty || 0);
          const rcvQty = Number(i.rcv_qty || 0);
          const purPrice = Number(i.pur_price || 0);
          const salePrice = Number(i.sale_price || i.products?.mrp || 0);
          const disc = Number(i.disc_percent || 0);
          const freeQty = Number(i.free_qty || 0);
          const val = rcvQty * purPrice;
          const discAmt = (val * disc) / 100;
          const rawVatRate = Number(i.products?.sale_vat_percent || 0);
          const vatRate = (rawVatRate > 0 && rawVatRate <= 1) ? Number((rawVatRate * 100).toFixed(2)) : rawVatRate;
          const vatAmt = ((val - discAmt) * vatRate) / 100;
          const lineAmt = Number(i.line_amount) || (val - discAmt + vatAmt);

          totalPoQty += poQty;
          totalRcvQty += rcvQty;
          totalFreeQty += freeQty;
          totalValue += val;
          totalDiscAmt += discAmt;
          totalVat += vatAmt;
          totalAmount += lineAmt;

          return [
            idx + 1,
            i.products?.barcode || i.barcode || '-',
            i.products?.item_name || i.item_name || '',
            poQty,
            rcvQty,
            purPrice.toFixed(2),
            salePrice.toFixed(2),
            disc,
            freeQty,
            val.toFixed(2),
            discAmt.toFixed(2),
            vatAmt.toFixed(2),
            lineAmt.toFixed(2)
          ];
        });

        // Add Summary Row
        items.push([
          'Total',
          '',
          '',
          totalPoQty,
          totalRcvQty,
          '',
          '',
          '',
          totalFreeQty,
          totalValue.toFixed(2),
          totalDiscAmt.toFixed(2),
          totalVat.toFixed(2),
          totalAmount.toFixed(2)
        ]);

      } else if (selectedType === 'Purchase Return Challan') {
        const { data: prt } = await supabase.from('purchase_returns').select('*').eq('challan_no', selectedDocument).single();
        const { data: prtItemsRaw } = await supabase.from('purchase_return_items').select('*').eq('purchase_return_id', prt?.id);
        const prtItems = await enrichItemsWithProducts(prtItemsRaw || []);
        const vendorName = await getVendorName(prt?.vendor_id);

        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: prt?.challan_no,
          date: prt?.return_date,
          orderNo: '',
          deliveryTo: '',
          vendorName: vendorName,
          remarks: prt?.reference_no || ''
        };

        items = (prtItems || []).map((i, idx) => ([
          idx + 1,
          i.products?.barcode || i.barcode || '',
          i.products?.item_name || i.item_name || '',
          Number(i.return_qty || 0).toFixed(2) + ' PCS',
          '0.00',
          Number(i.cost_price || 0).toFixed(2),
          Number(i.sale_price || 0).toFixed(2),
          '0.00',
          Number(i.line_amount || 0).toFixed(2)
        ]));

      } else if (selectedType === 'Store Delivery Challan' || selectedType === 'Store Delivery Challan Summary') {
        let req = null;
        const { data: r1 } = await supabase.from('requisitions').select('*').eq('challan_no', selectedDocument).limit(1);
        if (r1 && r1.length > 0) {
          req = r1[0];
        } else {
          const { data: r2 } = await supabase.from('requisitions').select('*').eq('requisition_no', selectedDocument).limit(1);
          if (r2 && r2.length > 0) req = r2[0];
        }
        const { data: reqItemsRaw } = await supabase.from('requisition_items').select('*').eq('requisition_id', req?.id);
        const reqItems = await enrichItemsWithProducts(reqItemsRaw || []);
        const storeName = stores.find(s => s.id === req?.shop_id)?.name || '';

        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: req?.challan_no || req?.requisition_no,
          date: req?.requisition_date,
          orderNo: '',
          deliveryTo: storeName,
          vendorName: '',
          remarks: ''
        };

        items = (reqItems || []).map((i, idx) => {
          const qty = Number(i.approve_qty) || 0;
          const cpu = Number(i.cpu) || 0;
          const mrp = Number(i.products?.mrp || i.mrp) || 0;
          return [
            idx + 1,
            i.products?.barcode || i.barcode || '',
            i.products?.item_name || i.product_name || '',
            qty.toFixed(2) + ' PCS',
            Number(i.bal_qty || 0).toFixed(2) + ' PCS',
            cpu.toFixed(2),
            mrp.toFixed(2),
            (Number(i.cost_value) || (cpu * qty)).toFixed(2),
            (mrp * qty).toFixed(2)
          ];
        });

      } else if (selectedType === 'Store Delivery Receive Challan') {
        let req = null;
        const { data: r1 } = await supabase.from('requisitions').select('*').eq('requisition_no', selectedDocument).limit(1);
        if (r1 && r1.length > 0) {
          req = r1[0];
        } else {
          const { data: r2 } = await supabase.from('requisitions').select('*').eq('challan_no', selectedDocument).limit(1);
          if (r2 && r2.length > 0) req = r2[0];
        }
        const { data: reqItemsRaw } = await supabase.from('requisition_items').select('*').eq('requisition_id', req?.id);
        const reqItems = await enrichItemsWithProducts(reqItemsRaw || []);
        const storeName = stores.find(s => s.id === req?.shop_id)?.name || '';

        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: req?.requisition_no || '',
          date: req?.requisition_date,
          orderNo: req?.challan_no || '',
          deliveryTo: storeName,
          vendorName: '',
          remarks: ''
        };

        items = (reqItems || []).map((i, idx) => {
          const qty = Number(i.approve_qty) || 0;
          const mrp = Number(i.products?.mrp || i.mrp) || 0;
          return [
            idx + 1,
            i.products?.barcode || i.barcode || '',
            i.products?.item_name || i.product_name || '',
            qty.toFixed(2) + ' PCS',
            '0.00 PCS',
            '0.00',
            mrp.toFixed(2),
            '0.00',
            (mrp * qty).toFixed(2)
          ];
        });

      } else if (selectedType === 'Circular Price Change') {
        let promo = null;
        const { data: pList } = await supabase
          .from('promotions')
          .select('*')
          .or(`circular_code.eq.${selectedDocument},circular_name.eq.${selectedDocument}`)
          .limit(1);

        if (pList && pList.length > 0) {
          promo = pList[0];
        }

        let promoItems = [];
        if (promo) {
          const { data: pi } = await supabase
            .from('promotion_items')
            .select('*')
            .eq('promotion_id', promo.id);
          promoItems = pi || [];
        }

        // Fetch products for enriched data
        const { data: prods } = await supabase
          .from('products')
          .select('id, item_name, barcode, user_define_barcode, code, purchase_price, mrp');

        const pMap = {};
        if (prods) {
          prods.forEach(p => {
            if (p.barcode) pMap[p.barcode] = p;
            if (p.code) pMap[p.code] = p;
            if (p.user_define_barcode) pMap[p.user_define_barcode] = p;
          });
        }

        headerInfo = {
          title: 'CIRCULAR PRICE CHANGE REPORT (DETAILS)',
          docNo: promo?.circular_code || selectedDocument,
          date: promo?.valid_from ? promo.valid_from.split('T')[0] : (promo?.created_at ? promo.created_at.split('T')[0] : fromDate),
          orderNo: '',
          deliveryTo: promo?.stores || selectedStore || 'Central Store',
          vendorName: 'N/A',
          remarks: promo?.circular_name || selectedDocument
        };

        // Helper to accurately extract current & new CPU and MRP
        const extractPriceDetails = (item, prod) => {
          let currentCpu = Number(item.current_cpu || prod?.purchase_price || 0);
          let newCpu = Number(item.new_cpu || currentCpu);
          let currentMrp = Number(item.current_mrp || 0);
          let newMrp = Number(item.new_mrp || 0);
          let diffMrp = 0;
          let changePercent = 0;

          let parsedJson = null;
          if (typeof item.item === 'string' && item.item.trim().startsWith('{')) {
            try { parsedJson = JSON.parse(item.item); } catch (e) {}
          }

          if (parsedJson && (parsedJson.currentMrp !== undefined || parsedJson.newMrp !== undefined)) {
            currentCpu = Number(parsedJson.currentCpu ?? (prod?.purchase_price || 0));
            newCpu = Number(parsedJson.newCpu ?? currentCpu);
            currentMrp = Number(parsedJson.currentMrp ?? (prod?.mrp || 0));
            newMrp = Number(parsedJson.newMrp ?? currentMrp);
            diffMrp = Number(parsedJson.diffMrp ?? (newMrp - currentMrp));
            changePercent = parsedJson.changePercent !== undefined
              ? Number(parsedJson.changePercent)
              : (currentMrp > 0 ? Number(((diffMrp / currentMrp) * 100).toFixed(2)) : 0);
            return { currentCpu, newCpu, currentMrp, newMrp, diffMrp, changePercent };
          }

          if (typeof item.item === 'string' && item.item.includes('|')) {
            const parts = item.item.split('|').map(s => Number(s.trim()));
            if (parts.length >= 4 && !isNaN(parts[2]) && !isNaN(parts[3])) {
              currentCpu = !isNaN(parts[0]) && parts[0] > 0 ? parts[0] : Number(prod?.purchase_price || 0);
              newCpu = !isNaN(parts[1]) && parts[1] > 0 ? parts[1] : currentCpu;
              currentMrp = parts[2];
              newMrp = parts[3];
              diffMrp = newMrp - currentMrp;
              changePercent = currentMrp > 0 ? Number(((diffMrp / currentMrp) * 100).toFixed(2)) : 0;
              return { currentCpu, newCpu, currentMrp, newMrp, diffMrp, changePercent };
            }
          }

          const vendorContrAmt = Number(item.vendor_contribution_amount || 0);
          const discAmt = Number(item.discount_amount || 0);
          const vendorContrPct = Number(item.vendor_contribution_percent || 0);
          const discPct = Number(item.discount_percent || 0);

          if (vendorContrAmt > 0 && discAmt > 0 && vendorContrAmt !== discAmt) {
            currentMrp = vendorContrAmt;
            newMrp = discAmt;
            if (vendorContrPct > 0) currentCpu = vendorContrPct;
            if (discPct > 0) newCpu = discPct;
            diffMrp = newMrp - currentMrp;
            changePercent = currentMrp > 0 ? Number(((diffMrp / currentMrp) * 100).toFixed(2)) : 0;
            return { currentCpu, newCpu, currentMrp, newMrp, diffMrp, changePercent };
          }

          if (discAmt !== 0) {
            newMrp = Number(prod?.mrp || 0);
            currentMrp = newMrp - discAmt;
            diffMrp = discAmt;
            changePercent = discPct > 0 ? discPct : (currentMrp > 0 ? Number(((diffMrp / currentMrp) * 100).toFixed(2)) : 0);
            return { currentCpu, newCpu, currentMrp, newMrp, diffMrp, changePercent };
          }

          currentMrp = Number(prod?.mrp || 0);
          newMrp = currentMrp;
          return { currentCpu, newCpu, currentMrp, newMrp, diffMrp: 0, changePercent: 0 };
        };

        let totalCurrCpu = 0;
        let totalNewCpu = 0;
        let totalCurrMrp = 0;
        let totalNewMrp = 0;

        items = promoItems.map((i, idx) => {
          const bc = i.barcode || i.user_barcode || '';
          const p = pMap[bc] || null;
          const name = i.description || p?.item_name || 'Product';
          const pDetails = extractPriceDetails(i, p);

          totalCurrCpu += pDetails.currentCpu;
          totalNewCpu += pDetails.newCpu;
          totalCurrMrp += pDetails.currentMrp;
          totalNewMrp += pDetails.newMrp;

          const pctChange = (pDetails.changePercent >= 0 ? '+' : '') + Number(pDetails.changePercent).toFixed(2) + '%';

          return [
            idx + 1,
            bc || '-',
            name,
            pDetails.currentCpu.toFixed(2),
            pDetails.newCpu.toFixed(2),
            pDetails.currentMrp.toFixed(2),
            pDetails.newMrp.toFixed(2),
            (pDetails.diffMrp >= 0 ? '+' : '') + pDetails.diffMrp.toFixed(2),
            pctChange
          ];
        });

        const totalDiff = totalNewMrp - totalCurrMrp;
        items.push([
          'Total',
          '',
          `${promoItems.length} Items`,
          totalCurrCpu.toFixed(2),
          totalNewCpu.toFixed(2),
          totalCurrMrp.toFixed(2),
          totalNewMrp.toFixed(2),
          (totalDiff >= 0 ? '+' : '') + totalDiff.toFixed(2),
          ''
        ]);

      } else {
        // Mock fallback for types not built yet
        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: selectedDocument,
          date: new Date().toISOString().split('T')[0],
          orderNo: 'DIRECT',
          deliveryTo: selectedStore,
          vendorName: 'N/A',
          remarks: 'N/A'
        };
        items = [];
      }

      // Generate PDF
      const isLandscape = (
        selectedType === 'Purchase Order' ||
        selectedType === 'Purchase Receive Challan' ||
        selectedType === 'Purchase Return Challan' ||
        selectedType === 'Store Delivery Challan' ||
        selectedType === 'Store Delivery Receive Challan' ||
        selectedType === 'Store Delivery Challan Summary' ||
        selectedType === 'Receive from Shop Challan' ||
        selectedType === 'Store Requisition' ||
        selectedType === 'Store Requisition(Ecom)' ||
        selectedType === 'DML Challan' ||
        selectedType === 'Damage and Lost' ||
        selectedType === 'Damage & Lost' ||
        selectedType === 'Circular Price Change'
      );
      const doc = new jsPDF(isLandscape ? 'landscape' : 'portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let startY = 36;
      const currentUserName = user?.name || user?.username || (localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user'))?.name || JSON.parse(localStorage.getItem('erp_user'))?.username : '') || 'Super Admin';
      const displayName = (currentUserName === 'msmraqeeb@gmail.com' || currentUserName === 'admin@email.com') ? 'Super Admin' : currentUserName;

      if (isLandscape) {
        // 1. Top Green Banner (#2e6f40)
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
        const titleText = `${headerInfo.title || selectedType.toUpperCase()} (DUPLICATE)`;
        doc.text(titleText, pageWidth - 14, 14, { align: 'right' });

        // 2. Metadata Section below Banner
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(50, 50, 50);

        let line1Left = '';
        let line2Left = '';

        if (selectedType === 'Circular Price Change') {
          line1Left = `Circular Name: ${headerInfo.remarks || headerInfo.docNo || 'N/A'} | Effective Date: ${headerInfo.date || 'N/A'}`;
          line2Left = `Store Scope: ${headerInfo.deliveryTo || 'Central Store'}`;
        } else {
          line1Left = `Challan No: ${headerInfo.docNo || 'N/A'}`;
          if (headerInfo.date) line1Left += ` | Date: ${headerInfo.date}`;
          if (headerInfo.deliveryTo) line1Left += ` | Store: ${headerInfo.deliveryTo}`;

          if (headerInfo.vendorName && headerInfo.vendorName !== 'N/A') line2Left += `Vendor: ${headerInfo.vendorName}`;
          if (headerInfo.remarks && headerInfo.remarks !== 'N/A') line2Left += (line2Left ? ' | ' : '') + `Reference No: ${headerInfo.remarks}`;
          if (headerInfo.orderNo && headerInfo.orderNo !== 'N/A') line2Left += (line2Left ? ' | ' : '') + `PO: ${headerInfo.orderNo}`;
          if (!line2Left) line2Left = `Store Scope: Central Store`;
        }

        const printDateStr = new Date().toLocaleString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });

        doc.text(line1Left, 14, 30);
        doc.text(line2Left, 14, 35);

        doc.text(`Generated On: ${printDateStr}`, pageWidth - 14, 30, { align: 'right' });
        doc.text(`Printed By: ${displayName}`, pageWidth - 14, 35, { align: 'right' });

        startY = 40;
      } else {
        // Portrait fallback
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(46, 111, 64);
        doc.text("EZ ERP", pageWidth / 2, 13, { align: 'center' });
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(70, 70, 70);
        doc.text("House: 352, Lane: 05, 2nd floor, Baridhara DOHS, Dhaka-1212, Bangladesh", pageWidth / 2, 18, { align: 'center' });

        // Top Right details
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(46, 111, 64);
        doc.text(headerInfo.title || 'CHALLAN', pageWidth - 14, 13, { align: 'right' });
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);
        doc.text(`Challan No: ${headerInfo.docNo || ''}`, pageWidth - 14, 18.5, { align: 'right' });
        if (headerInfo.date) doc.text(`Date: ${headerInfo.date}`, pageWidth - 14, 23, { align: 'right' });
        if (headerInfo.deliveryTo) doc.text(`Delivery To: ${headerInfo.deliveryTo}`, pageWidth - 14, 27.5, { align: 'right' });
        
        // Duplicate badge right below Delivery To
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(220, 38, 38);
        doc.text(`[DUPLICATE]`, pageWidth - 14, 32, { align: 'right' });

        // Top Left details
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);
        if (headerInfo.vendorName) {
          doc.text(`Vendor Name:`, 14, 18.5);
          doc.setFont("helvetica", "normal");
          doc.text(`${headerInfo.vendorName}`, 42, 18.5);
        }
        if (headerInfo.remarks) {
          doc.setFont("helvetica", "bold");
          doc.text(`Reference No:`, 14, 23);
          doc.setFont("helvetica", "normal");
          doc.text(`${headerInfo.remarks}`, 42, 23);
        }
        startY = 36;
      }
      let tableHead = [['SL', 'Barcode', 'Item Name', 'Pur. Price', 'MRP', 'Qty', 'Disc(%)', 'Free Qty', 'Value', 'Dis.Amt', 'VAT', 'Amount']];

      if (selectedType === 'Purchase Order') {
        tableHead = [['SL', 'Barcode', 'Item Name', 'Pur. Price', 'MRP', 'Qty', 'Disc(%)', 'Free Qty', 'Value', 'Dis.Amt', 'VAT', 'Amount']];
      } else if (selectedType === 'Purchase Receive Challan') {
        tableHead = [['SL', 'Barcode', 'Item Name', 'PO Qty', 'Rcv Qty', 'Pur. Price', 'MRP', 'Disc(%)', 'Free Qty', 'Value', 'Dis.Amt', 'VAT', 'Amount']];
      } else if (selectedType === 'Purchase Return Challan') {
        tableHead = [['SL', 'Barcode', 'Item Name', 'Return Qty', 'Cost Price', 'Sale Price', 'Disc(%)', 'VAT', 'Amount']];
      } else if (selectedType === 'Store Delivery Receive Challan' || selectedType === 'Store Delivery Challan' || selectedType === 'Store Delivery Challan Summary') {
        tableHead = [['SL', 'Barcode', 'Item Name', 'Del Qty', 'C. Stock', 'CPU', 'Sale Price', 'Cost Value', 'Sale Value']];
      } else if (selectedType === 'DML Challan' || selectedType === 'Damage and Lost' || selectedType === 'Damage & Lost') {
        tableHead = [['SL', 'Reference No', 'Barcode', 'Item Name', 'CPU (Tk)', 'Sale Price (Tk)', 'DML Qty', 'Unit', 'Amount (Tk)', 'Reason']];
      } else if (selectedType === 'Circular Price Change') {
        tableHead = [['SL', 'CODE / BARCODE', 'ITEM NAME', 'CURRENT CPU', 'NEW CPU', 'CURRENT MRP', 'NEW MRP', 'DIFF (MRP)', 'CHANGE (%)']];
      }

      autoTable(doc, {
        startY: startY,
        head: tableHead,
        body: items,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle', textColor: [30, 30, 30] },
        headStyles: { fillColor: [46, 111, 64], fontStyle: 'bold', textColor: [255, 255, 255], halign: 'center' },
        didParseCell: function (data) {
          if (data.section === 'head') {
            if (data.column.index === 0) data.cell.styles.halign = 'center';
            else if (selectedType === 'DML Challan' || selectedType === 'Damage and Lost' || selectedType === 'Damage & Lost') {
              if (data.column.index === 1 || data.column.index === 2 || data.column.index === 3 || data.column.index === 9) data.cell.styles.halign = 'left';
              else if (data.column.index === 7) data.cell.styles.halign = 'center';
              else data.cell.styles.halign = 'right';
            } else {
              if (data.column.index === 1 || data.column.index === 2) data.cell.styles.halign = 'left';
              else data.cell.styles.halign = 'right';
            }
          } else if (data.section === 'body') {
            if (data.column.index === 0) data.cell.styles.halign = 'center';
            else if (selectedType === 'DML Challan' || selectedType === 'Damage and Lost' || selectedType === 'Damage & Lost') {
              if (data.column.index === 1 || data.column.index === 2 || data.column.index === 3 || data.column.index === 9) data.cell.styles.halign = 'left';
              else if (data.column.index === 7) data.cell.styles.halign = 'center';
              else data.cell.styles.halign = 'right';
            } else {
              if (data.column.index === 1 || data.column.index === 2) data.cell.styles.halign = 'left';
              else data.cell.styles.halign = 'right';
            }
          }
          if (data.row.index === items.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 245, 240];
            data.cell.styles.textColor = [10, 60, 20];
          }
        },
        margin: { top: 10, left: 14, right: 14 }
      });

      const finalY = doc.lastAutoTable?.finalY || startY + 50;

      // 5. Signatures (Matching Image 2)
      const sigY = Math.max(finalY + 24, pageHeight - 24);
      doc.setDrawColor(160, 174, 192);
      doc.setLineWidth(0.4);

      // Prepared By (Left)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(displayName, 47.5, sigY - 2.5, { align: 'center' });
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

      doc.save(`Reprint_${String(headerInfo.docNo || selectedDocument).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
      toast.success("Reprint PDF Generated");

    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      
      <SectionWrapper title="Reprint">
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '1000px' }}>
          
          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 200px', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>From</label>
              <input 
                type="date" 
                className="input-animated" 
                value={fromDate} 
                onChange={e => setFromDate(e.target.value)} 
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>TO</label>
              <input 
                type="date" 
                className="input-animated" 
                value={toDate} 
                onChange={e => setToDate(e.target.value)} 
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type</label>
            <CustomSelect 
              className="input-animated" 
              value={selectedType} 
              onChange={e => setSelectedType(e.target.value)}
              style={{ width: '100%', maxWidth: '600px' }}
            >
              <option value="">-- Select --</option>
              {REPRINT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </CustomSelect>
          </div>

          {/* Store */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Store</label>
            <CustomSelect 
              className="input-animated" 
              value={selectedStore} 
              onChange={e => setSelectedStore(e.target.value)}
              style={{ width: '100%', maxWidth: '600px' }}
            >
              <option value="">-- All --</option>
              <option value="Central Store">Central Store</option>
              {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </CustomSelect>
          </div>

          {/* Document No */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', minHeight: '20px' }}>
              {selectedType ? getLabelForType() : 'Document No'}
            </label>
            <CustomSelect 
              className="input-animated" 
              value={selectedDocument} 
              onChange={e => setSelectedDocument(e.target.value)}
              style={{ width: '100%', maxWidth: '600px' }}
              disabled={isLoading || documentList.length === 0}
            >
              <option value="">-- Select --</option>
              {documentList.map(doc => (
                <option key={doc} value={doc}>{doc}</option>
              ))}
            </CustomSelect>
            {isLoading && <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading...</span>}
            {!isLoading && selectedType && documentList.length === 0 && (
              <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'var(--danger)' }}>No documents found for this period.</span>
            )}
          </div>

          {/* Reprint Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button className="btn-theme" 
              onClick={handleReprint}
              disabled={isLoading}
              style={{ 
                padding: '10px 40px', 
                backgroundColor: 'var(--accent-primary)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: isLoading ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold',
                transition: 'all 0.3s'
              }}
            >
              {isLoading ? 'Wait...' : 'Reprint'}
            </button>
          </div>

        </div>

      </SectionWrapper>
    </div>
  );
};

export default Reprint;
