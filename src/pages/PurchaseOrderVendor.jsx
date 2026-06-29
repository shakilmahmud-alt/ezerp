import React, { useState, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const PurchaseOrderVendor = () => {
  const [vendors, setVendors] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  
  // Temporary selection inside modal
  const [tempSelectedProducts, setTempSelectedProducts] = useState([]);

  // Main page state
  const [headerData, setHeaderData] = useState({
    vendorId: '',
    supplierPaymentType: 'CashPurchase',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date().toISOString().split('T')[0],
    referenceNo: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    deliveryTo: 'Central Store',
    poNumber: ''
  });

  const [poStats, setPoStats] = useState({ count: 0, lastPoNo: '' });

  const [selectedItems, setSelectedItems] = useState([]);
  const [printTwoCopy, setPrintTwoCopy] = useState(false);

  useEffect(() => {
    fetchInitialData();
    fetchPoStats();
  }, []);

  const fetchPoStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('po_number')
        .gte('created_at', `${today}T00:00:00Z`)
        .lte('created_at', `${today}T23:59:59Z`)
        .order('created_at', { ascending: false });

      if (error && error.code !== '42703') throw error; // Ignore missing column error if not created yet
      
      if (data) {
        const count = data.length;
        const lastPoNo = count > 0 ? data[0].po_number : '';
        setPoStats({ count, lastPoNo });
      }
    } catch (err) {
      console.error("Error fetching PO stats:", err);
    }
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [vendorRes, productRes] = await Promise.all([
        supabase.from('vendors').select('id, name').order('name'),
        supabase.from('products').select('*').order('item_name')
      ]);
      setVendors(vendorRes.data || []);
      setAllProducts(productRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load initial data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHeaderChange = async (e) => {
    const { name, value } = e.target;
    if (name === 'vendorId') {
      setIsLoading(true);
      try {
        const { data: heldPOs, error } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('vendor_id', value)
          .eq('status', 'Hold')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (heldPOs && heldPOs.length > 0) {
          const heldPO = heldPOs[0];
          
          setHeaderData({
            vendorId: value,
            supplierPaymentType: heldPO.supplier_payment_type || 'CashPurchase',
            orderDate: heldPO.order_date || new Date().toISOString().split('T')[0],
            deliveryDate: heldPO.delivery_date || new Date().toISOString().split('T')[0],
            referenceNo: heldPO.reference_no || '',
            startDate: heldPO.start_date || new Date().toISOString().split('T')[0],
            endDate: heldPO.end_date || new Date().toISOString().split('T')[0],
            deliveryTo: heldPO.delivery_to || 'Central Store',
            poNumber: heldPO.po_number || '',
            id: heldPO.id
          });

          const { data: itemsData, error: itemsError } = await supabase
            .from('purchase_order_items')
            .select('*, products(item_name, barcode, sale_vat_percent)')
            .eq('purchase_order_id', heldPO.id);
            
          if (itemsError) throw itemsError;

          if (itemsData) {
            const mappedItems = itemsData.map(item => ({
              id: item.product_id,
              item_name: item.products?.item_name,
              barcode: item.products?.barcode,
              sale_vat_percent: item.products?.sale_vat_percent,
              qty: item.qty,
              purPrice: item.pur_price,
              mrpPrice: item.mrp_price,
              discPercent: item.disc_percent,
              freeQty: item.free_qty,
              lineNotes: item.line_notes || ''
            }));
            setSelectedItems(mappedItems);
          }
          toast('Loaded held purchase order from database', { icon: '📦' });
        } else {
          setHeaderData({
            vendorId: value,
            supplierPaymentType: 'CashPurchase',
            orderDate: new Date().toISOString().split('T')[0],
            deliveryDate: new Date().toISOString().split('T')[0],
            referenceNo: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            deliveryTo: 'Central Store',
            poNumber: ''
          });
          setSelectedItems([]);
        }
      } catch (err) {
        console.error(err);
        toast.error("Error loading held order");
      } finally {
        setIsLoading(false);
      }
    } else {
      setHeaderData({ ...headerData, [name]: value });
    }
  };

  const openProductModal = () => {
    setTempSelectedProducts(selectedItems.map(item => item.id));
    setShowModal(true);
  };

  const toggleProductSelection = (productId) => {
    setTempSelectedProducts(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const confirmProductSelection = () => {
    const newSelectedItems = tempSelectedProducts.map(id => {
      // Keep existing items if they were already selected so we don't lose typed data
      const existing = selectedItems.find(item => item.id === id);
      if (existing) return existing;
      
      // Map new products from allProducts
      const prod = allProducts.find(p => p.id === id);
      return {
        ...prod,
        qty: 1,
        discPercent: 0,
        freeQty: 0,
        lineNotes: '',
        purPrice: prod.purchase_price || 0,
        mrpPrice: prod.mrp || 0
      };
    });
    
    setSelectedItems(newSelectedItems);
    setShowModal(false);
  };

  const updateItem = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;
    setSelectedItems(updated);
  };

  // Calculations
  const calculateRow = (item) => {
    const val = Number(item.purPrice || 0) * Number(item.qty || 0);
    const discAmt = val * (Number(item.discPercent || 0) / 100);
    const vatPercent = Number(item.sale_vat_percent || 0);
    const vatAmt = (val - discAmt) * (vatPercent / 100);
    const amt = val - discAmt + vatAmt;
    
    return {
      value: val,
      discAmt: discAmt,
      vatAmt: vatAmt,
      amount: amt
    };
  };

  const getTotals = () => {
    let totalValue = 0;
    let totalVat = 0;
    let totalAmount = 0;
    
    selectedItems.forEach(item => {
      const calc = calculateRow(item);
      totalValue += calc.value;
      totalVat += calc.vatAmt;
      totalAmount += calc.amount;
    });

    return { totalValue, totalVat, totalAmount };
  };

  const totals = getTotals();

  const handleSave = async (type) => {
    if (!headerData.vendorId) {
      toast.error('Please select a Vendor');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    setIsLoading(true);
    try {
      const status = type === 'hold' ? 'Hold' : 'Saved';
      let poId = headerData.id;
      
      // Generate PO Number if saving for the first time
      let generatedPoNo = headerData.poNumber;
      if (status === 'Saved' && !generatedPoNo) {
        const dateObj = new Date();
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const countStr = String(poStats.count + 1).padStart(3, '0');
        generatedPoNo = `PO${yyyy}${mm}${dd}${countStr}`;
      }

      const poPayload = {
        vendor_id: headerData.vendorId,
        supplier_payment_type: headerData.supplierPaymentType,
        order_date: headerData.orderDate,
        delivery_date: headerData.deliveryDate,
        reference_no: headerData.referenceNo,
        start_date: headerData.startDate,
        end_date: headerData.endDate,
        delivery_to: headerData.deliveryTo,
        status: status,
        po_number: generatedPoNo
      };

      if (poId) poPayload.id = poId;

      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .upsert(poPayload)
        .select()
        .single();

      if (poError) throw poError;
      poId = poData.id;

      const { error: delError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', poId);
      if (delError) throw delError;

      const itemsPayload = selectedItems.map(item => ({
        purchase_order_id: poId,
        product_id: item.id,
        qty: item.qty,
        pur_price: item.purPrice,
        mrp_price: item.mrpPrice,
        disc_percent: item.discPercent,
        free_qty: item.freeQty,
        line_notes: item.lineNotes
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsPayload);
      if (itemsError) throw itemsError;

      toast.success(`Purchase Order ${status === 'Hold' ? 'held' : 'saved'} successfully!`);
      
      // Auto-generate PDF on Save
      if (status === 'Saved') {
        generatePDF(generatedPoNo);
        fetchPoStats(); // Refresh stats after saving
      }

      setSelectedItems([]);
      setHeaderData({
        vendorId: '',
        supplierPaymentType: 'CashPurchase',
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: new Date().toISOString().split('T')[0],
        referenceNo: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        deliveryTo: 'Central Store',
        poNumber: ''
      });
    } catch (err) {
      console.error(err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = (overridePoNo = null) => {
    if (selectedItems.length === 0) {
      toast.error('Please select products to preview');
      return;
    }
    
    const doc = new jsPDF('landscape');
    const vendorName = vendors.find(v => v.id == headerData.vendorId)?.name || '';
    const displayPoNo = overridePoNo || headerData.poNumber || 'DRAFT';

    doc.setFontSize(16);
    doc.text(`Purchase Order ${displayPoNo !== 'DRAFT' ? '# ' + displayPoNo : '(Draft)'}`, 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Vendor: ${vendorName}`, 14, 25);
    doc.text(`Order Date: ${headerData.orderDate}`, 14, 30);
    doc.text(`Delivery To: ${headerData.deliveryTo}`, 150, 25);
    doc.text(`Delivery Date: ${headerData.deliveryDate}`, 150, 30);

    const tableCols = ["Name", "Barcode", "Pur. Price", "MRP", "Qty", "Disc(%)", "Free Qty", "Value", "Dis.Amt", "VAT", "Amount"];
    const tableRows = selectedItems.map(item => {
      const calc = calculateRow(item);
      return [
        item.item_name || '',
        item.barcode || '',
        Number(item.purPrice).toFixed(2),
        Number(item.mrpPrice).toFixed(2),
        item.qty,
        item.discPercent,
        item.freeQty,
        calc.value.toFixed(2),
        calc.discAmt.toFixed(2),
        calc.vatAmt.toFixed(2),
        calc.amount.toFixed(2)
      ];
    });

    // Add Total Row
    tableRows.push([
      'Total',
      '',
      '',
      '',
      '',
      '',
      '',
      totals.totalValue.toFixed(2),
      '',
      totals.totalVat.toFixed(2),
      totals.totalAmount.toFixed(2)
    ]);

    autoTable(doc, {
      head: [tableCols],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [46, 111, 64] },
      didParseCell: function (data) {
        // Highlight total row
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save(`PurchaseOrder_${new Date().getTime()}.pdf`);
  };

  const filteredProducts = allProducts.filter(p => 
    p.item_name?.toLowerCase().includes(modalSearch.toLowerCase()) || 
    p.barcode?.toLowerCase().includes(modalSearch.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', position: 'relative' }}>
      
      <SectionWrapper title="Purchase Order">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vendor Name</label>
            <select name="vendorId" value={headerData.vendorId} onChange={handleHeaderChange} className="input-animated">
              <option value="">Select Vendor</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Supplier Payment Type</label>
            <select name="supplierPaymentType" value={headerData.supplierPaymentType} onChange={handleHeaderChange} className="input-animated">
              <option value="CashPurchase">CashPurchase</option>
              <option value="CreditPurchase">CreditPurchase</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Number Of PO</label>
            <input type="text" value={poStats.count} disabled className="input-animated" style={{ backgroundColor: 'transparent' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Last PO Number</label>
            <input type="text" value={poStats.lastPoNo || 'N/A'} disabled className="input-animated" style={{ backgroundColor: 'transparent' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Supply Schedule</label>
            <input type="text" value="0" disabled className="input-animated" style={{ backgroundColor: 'transparent' }} />
          </div>
          
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Order Date</label>
            <input type="date" name="orderDate" value={headerData.orderDate} onChange={handleHeaderChange} className="input-animated" />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Delivery Date</label>
            <input type="date" name="deliveryDate" value={headerData.deliveryDate} onChange={handleHeaderChange} className="input-animated" />
          </div>
          <div style={{ gridColumn: 'span 3' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Delivery To</label>
            <select name="deliveryTo" value={headerData.deliveryTo} onChange={handleHeaderChange} className="input-animated">
              <option value="Central Store">Central Store</option>
              <option value="JAMUNA FUTURE PARK">JAMUNA FUTURE PARK</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reference No</label>
            <input type="text" name="referenceNo" value={headerData.referenceNo} onChange={handleHeaderChange} className="input-animated" />
          </div>
          <div style={{ gridColumn: 'span 4' }}></div>

          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Start Date</label>
            <input type="date" name="startDate" value={headerData.startDate} onChange={handleHeaderChange} className="input-animated" />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>End Date</label>
            <input type="date" name="endDate" value={headerData.endDate} onChange={handleHeaderChange} className="input-animated" />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Divider</label>
            <input type="text" value="1" disabled className="input-animated" style={{ backgroundColor: 'transparent' }} />
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper 
        title="Product Details" 
        rightContent={<span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 'bold' }}>Item Selected: {selectedItems.length} / Challan Quantity: {selectedItems.reduce((acc, curr) => acc + Number(curr.qty || 0), 0)}</span>}
      >
        <button 
          onClick={openProductModal}
          style={{ padding: '8px 20px', backgroundColor: '#e9d5ff', color: '#6b21a8', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' }}
         className="btn-theme">
          Select Product
        </button>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left', minWidth: '1500px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px' }}></th>
                <th style={{ padding: '8px' }}>Name</th>
                <th style={{ padding: '8px' }}>Barcode</th>
                <th style={{ padding: '8px' }}>UOM</th>
                <th style={{ padding: '8px' }}>Carton<br/>Size</th>
                <th style={{ padding: '8px' }}>Reord.<br/>Qty</th>
                <th style={{ padding: '8px' }}>Min<br/>Stk</th>
                <th style={{ padding: '8px' }}>WH<br/>STK</th>
                <th style={{ padding: '8px' }}>STR<br/>STK</th>
                <th style={{ padding: '8px' }}>Pur. Price</th>
                <th style={{ padding: '8px' }}>MRP</th>
                <th style={{ padding: '8px' }}>Quantity</th>
                <th style={{ padding: '8px' }}>Disc (%)</th>
                <th style={{ padding: '8px' }}>Free Qty</th>
                <th style={{ padding: '8px' }}>Value</th>
                <th style={{ padding: '8px' }}>Disc Amt</th>
                <th style={{ padding: '8px' }}>VAT</th>
                <th style={{ padding: '8px' }}>Amount</th>
                <th style={{ padding: '8px' }}>Line Notes</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map((item, index) => {
                const calc = calculateRow(item);
                return (
                  <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px' }}>
                      <Check size={16} color="var(--accent-primary)" />
                    </td>
                    <td style={{ padding: '8px', maxWidth: '150px' }}>{item.item_name}</td>
                    <td style={{ padding: '8px' }}>{item.barcode}</td>
                    <td style={{ padding: '8px' }}>PCS</td>
                    <td style={{ padding: '8px' }}>1</td>
                    <td style={{ padding: '8px' }}>0</td>
                    <td style={{ padding: '8px' }}>0</td>
                    <td style={{ padding: '8px' }}>0</td>
                    <td style={{ padding: '8px' }}>0</td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" value={item.purPrice} onChange={(e) => updateItem(index, 'purPrice', e.target.value)} style={{ width: '60px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '8px' }}>{item.mrpPrice}</td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" value={item.qty} onChange={(e) => updateItem(index, 'qty', e.target.value)} style={{ width: '60px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" value={item.discPercent} onChange={(e) => updateItem(index, 'discPercent', e.target.value)} style={{ width: '50px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" value={item.freeQty} onChange={(e) => updateItem(index, 'freeQty', e.target.value)} style={{ width: '50px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '8px' }}>{calc.value.toFixed(4)}</td>
                    <td style={{ padding: '8px' }}>{calc.discAmt.toFixed(4)}</td>
                    <td style={{ padding: '8px' }}>{calc.vatAmt.toFixed(4)}</td>
                    <td style={{ padding: '8px' }}>{calc.amount.toFixed(4)}</td>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={item.lineNotes} onChange={(e) => updateItem(index, 'lineNotes', e.target.value)} style={{ width: '100px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '30px', paddingTop: '20px', borderTop: '2px dotted var(--border-color)', fontSize: '0.85rem' }}>
          <div>
            <div style={{ color: 'var(--text-secondary)' }}>Total Value</div>
            <div style={{ fontWeight: 'bold' }}>{totals.totalValue.toFixed(4)}</div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Total Free Amount</div>
            <div style={{ fontWeight: 'bold' }}>0</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)' }}>Commission Value</div>
            <div style={{ fontWeight: 'bold' }}>0</div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Total Amount</div>
            <div style={{ fontWeight: 'bold' }}>{totals.totalAmount.toFixed(4)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)' }}>Total VAT</div>
            <div style={{ fontWeight: 'bold' }}>{totals.totalVat.toFixed(4)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '30px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', marginRight: '10px' }}>
            <input type="checkbox" checked={printTwoCopy} onChange={(e) => setPrintTwoCopy(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
            Print two copy
          </label>
          <button className="btn-theme" onClick={() => handleSave('save')} style={{ padding: '10px 20px', backgroundColor: '#00bcd4', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
          <button className="btn-danger" onClick={() => handleSave('hold')} style={{ padding: '10px 20px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Hold</button>
          <button className="btn-info" onClick={generatePDF} style={{ padding: '10px 20px', backgroundColor: '#f43f5e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Preview</button>
        </div>
      </SectionWrapper>

      {/* Product Selection Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-color)', width: '80%', height: '80%', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Product</h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowModal(false)} />
            </div>
            
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <input 
                type="text" 
                placeholder="Search..." 
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 8px', color: 'blue' }}>Selected</th>
                    <th style={{ padding: '12px 8px' }}>Barcode</th>
                    <th style={{ padding: '12px 8px', color: 'blue' }}>Name</th>
                    <th style={{ padding: '12px 8px' }}>WH STK</th>
                    <th style={{ padding: '12px 8px' }}>UOM</th>
                    <th style={{ padding: '12px 8px' }}>Pur. Price</th>
                    <th style={{ padding: '12px 8px' }}>Sale Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => {
                    const isSelected = tempSelectedProducts.includes(p.id);
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: isSelected ? 'rgba(46, 111, 64, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '12px 8px', cursor: 'pointer' }} onClick={() => toggleProductSelection(p.id)}>
                          {isSelected ? (
                            <Check size={20} color="var(--accent-primary)" />
                          ) : (
                            <div style={{ width: '20px', height: '20px', border: '2px solid var(--border-color)', borderRadius: '2px' }}></div>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>{p.barcode}</td>
                        <td style={{ padding: '12px 8px' }}>{p.item_name}</td>
                        <td style={{ padding: '12px 8px' }}>0</td>
                        <td style={{ padding: '12px 8px' }}>PCS</td>
                        <td style={{ padding: '12px 8px' }}>{p.purchase_price}</td>
                        <td style={{ padding: '12px 8px' }}>{p.mrp}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '15px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-danger" onClick={() => setShowModal(false)} style={{ padding: '8px 20px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button className="btn-theme" onClick={confirmProductSelection} style={{ padding: '8px 20px', backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderVendor;
