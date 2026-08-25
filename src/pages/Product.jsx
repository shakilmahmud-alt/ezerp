import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Download, Edit, Loader, Upload, FileSpreadsheet, Check, AlertCircle, X, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext';

const initialFormState = {
  item_name: '',
  product_description: '',
  regional_name: '',
  category_id: '',
  subcategory_id: '',
  sub_subcategory_id: '',
  brand_id: '',
  country_of_origin: 'Bangladesh',
  user_define_barcode: '',
  vendor_id: '',
  is_active: true,
  disc_exemption: false,
  member_point_exemption: false,
  
  gp_on_mrp: false,
  gp_on_cost: false,
  price_including_vat: true,
  
  sdc_vat_code: '10140445',
  sale_vat_percent: '7.5',
  retailer_service_type: "Readymade Graments (Other's Brand) : 7.5",
  
  purchase_price: '',
  mrp: '',
  wsp: '0',
  profit_on_tp: '',
  profit_on_mrp: ''
};

// Section Box Wrapper
const SectionWrapper = ({ title, children }) => (
  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', backgroundColor: 'rgba(0, 0, 0, 0.01)', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
    {title && (
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
      </div>
    )}
    {children}
  </div>
);

const Product = () => {
  const { hasEditPermission } = useAuth();
  const canEdit = hasEditPermission('Product');
  const [isAdding, setIsAdding] = useState(false);
  const [products, setProducts] = useState([]);
  
  // Dropdown Data
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subSubcategories, setSubSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBrand, setSearchBrand] = useState('');
  const [orderBy, setOrderBy] = useState('Most Recent Added Last');
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('productFormCache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.sdc_vat_code) parsed.sdc_vat_code = '10140445';
        return parsed;
      } catch (e) {
        return initialFormState;
      }
    }
    return initialFormState;
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!editingId) {
      localStorage.setItem('productFormCache', JSON.stringify(formData));
    }
  }, [formData, editingId]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  // Quick Add Brand State
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [isSavingBrand, setIsSavingBrand] = useState(false);

  // Bulk Import State
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportRows, setBulkImportRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, statusText: '' });

  // Download Sample Template for Bulk Import
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Item Name': 'Basketball (RI 24588) Pcs',
        'Category': 'Toys',
        'Sub Category': 'Outdoor Game',
        'Sub Subcategory': 'Football',
        'Brand': 'LIONEL SPORTS',
        'Country of Origin': 'China',
        'User Define Barcode': '',
        'Vendor': 'Radiant',
        'SDC VAT CODE': '10140445',
        'Sale VAT(%)': '7.50%',
        'Purchase Price *': 350,
        'MRP *': 590
      },
      {
        'Item Name': 'Football 15CM (RI 6936088) Pcs',
        'Category': 'Toys',
        'Sub Category': 'Outdoor Game',
        'Sub Subcategory': 'Football',
        'Brand': 'LIONEL SPORTS',
        'Country of Origin': 'China',
        'User Define Barcode': '',
        'Vendor': 'Radiant',
        'SDC VAT CODE': '10140445',
        'Sale VAT(%)': '7.50%',
        'Purchase Price *': 350,
        'MRP *': 590
      },
      {
        'Item Name': 'LE Hot Wheels Basic Car (C4982) Pcs',
        'Category': 'Toys',
        'Sub Category': 'Outdoor Game',
        'Sub Subcategory': 'Hot Wheel',
        'Brand': 'LIONEL SPORTS',
        'Country of Origin': 'China',
        'User Define Barcode': '',
        'Vendor': 'Radiant',
        'SDC VAT CODE': '10140445',
        'Sale VAT(%)': '7.50%',
        'Purchase Price *': 350,
        'MRP *': 590
      },
      {
        'Item Name': 'Baby 2 Pcs Rattle Toy (RI JK8821) Pcs',
        'Category': 'Toys',
        'Sub Category': 'Outdoor Game',
        'Sub Subcategory': 'Hot Wheel',
        'Brand': 'JACKY BABY',
        'Country of Origin': 'China',
        'User Define Barcode': '',
        'Vendor': 'Radiant',
        'SDC VAT CODE': '10140445',
        'Sale VAT(%)': '7.50%',
        'Purchase Price *': 350,
        'MRP *': 590
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Product_Template');
    XLSX.writeFile(wb, 'Product_Bulk_Import_Template.xlsx');
    toast.success('Sample import template downloaded!');
  };

  // Helper: Normalize object keys for fuzzy header matching
  const cleanHeaderKey = (str) => String(str || '').trim().toLowerCase().replace(/[\*\_\-\s\(\)\%\:\.\/\\\[\]]/g, '');

  const getFuzzyRowVal = (row, aliases) => {
    const rowKeys = Object.keys(row);
    // 1. Exact normalized match
    for (const k of rowKeys) {
      const ck = cleanHeaderKey(k);
      for (const a of aliases) {
        if (ck === cleanHeaderKey(a)) return row[k];
      }
    }
    // 2. Substring / contains match
    for (const k of rowKeys) {
      const ck = cleanHeaderKey(k);
      for (const a of aliases) {
        const ca = cleanHeaderKey(a);
        if (ca && (ck.includes(ca) || ca.includes(ck))) return row[k];
      }
    }
    return '';
  };

  const parseNumberSafe = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : num;
  };

  // Upload and Parse Excel / CSV File
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rawJson.length === 0) {
          toast.error('The uploaded file contains no data rows!');
          return;
        }

        // Base max SL from existing products
        const baseSl = products.length > 0 ? Math.max(...products.map(p => p.sl || 0)) : 0;

        const parsedRows = rawJson.map((row, idx) => {
          const itemName = String(getFuzzyRowVal(row, ['itemname', 'item_name', 'productname', 'product_name', 'item', 'product', 'name', 'title']) || '').trim();
          const categoryName = String(getFuzzyRowVal(row, ['category', 'categoryname', 'cat']) || '').trim();
          const subcategoryName = String(getFuzzyRowVal(row, ['subcategory', 'sub_category', 'sub category', 'subcat']) || '').trim();
          const subSubcategoryName = String(getFuzzyRowVal(row, ['subsubcategory', 'sub_subcategory', 'sub sub category', 'sub subcategory', 'subsubcat', 'subsub']) || '').trim();
          const brandName = String(getFuzzyRowVal(row, ['brand', 'brandname', 'brand_name']) || 'No Brand').trim() || 'No Brand';
          const countryOfOrigin = String(getFuzzyRowVal(row, ['countryoforigin', 'country_of_origin', 'country', 'origin']) || 'China').trim() || 'China';
          const vendorName = String(getFuzzyRowVal(row, ['vendor', 'vendorname', 'supplier', 'vendor_name']) || '').trim();
          const sdcVatCode = String(getFuzzyRowVal(row, ['sdcvatcode', 'sdc_vat_code', 'sdcvat', 'sdc', 'sdccode']) || '10140445').trim() || '10140445';
          
          const rawSaleVat = getFuzzyRowVal(row, ['salevat', 'sale_vat_percent', 'sale_vat', 'vat', 'salevat%']);
          const saleVatPercent = parseNumberSafe(rawSaleVat) || 7.5;

          const purPrice = parseNumberSafe(getFuzzyRowVal(row, ['purchaseprice', 'purchase_price', 'purprice', 'costprice', 'cpu', 'buyprice', 'tp', 'cost']));
          const mrpVal = parseNumberSafe(getFuzzyRowVal(row, ['mrp', 'salesprice', 'saleprice', 'retailprice', 'sellingprice', 'price']));

          const profitOnTp = purPrice > 0 ? (((mrpVal - purPrice) / purPrice) * 100).toFixed(2) : '0.00';
          const profitOnMrp = mrpVal > 0 ? (((mrpVal - purPrice) / mrpVal) * 100).toFixed(2) : '0.00';

          const nextSl = baseSl + idx + 1;
          const autoCode = `A${String(nextSl).padStart(6, '0')}`;
          const autoBarcode = `10011${String(nextSl).padStart(5, '0')}`;
          const rawUserBarcode = String(getFuzzyRowVal(row, ['userdefinebarcode', 'user_define_barcode', 'userbarcode', 'barcode']) || '').trim();
          const finalBarcode = rawUserBarcode || autoBarcode;

          return {
            sl: nextSl,
            code: autoCode,
            barcode: finalBarcode,
            user_define_barcode: finalBarcode,
            item_name: itemName,
            categoryName: categoryName,
            subcategoryName: subcategoryName,
            subSubcategoryName: subSubcategoryName,
            brandName: brandName,
            vendorName: vendorName,
            country_of_origin: countryOfOrigin,
            sdc_vat_code: sdcVatCode,
            sale_vat_percent: saleVatPercent,
            retailer_service_type: "Readymade Graments (Other's Brand) : 7.5",
            purchase_price: purPrice,
            mrp: mrpVal,
            wsp: 0,
            profit_on_tp: profitOnTp,
            profit_on_mrp: profitOnMrp,
            product_description: 'Pcs',
            regional_name: '',
            is_active: true,
            status: 'ACTIVE',
            disc_exemption: false,
            member_point_exemption: false,
            gp_on_mrp: false,
            gp_on_cost: false,
            price_including_vat: true,
            wh_stock: 0,
            str_stock: 0
          };
        }).filter(r => r.item_name || r.purchase_price > 0 || r.mrp > 0);

        setBulkImportRows(parsedRows);
        setShowBulkImportModal(true);
        toast.success(`Loaded ${parsedRows.length} products for import review`);
      } catch (err) {
        console.error('Error reading excel:', err);
        toast.error('Failed to parse file. Please check Excel format!');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleRemoveBulkRow = (idx) => {
    setBulkImportRows(prev => prev.filter((_, i) => i !== idx));
  };

  // Save All Imported Products to Database (with Auto Entity Resolution & Persistence)
  const handleSaveBulkImport = async () => {
    if (bulkImportRows.length === 0) return;
    setIsImporting(true);
    setImportProgress({ current: 0, total: bulkImportRows.length, statusText: 'Resolving categories, brands and vendors...' });

    try {
      // 1. Fetch latest lookups from DB
      const [catRes, subcatRes, subsubRes, brandRes, vendorRes, maxProductSlRes] = await Promise.all([
        supabase.from('categories').select('id, name, sl, code'),
        supabase.from('subcategories').select('id, name, category_name, sl, code'),
        supabase.from('sub_subcategories').select('id, name, subcategory_name, category_name, sl, code'),
        supabase.from('brands').select('id, name, sl, code'),
        supabase.from('vendors').select('id, name, sl, code'),
        supabase.from('products').select('sl').order('sl', { ascending: false }).limit(1)
      ]);

      let existingCategories = [...(catRes.data || [])];
      let existingSubcategories = [...(subcatRes.data || [])];
      let existingSubSubcategories = [...(subsubRes.data || [])];
      let existingBrands = [...(brandRes.data || [])];
      let existingVendors = [...(vendorRes.data || [])];

      let baseSl = maxProductSlRes.data && maxProductSlRes.data.length > 0 ? (maxProductSlRes.data[0].sl || 0) : 0;

      // 2. Resolve / Auto-create Categories
      const uniqueCatNames = [...new Set(bulkImportRows.map(r => r.categoryName).filter(Boolean))];
      for (const cName of uniqueCatNames) {
        const found = existingCategories.find(c => c.name?.trim().toLowerCase() === cName.trim().toLowerCase());
        if (!found) {
          const nextCatSl = existingCategories.length > 0 ? Math.max(...existingCategories.map(c => c.sl || 0)) + 1 : 1;
          const nextCatCode = `00${nextCatSl}`;
          const { data: newCat, error: cErr } = await supabase.from('categories').insert([{
            sl: nextCatSl,
            code: nextCatCode,
            name: cName,
            description: '',
            vat: '7.5'
          }]).select().single();
          if (cErr) throw cErr;
          existingCategories.push(newCat);
        }
      }

      // 3. Resolve / Auto-create Subcategories
      const uniqueSubcats = [...new Map(bulkImportRows.map(r => [`${r.categoryName}__${r.subcategoryName}`, r])).values()].filter(r => r.subcategoryName);
      for (const item of uniqueSubcats) {
        const found = existingSubcategories.find(sc => sc.name?.trim().toLowerCase() === item.subcategoryName.trim().toLowerCase());
        if (!found) {
          const nextSubcatSl = existingSubcategories.length > 0 ? Math.max(...existingSubcategories.map(sc => sc.sl || 0)) + 1 : 1;
          const nextSubcatCode = `0020${String(nextSubcatSl).padStart(3, '0')}`;
          const { data: newSubcat, error: scErr } = await supabase.from('subcategories').insert([{
            sl: nextSubcatSl,
            code: nextSubcatCode,
            name: item.subcategoryName,
            category_name: item.categoryName || '',
            description: ''
          }]).select().single();
          if (scErr) throw scErr;
          existingSubcategories.push(newSubcat);
        }
      }

      // 4. Resolve / Auto-create Sub-Subcategories
      const uniqueSubSubcats = [...new Map(bulkImportRows.map(r => [`${r.subcategoryName}__${r.subSubcategoryName}`, r])).values()].filter(r => r.subSubcategoryName);
      for (const item of uniqueSubSubcats) {
        const found = existingSubSubcategories.find(ssc => ssc.name?.trim().toLowerCase() === item.subSubcategoryName.trim().toLowerCase());
        if (!found) {
          const nextSscSl = existingSubSubcategories.length > 0 ? Math.max(...existingSubSubcategories.map(ssc => ssc.sl || 0)) + 1 : 1;
          const nextSscCode = `00200${String(nextSscSl).padStart(4, '0')}`;
          const { data: newSsc, error: sscErr } = await supabase.from('sub_subcategories').insert([{
            sl: nextSscSl,
            code: nextSscCode,
            name: item.subSubcategoryName,
            subcategory_name: item.subcategoryName || '',
            category_name: item.categoryName || '',
            description: ''
          }]).select().single();
          if (sscErr) throw sscErr;
          existingSubSubcategories.push(newSsc);
        }
      }

      // 5. Resolve / Auto-create Brands
      const uniqueBrandNames = [...new Set(bulkImportRows.map(r => r.brandName).filter(Boolean))];
      for (const bName of uniqueBrandNames) {
        const found = existingBrands.find(b => b.name?.trim().toLowerCase() === bName.trim().toLowerCase());
        if (!found) {
          const nextBrandSl = existingBrands.length > 0 ? Math.max(...existingBrands.map(b => b.sl || 0)) + 1 : 1;
          const nextBrandCode = `00${String(nextBrandSl).padStart(2, '0')}`;
          const { data: newBrand, error: bErr } = await supabase.from('brands').insert([{
            sl: nextBrandSl,
            code: nextBrandCode,
            name: bName,
            description: ''
          }]).select().single();
          if (bErr) throw bErr;
          existingBrands.push(newBrand);
        }
      }

      // 6. Resolve / Auto-create Vendors
      const uniqueVendorNames = [...new Set(bulkImportRows.map(r => r.vendorName).filter(Boolean))];
      for (const vName of uniqueVendorNames) {
        const found = existingVendors.find(v => v.name?.trim().toLowerCase() === vName.trim().toLowerCase());
        if (!found) {
          const nextVendorSl = existingVendors.length > 0 ? Math.max(...existingVendors.map(v => v.sl || 0)) + 1 : 1;
          const nextVendorCode = `100${nextVendorSl}`;
          const { data: newVendor, error: vErr } = await supabase.from('vendors').insert([{
            sl: nextVendorSl,
            code: nextVendorCode,
            name: vName,
            address: '',
            postal_code: '',
            city: '',
            country: 'Bangladesh',
            contact_no: '',
            email: '',
            website: '',
            store_can_receive: false,
            vendor_type: 'Local',
            owner_partner: 'Owner',
            vat_registered: false,
            vat_registration_no: '',
            nid: '',
            tin: '',
            turnover_company: false,
            regular_contact: { name: '', designation: '', cell: '', email: '' },
            management_contact: { name: '', designation: '', cell: '', email: '' },
            marketing_contact: { name: '', designation: '', cell: '', email: '' },
            financial_contact: { name: '', designation: '', cell: '', email: '' },
            trading_info: { same_as_reg: false, name: vName, address: '', postal_code: '', city: '', country: 'Bangladesh', contact_no: '', email: '', website: '', member_director: 'Member' },
            contract_details: {
              date_of_enrollment: new Date().toISOString().split('T')[0],
              manage_stock: 'Yes',
              gross_margin_on: '',
              margin_rate: '',
              payment_terms: '',
              commission_percent: '',
              supply_schedule: '',
              delivery_days: '',
              transport_mode: '',
              price_change_notice_days: '',
              special_discount_type: '',
              special_discount_percent: ''
            },
            bank_info: { bank_name: '', branch_name: '', routing_no: '', account_name: '', account_number: '' },
            adjust_specify: { damage: '', slow_moving: '', short_dated: '', expire_product: '' },
            status: 'ACTIVE'
          }]).select().single();
          if (vErr) throw vErr;
          existingVendors.push(newVendor);
        }
      }

      // 7. Prepare Products Payload with resolved foreign keys
      setImportProgress({ current: 0, total: bulkImportRows.length, statusText: 'Saving products into database...' });

      const productsToInsert = bulkImportRows.map((row, idx) => {
        const catObj = existingCategories.find(c => c.name?.trim().toLowerCase() === row.categoryName?.trim().toLowerCase());
        const subcatObj = existingSubcategories.find(sc => sc.name?.trim().toLowerCase() === row.subcategoryName?.trim().toLowerCase());
        const subsubObj = existingSubSubcategories.find(ssc => ssc.name?.trim().toLowerCase() === row.subSubcategoryName?.trim().toLowerCase());
        const brandObj = existingBrands.find(b => b.name?.trim().toLowerCase() === row.brandName?.trim().toLowerCase());
        const vendorObj = existingVendors.find(v => v.name?.trim().toLowerCase() === row.vendorName?.trim().toLowerCase());

        const nextSl = baseSl + idx + 1;
        const autoCode = `A${String(nextSl).padStart(6, '0')}`;
        const autoBarcode = `10011${String(nextSl).padStart(5, '0')}`;
        const finalBarcode = row.user_define_barcode || autoBarcode;

        return {
          sl: nextSl,
          code: autoCode,
          barcode: finalBarcode,
          user_define_barcode: finalBarcode,
          item_name: row.item_name,
          category_id: catObj ? catObj.id : null,
          subcategory_id: subcatObj ? subcatObj.id : null,
          sub_subcategory_id: subsubObj ? subsubObj.id : null,
          brand_id: brandObj ? brandObj.id : null,
          vendor_id: vendorObj ? vendorObj.id : null,
          country_of_origin: row.country_of_origin || 'China',
          sdc_vat_code: row.sdc_vat_code || '10140445',
          sale_vat_percent: row.sale_vat_percent || 7.5,
          retailer_service_type: "Readymade Graments (Other's Brand) : 7.5",
          purchase_price: row.purchase_price || 0,
          mrp: row.mrp || 0,
          wsp: 0,
          profit_on_tp: row.profit_on_tp || '0.00',
          profit_on_mrp: row.profit_on_mrp || '0.00',
          product_description: row.product_description || 'Pcs',
          regional_name: row.regional_name || '',
          is_active: true,
          status: 'ACTIVE',
          disc_exemption: false,
          member_point_exemption: false,
          gp_on_mrp: false,
          gp_on_cost: false,
          price_including_vat: true,
          wh_stock: 0,
          str_stock: 0
        };
      });

      // 8. Insert in batches of 50
      const chunkSize = 50;
      for (let i = 0; i < productsToInsert.length; i += chunkSize) {
        const chunk = productsToInsert.slice(i, i + chunkSize);
        const { error: insertErr } = await supabase.from('products').insert(chunk);
        if (insertErr) throw insertErr;
        setImportProgress({ 
          current: Math.min(i + chunkSize, productsToInsert.length), 
          total: productsToInsert.length, 
          statusText: `Saved ${Math.min(i + chunkSize, productsToInsert.length)} of ${productsToInsert.length} products...` 
        });
      }

      toast.success(`Successfully imported ${productsToInsert.length} products into the database!`);
      setShowBulkImportModal(false);
      setBulkImportRows([]);
      await Promise.all([fetchProducts(), fetchDropdownData()]);

    } catch (err) {
      console.error('Error during bulk product import:', err);
      toast.error(`Import failed: ${err.message || 'Unknown database error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const renderBulkImportModal = () => {
    if (!showBulkImportModal) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
        <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '8px', width: '95%', maxWidth: '1400px', height: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
          
          {/* Modal Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet color="#2e6f40" size={22} />
                Bulk Product Import Preview
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                Review and confirm items before saving. Auto-sequential barcodes, retailer service type, and profit percentages have been computed.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                type="button"
                onClick={handleDownloadSampleExcel}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, color: '#334155' }}
              >
                <Download size={14} color="#2e6f40" />
                Template
              </button>

              <label 
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, color: '#0284c7' }}
              >
                <Upload size={14} />
                Upload Another File
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>

              <X 
                size={22} 
                style={{ cursor: 'pointer', color: '#64748b', marginLeft: '10px' }} 
                onClick={() => !isImporting && setShowBulkImportModal(false)} 
              />
            </div>
          </div>

          {/* Statistics Banner */}
          <div style={{ padding: '10px 20px', backgroundColor: '#e2f5ea', borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <span>📦 Total Products Parsed: {bulkImportRows.length}</span>
              <span>🏷️ Auto Barcodes Assigned: 10011XXXXX</span>
              <span>💼 Service Type: Readymade Garments (7.5%)</span>
              <span>💰 WSP: 0</span>
            </div>
            {isImporting && (
              <div style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Loader size={14} className="animate-spin" />
                {importProgress.statusText}
              </div>
            )}
          </div>

          {/* Preview Table */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'center', width: '40px' }}>#</th>
                  <th style={{ padding: '10px 8px' }}>Barcode</th>
                  <th style={{ padding: '10px 8px' }}>Item Name</th>
                  <th style={{ padding: '10px 8px' }}>Category</th>
                  <th style={{ padding: '10px 8px' }}>Sub Category</th>
                  <th style={{ padding: '10px 8px' }}>Sub Subcategory</th>
                  <th style={{ padding: '10px 8px' }}>Brand</th>
                  <th style={{ padding: '10px 8px' }}>Vendor</th>
                  <th style={{ padding: '10px 8px' }}>Origin</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Pur. Price</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>MRP</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Profit % (TP)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Profit % (MRP)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {bulkImportRows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#2e6f40', fontFamily: 'monospace' }}>{row.barcode}</td>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>{row.item_name}</td>
                    <td style={{ padding: '8px' }}>{row.categoryName || '-'}</td>
                    <td style={{ padding: '8px' }}>{row.subcategoryName || '-'}</td>
                    <td style={{ padding: '8px' }}>{row.subSubcategoryName || '-'}</td>
                    <td style={{ padding: '8px' }}>{row.brandName || 'No Brand'}</td>
                    <td style={{ padding: '8px' }}>{row.vendorName || '-'}</td>
                    <td style={{ padding: '8px' }}>{row.country_of_origin}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500 }}>৳ {Number(row.purchase_price).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>৳ {Number(row.mrp).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 600, fontSize: '0.75rem' }}>
                        {row.profit_on_tp}%
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 600, fontSize: '0.75rem' }}>
                        {row.profit_on_mrp}%
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <Trash2 
                        size={15} 
                        color="#ef4444" 
                        style={{ cursor: 'pointer' }} 
                        title="Remove item" 
                        onClick={() => handleRemoveBulkRow(idx)} 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal Footer */}
          <div style={{ padding: '15px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Ready to save <strong style={{ color: '#0f172a' }}>{bulkImportRows.length}</strong> products into Central Store database.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                className="btn-danger" 
                onClick={() => setShowBulkImportModal(false)}
                disabled={isImporting}
                style={{ padding: '8px 20px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>

              <button 
                type="button" 
                className="btn-theme" 
                onClick={handleSaveBulkImport}
                disabled={isImporting || bulkImportRows.length === 0}
                style={{ 
                  padding: '8px 24px', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  backgroundColor: '#2e6f40',
                  color: '#fff',
                  boxShadow: '0 2px 6px rgba(46, 111, 64, 0.3)'
                }}
              >
                {isImporting ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Saving to Database...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Save All to Database ({bulkImportRows.length})
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const location = useLocation();

  useEffect(() => {
    setIsAdding(false);
    setEditingId(null);
    setErrorMsg('');
  }, [location.key]);

  useEffect(() => {
    fetchProducts();
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [catRes, subcatRes, subsubRes, brandRes, vendorRes] = await Promise.all([
        supabase.from('categories').select('id, name'),
        supabase.from('subcategories').select('id, name, category_name'),
        supabase.from('sub_subcategories').select('id, name, subcategory_name'),
        supabase.from('brands').select('id, name, sl, code'),
        supabase.from('vendors').select('id, name')
      ]);
      
      setCategories(catRes.data || []);
      setSubcategories(subcatRes.data || []);
      setSubSubcategories(subsubRes.data || []);
      setBrands(brandRes.data || []);
      setVendors(vendorRes.data || []);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name),
          subcategory:subcategories(name),
          sub_subcategory:sub_subcategories(name),
          brand:brands(name),
          vendor:vendors(name)
        `);
        
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMsg(`Supabase Error: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    // All Layer Search (checks every column, attribute, and nested relation)
    if (searchTerm.trim()) {
      const searchTokens = searchTerm.trim().toLowerCase().split(/\s+/);
      const fullProductContent = [
        p.item_name,
        p.code,
        p.barcode,
        p.user_define_barcode,
        p.category?.name,
        p.subcategory?.name,
        p.sub_subcategory?.name,
        p.brand?.name,
        p.vendor?.name,
        p.country_of_origin,
        p.sdc_vat_code,
        p.retailer_service_type,
        p.purchase_price,
        p.mrp,
        p.wsp,
        p.sale_vat_percent,
        p.profit_on_tp,
        p.profit_on_mrp,
        p.status,
        p.product_description,
        p.regional_name
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesAllTokens = searchTokens.every(token => fullProductContent.includes(token));
      if (!matchesAllTokens) return false;
    }

    // Brand Search Filter
    if (searchBrand.trim()) {
      const brandQuery = searchBrand.trim().toLowerCase();
      const brandName = (p.brand?.name || '').toLowerCase();
      if (!brandName.includes(brandQuery)) return false;
    }

    return true;
  });

  // Sorting Logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (orderBy) {
      case 'Most Recent Added Last':
        return (a.sl || 0) - (b.sl || 0); // Assuming higher SL means added later
      case 'Most Recent Added First':
        return (b.sl || 0) - (a.sl || 0);
      case 'MRP Ascending':
        return (a.mrp || 0) - (b.mrp || 0);
      case 'MRP Descending':
        return (b.mrp || 0) - (a.mrp || 0);
      // Fallback
      default:
        return (a.sl || 0) - (b.sl || 0);
    }
  });
  
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const paginatedProducts = sortedProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAddOrUpdate = async () => {
    if (!formData.item_name || !formData.category_id || !formData.subcategory_id || !formData.sub_subcategory_id || !formData.brand_id || !formData.purchase_price || !formData.mrp) {
      setErrorMsg('Please fill in all required fields (*).');
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const newSl = products.length > 0 ? Math.max(...products.map(p => p.sl || 0)) + 1 : 1;
        const newCode = `A${String(newSl).padStart(6, '0')}`;
        const newBarcode = `10359${String(newSl).padStart(5, '0')}`; // Auto generated mockup
        
        const { error } = await supabase
          .from('products')
          .insert([{ ...formData, sl: newSl, code: newCode, barcode: formData.user_define_barcode || newBarcode }]);
          
        if (error) throw error;
      }
      
      await fetchProducts();
      setFormData(initialFormState);
      localStorage.removeItem('productFormCache');
      setEditingId(null);
      setIsAdding(false);
    } catch (error) {
      console.error('Error saving product:', error);
      setErrorMsg(`Supabase Error: ${error.message || JSON.stringify(error)}`);
      setIsLoading(false);
    }
  };

  const handleAddNewBrand = async () => {
    if (!newBrandName.trim()) return;
    setIsSavingBrand(true);
    try {
      const newSl = brands.length > 0 ? Math.max(...brands.map(b => b.sl || 0)) + 1 : 1;
      const newCode = `00${newSl.toString().padStart(2, '0')}`;
      
      const { data, error } = await supabase
        .from('brands')
        .insert([{ 
          sl: newSl, 
          code: newCode, 
          name: newBrandName, 
          description: ''
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      const updatedBrands = [...brands, data];
      setBrands(updatedBrands);
      setFormData({ ...formData, brand_id: data.id });
      setShowBrandModal(false);
      setNewBrandName('');
      toast.success('Brand added successfully!');
    } catch (error) {
      console.error('Error adding brand:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSavingBrand(false);
    }
  };

  const handleEdit = (product) => {
    setFormData({ 
      ...initialFormState, 
      ...product,
      sdc_vat_code: product.sdc_vat_code || '10140445'
    });
    setEditingId(product.id);
    setIsAdding(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
      setErrorMsg(`Error deleting product: ${error.message}`);
    }
  };

  const toggleStatus = async (product) => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', product.id);

      if (error) throw error;
      setProducts(products.map(p => p.id === product.id ? { ...p, status: newStatus } : p));
    } catch (error) {
      console.error('Error updating status:', error);
      setErrorMsg(`Error updating status: ${error.message}`);
    }
  };

  if (!isAdding) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-primary)' }}>
        {errorMsg && (
          <div style={{ padding: '15px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', marginBottom: '20px', borderRadius: '4px', border: '1px solid var(--danger)' }}>
            {errorMsg}
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'var(--card-bg)', padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Product List</h2>
            {isLoading && <Loader className="animate-spin" size={20} color="var(--text-secondary)" />}
          </div>
          {canEdit && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Download Sample Template */}
              <button 
                type="button"
                onClick={handleDownloadSampleExcel}
                title="Download sample Excel template matching the required import format"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '7px 14px', 
                  borderRadius: '4px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                <Download size={15} color="#2e6f40" />
                Template
              </button>

              {/* Bulk Import Button */}
              <label 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  cursor: 'pointer', 
                  padding: '7px 16px', 
                  borderRadius: '4px',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
                }}
              >
                <Upload size={15} />
                Bulk Import
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                />
              </label>

              {/* Add New Button */}
              <button 
                className="btn btn-primary btn-theme" 
                onClick={() => {
                  const nextSl = products.length > 0 ? Math.max(...products.map(p => p.sl || 0)) + 1 : 1;
                  const nextBarcode = `10011${String(nextSl).padStart(5, '0')}`;
                  
                  const saved = localStorage.getItem('productFormCache');
                  let cachedData = initialFormState;
                  if (saved) {
                    try { cachedData = JSON.parse(saved); } catch(e) {}
                  }
                  
                  setFormData({...cachedData, user_define_barcode: nextBarcode});
                  setEditingId(null);
                  setIsAdding(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 16px', fontSize: '0.85rem' }}
              >
                <Plus size={16} /> Add New
              </button>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
          
          {/* Top Filters Row */}
          <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>Order By</label>
              <CustomSelect 
                className="input-animated"
                value={orderBy}
                onChange={(e) => { setOrderBy(e.target.value); setCurrentPage(1); }}
                style={{ width: '250px' }}
              >
                <option value="Most Recent Added Last">Most Recent Added Last</option>
                <option value="Most Recent Added First">Most Recent Added First</option>
                <option value="Most Recent Updated Last">Most Recent Updated Last</option>
                <option value="Most Recent Updated First">Most Recent Updated First</option>
                <option value="MRP Ascending">MRP Ascending</option>
                <option value="MRP Descending">MRP Descending</option>
              </CustomSelect>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
               <input 
                 type="text" 
                 placeholder="All Layer Search" 
                 value={searchTerm}
                 onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                 className="input-animated"
                 style={{ width: '200px' }}
               />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
               <input 
                 type="text" 
                 placeholder="Search By Brand" 
                 value={searchBrand}
                 onChange={(e) => { setSearchBrand(e.target.value); setCurrentPage(1); }}
                 className="input-animated"
                 style={{ width: '200px' }}
               />
            </div>
            
            <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: '0.85rem' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Last Barcode</div>
              <div>{products.length > 0 ? products[products.length - 1].code : 'N/A'}</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>SL</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Code</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Barcode</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Item Name</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Category</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Sub Category</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Sub Subcategory</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Brand</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Vendor</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Entry By</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>SD(%)</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>VAT(%)</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>CPU</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>MRP</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>WSP</th>
                  {canEdit && <th style={{ textAlign: 'center', padding: '12px', fontWeight: 600 }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading && products.length === 0 ? (
                  <tr>
                    <td colSpan="17" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Loading...
                    </td>
                  </tr>
                ) : paginatedProducts.length > 0 ? (
                  paginatedProducts.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px' }}>{p.sl}</td>
                      <td style={{ padding: '12px' }}>{p.code}</td>
                      <td style={{ padding: '12px' }}>{p.barcode}</td>
                      <td style={{ padding: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.item_name}</td>
                      <td style={{ padding: '12px' }}>{p.category?.name}</td>
                      <td style={{ padding: '12px' }}>{p.subcategory?.name}</td>
                      <td style={{ padding: '12px' }}>{p.sub_subcategory?.name}</td>
                      <td style={{ padding: '12px' }}>{p.brand?.name}</td>
                      <td style={{ padding: '12px' }}>{p.vendor?.name}</td>
                      <td style={{ padding: '12px' }}>{p.status}</td>
                      <td style={{ padding: '12px' }}>{p.entry_by}</td>
                      <td style={{ padding: '12px' }}>0</td>
                      <td style={{ padding: '12px' }}>{p.sale_vat_percent}</td>
                      <td style={{ padding: '12px' }}>{p.purchase_price}</td>
                      <td style={{ padding: '12px' }}>{p.mrp}</td>
                      <td style={{ padding: '12px' }}>{p.wsp}</td>
                      {canEdit && (
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                           <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                             <button 
                                className="btn btn-primary btn-theme"
                                onClick={() => handleEdit(p)}
                                style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#fff' }}>
                                Edit
                             </button>
                             <button 
                                className="btn btn-danger"
                                onClick={() => handleDelete(p.id)}
                                style={{ padding: '4px 10px', fontSize: '0.8rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
                                Delete
                             </button>
                           </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="18" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '15px', display: 'flex', gap: '5px' }}>
            <button className="btn-theme" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || totalPages === 0}
              style={{ padding: '5px 10px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', color: (currentPage === 1 || totalPages === 0) ? 'var(--text-secondary)' : 'var(--text-primary)', borderRadius: '4px', cursor: (currentPage === 1 || totalPages === 0) ? 'not-allowed' : 'pointer' }}
            >«</button>
            {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(page => (
              <button className="btn-theme" 
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{ 
                  padding: '5px 10px', 
                  background: currentPage === page ? 'var(--accent-primary)' : 'rgba(0,0,0,0.02)', 
                  border: currentPage === page ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)', 
                  color: currentPage === page ? '#fff' : 'var(--text-primary)', 
                  borderRadius: '4px', 
                  fontWeight: currentPage === page ? 'bold' : 'normal',
                  cursor: 'pointer'
                }}
              >
                {page}
              </button>
            ))}
            <button className="btn-theme" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{ padding: '5px 10px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', color: (currentPage === totalPages || totalPages === 0) ? 'var(--text-secondary)' : 'var(--text-primary)', borderRadius: '4px', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}
            >»</button>
          </div>
        </div>

        {renderBulkImportModal()}
      </div>
    );
  }

  // --- Add/Edit Form Layout ---
  return (
    <div style={{ padding: '20px', color: 'var(--text-primary)' }}>
      {errorMsg && (
        <div style={{ padding: '15px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', marginBottom: '20px', borderRadius: '4px', border: '1px solid var(--danger)' }}>
          {errorMsg}
        </div>
      )}
      <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
        
        {/* Form Header */}
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{editingId ? 'Edit Product' : 'Add Product'}</h2>
        </div>
        
        {/* Simple Product / Barcode Display Row */}
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--accent-primary)' }}>
            <input type="radio" defaultChecked style={{ accentColor: 'var(--accent-primary)' }} />
            Simple Product
          </label>
          <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
            <div style={{ color: 'var(--text-secondary)' }}>Last Barcode</div>
            <div>{products.length > 0 ? products[products.length - 1].code : 'N/A'}</div>
          </div>
        </div>
        
        <div style={{ padding: '30px' }}>
          <form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            
            {/* Left Column (Basic Information) */}
            <div>
              <SectionWrapper title="Basic Information">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Item Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="input-animated" value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} disabled={isLoading} />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Category <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <CustomSelect className="input-animated" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value, subcategory_id: '', sub_subcategory_id: ''})} disabled={isLoading}>
                      <option value="">Select a Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </CustomSelect>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Sub Category <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <CustomSelect className="input-animated" value={formData.subcategory_id} onChange={e => setFormData({...formData, subcategory_id: e.target.value, sub_subcategory_id: ''})} disabled={isLoading || !formData.category_id}>
                      <option value="">Select a Sub Category</option>
                      {subcategories.filter(sc => sc.category_name === categories.find(c => c.id === formData.category_id)?.name).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                    </CustomSelect>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Sub Subcategory <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <CustomSelect className="input-animated" value={formData.sub_subcategory_id} onChange={e => setFormData({...formData, sub_subcategory_id: e.target.value})} disabled={isLoading || !formData.subcategory_id}>
                      <option value="">Select a Sub Subcategory</option>
                      {subSubcategories.filter(ssc => ssc.subcategory_name === subcategories.find(sc => sc.id === formData.subcategory_id)?.name).map(ssc => <option key={ssc.id} value={ssc.id}>{ssc.name}</option>)}
                    </CustomSelect>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Brand <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <CustomSelect className="input-animated" value={formData.brand_id} onChange={e => setFormData({...formData, brand_id: e.target.value})} disabled={isLoading}>
                        <option value="">Select a Brand</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </CustomSelect>
                    </div>
                    <button type="button" className="btn btn-primary btn-theme" style={{ padding: '8px 12px' }} onClick={() => setShowBrandModal(true)}>+</button>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Country of Origin</label>
                    <input type="text" className="input-animated" value={formData.country_of_origin} onChange={e => setFormData({...formData, country_of_origin: e.target.value})} disabled={isLoading} />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>User Define Barcode</label>
                    <input type="text" className="input-animated" placeholder="add a User Barcode..." value={formData.user_define_barcode} onChange={e => setFormData({...formData, user_define_barcode: e.target.value})} disabled={isLoading} readOnly style={{ backgroundColor: 'rgba(0,0,0,0.1)' }} />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Vendor</label>
                    <CustomSelect className="input-animated" value={formData.vendor_id} onChange={e => setFormData({...formData, vendor_id: e.target.value})} disabled={isLoading}>
                      <option value="">Select a Vendor</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </CustomSelect>
                  </div>

                  {/* Bottom Checkboxes */}
                  <div style={{ display: 'flex', marginTop: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: formData.is_active ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ accentColor: 'var(--accent-primary)' }} />
                      Active
                    </label>
                  </div>

                </div>
              </SectionWrapper>
            </div>

            {/* Right Column (Price Information & Stock Information) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <SectionWrapper title="Price Information">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: formData.price_including_vat ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    <input type="checkbox" checked={formData.price_including_vat} onChange={e => setFormData({...formData, price_including_vat: e.target.checked})} style={{ accentColor: 'var(--accent-primary)' }} />
                    Price Including VAT
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>SDC VAT CODE</label>
                      <input type="text" className="input-animated" value={formData.sdc_vat_code} onChange={e => setFormData({...formData, sdc_vat_code: e.target.value})} disabled={isLoading} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Sale VAT(%)</label>
                      <input type="number" className="input-animated" value={formData.sale_vat_percent} onChange={e => setFormData({...formData, sale_vat_percent: e.target.value})} disabled={isLoading} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px', color: 'var(--accent-primary)' }}>Retailer Service Type</label>
                    <CustomSelect className="input-animated" value={formData.retailer_service_type} onChange={e => setFormData({...formData, retailer_service_type: e.target.value})} disabled={isLoading}>
                      <option value="Readymade Graments (Other's Brand) : 7.5">Readymade Graments (Other's Brand) : 7.5</option>
                      <option value="Zero VAT % : 0">Zero VAT % : 0</option>
                    </CustomSelect>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Purchase Price <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="number" className="input-animated" value={formData.purchase_price} onChange={e => {
                      const newTp = e.target.value;
                      const tpVal = parseFloat(newTp) || 0;
                      const mrpVal = parseFloat(formData.mrp) || 0;
                      const p_tp = tpVal > 0 ? (((mrpVal - tpVal) / tpVal) * 100).toFixed(2) : '0.00';
                      const p_mrp = mrpVal > 0 ? (((mrpVal - tpVal) / mrpVal) * 100).toFixed(2) : '0.00';
                      setFormData({...formData, purchase_price: newTp, profit_on_tp: p_tp, profit_on_mrp: p_mrp});
                    }} disabled={isLoading} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>MRP <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="number" className="input-animated" value={formData.mrp} onChange={e => {
                        const newMrp = e.target.value;
                        const mrpVal = parseFloat(newMrp) || 0;
                        const tpVal = parseFloat(formData.purchase_price) || 0;
                        const p_tp = tpVal > 0 ? (((mrpVal - tpVal) / tpVal) * 100).toFixed(2) : '0.00';
                        const p_mrp = mrpVal > 0 ? (((mrpVal - tpVal) / mrpVal) * 100).toFixed(2) : '0.00';
                        setFormData({...formData, mrp: newMrp, profit_on_tp: p_tp, profit_on_mrp: p_mrp});
                      }} disabled={isLoading} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>WSP</label>
                      <input type="number" className="input-animated" value={formData.wsp} onChange={e => setFormData({...formData, wsp: e.target.value})} disabled={isLoading} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Profit(%) On TP</label>
                      <input type="number" className="input-animated" value={formData.profit_on_tp} readOnly disabled={isLoading} style={{ backgroundColor: 'rgba(0,0,0,0.1)' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Profit(%) On MRP</label>
                      <input type="number" className="input-animated" value={formData.profit_on_mrp} readOnly disabled={isLoading} style={{ backgroundColor: 'rgba(0,0,0,0.1)' }} />
                    </div>
                  </div>

                </div>
              </SectionWrapper>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button  
                type="button"
                className="btn-theme"
                onClick={handleAddOrUpdate}
                disabled={isLoading}
                style={{ padding: '8px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isLoading ? 'Saving...' : editingId ? 'Update' : 'Add'}
              </button>
              <button  
                type="button"
                className="btn-danger"
                onClick={() => {
                  setEditingId(null);
                  setIsAdding(false);
                  setErrorMsg('');
                }}
                disabled={isLoading}
                style={{ padding: '8px 30px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Brand Quick Add Modal */}
      {showBrandModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '25px', borderRadius: '8px', width: '400px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>Add New Brand</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px', color: 'var(--text-primary)' }}>Brand Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input 
                  type="text" 
                  className="input-animated" 
                  value={newBrandName} 
                  onChange={e => setNewBrandName(e.target.value)} 
                  disabled={isSavingBrand} 
                  autoFocus 
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button className="btn-danger" 
                  type="button" 
                  style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  onClick={() => { setShowBrandModal(false); setNewBrandName(''); }}
                  disabled={isSavingBrand}
                >
                  Cancel
                </button>
                <button className="btn-theme" 
                  type="button" 
                  style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={handleAddNewBrand}
                  disabled={isSavingBrand || !newBrandName.trim()}
                >
                  {isSavingBrand ? 'Saving...' : 'Save Brand'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {renderBulkImportModal()}

    </div>
  );
};

export default Product;
