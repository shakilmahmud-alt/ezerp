import React, { useState, useRef } from 'react';
import { Search, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';

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

const BarcodePrint = () => {
  const [isLoading, setIsLoading] = useState(false);

  // Top Filters
  const [filters, setFilters] = useState({
    purchaseChallanNo: '',
    purchaseOrderNo: '',
    storeDeliveryChallan: '',
    circularPriceChangeNo: ''
  });

  // Options
  const [printType, setPrintType] = useState('system'); // 'system' or 'user'
  const [skipBarcode, setSkipBarcode] = useState(false); 
  const [customizeDiscount, setCustomizeDiscount] = useState(false);
  const [buyGet, setBuyGet] = useState(false);
  const [unimartBarcode, setUnimartBarcode] = useState(false); // Ignored in print as requested, but keeping UI

  // Standard Mode State
  const [stdSearch, setStdSearch] = useState({ barcode: '', userBarcode: '', name: '' });
  const [stdTempItem, setStdTempItem] = useState(null);
  const [stdSalePrice, setStdSalePrice] = useState('');
  const [stdQty, setStdQty] = useState('');
  const [stdDiscPercent, setStdDiscPercent] = useState('');
  const [stdDiscAmt, setStdDiscAmt] = useState('');
  const [stdFromDate, setStdFromDate] = useState('');
  const [stdToDate, setStdToDate] = useState('');
  const [stdItems, setStdItems] = useState([]);

  // Buy Get Mode State
  const [buySearch, setBuySearch] = useState('');
  const [buyTempItem, setBuyTempItem] = useState(null);
  const [buyQty, setBuyQty] = useState('');
  const [buyItems, setBuyItems] = useState([]);

  const [getSearch, setGetSearch] = useState('');
  const [getTempItem, setGetTempItem] = useState(null);
  const [getQty, setGetQty] = useState('');
  const [getItems, setGetItems] = useState([]);

  // Generic Product Search
  const fetchProduct = async (queryField, queryValue) => {
    if (!queryValue) return null;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, brands(name)')
        .eq(queryField, queryValue)
        .limit(1)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') throw error;
        toast.error('Product not found!');
        return null;
      }
      return data;
    } catch (err) {
      console.error(err);
      toast.error('Error fetching product');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Handlers
  const handleStdSearch = async (e) => {
    if (e.key === 'Enter') {
      let field = '';
      let val = '';
      if (stdSearch.barcode) { field = 'barcode'; val = stdSearch.barcode; }
      else if (stdSearch.userBarcode) { field = 'code'; val = stdSearch.userBarcode; }
      else if (stdSearch.name) { field = 'item_name'; val = stdSearch.name; } 
      
      if (val) {
        const product = await fetchProduct(field, val);
        if (product) {
          setStdTempItem(product);
          setStdSearch(prev => ({ ...prev, name: product.item_name }));
        }
      }
    }
  };

  const handleStdAdd = () => {
    if (!stdTempItem) { toast.error("Please search and select a product first"); return; }
    if (!stdQty || Number(stdQty) <= 0) { toast.error("Please enter a valid quantity"); return; }

    const newItem = {
      ...stdTempItem,
      printQty: Number(stdQty),
      salePrice: stdSalePrice || stdTempItem.mrp,
      discPercent: stdDiscPercent,
      discAmt: stdDiscAmt,
      fromDate: stdFromDate,
      toDate: stdToDate,
      selected: true
    };

    setStdItems([...stdItems, newItem]);
    
    // Reset fields
    setStdTempItem(null);
    setStdSearch({ barcode: '', userBarcode: '', name: '' });
    setStdSalePrice('');
    setStdQty('');
    setStdDiscPercent('');
    setStdDiscAmt('');
  };

  const removeStdItem = (index) => {
    setStdItems(stdItems.filter((_, i) => i !== index));
  };

  const toggleStdItemSelect = (index) => {
    const newItems = [...stdItems];
    newItems[index].selected = !newItems[index].selected;
    setStdItems(newItems);
  };

  // Buy Get Handlers
  const handleBuySearch = async () => {
    const product = await fetchProduct('barcode', buySearch);
    if (product) setBuyTempItem(product);
  };

  const handleGetSearch = async () => {
    const product = await fetchProduct('barcode', getSearch);
    if (product) setGetTempItem(product);
  };

  const handleBuyAdd = () => {
    if (!buyTempItem) return;
    if (!buyQty || Number(buyQty) <= 0) return;
    setBuyItems([...buyItems, { ...buyTempItem, qty: Number(buyQty) }]);
    setBuyTempItem(null);
    setBuySearch('');
    setBuyQty('');
  };

  const handleGetAdd = () => {
    if (!getTempItem) return;
    if (!getQty || Number(getQty) <= 0) return;
    setGetItems([...getItems, { ...getTempItem, qty: Number(getQty) }]);
    setGetTempItem(null);
    setGetSearch('');
    setGetQty('');
  };

  // Utility to generate Base64 barcode image
  const generateBarcodeImage = (text) => {
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, text, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        height: 40,
        width: 2
      });
      return canvas.toDataURL("image/png");
    } catch (e) {
      console.error("Barcode generation error:", e);
      return null;
    }
  };

  // PDF Preview
  const handlePreview = () => {
    const doc = new jsPDF();
    
    // Configs
    const marginX = 10;
    let currentY = 20;
    const itemHeight = 35;
    const itemWidth = 38; // 5 items per row (210 - 20) / 5
    const columns = 5;
    let currentColumn = 0;
    
    const renderBarcode = (item, type, labelOverride = null) => {
      // type determines how many to print based on std mode or buyget mode
      const qty = type === 'std' ? item.printQty : item.qty;
      
      for(let i=0; i<qty; i++) {
        if (currentColumn >= columns) {
          currentColumn = 0;
          currentY += itemHeight;
        }

        if (currentY > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          currentY = 20;
          currentColumn = 0;
        }

        // Determine which barcode to draw based on Options
        let codeToPrint = printType === 'system' ? item.barcode : item.code;
        
        const startX = marginX + (currentColumn * itemWidth);
        const centerX = startX + (itemWidth / 2);

        // Draw Company Name
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("( EG ERP )", centerX, currentY, { align: 'center' });
        
        // Draw Item Name
        doc.setFontSize(7);
        let itemName = item.item_name || '';
        if (labelOverride) itemName = `[${labelOverride}] ${itemName}`;
        if (itemName.length > 25) itemName = itemName.substring(0, 25) + '...';
        doc.text(itemName, centerX, currentY + 4, { align: 'center' });
        
        // Draw Barcode Image
        if (codeToPrint) {
          const imgData = generateBarcodeImage(codeToPrint);
          if (imgData) doc.addImage(imgData, 'PNG', centerX - 15, currentY + 6, 30, 10);
        }

        // Draw Barcode String
        doc.setFontSize(7);
        doc.text(codeToPrint || '', centerX, currentY + 19, { align: 'center' });

        // Draw Price
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        const price = item.salePrice || item.mrp || 0;
        doc.text(`Price:${price} Incl VAT`, centerX, currentY + 24, { align: 'center' });
        
        currentColumn++;
      }
    };

    if (buyGet) {
      if (buyItems.length === 0 && getItems.length === 0) {
        toast.error("Add items to Buy/Get details first");
        return;
      }
      buyItems.forEach(item => renderBarcode(item, 'buyget', 'BUY'));
      getItems.forEach(item => renderBarcode(item, 'buyget', 'GET'));
    } else {
      const selectedToPrint = stdItems.filter(i => i.selected);
      if (selectedToPrint.length === 0) {
        toast.error("No items selected for printing");
        return;
      }
      selectedToPrint.forEach(item => renderBarcode(item, 'std'));
    }

    doc.save(`Barcodes_${new Date().getTime()}.pdf`);
    toast.success("PDF Generated");
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      
      <SectionWrapper title="Barcode Print">
        {/* Top Filters (UI Only) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Purchase Challan No</label>
            <input type="text" className="input-animated" value={filters.purchaseChallanNo} onChange={e => setFilters({...filters, purchaseChallanNo: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Purchase Order No</label>
            <input type="text" className="input-animated" value={filters.purchaseOrderNo} onChange={e => setFilters({...filters, purchaseOrderNo: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Store Delivery Challan</label>
            <input type="text" className="input-animated" value={filters.storeDeliveryChallan} onChange={e => setFilters({...filters, storeDeliveryChallan: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Circular Price Change No</label>
            <input type="text" className="input-animated" value={filters.circularPriceChangeNo} onChange={e => setFilters({...filters, circularPriceChangeNo: e.target.value})} />
          </div>
        </div>

        {/* Options Row */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input type="radio" name="printType" value="system" checked={printType === 'system'} onChange={() => setPrintType('system')} style={{ accentColor: 'var(--accent-primary)' }} />
            Print System Barcode
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input type="radio" name="printType" value="user" checked={printType === 'user'} onChange={() => setPrintType('user')} style={{ accentColor: 'var(--accent-primary)' }} />
            Print User Barcode
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', marginLeft: '10px' }}>
            <input type="checkbox" checked={skipBarcode} onChange={(e) => setSkipBarcode(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
            {printType === 'system' ? 'Skip User Barcode' : 'Skip System Barcode'}
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', marginLeft: '10px' }}>
            <input type="checkbox" checked={customizeDiscount} onChange={(e) => setCustomizeDiscount(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
            Customize Discount
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', marginLeft: '10px' }}>
            <input type="checkbox" checked={buyGet} onChange={(e) => setBuyGet(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
            Buy Get
          </label>
        </div>

        {!buyGet ? (
          /* ================= STANDARD MODE ================= */
          <>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '20px' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Barcode</label>
                <input type="text" className="input-animated" value={stdSearch.barcode} onChange={e => setStdSearch({...stdSearch, barcode: e.target.value})} onKeyDown={handleStdSearch} />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>User Barcode</label>
                <input type="text" className="input-animated" value={stdSearch.userBarcode} onChange={e => setStdSearch({...stdSearch, userBarcode: e.target.value})} onKeyDown={handleStdSearch} />
              </div>
              <div style={{ flex: '2 1 300px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Name</label>
                <input type="text" className="input-animated" value={stdSearch.name} onChange={e => setStdSearch({...stdSearch, name: e.target.value})} onKeyDown={handleStdSearch} disabled={!!stdTempItem} />
              </div>
              
              <div style={{ flex: '1 1 150px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sale Price</label>
                <select className="input-animated" value={stdSalePrice} onChange={e => setStdSalePrice(e.target.value)}>
                  <option value="">- Select Sale Price -</option>
                  {stdTempItem && <option value={stdTempItem.mrp}>{stdTempItem.mrp}</option>}
                </select>
              </div>

              {customizeDiscount && (
                <>
                  <div style={{ width: '80px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Discount(%)</label>
                    <input type="number" className="input-animated" value={stdDiscPercent} onChange={e => setStdDiscPercent(e.target.value)} />
                  </div>
                  <div style={{ width: '100px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Discount Amt</label>
                    <input type="number" className="input-animated" value={stdDiscAmt} onChange={e => setStdDiscAmt(e.target.value)} />
                  </div>
                  <div style={{ width: '130px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>From Date</label>
                    <input type="date" className="input-animated" value={stdFromDate} onChange={e => setStdFromDate(e.target.value)} />
                  </div>
                  <div style={{ width: '130px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>To Date</label>
                    <input type="date" className="input-animated" value={stdToDate} onChange={e => setStdToDate(e.target.value)} />
                  </div>
                </>
              )}

              <div style={{ width: '80px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Quantity</label>
                <input type="number" className="input-animated" value={stdQty} onChange={e => setStdQty(e.target.value)} />
              </div>
              
              <button className="btn-theme" 
                onClick={handleStdAdd}
                style={{ padding: '8px 20px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', height: '38px' }}
              >
                ADD
              </button>
            </div>

            <div style={{ overflowX: 'auto', marginTop: '30px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left', minWidth: '1000px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px', width: '40px' }}><div style={{ width: '16px', height: '16px', border: '1px solid var(--border-color)'}}></div></th>
                    <th style={{ padding: '8px' }}>SL</th>
                    <th style={{ padding: '8px' }}>Code</th>
                    <th style={{ padding: '8px' }}>Rcv. Code</th>
                    <th style={{ padding: '8px' }}>Barcode</th>
                    <th style={{ padding: '8px' }}>Name</th>
                    <th style={{ padding: '8px' }}>Brand</th>
                    <th style={{ padding: '8px' }}>Price</th>
                    {customizeDiscount && (
                      <>
                        <th style={{ padding: '8px' }}>Disc(%)</th>
                        <th style={{ padding: '8px' }}>Dis Amt</th>
                        <th style={{ padding: '8px' }}>From Date</th>
                        <th style={{ padding: '8px' }}>To Date</th>
                      </>
                    )}
                    <th style={{ padding: '8px' }}>Quantity</th>
                    <th style={{ padding: '8px' }}>Barcode Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {stdItems.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px', cursor: 'pointer' }} onClick={() => toggleStdItemSelect(index)}>
                        {item.selected ? <Check size={16} color="var(--accent-primary)" /> : <div style={{ width: '16px', height: '16px', border: '1px solid var(--border-color)'}}></div>}
                      </td>
                      <td style={{ padding: '8px' }}>{index + 1}</td>
                      <td style={{ padding: '8px' }}>{item.code}</td>
                      <td style={{ padding: '8px' }}>-</td>
                      <td style={{ padding: '8px' }}>{item.barcode}</td>
                      <td style={{ padding: '8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.item_name}</td>
                      <td style={{ padding: '8px' }}>{item.brands?.name || '-'}</td>
                      <td style={{ padding: '8px' }}>{item.salePrice}</td>
                      {customizeDiscount && (
                        <>
                          <td style={{ padding: '8px' }}>{item.discPercent}</td>
                          <td style={{ padding: '8px' }}>{item.discAmt}</td>
                          <td style={{ padding: '8px' }}>{item.fromDate}</td>
                          <td style={{ padding: '8px' }}>{item.toDate}</td>
                        </>
                      )}
                      <td style={{ padding: '8px' }}>{item.wh_stock || 0}</td>
                      <td style={{ padding: '8px' }}>
                        <input 
                          type="number" 
                          value={item.printQty} 
                          onChange={(e) => {
                            const newItems = [...stdItems];
                            newItems[index].printQty = Number(e.target.value);
                            setStdItems(newItems);
                          }}
                          style={{ width: '60px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                        />
                        <button className="btn-danger" onClick={() => removeStdItem(index)} style={{ marginLeft: '10px', color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Remove">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stdItems.length === 0 && (
                    <tr>
                      <td colSpan={customizeDiscount ? "14" : "10"} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                        No products added.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* ================= BUY GET MODE ================= */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            
            {/* Buy Details Panel */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px' }}>
              <h4 style={{ margin: '0 0 15px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--text-primary)' }}>Buy Details</h4>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Barcode</label>
                  <div style={{ display: 'flex' }}>
                    <input type="text" className="input-animated" value={buySearch} onChange={e => setBuySearch(e.target.value)} style={{ borderRight: 'none', borderRadius: '4px 0 0 4px', width: '100%' }} />
                    <button onClick={handleBuySearch} style={{ border: '1px solid var(--border-color)', backgroundColor: '#f8fafc', padding: '0 10px', borderRadius: '0 4px 4px 0', cursor: 'pointer' }}>
                      <Search size={16} color="var(--text-secondary)" />
                    </button>
                  </div>
                </div>
                <div style={{ flex: '2 1 200px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Description *</label>
                  <input type="text" className="input-animated" value={buyTempItem ? buyTempItem.item_name : ''} disabled style={{ borderBottom: '1px dotted var(--border-color)', backgroundColor: 'transparent' }} />
                </div>
                <div style={{ width: '80px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>MRP *</label>
                  <input type="text" className="input-animated" value={buyTempItem ? buyTempItem.mrp : ''} disabled style={{ borderBottom: '1px dotted var(--border-color)', backgroundColor: 'transparent' }} />
                </div>
                <div style={{ width: '80px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Quantity *</label>
                  <input type="number" className="input-animated" value={buyQty} onChange={e => setBuyQty(e.target.value)} />
                </div>
                <button onClick={handleBuyAdd} style={{ padding: '8px 20px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', height: '38px' }} className="btn-theme">Add</button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px' }}>Code</th>
                    <th style={{ padding: '8px' }}>Barcode</th>
                    <th style={{ padding: '8px' }}>Name</th>
                    <th style={{ padding: '8px' }}>MRP</th>
                    <th style={{ padding: '8px' }}>Quantity</th>
                    <th style={{ padding: '8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {buyItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px' }}>{item.code}</td>
                      <td style={{ padding: '8px' }}>{item.barcode}</td>
                      <td style={{ padding: '8px' }}>{item.item_name}</td>
                      <td style={{ padding: '8px' }}>{item.mrp}</td>
                      <td style={{ padding: '8px' }}>{item.qty}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => setBuyItems(buyItems.filter((_, i) => i !== idx))}>Delete</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Get Details Panel */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px' }}>
              <h4 style={{ margin: '0 0 15px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--text-primary)' }}>Get Details</h4>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Barcode</label>
                  <div style={{ display: 'flex' }}>
                    <input type="text" className="input-animated" value={getSearch} onChange={e => setGetSearch(e.target.value)} style={{ borderRight: 'none', borderRadius: '4px 0 0 4px', width: '100%' }} />
                    <button onClick={handleGetSearch} style={{ border: '1px solid var(--border-color)', backgroundColor: '#f8fafc', padding: '0 10px', borderRadius: '0 4px 4px 0', cursor: 'pointer' }}>
                      <Search size={16} color="var(--text-secondary)" />
                    </button>
                  </div>
                </div>
                <div style={{ flex: '2 1 200px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Description *</label>
                  <input type="text" className="input-animated" value={getTempItem ? getTempItem.item_name : ''} disabled style={{ borderBottom: '1px dotted var(--border-color)', backgroundColor: 'transparent' }} />
                </div>
                <div style={{ width: '80px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>MRP *</label>
                  <input type="text" className="input-animated" value={getTempItem ? getTempItem.mrp : ''} disabled style={{ borderBottom: '1px dotted var(--border-color)', backgroundColor: 'transparent' }} />
                </div>
                <div style={{ width: '80px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Quantity *</label>
                  <input type="number" className="input-animated" value={getQty} onChange={e => setGetQty(e.target.value)} />
                </div>
                <button onClick={handleGetAdd} style={{ padding: '8px 20px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', height: '38px' }} className="btn-theme">Add</button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px' }}>Code</th>
                    <th style={{ padding: '8px' }}>Barcode</th>
                    <th style={{ padding: '8px' }}>Name</th>
                    <th style={{ padding: '8px' }}>MRP</th>
                    <th style={{ padding: '8px' }}>Quantity</th>
                    <th style={{ padding: '8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px' }}>{item.code}</td>
                      <td style={{ padding: '8px' }}>{item.barcode}</td>
                      <td style={{ padding: '8px' }}>{item.item_name}</td>
                      <td style={{ padding: '8px' }}>{item.mrp}</td>
                      <td style={{ padding: '8px' }}>{item.qty}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => setGetItems(getItems.filter((_, i) => i !== idx))}>Delete</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
          <button className="btn-info" 
            onClick={handlePreview}
            disabled={isLoading}
            style={{ 
              padding: '10px 30px', 
              backgroundColor: 'var(--accent-primary)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              transition: 'all 0.3s'
            }}
          >
            {isLoading ? 'Wait...' : 'PREVIEW'}
          </button>
        </div>

      </SectionWrapper>
    </div>
  );
};

export default BarcodePrint;
