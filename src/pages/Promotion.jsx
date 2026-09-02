import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext';

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

// ================= STANDARDIZED PROMOTION PDF GENERATOR =================
const generatePromotionPDF = (promoData, itemsDataBuy = [], itemsDataGet = [], circularItems = [], couponItems = [], currentUser = null) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Company Header (Center)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(46, 111, 64);
  doc.text("EZ ERP", pageWidth / 2, 13, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text("House: 352, Lane: 05, 2nd floor, Baridhara DOHS, Dhaka-1212, Bangladesh", pageWidth / 2, 18, { align: 'center' });

  // 2. Top Right Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(46, 111, 64);
  doc.text("PROMOTION CIRCULAR", pageWidth - 14, 13, { align: 'right' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  const code = promoData.circular_code ? (promoData.circular_code.startsWith('#') ? promoData.circular_code : `#${promoData.circular_code}`) : '';
  doc.text(`Circular No: ${code}`, pageWidth - 14, 18.5, { align: 'right' });
  
  const from = promoData.valid_from ? String(promoData.valid_from).split('T')[0] : '';
  const to = promoData.valid_to ? String(promoData.valid_to).split('T')[0] : '';
  const dateStr = from && to ? `${from} to ${to}` : (from || to || new Date().toISOString().split('T')[0]);
  doc.text(`Validity: ${dateStr}`, pageWidth - 14, 23, { align: 'right' });

  const storesText = promoData.stores || 'ALL';
  doc.text(`Stores: ${storesText.length > 40 ? storesText.substring(0, 40) + '...' : storesText}`, pageWidth - 14, 27.5, { align: 'right' });

  // 3. Top Left Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  
  doc.text(`Promotion Name:`, 14, 18.5);
  doc.setFont("helvetica", "normal");
  doc.text(`${promoData.circular_name || ''}`, 45, 18.5);

  doc.setFont("helvetica", "bold");
  doc.text(`Promotion Type:`, 14, 23);
  doc.setFont("helvetica", "normal");
  doc.text(`${promoData.promotion_type || 'Circular Discount'}`, 45, 23);

  doc.setFont("helvetica", "bold");
  doc.text(`Circular Type:`, 14, 27.5);
  doc.setFont("helvetica", "normal");
  doc.text(`${promoData.circular_type || promoData.remarks || 'Standard'}`, 45, 27.5);

  // 4. Tables according to promo type
  let startY = 33;
  let tableHead = [];
  let tableBody = [];
  let colStyles = {};
  let hasSummaryRow = false;

  if (promoData.promotion_type === 'Buy Get') {
    tableHead = [['SL', 'Type', 'Barcode / Code', 'Item Name', 'Price (MRP)', 'Quantity']];
    let sl = 1;
    (itemsDataBuy || []).forEach(i => {
      tableBody.push([
        sl++,
        'BUY',
        i.barcode || i.code || '-',
        i.name || i.item || '',
        Number(i.mrp || 0).toFixed(2),
        i.quantity || 1
      ]);
    });
    (itemsDataGet || []).forEach(i => {
      tableBody.push([
        sl++,
        'GET',
        i.barcode || i.code || '-',
        i.name || i.item || '',
        Number(i.mrp || 0).toFixed(2),
        i.quantity || 1
      ]);
    });

    colStyles = {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'left', cellWidth: 35 },
      3: { halign: 'left' },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 25 }
    };
  } else if (promoData.promotion_type === 'Coupon') {
    tableHead = [['SL', 'Coupon No', 'Coupon Type', 'Discount Val', 'Max Disc Amt', 'Redeem Limit', 'Min Purchase']];
    tableBody = [[
      1,
      promoData.coupon_no || 'N/A',
      promoData.coupon_type || 'Discount',
      Number(promoData.coupon_disc_val || 0).toFixed(2),
      Number(promoData.coupon_max_disc_amt || 0).toFixed(2),
      promoData.coupon_redeem_limit || 'Unlimited',
      Number(promoData.coupon_min_purchase || 0).toFixed(2)
    ]];

    if (couponItems && couponItems.length > 0) {
      couponItems.forEach((c, idx) => {
        tableBody.push([
          idx + 2,
          c.couponNo || '',
          'Sub Coupon',
          Number(c.discPct || 0).toFixed(2) + '%',
          Number(c.discAmt || 0).toFixed(2),
          '-',
          '-'
        ]);
      });
    }

    colStyles = {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left', cellWidth: 40 },
      2: { halign: 'left', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'center', cellWidth: 30 },
      6: { halign: 'right', cellWidth: 35 }
    };
  } else {
    // Circular Discount
    tableHead = [['SL', 'Barcode / Code', 'Item Name', 'Category', 'Brand', 'Price (MRP)', 'Disc (%)', 'Disc. Amt', 'Ven. Contri (%)']];
    let totalMrp = 0;
    let totalDiscAmt = 0;

    (circularItems || []).forEach((it, idx) => {
      const mrp = Number(it.mrp || it.sale_price || 0);
      const dPct = Number(it.discountPct || it.discount_percent || 0);
      const dAmt = Number(it.discAmt || it.discount_amount || 0);
      const vPct = Number(it.vendorContriPct || it.vendor_contribution_percent || 0);

      totalMrp += mrp;
      totalDiscAmt += dAmt;

      tableBody.push([
        idx + 1,
        it.userBarcode || it.code || it.barcode || '-',
        it.name || it.item || it.description || '',
        it.category || '-',
        it.brand || '-',
        mrp.toFixed(2),
        dPct > 0 ? `${dPct.toFixed(2)}%` : '0.00%',
        dAmt.toFixed(2),
        vPct > 0 ? `${vPct.toFixed(2)}%` : '0.00%'
      ]);
    });

    if (tableBody.length > 0) {
      hasSummaryRow = true;
      tableBody.push([
        'Total',
        '',
        `${circularItems.length} items`,
        '',
        '',
        totalMrp.toFixed(2),
        '',
        totalDiscAmt.toFixed(2),
        ''
      ]);
    }

    colStyles = {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left', cellWidth: 28 },
      2: { halign: 'left' },
      3: { halign: 'left', cellWidth: 32 },
      4: { halign: 'left', cellWidth: 30 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', cellWidth: 24 },
      8: { halign: 'right', cellWidth: 24 }
    };
  }

  autoTable(doc, {
    startY: startY,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 30, 30] },
    headStyles: { fillColor: [46, 111, 64], fontStyle: 'bold', textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: colStyles,
    didParseCell: function (data) {
      if (data.section === 'head') {
        if (data.column.index === 0) data.cell.styles.halign = 'center';
      }
      if (data.row.index === tableBody.length - 1 && hasSummaryRow) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 245, 240];
        data.cell.styles.textColor = [10, 60, 20];
      }
    },
    margin: { top: 10, left: 14, right: 14 }
  });

  const finalY = doc.lastAutoTable.finalY || startY + 50;

  // 5. Signatures (Exact Match to Image 3)
  const sigY = Math.max(finalY + 24, pageHeight - 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setLineWidth(0.4);

  const currentUserName = currentUser?.name || currentUser?.username || (localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user'))?.name || JSON.parse(localStorage.getItem('erp_user'))?.username : '') || 'Admin';
  const displayName = (currentUserName === 'msmraqeeb@gmail.com' || currentUserName === 'admin@email.com') ? 'Admin' : currentUserName;

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

  doc.save(`Promotion_${String(promoData.circular_code || 'Circular').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
};

// ================= ADD / EDIT PROMOTION FORM =================
const PromotionForm = ({ initialData, onSave, onCancel }) => {
  const { user } = useAuth();
  const [promoType, setPromoType] = useState(initialData?.promotion_type || 'Circular Discount');
  const [circularName, setCircularName] = useState(initialData?.circular_name || '');
  const [validFrom, setValidFrom] = useState(initialData?.valid_from?.split('T')[0] || '');
  const [validTo, setValidTo] = useState(initialData?.valid_to?.split('T')[0] || '');
  const [pointEnable, setPointEnable] = useState(initialData?.point_enable || false);
  const [buyItemCount, setBuyItemCount] = useState(initialData?.buy_item_count || '*');
  const [getItemCount, setGetItemCount] = useState(initialData?.get_item_count || '*');
  
  const [selectedStores, setSelectedStores] = useState(initialData?.stores ? initialData.stores.split(', ') : []);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target)) {
        setIsStoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const [storesList, setStoresList] = useState([]);
  const [brandsList, setBrandsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [subCategoriesList, setSubCategoriesList] = useState([]);
  const [subSubcategoriesList, setSubSubcategoriesList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [productsList, setProductsList] = useState([]);

  // Upper Selection states
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [uploadBySrlBarcode, setUploadBySrlBarcode] = useState(false);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [
          storesRes,
          brandsRes,
          categoriesRes,
          subCatsRes,
          subSubRes,
          vendorsRes,
          productsRes
        ] = await Promise.all([
          supabase.from('stores').select('name').eq('status', 'ACTIVE').order('name'),
          supabase.from('brands').select('id, name').order('name'),
          supabase.from('categories').select('id, name').order('name'),
          supabase.from('subcategories').select('id, name, category_name').order('name'),
          supabase.from('sub_subcategories').select('id, name, subcategory_name, category_name').order('name'),
          supabase.from('vendors').select('id, name').order('name'),
          supabase.from('products').select('id, code, barcode, user_define_barcode, item_name, mrp, purchase_price, brand_id, category_id, subcategory_id, sub_subcategory_id, vendor_id, status').order('item_name')
        ]);

        if (storesRes.data) setStoresList(['Central Store', ...storesRes.data.map(s => s.name)]);
        if (brandsRes.data) setBrandsList(brandsRes.data || []);
        if (categoriesRes.data) setCategoriesList(categoriesRes.data || []);
        if (subCatsRes.data) setSubCategoriesList(subCatsRes.data || []);
        if (subSubRes.data) setSubSubcategoriesList(subSubRes.data || []);
        if (vendorsRes.data) setVendorsList(vendorsRes.data || []);
        if (productsRes.data) setProductsList(productsRes.data || []);
      } catch (err) {
        console.error("Failed to load master data for promotions", err);
      }
    };
    fetchMasterData();
  }, []);

  // Cascaded dropdown filters
  const availableSubCategories = React.useMemo(() => {
    if (!selectedCategory) return subCategoriesList;
    const cat = categoriesList.find(c => c.id === selectedCategory);
    if (!cat) return subCategoriesList;
    return subCategoriesList.filter(s => s.category_name?.trim().toLowerCase() === cat.name?.trim().toLowerCase());
  }, [selectedCategory, subCategoriesList, categoriesList]);

  const availableSubSubcategories = React.useMemo(() => {
    if (!selectedSubCategory) return subSubcategoriesList;
    const sub = subCategoriesList.find(s => s.id === selectedSubCategory);
    if (!sub) return subSubcategoriesList;
    return subSubcategoriesList.filter(ss => ss.subcategory_name?.trim().toLowerCase() === sub.name?.trim().toLowerCase());
  }, [selectedSubCategory, subSubcategoriesList, subCategoriesList]);

  const availableProducts = React.useMemo(() => {
    return productsList.filter(p => {
      if (selectedBrand && p.brand_id !== selectedBrand) return false;
      if (selectedCategory && p.category_id !== selectedCategory) return false;
      if (selectedSubCategory && p.subcategory_id !== selectedSubCategory) return false;
      if (selectedSubSubcategory && p.sub_subcategory_id !== selectedSubSubcategory) return false;
      if (selectedVendor && p.vendor_id !== selectedVendor) return false;
      return true;
    });
  }, [productsList, selectedBrand, selectedCategory, selectedSubCategory, selectedSubSubcategory, selectedVendor]);

  // Circular Discount
  const [items, setItems] = useState([]);
  const [filterDisc, setFilterDisc] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [selectedProductForBc, setSelectedProductForBc] = useState(null);
  const [bcDesc, setBcDesc] = useState('');
  const [bcLpp, setBcLpp] = useState('');
  const [bcSalePrice, setBcSalePrice] = useState('');
  const [bcDiscPct, setBcDiscPct] = useState('');
  const [bcDiscAmt, setBcDiscAmt] = useState('');
  const [bcVenPct, setBcVenPct] = useState('0');
  const [bcVenAmt, setBcVenAmt] = useState('0');

  // Product Search Modal states (Multi-Select)
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalCategory, setModalCategory] = useState('');
  const [modalBrand, setModalBrand] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [modalDiscPct, setModalDiscPct] = useState('');
  const [modalDiscAmt, setModalDiscAmt] = useState('');
  const [modalVenPct, setModalVenPct] = useState('0');
  const [modalVenAmt, setModalVenAmt] = useState('0');

  const filteredModalProducts = React.useMemo(() => {
    const q = modalSearch.trim().toLowerCase();
    return productsList.filter(p => {
      if (modalCategory && p.category_id !== modalCategory) return false;
      if (modalBrand && p.brand_id !== modalBrand) return false;
      if (!q) return true;
      return (
        (p.item_name && p.item_name.toLowerCase().includes(q)) ||
        (p.barcode && String(p.barcode).toLowerCase().includes(q)) ||
        (p.user_define_barcode && String(p.user_define_barcode).toLowerCase().includes(q)) ||
        (p.code && String(p.code).toLowerCase().includes(q))
      );
    });
  }, [productsList, modalSearch, modalCategory, modalBrand]);

  const toggleSelectModalProduct = (id) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllModalProducts = () => {
    const visibleIds = filteredModalProducts.map(p => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleApplySingleProductFromModal = (product) => {
    setSelectedProductForBc(product);
    setBarcodeSearch(product.barcode || product.user_define_barcode || product.code || '');
    setBcDesc(product.item_name || '');
    setBcLpp(product.purchase_price != null ? Number(product.purchase_price).toFixed(2) : '0.00');
    setBcSalePrice(product.mrp != null ? Number(product.mrp).toFixed(2) : '0.00');
    setBcDiscPct('');
    setBcDiscAmt('');
    setBcVenPct('0');
    setBcVenAmt('0.00');
    setShowProductModal(false);
    toast.success(`Selected "${product.item_name}"`);
  };

  const handleAddSelectedFromModal = () => {
    if (selectedProductIds.length === 0) {
      return toast.error("Please select at least one product");
    }

    const dPct = parseFloat(modalDiscPct || bcDiscPct || filterDisc || 0);
    const dAmt = parseFloat(modalDiscAmt || bcDiscAmt || 0);
    if (dPct <= 0 && dAmt <= 0) {
      return toast.error("Please enter Discount (%) or Discount Amount to apply");
    }

    const vPct = parseFloat(modalVenPct || bcVenPct || 0);
    const vAmt = parseFloat(modalVenAmt || bcVenAmt || 0);

    const prodsToAdd = productsList.filter(p => selectedProductIds.includes(p.id));

    setItems(prev => {
      const nextList = [...prev];
      prodsToAdd.forEach(product => {
        const brand = brandsList.find(b => b.id === product.brand_id);
        const cat = categoriesList.find(c => c.id === product.category_id);
        const sub = subCategoriesList.find(s => s.id === product.subcategory_id);
        const subSub = subSubcategoriesList.find(ss => ss.id === product.sub_subcategory_id);
        const ven = vendorsList.find(v => v.id === product.vendor_id);
        const mrp = Number(product.mrp || 0);
        
        const lineDiscAmt = dPct > 0 ? parseFloat(((mrp * dPct) / 100).toFixed(2)) : dAmt;
        const lineVenAmt = vPct > 0 ? parseFloat(((lineDiscAmt * vPct) / 100).toFixed(2)) : vAmt;
        const pCode = product.user_define_barcode || product.barcode || product.code;

        const existingIdx = nextList.findIndex(it => (it.userBarcode || it.code) === pCode);
        const newItemObj = {
          sl: nextList.length + 1,
          brand: brand?.name || '',
          category: cat?.name || '',
          subCategory: sub?.name || '',
          subSubcategory: subSub?.name || '',
          vendor: ven?.name || '',
          item: product.item_name,
          code: product.code || '',
          userBarcode: pCode,
          name: product.item_name,
          mrp: mrp,
          discountPct: dPct,
          discAmt: lineDiscAmt,
          vendorContriPct: vPct,
          vendorContriAmt: lineVenAmt
        };

        if (existingIdx >= 0) {
          nextList[existingIdx] = newItemObj;
        } else {
          nextList.push(newItemObj);
        }
      });
      return nextList;
    });

    toast.success(`Added ${prodsToAdd.length} product(s) to circular items!`);
    setSelectedProductIds([]);
    setShowProductModal(false);
  };

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
        
        const newItems = json.map((row, index) => {
          const barcode = String(row['User Barcode'] || row['Barcode'] || row['barcode'] || row['Code'] || row['code'] || '').trim();
          const foundProd = productsList.find(p => 
            p.barcode === barcode || 
            p.user_define_barcode === barcode || 
            p.code === barcode
          );

          const brandObj = foundProd ? brandsList.find(b => b.id === foundProd.brand_id) : null;
          const catObj = foundProd ? categoriesList.find(c => c.id === foundProd.category_id) : null;
          const subObj = foundProd ? subCategoriesList.find(s => s.id === foundProd.subcategory_id) : null;
          const subSubObj = foundProd ? subSubcategoriesList.find(ss => ss.id === foundProd.sub_subcategory_id) : null;
          const venObj = foundProd ? vendorsList.find(v => v.id === foundProd.vendor_id) : null;

          const discPct = Number(row['Discount(%)'] || row['Discount %'] || row['discount_percent'] || row['Discount']) || 0;
          let discAmt = Number(row['Disc. Amt'] || row['Discount Amount'] || row['disc_amt'] || row['discount_amount']) || 0;
          if (discAmt === 0 && discPct > 0 && foundProd) {
            discAmt = parseFloat(((Number(foundProd.mrp || 0) * discPct) / 100).toFixed(2));
          }

          return {
            sl: items.length + index + 1,
            brand: row['Brand'] || brandObj?.name || '',
            category: row['Category'] || catObj?.name || '',
            subCategory: row['Sub Category'] || subObj?.name || '',
            subSubcategory: row['Sub Subcategory'] || subSubObj?.name || '',
            vendor: row['Vendor'] || venObj?.name || '',
            item: row['Item'] || foundProd?.item_name || '',
            code: String(row['Code'] || foundProd?.code || barcode),
            userBarcode: String(row['User Barcode'] || foundProd?.user_define_barcode || barcode),
            name: row['Name'] || foundProd?.item_name || '',
            discountPct: discPct,
            discAmt: discAmt,
            vendorContriPct: Number(row['Vendor Contri.(%)'] || row['vendor_contribution_percent'] || 0),
            vendorContriAmt: Number(row['Vendor Contri Amt'] || row['vendor_contribution_amount'] || 0)
          };
        });
        
        setItems(prev => [...prev, ...newItems]);
        toast.success(`Imported ${newItems.length} items from file`);
      } catch (err) {
        toast.error("Error parsing Excel file");
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

  const handleAddUpperFilter = () => {
    const dPct = parseFloat(filterDisc);
    if (!filterDisc || isNaN(dPct) || dPct <= 0) {
      return toast.error("Please enter a valid Discount (%) greater than 0");
    }

    if (selectedItem) {
      const product = productsList.find(p => p.id === selectedItem);
      if (!product) return toast.error("Selected product not found");

      const brand = brandsList.find(b => b.id === product.brand_id);
      const cat = categoriesList.find(c => c.id === product.category_id);
      const sub = subCategoriesList.find(s => s.id === product.subcategory_id);
      const subSub = subSubcategoriesList.find(ss => ss.id === product.sub_subcategory_id);
      const ven = vendorsList.find(v => v.id === product.vendor_id);
      const mrp = Number(product.mrp || 0);
      const discAmt = parseFloat(((mrp * dPct) / 100).toFixed(2));
      const pCode = product.user_define_barcode || product.barcode || product.code;

      const newItem = {
        sl: items.length + 1,
        brand: brand?.name || '',
        category: cat?.name || '',
        subCategory: sub?.name || '',
        subSubcategory: subSub?.name || '',
        vendor: ven?.name || '',
        item: product.item_name,
        code: product.code || '',
        userBarcode: pCode,
        name: product.item_name,
        discountPct: dPct,
        discAmt: discAmt,
        vendorContriPct: 0,
        vendorContriAmt: 0
      };

      setItems(prev => {
        const existingIdx = prev.findIndex(it => (it.userBarcode || it.code) === pCode);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], discountPct: dPct, discAmt: discAmt };
          return updated;
        }
        return [...prev, newItem];
      });

      setFilterDisc('');
      toast.success(`"${product.item_name}" added with ${dPct}% discount`);
    } else {
      // Bulk add based on filters
      const matched = availableProducts;
      if (matched.length === 0) {
        return toast.error("No products match the selected criteria");
      }

      if (!selectedBrand && !selectedCategory && !selectedSubCategory && !selectedSubSubcategory && !selectedVendor) {
        if (!window.confirm(`Are you sure you want to apply ${dPct}% discount to all ${matched.length} products?`)) {
          return;
        }
      }

      setItems(prev => {
        const nextList = [...prev];
        matched.forEach(product => {
          const brand = brandsList.find(b => b.id === product.brand_id);
          const cat = categoriesList.find(c => c.id === product.category_id);
          const sub = subCategoriesList.find(s => s.id === product.subcategory_id);
          const subSub = subSubcategoriesList.find(ss => ss.id === product.sub_subcategory_id);
          const ven = vendorsList.find(v => v.id === product.vendor_id);
          const mrp = Number(product.mrp || 0);
          const discAmt = parseFloat(((mrp * dPct) / 100).toFixed(2));
          const pCode = product.user_define_barcode || product.barcode || product.code;

          const existingIdx = nextList.findIndex(it => (it.userBarcode || it.code) === pCode);
          if (existingIdx >= 0) {
            nextList[existingIdx] = {
              ...nextList[existingIdx],
              discountPct: dPct,
              discAmt: discAmt
            };
          } else {
            nextList.push({
              sl: nextList.length + 1,
              brand: brand?.name || '',
              category: cat?.name || '',
              subCategory: sub?.name || '',
              subSubcategory: subSub?.name || '',
              vendor: ven?.name || '',
              item: product.item_name,
              code: product.code || '',
              userBarcode: pCode,
              name: product.item_name,
              discountPct: dPct,
              discAmt: discAmt,
              vendorContriPct: 0,
              vendorContriAmt: 0
            });
          }
        });
        return nextList;
      });

      setFilterDisc('');
      toast.success(`${matched.length} items set with ${dPct}% discount!`);
    }
  };

  const handleBarcodeSearch = async (type) => {
    const searchVal = type === 'circular' ? barcodeSearch.trim() : type === 'buy' ? buyBcSearch.trim() : getBcSearch.trim();
    if (!searchVal) return toast.error("Enter barcode to search");

    try {
      const lower = searchVal.toLowerCase();
      let found = productsList.find(p => 
        p.barcode?.toLowerCase() === lower || 
        p.user_define_barcode?.toLowerCase() === lower || 
        p.code?.toLowerCase() === lower
      );

      if (!found) {
        const { data, error } = await supabase.from('products').select('*')
          .or(`barcode.eq.${searchVal},user_define_barcode.eq.${searchVal},code.eq.${searchVal}`)
          .maybeSingle();
        if (data && !error) found = data;
      }

      if (found) {
        if (type === 'circular') {
          setSelectedProductForBc(found);
          setBcDesc(found.item_name || '');
          setBcLpp(found.purchase_price != null ? Number(found.purchase_price).toFixed(2) : '0.00');
          setBcSalePrice(found.mrp != null ? Number(found.mrp).toFixed(2) : '0.00');
          setBcDiscPct('');
          setBcDiscAmt('');
          setBcVenPct('0');
          setBcVenAmt('0.00');
        } else if (type === 'buy') {
          setBuyBcDesc(found.item_name || '');
          setBuyBcMrp(found.mrp || 0);
        } else if (type === 'get') {
          setGetBcDesc(found.item_name || '');
          setGetBcMrp(found.mrp || 0);
        }
        toast.success("Product found: " + (found.item_name || found.barcode));
      } else {
        toast.error("Product not found");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error searching product");
    }
  };

  const handleDiscPctChange = (val) => {
    setBcDiscPct(val);
    const pct = parseFloat(val) || 0;
    const sp = parseFloat(bcSalePrice) || 0;
    const amt = ((sp * pct) / 100).toFixed(2);
    setBcDiscAmt(amt);

    const vp = parseFloat(bcVenPct) || 0;
    setBcVenAmt(((parseFloat(amt) * vp) / 100).toFixed(2));
  };

  const handleDiscAmtChange = (val) => {
    setBcDiscAmt(val);
    const amt = parseFloat(val) || 0;
    const sp = parseFloat(bcSalePrice) || 0;
    const pct = sp > 0 ? ((amt / sp) * 100).toFixed(2) : '0';
    setBcDiscPct(pct);

    const vp = parseFloat(bcVenPct) || 0;
    setBcVenAmt(((amt * vp) / 100).toFixed(2));
  };

  const handleVenPctChange = (val) => {
    setBcVenPct(val);
    const vp = parseFloat(val) || 0;
    const dAmt = parseFloat(bcDiscAmt) || 0;
    setBcVenAmt(((dAmt * vp) / 100).toFixed(2));
  };

  const handleVenAmtChange = (val) => {
    setBcVenAmt(val);
    const vAmt = parseFloat(val) || 0;
    const dAmt = parseFloat(bcDiscAmt) || 0;
    const vp = dAmt > 0 ? ((vAmt / dAmt) * 100).toFixed(2) : '0';
    setBcVenPct(vp);
  };

  const handleAddCircular = () => {
    if (!bcDesc) return toast.error("Search and select a barcode first");
    const dPct = parseFloat(bcDiscPct) || 0;
    const dAmt = parseFloat(bcDiscAmt) || 0;
    if (dPct <= 0 && dAmt <= 0) {
      return toast.error("Please enter a valid Discount (%) or Discount Amount");
    }

    const brand = brandsList.find(b => b.id === selectedProductForBc?.brand_id);
    const cat = categoriesList.find(c => c.id === selectedProductForBc?.category_id);
    const sub = subCategoriesList.find(s => s.id === selectedProductForBc?.subcategory_id);
    const subSub = subSubcategoriesList.find(ss => ss.id === selectedProductForBc?.sub_subcategory_id);
    const ven = vendorsList.find(v => v.id === selectedProductForBc?.vendor_id);
    const pCode = selectedProductForBc?.user_define_barcode || selectedProductForBc?.barcode || barcodeSearch;

    const newItem = {
      sl: items.length + 1,
      brand: brand?.name || '',
      category: cat?.name || '',
      subCategory: sub?.name || '',
      subSubcategory: subSub?.name || '',
      vendor: ven?.name || '',
      item: selectedProductForBc?.item_name || bcDesc,
      code: selectedProductForBc?.code || barcodeSearch,
      userBarcode: pCode,
      name: selectedProductForBc?.item_name || bcDesc,
      mrp: parseFloat(selectedProductForBc?.mrp || bcSalePrice || 0),
      discountPct: dPct,
      discAmt: dAmt,
      vendorContriPct: parseFloat(bcVenPct) || 0,
      vendorContriAmt: parseFloat(bcVenAmt) || 0
    };

    setItems(prev => {
      const existingIdx = prev.findIndex(it => (it.userBarcode || it.code) === pCode);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newItem;
        return updated;
      }
      return [...prev, newItem];
    });

    // Clear inputs
    setBarcodeSearch('');
    setBcDesc('');
    setBcLpp('');
    setBcSalePrice('');
    setBcDiscPct('');
    setBcDiscAmt('');
    setBcVenPct('0');
    setBcVenAmt('0');
    setSelectedProductForBc(null);

    toast.success("Item added successfully");
  };

  const handleDeleteItem = (index) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
    toast.success("Item removed");
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
    generatePromotionPDF(promoData, itemsDataBuy, itemsDataGet, circularItems, couponItems, user);
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
            <div style={{ position: 'relative' }} ref={storeDropdownRef}>
              <div 
                className="input-animated" 
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }}
                onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
              >
                <span style={{ fontSize: '0.85rem' }}>{selectedStores.length ? `${selectedStores.length} checked ▼` : 'Select ▼'}</span>
              </div>
              {isStoreDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
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
                <div style={{ position: 'relative' }} ref={storeDropdownRef}>
                  <div 
                    className="input-animated" 
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, padding: '5px 0' }}
                    onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                  >
                    <span style={{ fontSize: '0.8rem' }}>{selectedStores.length ? `${selectedStores.length} checked ▼` : 'Select ▼'}</span>
                  </div>
                  {isStoreDropdownOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
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
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Brand</label>
            <CustomSelect 
              value={selectedBrand} 
              onChange={e => setSelectedBrand(e.target.value)}
              className="input-animated"
            >
              <option value="">-- ALL --</option>
              {brandsList.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </CustomSelect>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Category</label>
            <CustomSelect 
              value={selectedCategory} 
              onChange={e => {
                setSelectedCategory(e.target.value);
                setSelectedSubCategory('');
                setSelectedSubSubcategory('');
              }}
              className="input-animated"
            >
              <option value="">-- ALL --</option>
              {categoriesList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </CustomSelect>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sub Category</label>
            <CustomSelect 
              value={selectedSubCategory} 
              onChange={e => {
                setSelectedSubCategory(e.target.value);
                setSelectedSubSubcategory('');
              }}
              className="input-animated"
            >
              <option value="">-- ALL --</option>
              {availableSubCategories.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </CustomSelect>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sub Subcategory</label>
            <CustomSelect 
              value={selectedSubSubcategory} 
              onChange={e => setSelectedSubSubcategory(e.target.value)}
              className="input-animated"
            >
              <option value="">-- ALL --</option>
              {availableSubSubcategories.map(ss => (
                <option key={ss.id} value={ss.id}>{ss.name}</option>
              ))}
            </CustomSelect>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vendor</label>
            <CustomSelect 
              value={selectedVendor} 
              onChange={e => setSelectedVendor(e.target.value)}
              className="input-animated"
            >
              <option value="">-- ALL --</option>
              {vendorsList.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </CustomSelect>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Item</label>
            <CustomSelect 
              value={selectedItem} 
              onChange={e => setSelectedItem(e.target.value)}
              className="input-animated"
            >
              <option value="">-- ALL --</option>
              {availableProducts.map(p => (
                <option key={p.id} value={p.id}>{p.item_name} {p.code ? `(${p.code})` : ''}</option>
              ))}
            </CustomSelect>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Discount (%)</label>
            <input 
              type="number" 
              min="0"
              max="100"
              step="any"
              className="input-animated" 
              value={filterDisc} 
              onChange={e => setFilterDisc(e.target.value)} 
              placeholder="-- ALL --" 
              style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem', padding: '5px 0' }} 
            />
          </div>

          <button 
            type="button" 
            onClick={handleAddUpperFilter} 
            style={{ 
              padding: '6px 20px', 
              backgroundColor: 'var(--accent-primary, #2e6f40)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontSize: '0.85rem',
              fontWeight: 600,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
            }}
          >
            Add
          </button>
        </div>
        
        <div style={{ borderTop: '1px dotted #ccc', margin: '20px 0' }}></div>

        {/* Barcode Search Area */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr) auto', gap: '15px', alignItems: 'end', marginBottom: '20px' }}>
          <div style={{ gridColumn: '1 / 2' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Barcode</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input 
                type="text" 
                value={barcodeSearch} 
                onChange={e => setBarcodeSearch(e.target.value)} 
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setModalSearch(barcodeSearch);
                    setShowProductModal(true);
                  }
                }} 
                placeholder="Scan / Type barcode"
                className="input-animated" 
                style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} 
              />
              <button 
                type="button"
                onClick={() => {
                  setModalSearch(barcodeSearch);
                  setShowProductModal(true);
                }} 
                style={{ 
                  padding: '4px 10px', 
                  backgroundColor: 'var(--accent-primary, #2e6f40)', 
                  color: '#fff',
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Search & Select Products"
              >
                🔍
              </button>
            </div>
          </div>

          <div style={{ gridColumn: '2 / 4' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Description <span style={{ color: 'red' }}>*</span></label>
            <input 
              type="text" 
              value={bcDesc} 
              readOnly 
              placeholder="Product name"
              className="input-animated" 
              style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem', backgroundColor: '#f8fafc' }} 
            />
          </div>

          <div style={{ gridColumn: '4 / 6' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Last Purchase Price</label>
            <input 
              type="text" 
              value={bcLpp} 
              readOnly 
              placeholder="0.00"
              className="input-animated" 
              style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem', backgroundColor: '#f8fafc' }} 
            />
          </div>

          <div style={{ gridColumn: '7' }}></div>

          <div style={{ gridColumn: '1 / 2' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sale Price</label>
            <CustomSelect 
              value={bcSalePrice} 
              onChange={e => {
                setBcSalePrice(e.target.value);
                if (bcDiscPct) handleDiscPctChange(bcDiscPct);
              }}
              className="input-animated" 
              style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }}
            >
              <option value="">{bcSalePrice ? Number(bcSalePrice).toFixed(2) : '-- Select Sale Price --'}</option>
              {bcSalePrice && <option value={bcSalePrice}>{Number(bcSalePrice).toFixed(2)}</option>}
            </CustomSelect>
          </div>

          <div style={{ gridColumn: '2 / 3' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Discount(%) <span style={{ color: 'red' }}>*</span></label>
            <input 
              type="number" 
              min="0"
              max="100"
              step="any"
              value={bcDiscPct} 
              onChange={e => handleDiscPctChange(e.target.value)} 
              placeholder="0.00"
              className="input-animated" 
              style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} 
            />
          </div>

          <div style={{ gridColumn: '3 / 4' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Discount Amount <span style={{ color: 'red' }}>*</span></label>
            <input 
              type="number" 
              min="0"
              step="any"
              value={bcDiscAmt} 
              onChange={e => handleDiscAmtChange(e.target.value)} 
              placeholder="0.00"
              className="input-animated" 
              style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} 
            />
          </div>

          <div style={{ gridColumn: '4 / 5' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vendor Contribution(%)</label>
            <input 
              type="number" 
              min="0"
              max="100"
              step="any"
              value={bcVenPct} 
              onChange={e => handleVenPctChange(e.target.value)} 
              placeholder="0.00"
              className="input-animated" 
              style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} 
            />
          </div>

          <div style={{ gridColumn: '5 / 7' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vendor Contribution Amount</label>
            <input 
              type="number" 
              min="0"
              step="any"
              value={bcVenAmt} 
              onChange={e => handleVenAmtChange(e.target.value)} 
              placeholder="0.00"
              className="input-animated" 
              style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, fontSize: '0.8rem' }} 
            />
          </div>

          <div style={{ gridColumn: '7' }}>
            <button 
              type="button"
              onClick={handleAddCircular} 
              style={{ 
                padding: '6px 20px', 
                backgroundColor: 'var(--accent-primary, #2e6f40)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                fontSize: '0.85rem',
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }} 
            >
              Add
            </button>
          </div>
        </div>

        <div style={{ borderTop: '1px dotted #ccc', margin: '20px 0' }}></div>

        {/* Excel Export/Upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn-theme" 
            onClick={handleExport} 
            style={{ 
              padding: '8px 25px', 
              backgroundColor: 'var(--accent-primary, #2e6f40)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontWeight: 600, 
              fontSize: '0.85rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            ↓ Export
          </button>
          
          <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={uploadBySrlBarcode} 
              onChange={e => setUploadBySrlBarcode(e.target.checked)} 
            /> 
            Upload By Srl_barcode
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'red' }}>Select CSV File *</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={e => setExcelFile(e.target.files[0])} style={{ fontSize: '0.8rem' }} />
          </div>

          <div style={{ flex: 1 }}></div>

          <button 
            type="button"
            className="btn-theme" 
            onClick={handleUpload} 
            style={{ 
              padding: '8px 25px', 
              backgroundColor: 'var(--accent-primary, #2e6f40)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontWeight: 600, 
              fontSize: '0.85rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            ↑ Upload!
          </button>
        </div>

        {/* Items Table Info bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Total Items: <span style={{ color: 'var(--accent-primary, #2e6f40)' }}>{items.length}</span>
          </span>
          {items.length > 0 && (
            <button 
              type="button"
              onClick={() => {
                if (window.confirm("Clear all items from list?")) setItems([]);
              }}
              style={{ fontSize: '0.75rem', color: '#dc2626', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontWeight: 600 }}
            >
              Clear All
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', position: 'sticky', top: 0, backgroundColor: 'var(--card-bg)', zIndex: 1 }}>
                <th style={{ padding: '10px 6px' }}>Brand</th>
                <th style={{ padding: '10px 6px' }}>Category</th>
                <th style={{ padding: '10px 6px' }}>Sub Category</th>
                <th style={{ padding: '10px 6px' }}>Sub Subcategory</th>
                <th style={{ padding: '10px 6px' }}>Vendor</th>
                <th style={{ padding: '10px 6px' }}>Item</th>
                <th style={{ padding: '10px 6px' }}>Code</th>
                <th style={{ padding: '10px 6px' }}>User Barcode</th>
                <th style={{ padding: '10px 6px' }}>Name</th>
                <th style={{ padding: '10px 6px' }}>Discount(%)</th>
                <th style={{ padding: '10px 6px' }}>Disc. Amt</th>
                <th style={{ padding: '10px 6px' }}>Vendor Contri.(%)</th>
                <th style={{ padding: '10px 6px' }}>Vendor Contri Amt</th>
                <th style={{ padding: '10px 6px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="14" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                    No items added yet. Use the filters or barcode scanner above to add items.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px 6px' }}>{item.brand}</td>
                    <td style={{ padding: '8px 6px' }}>{item.category}</td>
                    <td style={{ padding: '8px 6px' }}>{item.subCategory}</td>
                    <td style={{ padding: '8px 6px' }}>{item.subSubcategory}</td>
                    <td style={{ padding: '8px 6px' }}>{item.vendor}</td>
                    <td style={{ padding: '8px 6px' }}>{item.item}</td>
                    <td style={{ padding: '8px 6px' }}>{item.code}</td>
                    <td style={{ padding: '8px 6px' }}>{item.userBarcode}</td>
                    <td style={{ padding: '8px 6px', fontWeight: 500 }}>{item.name}</td>
                    <td style={{ padding: '8px 6px' }}>{item.discountPct}%</td>
                    <td style={{ padding: '8px 6px' }}>{Number(item.discAmt || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px 6px' }}>{item.vendorContriPct}%</td>
                    <td style={{ padding: '8px 6px' }}>{Number(item.vendorContriAmt || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteItem(idx)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px' }}
                        title="Delete Item"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
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
        <button 
          onClick={handleSave} 
          disabled={isLoading} 
          style={{ 
            padding: '8px 30px', 
            backgroundColor: 'var(--accent-primary, #2e6f40)', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer', 
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }} 
          className="btn-theme"
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        <button 
          type="button"
          onClick={() => {
            const promoPayload = {
              circular_name: circularName,
              circular_code: initialData?.circular_code || 'PREVIEW',
              promotion_type: promoType,
              valid_from: validFrom,
              valid_to: validTo,
              stores: selectedStores.join(', ')
            };
            generatePromotionPDF(promoPayload, buyItems, getItems, items, couponItems, user);
          }}
          style={{ 
            padding: '8px 25px', 
            backgroundColor: '#0284c7', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer', 
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }} 
        >
          📄 Print / PDF
        </button>
        <button 
          onClick={onCancel} 
          style={{ 
            padding: '8px 30px', 
            backgroundColor: '#dc2626', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer', 
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }} 
          className="btn-danger"
        >
          Close
        </button>
      </div>

      {/* ================= PRODUCT SEARCH MODAL WITH MULTI-SELECT ================= */}
      {showProductModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--card-bg, #fff)', width: '920px', maxWidth: '95vw', maxHeight: '90vh', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--accent-primary, #2e6f40)', color: '#fff' }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔍 Select Products for Circular
              </div>
              <button 
                type="button"
                onClick={() => setShowProductModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Filter Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', padding: '12px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: '#f8fafc', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Search (Name, Barcode, Code)</label>
                <input 
                  type="text" 
                  autoFocus
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  placeholder="Type to search..."
                  className="input-animated"
                  style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', marginTop: '2px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
                <CustomSelect 
                  value={modalCategory}
                  onChange={e => setModalCategory(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', marginTop: '2px' }}
                >
                  <option value="">-- ALL CATEGORIES --</option>
                  {categoriesList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </CustomSelect>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Brand</label>
                <CustomSelect 
                  value={modalBrand}
                  onChange={e => setModalBrand(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', marginTop: '2px' }}
                >
                  <option value="">-- ALL BRANDS --</option>
                  {brandsList.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </CustomSelect>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setModalSearch('');
                    setModalCategory('');
                    setModalBrand('');
                  }}
                  style={{ padding: '6px 14px', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', minHeight: '250px', maxHeight: '420px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', position: 'sticky', top: 0, backgroundColor: 'var(--card-bg)', zIndex: 2 }}>
                    <th style={{ padding: '10px 8px', width: '35px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={filteredModalProducts.length > 0 && filteredModalProducts.every(p => selectedProductIds.includes(p.id))}
                        onChange={toggleSelectAllModalProducts}
                        title="Select All Filtered"
                      />
                    </th>
                    <th style={{ padding: '10px 8px' }}>Barcode</th>
                    <th style={{ padding: '10px 8px' }}>User Barcode</th>
                    <th style={{ padding: '10px 8px' }}>Item Name</th>
                    <th style={{ padding: '10px 8px' }}>Brand</th>
                    <th style={{ padding: '10px 8px' }}>Category</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Purchase (LPP)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>MRP (Sale)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '70px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModalProducts.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No products found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredModalProducts.map(p => {
                      const isChecked = selectedProductIds.includes(p.id);
                      const brand = brandsList.find(b => b.id === p.brand_id)?.name || '-';
                      const cat = categoriesList.find(c => c.id === p.category_id)?.name || '-';
                      return (
                        <tr 
                          key={p.id} 
                          style={{ borderBottom: '1px solid #eee', backgroundColor: isChecked ? 'rgba(46, 111, 64, 0.08)' : 'inherit', cursor: 'pointer' }}
                          onClick={() => toggleSelectModalProduct(p.id)}
                        >
                          <td style={{ padding: '8px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => toggleSelectModalProduct(p.id)}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>{p.barcode || '-'}</td>
                          <td style={{ padding: '8px' }}>{p.user_define_barcode || p.code || '-'}</td>
                          <td style={{ padding: '8px', fontWeight: 600 }}>{p.item_name}</td>
                          <td style={{ padding: '8px' }}>{brand}</td>
                          <td style={{ padding: '8px' }}>{cat}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{p.purchase_price != null ? Number(p.purchase_price).toFixed(2) : '0.00'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: 'var(--accent-primary, #2e6f40)' }}>{p.mrp != null ? Number(p.mrp).toFixed(2) : '0.00'}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleApplySingleProductFromModal(p)}
                              style={{ padding: '3px 8px', backgroundColor: 'var(--accent-primary, #2e6f40)', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem' }}
                              title="Pick this single item to form inputs"
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Controls */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Selected: <span style={{ color: 'var(--accent-primary, #2e6f40)', fontSize: '1rem' }}>{selectedProductIds.length}</span> / {filteredModalProducts.length}
                </span>

                {selectedProductIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Disc(%):</span>
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        step="any"
                        placeholder="%" 
                        value={modalDiscPct}
                        onChange={e => setModalDiscPct(e.target.value)}
                        style={{ width: '65px', padding: '4px 6px', fontSize: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '3px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Ven. Contri(%):</span>
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        step="any"
                        placeholder="%" 
                        value={modalVenPct}
                        onChange={e => setModalVenPct(e.target.value)}
                        style={{ width: '65px', padding: '4px 6px', fontSize: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '3px' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedProductIds.length > 0 && (
                  <button 
                    type="button"
                    onClick={handleAddSelectedFromModal}
                    style={{ padding: '7px 20px', backgroundColor: 'var(--accent-primary, #2e6f40)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  >
                    ✓ Add Selected ({selectedProductIds.length}) to Circular
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  style={{ padding: '7px 18px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
                >
                  Close
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};

// ================= PROMOTION LIST (MAIN PAGE) =================
const Promotion = () => {
  const { user } = useAuth();
  const [view, setView] = useState('list'); // list, add, edit
  const [promotions, setPromotions] = useState([]);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const actionDropdownRef = useRef(null);

  useEffect(() => {
    const handleActionClickOutside = (event) => {
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleActionClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleActionClickOutside);
    };
  }, []);
  
  const [statusModalPromo, setStatusModalPromo] = useState(null);
  const [tagModalPromo, setTagModalPromo] = useState(null);

  const handlePrintPromo = async (promo) => {
    try {
      toast.loading("Preparing PDF...", { id: "promo-pdf" });
      const { data: promoItems, error } = await supabase
        .from('promotion_items')
        .select('*')
        .eq('promotion_id', promo.id);
      if (error) throw error;

      // Extract barcodes / user_barcodes to fetch MRP
      const barcodes = [...new Set((promoItems || []).map(i => i.user_barcode || i.barcode).filter(Boolean))];
      let prodPriceMap = {};
      if (barcodes.length > 0) {
        try {
          const { data: prods } = await supabase
            .from('products')
            .select('barcode, user_define_barcode, code, mrp, purchase_price')
            .in('barcode', barcodes);
          if (prods) {
            prods.forEach(p => {
              if (p.barcode) prodPriceMap[p.barcode] = p.mrp;
              if (p.user_define_barcode) prodPriceMap[p.user_define_barcode] = p.mrp;
              if (p.code) prodPriceMap[p.code] = p.mrp;
            });
          }
        } catch (e) {
          console.warn("Could not load MRP for promo items", e);
        }
      }

      let itemsBuy = [];
      let itemsGet = [];
      let circularItems = [];
      let couponItems = [];

      if (promo.promotion_type === 'Buy Get') {
        (promoItems || []).forEach(it => {
          const code = it.user_barcode || it.barcode || '';
          const mrpVal = prodPriceMap[code] || it.mrp || 0;
          const formatted = {
            barcode: code,
            name: it.description || it.item || '',
            mrp: mrpVal,
            quantity: it.quantity || 1
          };
          if (it.item_type === 'Get' || it.type === 'Get') itemsGet.push(formatted);
          else itemsBuy.push(formatted);
        });
      } else if (promo.promotion_type === 'Coupon') {
        couponItems = (promoItems || []).map(it => ({
          couponNo: it.coupon_no || promo.coupon_no,
          discPct: it.discount_percent || 0,
          discAmt: it.discount_amount || 0
        }));
      } else {
        circularItems = (promoItems || []).map((it, idx) => {
          const code = it.user_barcode || it.barcode || '';
          const mrpVal = prodPriceMap[code] || it.mrp || 0;
          return {
            sl: idx + 1,
            code: code,
            userBarcode: code,
            name: it.description || it.item || '',
            brand: it.brand || '',
            category: it.category || '',
            mrp: mrpVal,
            discountPct: it.discount_percent || 0,
            discAmt: it.discount_amount || 0,
            vendorContriPct: it.vendor_contribution_percent || 0,
            vendorContriAmt: it.vendor_contribution_amount || 0
          };
        });
      }

      generatePromotionPDF(promo, itemsBuy, itemsGet, circularItems, couponItems, user);
      toast.success("PDF Generated", { id: "promo-pdf" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF", { id: "promo-pdf" });
    }
  };

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
                    <div style={{ position: 'relative', display: 'inline-block' }} ref={activeDropdown === promo.id ? actionDropdownRef : null}>
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
                            style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '0.85rem' }}
                            onClick={() => { handlePrintPromo(promo); setActiveDropdown(null); }}
                          >
                            📄 Print / PDF
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
