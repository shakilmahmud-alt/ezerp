import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Package, 
  FileText, 
  RefreshCw, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Calendar, 
  Hash, 
  Layers, 
  CheckCircle,
  Truck,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

const PosReceiveReport = () => {
  const { posTerminal } = useAuth();
  const [activeTab, setActiveTab] = useState('product'); // 'product' | 'challan'
  
  const [purchaseReceives, setPurchaseReceives] = useState([]);
  const [purchaseReceiveItems, setPurchaseReceiveItems] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [requisitionItems, setRequisitionItems] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProductIds, setExpandedProductIds] = useState(new Set());
  const [expandedChallanIds, setExpandedChallanIds] = useState(new Set());

  useEffect(() => {
    fetchReceiveData();
  }, []);

  const fetchReceiveData = async () => {
    setIsLoading(true);
    try {
      const [
        prRes, 
        priRes, 
        reqRes, 
        reqiRes, 
        prodRes
      ] = await Promise.all([
        supabase.from('purchase_receives').select('*').order('created_at', { ascending: false }),
        supabase.from('purchase_receive_items').select('*'),
        supabase.from('requisitions').select('*').order('created_at', { ascending: false }),
        supabase.from('requisition_items').select('*'),
        supabase.from('products').select('id, barcode, code, item_name, purchase_price, mrp')
      ]);

      if (prRes.data) setPurchaseReceives(prRes.data);
      if (priRes.data) setPurchaseReceiveItems(priRes.data);
      if (reqRes.data) setRequisitions(reqRes.data);
      if (reqiRes.data) setRequisitionItems(reqiRes.data);
      if (prodRes.data) setProducts(prodRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching stock receive data');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle expand for a product
  const toggleProductExpand = (pId) => {
    setExpandedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(pId)) {
        next.delete(pId);
      } else {
        next.add(pId);
      }
      return next;
    });
  };

  // Toggle expand for all products
  const toggleAllProducts = (expandAll) => {
    if (expandAll) {
      const allIds = new Set(productWiseData.map(p => p.productId));
      setExpandedProductIds(allIds);
    } else {
      setExpandedProductIds(new Set());
    }
  };

  // Toggle expand for a challan
  const toggleChallanExpand = (cId) => {
    setExpandedChallanIds(prev => {
      const next = new Set(prev);
      if (next.has(cId)) {
        next.delete(cId);
      } else {
        next.add(cId);
      }
      return next;
    });
  };

  // ----------------------------------------------------
  // Product Map Dictionary
  // ----------------------------------------------------
  const productMap = useMemo(() => {
    const map = {};
    products.forEach(p => {
      map[p.id] = p;
      if (p.barcode) map[p.barcode] = p;
    });
    return map;
  }, [products]);

  // ----------------------------------------------------
  // 1. Group Receives by Product (Product-Wise View)
  // ----------------------------------------------------
  const productWiseData = useMemo(() => {
    const grouped = {};

    // 1. Process purchase_receive_items
    purchaseReceiveItems.forEach(item => {
      const pr = purchaseReceives.find(p => p.id === item.purchase_receive_id);
      const prod = productMap[item.product_id] || { item_name: 'Product', barcode: 'N/A', purchase_price: item.pur_price, mrp: item.sale_price };
      const pId = item.product_id || item.barcode || 'N/A';

      if (!grouped[pId]) {
        grouped[pId] = {
          productId: pId,
          barcode: prod.barcode || prod.code || 'N/A',
          productName: prod.item_name || 'Product',
          costPrice: Number(prod.purchase_price || item.pur_price || 0),
          mrp: Number(prod.mrp || item.sale_price || 0),
          totalRcvQty: 0,
          totalCostValue: 0,
          challans: []
        };
      }

      const challanNo = pr?.last_challan_no || pr?.id || 'N/A';
      const date = pr?.purchase_date || (pr?.created_at ? pr.created_at.slice(0, 10) : '-');
      const refNo = pr?.reference_no || '-';
      const qty = Number(item.rcv_qty || item.po_qty || 0);
      const cost = Number(item.pur_price || prod.purchase_price || 0);
      const lineTotal = Number(item.line_amount || (qty * cost));

      grouped[pId].totalRcvQty += qty;
      grouped[pId].totalCostValue += lineTotal;
      grouped[pId].challans.push({
        id: item.id,
        challan_no: challanNo,
        date: date,
        reference_no: refNo,
        rcv_qty: qty,
        pur_price: cost,
        sale_price: Number(item.sale_price || prod.mrp || 0),
        line_total: lineTotal,
        source: 'Purchase Receive',
        delivery_to: pr?.delivery_to || 'Central Store'
      });
    });

    // 2. Process requisition_items (Store Delivery / Shop Receive)
    requisitionItems.forEach(item => {
      const req = requisitions.find(r => r.id === item.requisition_id);
      const prod = productMap[item.product_id] || productMap[item.barcode] || { item_name: item.product_name, barcode: item.barcode, purchase_price: item.cpu, mrp: item.mrp };
      const pId = item.product_id || item.barcode || 'N/A';

      if (!grouped[pId]) {
        grouped[pId] = {
          productId: pId,
          barcode: prod.barcode || item.barcode || 'N/A',
          productName: prod.item_name || item.product_name || 'Product',
          costPrice: Number(prod.purchase_price || item.cpu || 0),
          mrp: Number(prod.mrp || item.mrp || 0),
          totalRcvQty: 0,
          totalCostValue: 0,
          challans: []
        };
      }

      const challanNo = req?.challan_no || req?.requisition_no || 'N/A';
      const date = req?.requisition_date || (req?.created_at ? req.created_at.slice(0, 10) : '-');
      const refNo = req?.requisition_no || '-';
      const qty = Number(item.approve_qty || item.req_qty || 0);
      const cost = Number(item.cpu || prod.purchase_price || 0);
      const lineTotal = Number(item.cost_value || (qty * cost));

      grouped[pId].totalRcvQty += qty;
      grouped[pId].totalCostValue += lineTotal;
      grouped[pId].challans.push({
        id: item.id,
        challan_no: challanNo,
        date: date,
        reference_no: refNo,
        rcv_qty: qty,
        pur_price: cost,
        sale_price: Number(item.mrp || prod.mrp || 0),
        line_total: lineTotal,
        source: 'Store Delivery / Transfer',
        delivery_to: 'Branch Store'
      });
    });

    const list = Object.values(grouped).sort((a, b) => b.totalRcvQty - a.totalRcvQty);
    return list.map((item, idx) => ({ ...item, sl: idx + 1 }));
  }, [purchaseReceives, purchaseReceiveItems, requisitions, requisitionItems, productMap]);

  // Filtered Product Wise Data based on Search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return productWiseData;
    const q = searchQuery.trim().toLowerCase();
    return productWiseData.filter(p => 
      p.productName.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.challans.some(c => c.challan_no.toLowerCase().includes(q) || c.date.includes(q) || c.reference_no.toLowerCase().includes(q))
    );
  }, [productWiseData, searchQuery]);

  // ----------------------------------------------------
  // 2. Challan Wise View Data
  // ----------------------------------------------------
  const challanWiseData = useMemo(() => {
    const list = [];

    // Purchase Receives
    purchaseReceives.forEach(pr => {
      const items = purchaseReceiveItems.filter(i => i.purchase_receive_id === pr.id);
      list.push({
        id: pr.id,
        challan_no: pr.last_challan_no || pr.id,
        date: pr.purchase_date || (pr.created_at ? pr.created_at.slice(0, 10) : '-'),
        reference_no: pr.reference_no || '-',
        delivery_to: pr.delivery_to || posTerminal?.store_name || 'Central Store',
        net_amount: Number(pr.net_amount || pr.total_value || 0),
        total_items: items.reduce((sum, i) => sum + Number(i.rcv_qty || i.po_qty || 0), 0),
        source: 'Purchase Receive',
        items: items.map(i => {
          const prod = productMap[i.product_id] || { item_name: 'Product', barcode: '-' };
          return {
            id: i.id,
            barcode: prod.barcode || '-',
            product_name: prod.item_name || 'Product',
            qty: Number(i.rcv_qty || i.po_qty || 0),
            price: Number(i.pur_price || 0),
            total: Number(i.line_amount || (Number(i.rcv_qty || 0) * Number(i.pur_price || 0)))
          };
        })
      });
    });

    // Requisitions
    requisitions.forEach(req => {
      const items = requisitionItems.filter(i => i.requisition_id === req.id);
      list.push({
        id: req.id,
        challan_no: req.challan_no || req.requisition_no,
        date: req.requisition_date || (req.created_at ? req.created_at.slice(0, 10) : '-'),
        reference_no: req.requisition_no || '-',
        delivery_to: 'Branch Store',
        net_amount: items.reduce((sum, i) => sum + Number(i.cost_value || (Number(i.approve_qty || i.req_qty || 0) * Number(i.cpu || 0))), 0),
        total_items: items.reduce((sum, i) => sum + Number(i.approve_qty || i.req_qty || 0), 0),
        source: 'Store Delivery / Transfer',
        items: items.map(i => ({
          id: i.id,
          barcode: i.barcode || '-',
          product_name: i.product_name || 'Product',
          qty: Number(i.approve_qty || i.req_qty || 0),
          price: Number(i.cpu || 0),
          total: Number(i.cost_value || (Number(i.approve_qty || i.req_qty || 0) * Number(i.cpu || 0)))
        }))
      });
    });

    return list.sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [purchaseReceives, purchaseReceiveItems, requisitions, requisitionItems, productMap, posTerminal]);

  // Filtered Challan Wise Data based on Search
  const filteredChallans = useMemo(() => {
    if (!searchQuery.trim()) return challanWiseData;
    const q = searchQuery.trim().toLowerCase();
    return challanWiseData.filter(c => 
      c.challan_no.toLowerCase().includes(q) ||
      c.date.includes(q) ||
      c.reference_no.toLowerCase().includes(q) ||
      c.delivery_to.toLowerCase().includes(q) ||
      c.items.some(i => i.product_name.toLowerCase().includes(q) || i.barcode.toLowerCase().includes(q))
    );
  }, [challanWiseData, searchQuery]);

  // Summary Metrics
  const totalUniqueProducts = productWiseData.length;
  const totalReceivedQtySum = productWiseData.reduce((sum, p) => sum + p.totalRcvQty, 0);
  const totalCostValuation = productWiseData.reduce((sum, p) => sum + p.totalCostValue, 0);
  const totalChallansCount = challanWiseData.length;

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontSize: '13px', color: '#1e293b' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Stock Receive Report <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500 }}>({posTerminal?.store_name || 'Banani Model Town'})</span>
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Detailed breakdown of goods received across all delivery challans and supplier purchases.
          </p>
        </div>

        <button 
          className="btn-secondary" 
          onClick={fetchReceiveData}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            color: '#2e6f40',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> 
          Refresh Data
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        
        {/* Total Unique Products */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #2e6f40', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{totalUniqueProducts}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>Unique Products Received</div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2f5ea', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#2e6f40' }}>
              <Package size={20} />
            </div>
          </div>
        </div>

        {/* Total Received Quantity */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{totalReceivedQtySum.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>pcs</span></div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>Total Quantity Received</div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e0f2fe', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#0284c7' }}>
              <Layers size={20} />
            </div>
          </div>
        </div>

        {/* Total Received Challans */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{totalChallansCount}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>Total Challans Received</div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#d97706' }}>
              <Truck size={20} />
            </div>
          </div>
        </div>

        {/* Total Valuation */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #8b5cf6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>৳ {totalCostValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>Total Cost Valuation</div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f3e8ff', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#7c3aed' }}>
              <DollarSign size={20} />
            </div>
          </div>
        </div>

      </div>

      {/* Main Container with Tabs and Live Search */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        
        {/* Navigation Tabs Bar & Search Box */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '14px 20px', 
          borderBottom: '1px solid #e2e8f0', 
          backgroundColor: '#ffffff',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('product')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                backgroundColor: activeTab === 'product' ? '#2e6f40' : '#f1f5f9',
                color: activeTab === 'product' ? '#ffffff' : '#475569',
                transition: 'all 0.2s ease'
              }}
            >
              <Package size={15} />
              Product Wise Receive
              <span style={{ 
                backgroundColor: activeTab === 'product' ? '#1b4327' : '#e2e8f0', 
                color: activeTab === 'product' ? '#ffffff' : '#475569',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.72rem'
              }}>
                {filteredProducts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('challan')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                backgroundColor: activeTab === 'challan' ? '#2e6f40' : '#f1f5f9',
                color: activeTab === 'challan' ? '#ffffff' : '#475569',
                transition: 'all 0.2s ease'
              }}
            >
              <FileText size={15} />
              Challan Wise Receive
              <span style={{ 
                backgroundColor: activeTab === 'challan' ? '#1b4327' : '#e2e8f0', 
                color: activeTab === 'challan' ? '#ffffff' : '#475569',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.72rem'
              }}>
                {filteredChallans.length}
              </span>
            </button>
          </div>

          {/* Controls: Search + Expand All */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeTab === 'product' && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => toggleAllProducts(true)}
                  style={{ padding: '6px 10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#334155' }}
                >
                  Expand All
                </button>
                <button
                  onClick={() => toggleAllProducts(false)}
                  style={{ padding: '6px 10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#334155' }}
                >
                  Collapse All
                </button>
              </div>
            )}

            {/* Live Search Bar */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={activeTab === 'product' ? 'Search barcode, product, challan...' : 'Search challan no, date, ref...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '7px 12px 7px 30px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  width: '240px',
                  fontSize: '0.82rem',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>
          </div>

        </div>

        {/* TAB 1: PRODUCT WISE RECEIVE TAB */}
        {activeTab === 'product' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#ffffff' }}>
                  <th style={{ textAlign: 'center', padding: '10px 8px', width: '45px' }}>SL</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Barcode</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px' }}>Product Name</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Cost Price</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>MRP</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Total Received Qty</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Total Cost Value</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', width: '140px' }}>Challans Count</th>
                  <th style={{ textAlign: 'center', padding: '10px 10px', width: '70px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '35px', color: '#94a3b8' }}>
                      No product receive records found
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isExpanded = expandedProductIds.has(p.productId);
                    return (
                      <React.Fragment key={p.productId}>
                        {/* Master Product Row */}
                        <tr 
                          onClick={() => toggleProductExpand(p.productId)}
                          style={{ 
                            borderBottom: '1px solid #f1f5f9', 
                            backgroundColor: isExpanded ? '#f0fdf4' : p.sl % 2 === 0 ? '#fafafa' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '10px 8px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                            {p.sl}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2e6f40', fontFamily: 'monospace' }}>
                            {p.barcode}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                            {p.productName}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>
                            ৳ {p.costPrice.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                            ৳ {p.mrp.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <span style={{ 
                              padding: '3px 10px', 
                              borderRadius: '4px', 
                              backgroundColor: '#e0f2fe', 
                              color: '#0369a1', 
                              fontWeight: 700, 
                              fontSize: '0.82rem' 
                            }}>
                              {p.totalRcvQty.toLocaleString()} pcs
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                            ৳ {p.totalCostValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '12px',
                              backgroundColor: '#e2f5ea',
                              color: '#166534',
                              fontWeight: 600,
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <FileText size={12} />
                              {p.challans.length} Challan{p.challans.length > 1 ? 's' : ''}
                            </span>
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProductExpand(p.productId);
                              }}
                              style={{
                                border: 'none',
                                background: isExpanded ? '#2e6f40' : '#f1f5f9',
                                color: isExpanded ? '#ffffff' : '#64748b',
                                width: '26px',
                                height: '26px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Challan Breakdown Sub-table */}
                        {isExpanded && (
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <td colSpan="9" style={{ padding: '12px 20px 16px 40px', borderBottom: '2px solid #cbd5e1' }}>
                              <div style={{ backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
                                <div style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Truck size={14} color="#2e6f40" />
                                    Challan Breakdown for: <span style={{ color: '#2e6f40' }}>{p.productName}</span> ({p.barcode})
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    Received across {p.challans.length} unique deliveries
                                  </span>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                  <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                      <th style={{ textAlign: 'center', padding: '6px 8px', width: '35px' }}>#</th>
                                      <th style={{ textAlign: 'left', padding: '6px 10px' }}>Challan No</th>
                                      <th style={{ textAlign: 'left', padding: '6px 10px' }}>Receive Date</th>
                                      <th style={{ textAlign: 'left', padding: '6px 10px' }}>Reference / Req No</th>
                                      <th style={{ textAlign: 'right', padding: '6px 10px' }}>Received Qty</th>
                                      <th style={{ textAlign: 'right', padding: '6px 10px' }}>Cost Price</th>
                                      <th style={{ textAlign: 'right', padding: '6px 10px' }}>Line Total</th>
                                      <th style={{ textAlign: 'left', padding: '6px 10px' }}>Receive Source</th>
                                      <th style={{ textAlign: 'left', padding: '6px 10px' }}>Delivery Destination</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {p.challans.map((ch, chIdx) => (
                                      <tr key={ch.id || chIdx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: chIdx % 2 === 0 ? '#ffffff' : '#fcfdfd' }}>
                                        <td style={{ padding: '6px 8px', textAlign: 'center', color: '#94a3b8' }}>
                                          {chIdx + 1}
                                        </td>
                                        <td style={{ padding: '6px 10px', fontWeight: 700, color: '#2e6f40', fontFamily: 'monospace' }}>
                                          {ch.challan_no}
                                        </td>
                                        <td style={{ padding: '6px 10px', color: '#334155' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={12} color="#64748b" />
                                            {ch.date}
                                          </div>
                                        </td>
                                        <td style={{ padding: '6px 10px', color: '#64748b' }}>
                                          {ch.reference_no}
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>
                                          {ch.rcv_qty.toLocaleString()} pcs
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#475569' }}>
                                          ৳ {ch.pur_price.toFixed(2)}
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>
                                          ৳ {ch.line_total.toFixed(2)}
                                        </td>
                                        <td style={{ padding: '6px 10px' }}>
                                          <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.72rem',
                                            fontWeight: 600,
                                            backgroundColor: ch.source === 'Purchase Receive' ? '#eff6ff' : '#fef3c7',
                                            color: ch.source === 'Purchase Receive' ? '#1e40af' : '#92400e'
                                          }}>
                                            {ch.source}
                                          </span>
                                        </td>
                                        <td style={{ padding: '6px 10px', color: '#475569', fontWeight: 500 }}>
                                          {ch.delivery_to}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: CHALLAN WISE RECEIVE TAB */}
        {activeTab === 'challan' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#ffffff' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px' }}>Challan No</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Reference No</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Delivery Destination</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Total Items (pcs)</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px' }}>Net Amount</th>
                  <th style={{ textAlign: 'center', padding: '10px 10px', width: '70px' }}>Items</th>
                </tr>
              </thead>
              <tbody>
                {filteredChallans.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '35px', color: '#94a3b8' }}>
                      No challan records found
                    </td>
                  </tr>
                ) : (
                  filteredChallans.map((row) => {
                    const isExpanded = expandedChallanIds.has(row.id);
                    return (
                      <React.Fragment key={row.id}>
                        <tr 
                          onClick={() => toggleChallanExpand(row.id)}
                          style={{ 
                            borderBottom: '1px solid #f1f5f9', 
                            backgroundColor: isExpanded ? '#f0fdf4' : '#ffffff',
                            cursor: 'pointer' 
                          }}
                        >
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#2e6f40', fontFamily: 'monospace' }}>
                            {row.challan_no}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#334155' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={13} color="#64748b" />
                              {row.date}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>
                            {row.reference_no}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#0369a1', fontWeight: 600 }}>
                            {row.delivery_to}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                            {row.total_items.toLocaleString()} pcs
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                            ৳ {row.net_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleChallanExpand(row.id);
                              }}
                              style={{
                                border: 'none',
                                background: isExpanded ? '#2e6f40' : '#f1f5f9',
                                color: isExpanded ? '#ffffff' : '#64748b',
                                width: '26px',
                                height: '26px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Challan Items Sub-table */}
                        {isExpanded && (
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <td colSpan="7" style={{ padding: '10px 20px 14px 30px', borderBottom: '2px solid #cbd5e1' }}>
                              <div style={{ backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                                <div style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                  Products in Challan: <span style={{ color: '#2e6f40' }}>{row.challan_no}</span>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                  <thead>
                                    <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '30px' }}>#</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Barcode</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Product Name</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Received Qty</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Unit Price</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Total Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.items.map((it, itIdx) => (
                                      <tr key={it.id || itIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '6px 8px', textAlign: 'center', color: '#94a3b8' }}>{itIdx + 1}</td>
                                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#2e6f40', fontFamily: 'monospace' }}>{it.barcode}</td>
                                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0f172a' }}>{it.product_name}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>{it.qty} pcs</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>৳ {it.price.toFixed(2)}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>৳ {it.total.toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};

export default PosReceiveReport;
