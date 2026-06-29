import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SectionWrapper = ({ title, children, rightContent }) => (
  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', backgroundColor: 'var(--card-bg)', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
    {(title || rightContent) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
        {rightContent}
      </div>
    )}
    {children}
  </div>
);

// ================= STATUS DETAILS MODAL =================
const StatusDetailsModal = ({ promotion, onClose }) => {
  const stores = promotion.stores ? promotion.stores.split(', ') : [];
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'var(--bg-color)', width: '80%', maxWidth: '800px', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Promotion Status Detail</h3>
          <button className="btn-danger" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>X</button>
        </div>
        
        <div style={{ padding: '20px', overflowY: 'auto', backgroundColor: 'var(--card-bg)', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 8px' }}>PROMOTION CODE</th>
                <th style={{ padding: '12px 8px' }}>STORE NAME</th>
                <th style={{ padding: '12px 8px' }}>In Active Status</th>
                <th style={{ padding: '12px 8px' }}>In Active Date</th>
                <th style={{ padding: '12px 8px' }}>Extend Status</th>
                <th style={{ padding: '12px 8px' }}>Extend Date</th>
              </tr>
            </thead>
            <tbody>
              {stores.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No stores assigned</td></tr>
              ) : (
                stores.map((store, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 8px' }}>{promotion.circular_code}</td>
                    <td style={{ padding: '10px 8px' }}>{store}</td>
                    <td style={{ padding: '10px 8px' }}>N</td>
                    <td style={{ padding: '10px 8px' }}></td>
                    <td style={{ padding: '10px 8px' }}>N</td>
                    <td style={{ padding: '10px 8px' }}></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div style={{ padding: '15px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--card-bg)' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }} className="btn-danger">Close</button>
        </div>
      </div>
    </div>
  );
};

// ================= CUSTOMER TAG MODAL =================
const CustomerTypeTagModal = ({ promotion, onClose }) => {
  const [limit, setLimit] = useState(0);
  const [types, setTypes] = useState({ GOLD: false, SILVER: false });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTags();
  }, [promotion.id]);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase.from('promotion_customer_tags').select('*').eq('promotion_id', promotion.id).maybeSingle();
      if (data && !error) {
        setLimit(data.customer_limit || 0);
        const savedTypes = data.customer_types ? data.customer_types.split(',') : [];
        setTypes({
          GOLD: savedTypes.includes('GOLD'),
          SILVER: savedTypes.includes('SILVER')
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const selectedTypes = Object.keys(types).filter(k => types[k]).join(',');
      const payload = {
        promotion_id: promotion.id,
        customer_limit: limit,
        customer_types: selectedTypes
      };

      const { data: existing } = await supabase.from('promotion_customer_tags').select('id').eq('promotion_id', promotion.id).maybeSingle();

      if (existing) {
        await supabase.from('promotion_customer_tags').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('promotion_customer_tags').insert(payload);
      }
      
      toast.success("Customer tags saved successfully");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save customer tags");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'var(--bg-color)', width: '80%', maxWidth: '800px', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid #38bdf8', backgroundColor: 'var(--card-bg)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Customer Type Tag</h3>
        </div>
        
        <div style={{ padding: '20px', backgroundColor: '#f8fafc' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block' }}>Promotion Name</label>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{promotion.circular_name}</div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block' }}>Customer Limit</label>
            <input type="number" value={limit} onChange={e => setLimit(e.target.value)} style={{ padding: '5px', width: '100px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>Customer Type</label>
            <div style={{ display: 'flex', gap: '50px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={types.GOLD} onChange={e => setTypes({...types, GOLD: e.target.checked})} /> GOLD
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={types.SILVER} onChange={e => setTypes({...types, SILVER: e.target.checked})} /> SILVER
              </label>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
            <button onClick={handleSave} disabled={isLoading} style={{ padding: '8px 20px', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }} className="btn-theme">Save</button>
            <button onClick={onClose} style={{ padding: '8px 20px', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }} className="btn-danger">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================= ADD / EDIT PROMOTION FORM =================
const PromotionForm = ({ initialData, onSave, onCancel }) => {
  const [promoType, setPromoType] = useState(initialData?.promotion_type || 'Circular Discount');
  const [circularName, setCircularName] = useState(initialData?.circular_name || '');
  const [validFrom, setValidFrom] = useState(initialData?.valid_from?.split('T')[0] || '');
  const [validTo, setValidTo] = useState(initialData?.valid_to?.split('T')[0] || '');
  const [pointEnable, setPointEnable] = useState(initialData?.point_enable || false);
  const [buyItemCount, setBuyItemCount] = useState(initialData?.buy_item_count || '*');
  const [getItemCount, setGetItemCount] = useState(initialData?.get_item_count || '*');
  
  const [selectedStores, setSelectedStores] = useState(initialData?.stores ? initialData.stores.split(', ') : []);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const storesList = ['Central Store', 'Shop', 'JAMUNA FUTURE PARK', 'KIDS PARADISE (UTTARA)'];

  // Circular Discount
  const [items, setItems] = useState([]);
  const [filterDisc, setFilterDisc] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [bcDesc, setBcDesc] = useState('');
  const [bcLpp, setBcLpp] = useState('');
  const [bcSalePrice, setBcSalePrice] = useState('');
  const [bcDiscPct, setBcDiscPct] = useState('');
  const [bcDiscAmt, setBcDiscAmt] = useState('');
  const [bcVenPct, setBcVenPct] = useState('');
  const [bcVenAmt, setBcVenAmt] = useState('');

  // Buy Get
  const [buyItems, setBuyItems] = useState([]);
  const [getItems, setGetItems] = useState([]);
  
  const [buyBcSearch, setBuyBcSearch] = useState('');
  const [buyBcDesc, setBuyBcDesc] = useState('');
  const [buyBcMrp, setBuyBcMrp] = useState('');
  const [buyBcQty, setBuyBcQty] = useState('');
  
  const [getBcSearch, setGetBcSearch] = useState('');
  const [getBcDesc, setGetBcDesc] = useState('');
  const [getBcMrp, setGetBcMrp] = useState('');
  const [getBcQty, setGetBcQty] = useState('');

  // Coupon
  const [couponNo, setCouponNo] = useState(initialData?.coupon_no || '');
  const [couponType, setCouponType] = useState(initialData?.coupon_type || 'Percent');
  const [couponDiscVal, setCouponDiscVal] = useState(initialData?.coupon_disc_val || '');
  const [couponMaxDiscAmt, setCouponMaxDiscAmt] = useState(initialData?.coupon_max_disc_amt || '0');
  const [couponRedeemLimit, setCouponRedeemLimit] = useState(initialData?.coupon_redeem_limit || '1');
  const [couponMinPurchase, setCouponMinPurchase] = useState(initialData?.coupon_min_purchase || '');
  const [couponItems, setCouponItems] = useState([]);

  const [excelFile, setExcelFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialData?.id) {
      fetchItems(initialData.id);
    }
  }, [initialData]);

  const fetchItems = async (promoId) => {
    try {
      const { data, error } = await supabase.from('promotion_items').select('*').eq('promotion_id', promoId);
      if (data && !error) {
        if (promoType === 'Buy Get') {
          const buys = data.filter(d => d.brand === 'Buy').map(d => ({ code: d.barcode, barcode: d.barcode, name: d.description, mrp: d.discount_amount, quantity: d.item }));
          const gets = data.filter(d => d.brand === 'Get').map(d => ({ code: d.barcode, barcode: d.barcode, name: d.description, mrp: d.discount_amount, quantity: d.item }));
          setBuyItems(buys);
          setGetItems(gets);
        } else if (promoType === 'Coupon') {
          const coupons = data.filter(d => d.brand === 'Coupon').map(d => ({
            couponNo: d.barcode,
            discPct: d.discount_percent,
            discAmt: d.discount_amount
          }));
          setCouponItems(coupons);
        } else {
          const mapped = data.map((d, i) => ({
            sl: i + 1,
            brand: d.brand || '',
            category: d.category || '',
            subCategory: d.sub_category || '',
            subSubcategory: d.sub_subcategory || '',
            vendor: d.vendor || '',
            item: d.item || '',
            code: d.barcode,
            userBarcode: d.user_barcode || '',
            name: d.description || '',
            discountPct: d.discount_percent,
            discAmt: d.discount_amount,
            vendorContriPct: d.vendor_contribution_percent,
            vendorContriAmt: d.vendor_contribution_amount
          }));
          setItems(mapped);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStore = (store) => {
    setSelectedStores(prev => prev.includes(store) ? prev.filter(s => s !== store) : [...prev, store]);
  };

  const handleExport = () => {
    const ws_data = [
      ['Brand', 'Category', 'Sub Category', 'Sub Subcategory', 'Vendor', 'Item', 'Code', 'User Barcode', 'Name', 'Discount(%)', 'Disc. Amt', 'Vendor Contri.(%)', 'Vendor Contri Amt'],
      ['Chicco', 'Baby Feeding', 'Baby Feeder', 'Baby Feeder', 'Vendor 1', 'Item 1', 'A002752', 'A002752', 'Chicco Feeder (150ml)', '50', '0', '0', '0']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Promotion_Template.xlsx");
  };

  const handleCouponExport = () => {
    const ws_data = [
      ['COUPON_NO', 'DISC_PERCENT', 'DISC_AMOUNT'],
      ['A00002578', '3', '0'],
      ['A00001850', '0', '200']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Coupon_Template");
    XLSX.writeFile(wb, "Coupon_Template.xlsx");
  };

  const handleUpload = () => {
    if (!excelFile) return toast.error("Choose a file first");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
        
        const newItems = json.map((row, index) => ({
          sl: items.length + index + 1,
          brand: row['Brand'],
          category: row['Category'],
          subCategory: row['Sub Category'],
          subSubcategory: row['Sub Subcategory'],
          vendor: row['Vendor'],
          item: row['Item'],
          code: String(row['Code']),
          userBarcode: String(row['User Barcode']),
          name: row['Name'],
          discountPct: row['Discount(%)'] || 0,
          discAmt: row['Disc. Amt'] || 0,
          vendorContriPct: row['Vendor Contri.(%)'] || 0,
          vendorContriAmt: row['Vendor Contri Amt'] || 0
        }));
        
        setItems(prev => [...prev, ...newItems]);
        toast.success("Excel parsed successfully");
      } catch (err) {
        toast.error("Error parsing Excel");
      }
    };
    reader.readAsArrayBuffer(excelFile);
  };

  const handleCouponUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
        
        const newCoupons = json.map(row => ({
          couponNo: String(row['COUPON_NO']),
          discPct: Number(row['DISC_PERCENT']) || 0,
          discAmt: Number(row['DISC_AMOUNT']) || 0
        }));
        
        setCouponItems(prev => [...prev, ...newCoupons]);
        toast.success("Coupon Excel parsed successfully");
      } catch (err) {
        toast.error("Error parsing Excel");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBarcodeSearch = async (type) => {
    const searchVal = type === 'circular' ? barcodeSearch : type === 'buy' ? buyBcSearch : getBcSearch;
    if (!searchVal) return;
    try {
      const { data, error } = await supabase.from('products').select('*').eq('barcode', searchVal).maybeSingle();
      if (data && !error) {
        if (type === 'circular') {
          setBcDesc(data.item_name);
          setBcLpp(data.purchase_price || 0);
          setBcSalePrice(data.mrp || 0);
        } else if (type === 'buy') {
          setBuyBcDesc(data.item_name);
          setBuyBcMrp(data.mrp || 0);
        } else if (type === 'get') {
          setGetBcDesc(data.item_name);
          setGetBcMrp(data.mrp || 0);
        }
        toast.success("Product found");
      } else {
        toast.error("Product not found");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCircular = () => {
    if (!bcDesc) return toast.error("Search barcode first");
    const newItem = {
      sl: items.length + 1,
      brand: '', category: '', subCategory: '', subSubcategory: '', vendor: '', item: '',
      code: barcodeSearch,
      userBarcode: barcodeSearch,
      name: bcDesc,
      discountPct: bcDiscPct || 0,
      discAmt: bcDiscAmt || 0,
      vendorContriPct: bcVenPct || 0,
      vendorContriAmt: bcVenAmt || 0
    };
    setItems(prev => [...prev, newItem]);
    
    // Clear
    setBarcodeSearch(''); setBcDesc(''); setBcLpp(''); setBcSalePrice('');
    setBcDiscPct(''); setBcDiscAmt(''); setBcVenPct(''); setBcVenAmt('');
  };

  const handleAddBuy = () => {
    if (!buyBcDesc) return toast.error("Search barcode first");
    setBuyItems(prev => [...prev, {
      code: buyBcSearch, barcode: buyBcSearch, name: buyBcDesc, mrp: buyBcMrp, quantity: buyBcQty || 1
    }]);
    setBuyBcSearch(''); setBuyBcDesc(''); setBuyBcMrp(''); setBuyBcQty('');
  };

  const handleAddGet = () => {
    if (!getBcDesc) return toast.error("Search barcode first");
    setGetItems(prev => [...prev, {
      code: getBcSearch, barcode: getBcSearch, name: getBcDesc, mrp: getBcMrp, quantity: getBcQty || 1
    }]);
    setGetBcSearch(''); setGetBcDesc(''); setGetBcMrp(''); setGetBcQty('');
  };

  const generatePDF = (promoData, itemsDataBuy, itemsDataGet, circularItems, couponItems) => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('EG ERP', 14, 20);
    doc.setFontSize(10);
    doc.text('Address: 123 Business Avenue, Dhaka, Bangladesh', 14, 28);
    
    doc.setFontSize(14);
    doc.text('PROMOTION CIRCULAR', 105, 40, null, null, 'center');
    
    doc.setFontSize(10);
    doc.text(`Promotion Name: ${promoData.circular_name}`, 14, 50);
    doc.text(`Promotion Code: ${promoData.circular_code}`, 14, 56);
    doc.text(`Type: ${promoData.promotion_type}`, 14, 62);
    
    if (promoData.promotion_type === 'Buy Get') {
       doc.text(`Buy Item: ${promoData.buy_item_count} | Get Item: ${promoData.get_item_count}`, 14, 68);
       
       let finalBody = [];
       itemsDataBuy.forEach(i => finalBody.push(['Buy', i.barcode, i.name, i.mrp, i.quantity]));
       itemsDataGet.forEach(i => finalBody.push(['Get', i.barcode, i.name, i.mrp, i.quantity]));
       
       autoTable(doc, {
        startY: 75,
        head: [['Type', 'Code', 'Name', 'MRP', 'Quantity']],
        body: finalBody
      });
    } else if (promoData.promotion_type === 'Coupon') {
      autoTable(doc, {
        startY: 70,
        head: [['Coupon No', 'Type', 'Discount', 'Max Amt', 'Redeem Limit', 'Min Purchase']],
        body: [[
          promoData.coupon_no,
          promoData.coupon_type,
          promoData.coupon_disc_val,
          promoData.coupon_max_disc_amt,
          promoData.coupon_redeem_limit,
          promoData.coupon_min_purchase
        ]]
      });
      if (couponItems && couponItems.length > 0) {
        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [['COUPON_NO', 'DISC_PERCENT', 'DISC_AMOUNT']],
          body: couponItems.map(item => [item.couponNo, item.discPct, item.discAmt])
        });
      }
    } else {
      autoTable(doc, {
        startY: 70,
        head: [['Code', 'Name', 'Discount(%)', 'Disc. Amt', 'Ven. Contri(%)']],
        body: circularItems.map(item => [
          item.code,
          item.name,
          item.discountPct,
          item.discAmt,
          item.vendorContriPct
        ])
      });
    }
    
    doc.save(`Promotion_${promoData.circular_code}.pdf`);
  };

  const handleSave = async () => {
    if (!circularName) return toast.error("Name is required");
    setIsLoading(true);
    
    try {
      // Generate Code if new
      let generatedCode = initialData?.circular_code;
      if (!generatedCode) {
        const todayStr = new Date().toISOString().slice(0,10).replace(/-/g,''); 
        const random3 = Math.floor(100 + Math.random() * 900);
        generatedCode = `PR${todayStr}${random3}`;
      }

      const promoPayload = {
        circular_name: circularName,
        circular_code: generatedCode,
        promotion_type: promoType,
        valid_from: validFrom ? new Date(validFrom).toISOString() : null,
        valid_to: validTo ? new Date(validTo).toISOString() : null,
        point_enable: pointEnable,
        stores: selectedStores.join(', '),
        buy_item_count: promoType === 'Buy Get' ? buyItemCount : null,
        get_item_count: promoType === 'Buy Get' ? getItemCount : null,
        coupon_no: promoType === 'Coupon' ? couponNo : null,
        coupon_type: promoType === 'Coupon' ? couponType : null,
        coupon_disc_val: promoType === 'Coupon' ? Number(couponDiscVal) || 0 : null,
        coupon_max_disc_amt: promoType === 'Coupon' ? Number(couponMaxDiscAmt) || 0 : null,
        coupon_redeem_limit: promoType === 'Coupon' ? Number(couponRedeemLimit) || 1 : null,
        coupon_min_purchase: promoType === 'Coupon' ? Number(couponMinPurchase) || 0 : null
      };

      let promoId = initialData?.id;

      if (promoId) {
        const { error } = await supabase.from('promotions').update(promoPayload).eq('id', promoId);
        if (error) {
           console.error(error);
           toast.error("Please run the provided ALTER TABLE SQL for new columns first!");
           setIsLoading(false);
           return;
        }
        await supabase.from('promotion_items').delete().eq('promotion_id', promoId);
      } else {
        const { data, error } = await supabase.from('promotions').insert(promoPayload).select().single();
        if (error) {
           console.error(error);
           toast.error("Please run the provided ALTER TABLE SQL for new columns first!");
           setIsLoading(false);
           return;
        }
        promoId = data.id;
      }

      // Save Items based on type
      let itemsPayload = [];
      if (promoType === 'Buy Get') {
         const buyPayload = buyItems.map(item => ({
            promotion_id: promoId, brand: 'Buy', item: item.quantity, barcode: item.code, description: item.name, discount_amount: item.mrp
         }));
         const getPayload = getItems.map(item => ({
            promotion_id: promoId, brand: 'Get', item: item.quantity, barcode: item.code, description: item.name, discount_amount: item.mrp
         }));
         itemsPayload = [...buyPayload, ...getPayload];
      } else if (promoType === 'Coupon') {
         itemsPayload = couponItems.map(item => ({
            promotion_id: promoId, brand: 'Coupon', barcode: item.couponNo, discount_percent: item.discPct, discount_amount: item.discAmt
         }));
      } else {
         itemsPayload = items.map(item => ({
          promotion_id: promoId,
          brand: item.brand,
          category: item.category,
          sub_category: item.subCategory,
          sub_subcategory: item.subSubcategory,
          vendor: item.vendor,
          item: item.item,
          barcode: item.code,
          user_barcode: item.userBarcode,
          description: item.name,
          discount_percent: Number(item.discountPct) || 0,
          discount_amount: Number(item.discAmt) || 0,
          vendor_contribution_percent: Number(item.vendorContriPct) || 0,
          vendor_contribution_amount: Number(item.vendorContriAmt) || 0
        }));
      }

      if (itemsPayload.length > 0) {
        const { error: itemsError } = await supabase.from('promotion_items').insert(itemsPayload);
        if (itemsError) throw itemsError;
      }

      toast.success("Promotion saved successfully");
      generatePDF(promoPayload, buyItems, getItems, items, couponItems);
      onSave();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
        {initialData ? 'Edit Promotion' : 'Add Promotion'}
      </h2>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '10px 20px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
          <input type="radio" name="promoType" checked={promoType === 'Circular Discount'} onChange={() => setPromoType('Circular Discount')} accentColor="#0ea5e9" /> Circular Discount
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
          <input type="radio" name="promoType" checked={promoType === 'Buy Get'} onChange={() => setPromoType('Buy Get')} accentColor="#0ea5e9" /> Buy Get
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
          <input type="radio" name="promoType" checked={promoType === 'Coupon'} onChange={() => setPromoType('Coupon')} accentColor="#0ea5e9" /> Coupon
        </label>
      </div>

      {promoType !== 'Coupon' && (
      <SectionWrapper title={promoType === 'Buy Get' ? "Promotion Information" : "Circular Information"}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', alignItems: 'end' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{promoType === 'Buy Get' ? 'Promotion Name' : 'Circular Name'} <span style={{ color: 'red' }}>*</span></label>
            <input type="text" className="input-animated" value={circularName} onChange={e => setCircularName(e.target.value)} style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Select Store</label>
            <div style={{ position: 'relative' }}>
              <div 
                className="input-animated" 
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }}
                onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
              >
                <span style={{ fontSize: '0.85rem' }}>{selectedStores.length ? `${selectedStores.length} checked ▼` : 'Select ▼'}</span>
              </div>
              {isStoreDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }}>
                  {storesList.map(store => (
                    <label key={store} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '0.8rem' }}>
                      <input type="checkbox" checked={selectedStores.includes(store)} onChange={() => toggleStore(store)} style={{ marginRight: '8px' }} />
                      {store}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Valid From <span style={{ color: 'red' }}>*</span></label>
            <input type="date" className="input-animated" value={validFrom} onChange={e => setValidFrom(e.target.value)} style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Valid To <span style={{ color: 'red' }}>*</span></label>
              <input type="date" className="input-animated" value={validTo} onChange={e => setValidTo(e.target.value)} style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} />
            </div>
            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', marginBottom: '5px' }}>
              <input type="checkbox" checked={pointEnable} onChange={e => setPointEnable(e.target.checked)} /> Point Enable
            </label>
          </div>
          
          {promoType === 'Buy Get' && (
             <>
               <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                 <label style={{ fontSize: '0.75rem', color: 'red' }}>Buy Item * (Enter * or Number)</label>
                 <input type="text" className="input-animated" value={buyItemCount} onChange={e => setBuyItemCount(e.target.value)} style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }} />
               </div>
               <div style={{ gridColumn: 'span 3', marginTop: '10px' }}>
                 <label style={{ fontSize: '0.75rem', color: 'red' }}>Get Item *</label>
                 <input type="text" className="input-animated" value={getItemCount} onChange={e => setGetItemCount(e.target.value)} style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }} />
               </div>
             </>
          )}
        </div>
      </SectionWrapper>
      )}

      {promoType === 'Coupon' && (
        <SectionWrapper title="Circular Information">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '15px', alignItems: 'end', marginBottom: '20px' }}>
             {/* Row 1 */}
             <div style={{ gridColumn: 'span 1' }}>
                <button className="btn-theme" onClick={handleCouponExport} style={{ width: '100%', padding: '8px', backgroundColor: '#38bdf8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Export</button>
             </div>
             <div style={{ gridColumn: 'span 1', display: 'flex', alignItems: 'center', height: '100%', paddingBottom: '5px' }}>
                <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input type="checkbox" /> Upload By Coupon no
                </label>
             </div>
             <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', color: 'red', display: 'block', marginBottom: '5px' }}>Select CSV File *</label>
                <input type="file" accept=".xlsx, .xls, .csv" onChange={e => { setExcelFile(e.target.files[0]); handleCouponUpload(e.target.files[0]); }} style={{ fontSize: '0.75rem' }} />
             </div>
             <div style={{ gridColumn: 'span 2' }}></div> {/* Spacer */}

             {/* Row 2 */}
             <div style={{ gridColumn: 'span 2' }}>
               <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Circular Name</label>
               <input type="text" value={circularName} onChange={e=>setCircularName(e.target.value)} className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0, fontSize: '0.8rem' }} />
             </div>
             <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Select Store</label>
                <div style={{ position: 'relative' }}>
                  <div 
                    className="input-animated" 
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, padding: '5px 0' }}
                    onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                  >
                    <span style={{ fontSize: '0.8rem' }}>{selectedStores.length ? `${selectedStores.length} checked ▼` : 'Select ▼'}</span>
                  </div>
                  {isStoreDropdownOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }}>
                      {storesList.map(store => (
                        <label key={store} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '0.8rem' }}>
                          <input type="checkbox" checked={selectedStores.includes(store)} onChange={() => toggleStore(store)} style={{ marginRight: '8px' }} />
                          {store}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
             </div>
             <div style={{ gridColumn: 'span 1' }}>
                <label style={{ fontSize: '0.75rem', color: 'red' }}>Valid From *</label>
                <input type="date" className="input-animated" value={validFrom} onChange={e => setValidFrom(e.target.value)} style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} />
             </div>
             <div style={{ gridColumn: 'span 1', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: 'red' }}>Valid To *</label>
                  <input type="date" className="input-animated" value={validTo} onChange={e => setValidTo(e.target.value)} style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} />
                </div>
                <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                  <input type="checkbox" checked={pointEnable} onChange={e => setPointEnable(e.target.checked)} /> Point Enable
                </label>
             </div>

             {/* Row 3 */}
             <div style={{ gridColumn: 'span 1' }}>
               <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Coupon No</label>
               <input type="text" value={couponNo} onChange={e=>setCouponNo(e.target.value)} className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0, fontSize: '0.8rem' }} />
             </div>
             <div style={{ gridColumn: 'span 1' }}>
               <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Coupon Type</label>
               <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '5px 0' }}>
                 <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                   <input type="radio" name="cType" checked={couponType==='Percent'} onChange={()=>setCouponType('Percent')} /> Percent
                 </label>
                 <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                   <input type="radio" name="cType" checked={couponType==='Amount'} onChange={()=>setCouponType('Amount')} /> Amount
                 </label>
               </div>
             </div>
             <div style={{ gridColumn: 'span 1' }}>
               <label style={{ fontSize: '0.75rem', color: 'red' }}>Discount {couponType} *</label>
               <input type="text" value={couponDiscVal} onChange={e=>setCouponDiscVal(e.target.value)} className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0, fontSize: '0.8rem' }} />
             </div>
             <div style={{ gridColumn: 'span 1' }}>
               <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Max Discount Amount</label>
               <input type="text" value={couponMaxDiscAmt} onChange={e=>setCouponMaxDiscAmt(e.target.value)} placeholder="0" className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0, fontSize: '0.8rem' }} />
             </div>
             <div style={{ gridColumn: 'span 1' }}>
               <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Number of Redemption Limit</label>
               <input type="text" value={couponRedeemLimit} onChange={e=>setCouponRedeemLimit(e.target.value)} placeholder="1" className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0, fontSize: '0.8rem' }} />
             </div>
             <div style={{ gridColumn: 'span 1' }}>
               <label style={{ fontSize: '0.75rem', color: 'red' }}>Minimum Purchase Amount *</label>
               <input type="text" value={couponMinPurchase} onChange={e=>setCouponMinPurchase(e.target.value)} className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0, fontSize: '0.8rem' }} />
             </div>
          </div>
          
          {couponItems.length > 0 && (
             <div style={{ overflowX: 'auto', maxHeight: '300px', marginTop: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', position: 'sticky', top: 0, backgroundColor: 'var(--card-bg)' }}>
                      <th style={{ padding: '10px 5px' }}>COUPON_NO</th>
                      <th style={{ padding: '10px 5px' }}>DISC_PERCENT</th>
                      <th style={{ padding: '10px 5px' }}>DISC_AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {couponItems.map((itm, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px 5px' }}>{itm.couponNo}</td>
                        <td style={{ padding: '8px 5px' }}>{itm.discPct}</td>
                        <td style={{ padding: '8px 5px' }}>{itm.discAmt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          )}
        </SectionWrapper>
      )}

      {promoType === 'Circular Discount' && (
      <SectionWrapper title="Circular Details">
        {/* Upper Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) auto', gap: '15px', alignItems: 'end', marginBottom: '20px' }}>
          {['Brand', 'Category', 'Sub Category', 'Sub Subcategory', 'Vendor', 'Item'].map((lbl, i) => (
            <div key={i}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lbl}</label>
              <select className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem', padding: '5px 0' }}>
                <option>-- ALL --</option>
              </select>
            </div>
          ))}
          <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Discount (%)</label>
              <input type="text" className="input-animated" value={filterDisc} onChange={e=>setFilterDisc(e.target.value)} placeholder="-- ALL --" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem', padding: '5px 0' }} />
          </div>
          <button style={{ padding: '6px 15px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }} className="btn-theme">Add</button>
        </div>
        
        <div style={{ borderTop: '1px dotted #ccc', margin: '20px 0' }}></div>

        {/* Barcode Search Area */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr) auto', gap: '15px', alignItems: 'end', marginBottom: '20px' }}>
          <div style={{ gridColumn: '1 / 2' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Barcode</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input type="text" value={barcodeSearch} onChange={e => setBarcodeSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleBarcodeSearch('circular')} className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} />
              <button className="btn-theme" onClick={() => handleBarcodeSearch('circular')} style={{ padding: '2px 8px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>🔍</button>
            </div>
          </div>
          <div style={{ gridColumn: '2 / 4' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Description <span style={{ color: 'red' }}>*</span></label>
            <input type="text" value={bcDesc} readOnly className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} />
          </div>
          <div style={{ gridColumn: '4 / 6' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Last Purchase Price</label>
            <input type="text" value={bcLpp} readOnly className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} />
          </div>
          <div style={{ gridColumn: '7' }}></div>

          <div style={{ gridColumn: '1 / 2' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sale Price</label>
            <select className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }}>
              <option>{bcSalePrice || '-- Select Sale Price --'}</option>
            </select>
          </div>
          <div style={{ gridColumn: '2 / 3' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Discount(%) <span style={{ color: 'red' }}>*</span></label>
            <input type="text" value={bcDiscPct} onChange={e=>setBcDiscPct(e.target.value)} className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} />
          </div>
          <div style={{ gridColumn: '3 / 4' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Discount Amount <span style={{ color: 'red' }}>*</span></label>
            <input type="text" value={bcDiscAmt} onChange={e=>setBcDiscAmt(e.target.value)} className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} />
          </div>
          <div style={{ gridColumn: '4 / 5' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vendor Contribution(%)</label>
            <input type="text" value={bcVenPct} onChange={e=>setBcVenPct(e.target.value)} className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} />
          </div>
          <div style={{ gridColumn: '5 / 7' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vendor Contribution Amount</label>
            <input type="text" value={bcVenAmt} onChange={e=>setBcVenAmt(e.target.value)} className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} />
          </div>
          <div style={{ gridColumn: '7' }}>
            <button onClick={handleAddCircular} style={{ padding: '6px 15px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }} className="btn-theme">Add</button>
          </div>
        </div>

        <div style={{ borderTop: '1px dotted #ccc', margin: '20px 0' }}></div>

        {/* Excel Export/Upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
          <button className="btn-theme" onClick={handleExport} style={{ padding: '8px 25px', backgroundColor: '#38bdf8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>↓ Export</button>
          
          <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input type="checkbox" /> Upload By Srl_barcode
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'red' }}>Select CSV File *</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={e => setExcelFile(e.target.files[0])} style={{ fontSize: '0.8rem' }} />
          </div>

          <div style={{ flex: 1 }}></div>

          <button className="btn-theme" onClick={handleUpload} style={{ padding: '8px 30px', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>↑ Upload!</button>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', position: 'sticky', top: 0, backgroundColor: 'var(--card-bg)' }}>
                <th style={{ padding: '10px 5px' }}>Brand</th>
                <th style={{ padding: '10px 5px' }}>Category</th>
                <th style={{ padding: '10px 5px' }}>Sub Category</th>
                <th style={{ padding: '10px 5px' }}>Sub Subcategory</th>
                <th style={{ padding: '10px 5px' }}>Vendor</th>
                <th style={{ padding: '10px 5px' }}>Item</th>
                <th style={{ padding: '10px 5px' }}>Code</th>
                <th style={{ padding: '10px 5px' }}>User Barcode</th>
                <th style={{ padding: '10px 5px' }}>Name</th>
                <th style={{ padding: '10px 5px' }}>Discount(%)</th>
                <th style={{ padding: '10px 5px' }}>Disc. Amt</th>
                <th style={{ padding: '10px 5px' }}>Vendor Contri.(%)</th>
                <th style={{ padding: '10px 5px' }}>Vendor Contri Amt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 5px' }}>{item.brand}</td>
                  <td style={{ padding: '8px 5px' }}>{item.category}</td>
                  <td style={{ padding: '8px 5px' }}>{item.subCategory}</td>
                  <td style={{ padding: '8px 5px' }}>{item.subSubcategory}</td>
                  <td style={{ padding: '8px 5px' }}>{item.vendor}</td>
                  <td style={{ padding: '8px 5px' }}>{item.item}</td>
                  <td style={{ padding: '8px 5px' }}>{item.code}</td>
                  <td style={{ padding: '8px 5px' }}>{item.userBarcode}</td>
                  <td style={{ padding: '8px 5px' }}>{item.name}</td>
                  <td style={{ padding: '8px 5px' }}>{item.discountPct}</td>
                  <td style={{ padding: '8px 5px' }}>{item.discAmt}</td>
                  <td style={{ padding: '8px 5px' }}>{item.vendorContriPct}</td>
                  <td style={{ padding: '8px 5px' }}>{item.vendorContriAmt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionWrapper>
      )}

      {promoType === 'Buy Get' && (
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
         <div style={{ border: '1px solid var(--border-color)', padding: '15px', flex: 1, backgroundColor: 'var(--card-bg)', borderRadius: '8px' }}>
           <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Buy Details</h4>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', marginBottom: '15px' }}>
             <div>
               <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Barcode</label>
               <div style={{ display: 'flex', gap: '5px' }}>
                 <input type="text" value={buyBcSearch} onChange={e=>setBuyBcSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleBarcodeSearch('buy')} className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0 }} />
                 <button className="btn-theme" onClick={() => handleBarcodeSearch('buy')} style={{ padding: '2px 8px', border:'1px solid #ccc', borderRadius:'4px', backgroundColor:'#fff', cursor:'pointer' }}>🔍</button>
               </div>
             </div>
             <div>
               <label style={{ fontSize: '0.75rem', color: 'red' }}>Description *</label>
               <input type="text" value={buyBcDesc} readOnly className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0 }} />
             </div>
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'end', marginBottom: '20px' }}>
             <div>
               <label style={{ fontSize: '0.75rem', color: 'red' }}>MRP *</label>
               <input type="text" value={buyBcMrp} readOnly className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0 }} />
             </div>
             <div>
               <label style={{ fontSize: '0.75rem', color: 'red' }}>Quantity *</label>
               <input type="text" value={buyBcQty} onChange={e=>setBuyBcQty(e.target.value)} className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0 }} />
             </div>
             <button onClick={handleAddBuy} style={{ padding: '6px 15px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }} className="btn-theme">Add</button>
           </div>
           
           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left', marginTop:'20px' }}>
             <thead>
               <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                 <th style={{ padding: '8px' }}>Code</th><th style={{ padding: '8px' }}>Barcode</th><th style={{ padding: '8px' }}>Name</th><th style={{ padding: '8px' }}>MRP</th><th style={{ padding: '8px' }}>Quantity</th>
               </tr>
             </thead>
             <tbody>
               {buyItems.map((itm, idx) => (
                 <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
                   <td style={{ padding: '8px' }}>{itm.code}</td><td style={{ padding: '8px' }}>{itm.barcode}</td><td style={{ padding: '8px' }}>{itm.name}</td><td style={{ padding: '8px' }}>{itm.mrp}</td><td style={{ padding: '8px' }}>{itm.quantity}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>

         <div style={{ border: '1px solid var(--border-color)', padding: '15px', flex: 1, backgroundColor: 'var(--card-bg)', borderRadius: '8px' }}>
           <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Get Details</h4>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', marginBottom: '15px' }}>
             <div>
               <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Barcode</label>
               <div style={{ display: 'flex', gap: '5px' }}>
                 <input type="text" value={getBcSearch} onChange={e=>setGetBcSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleBarcodeSearch('get')} className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0 }} />
                 <button className="btn-theme" onClick={() => handleBarcodeSearch('get')} style={{ padding: '2px 8px', border:'1px solid #ccc', borderRadius:'4px', backgroundColor:'#fff', cursor:'pointer' }}>🔍</button>
               </div>
             </div>
             <div>
               <label style={{ fontSize: '0.75rem', color: 'red' }}>Description *</label>
               <input type="text" value={getBcDesc} readOnly className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0 }} />
             </div>
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'end', marginBottom: '20px' }}>
             <div>
               <label style={{ fontSize: '0.75rem', color: 'red' }}>MRP *</label>
               <input type="text" value={getBcMrp} readOnly className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0 }} />
             </div>
             <div>
               <label style={{ fontSize: '0.75rem', color: 'red' }}>Quantity *</label>
               <input type="text" value={getBcQty} onChange={e=>setGetBcQty(e.target.value)} className="input-animated" style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop:'none', borderLeft:'none', borderRight:'none', borderRadius:0 }} />
             </div>
             <button onClick={handleAddGet} style={{ padding: '6px 15px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }} className="btn-theme">Add</button>
           </div>
           
           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left', marginTop:'20px' }}>
             <thead>
               <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                 <th style={{ padding: '8px' }}>Code</th><th style={{ padding: '8px' }}>Barcode</th><th style={{ padding: '8px' }}>Name</th><th style={{ padding: '8px' }}>MRP</th><th style={{ padding: '8px' }}>Quantity</th>
               </tr>
             </thead>
             <tbody>
               {getItems.map((itm, idx) => (
                 <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
                   <td style={{ padding: '8px' }}>{itm.code}</td><td style={{ padding: '8px' }}>{itm.barcode}</td><td style={{ padding: '8px' }}>{itm.name}</td><td style={{ padding: '8px' }}>{itm.mrp}</td><td style={{ padding: '8px' }}>{itm.quantity}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '30px' }}>
        <button onClick={handleSave} disabled={isLoading} style={{ padding: '8px 25px', backgroundColor: '#e5e7eb', color: '#4b5563', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} className="btn-theme">Save</button>
        <button onClick={onCancel} style={{ padding: '8px 25px', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} className="btn-danger">Close</button>
      </div>
    </div>
  );
};

// ================= PROMOTION LIST (MAIN PAGE) =================
const Promotion = () => {
  const [view, setView] = useState('list'); // list, add, edit
  const [promotions, setPromotions] = useState([]);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  const [statusModalPromo, setStatusModalPromo] = useState(null);
  const [tagModalPromo, setTagModalPromo] = useState(null);

  useEffect(() => {
    if (view === 'list') {
      fetchPromotions();
    }
  }, [view]);

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
      if (data && !error) setPromotions(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch promotions. Have you created the tables?");
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (view === 'add') return <PromotionForm onSave={() => setView('list')} onCancel={() => setView('list')} />;
  if (view === 'edit') return <PromotionForm initialData={selectedPromo} onSave={() => setView('list')} onCancel={() => setView('list')} />;

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Promotion List</h2>
        <button className="btn-theme" 
          onClick={() => { setSelectedPromo(null); setView('add'); }}
          style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
        >
          + Add New
        </button>
      </div>

      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <input type="text" placeholder="Search" style={{ padding: '8px', width: '200px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
        </div>
        
        <div style={{ overflowX: 'auto', minHeight: '400px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px 15px' }}>SL</th>
                <th style={{ padding: '12px 15px' }}>Code</th>
                <th style={{ padding: '12px 15px' }}>Name</th>
                <th style={{ padding: '12px 15px' }}>Type</th>
                <th style={{ padding: '12px 15px' }}>Package Price</th>
                <th style={{ padding: '12px 15px' }}>Valid From</th>
                <th style={{ padding: '12px 15px' }}>Valid To</th>
                <th style={{ padding: '12px 15px' }}>Current Status</th>
                <th style={{ padding: '12px 15px' }}>Details</th>
                <th style={{ padding: '12px 15px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promo, idx) => (
                <tr key={promo.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 15px' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 15px' }}>{promo.circular_code}</td>
                  <td style={{ padding: '10px 15px' }}>{promo.circular_name}</td>
                  <td style={{ padding: '10px 15px' }}>{promo.promotion_type}</td>
                  <td style={{ padding: '10px 15px' }}></td>
                  <td style={{ padding: '10px 15px' }}>{formatDate(promo.valid_from)}</td>
                  <td style={{ padding: '10px 15px' }}>{formatDate(promo.valid_to)}</td>
                  <td style={{ padding: '10px 15px' }}>
                    {new Date() >= new Date(promo.valid_from) && new Date() <= new Date(promo.valid_to) ? (
                      <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Active</span>
                    ) : (
                      <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Inactive</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 15px' }}>
                    <span 
                      style={{ color: 'var(--accent-primary)', textDecoration: 'underline', cursor: 'pointer' }}
                      onClick={() => setStatusModalPromo(promo)}
                    >
                      Status Details
                    </span>
                  </td>
                  <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button 
                        className="btn-theme"
                        onClick={() => setActiveDropdown(activeDropdown === promo.id ? null : promo.id)}
                        style={{ padding: '5px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        Action <span style={{ fontSize: '0.6rem' }}>▼</span>
                      </button>
                      
                      {activeDropdown === promo.id && (
                        <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minWidth: '150px', textAlign: 'left', marginTop: '2px' }}>
                          <div 
                            style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '0.85rem' }}
                            onClick={() => { setSelectedPromo(promo); setView('edit'); setActiveDropdown(null); }}
                          >
                            Show Details
                          </div>
                          <div 
                            style={{ padding: '10px 15px', cursor: 'pointer', fontSize: '0.85rem' }}
                            onClick={() => { setTagModalPromo(promo); setActiveDropdown(null); }}
                          >
                            Tag Customer Type
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {statusModalPromo && <StatusDetailsModal promotion={statusModalPromo} onClose={() => setStatusModalPromo(null)} />}
      {tagModalPromo && <CustomerTypeTagModal promotion={tagModalPromo} onClose={() => setTagModalPromo(null)} />}
    </div>
  );
};

export default Promotion;
