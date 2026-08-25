import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import LoadingOverlay from '../components/LoadingOverlay';

const ProductQuickSearch = () => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subSubcategories, setSubSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [filters, setFilters] = useState({
    categoryId: '',
    subcategoryId: '',
    subSubcategoryId: '',
    brandId: '',
    vendorId: '',
    itemName: '',
    searchQuery: '',
    mrpOperator: '',
    mrpValue: '',
    cpuOperator: '',
    cpuValue: '',
    store: '',
    showZeroStock: false
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [catRes, subcatRes, subsubRes, brandRes, vendorRes, storeRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('subcategories').select('*').order('name'),
        supabase.from('sub_subcategories').select('*').order('name'),
        supabase.from('brands').select('*').order('name'),
        supabase.from('vendors').select('*').order('name'),
        supabase.from('stores').select('*').order('name')
      ]);
      
      setCategories(catRes.data || []);
      setSubcategories(subcatRes.data || []);
      setSubSubcategories(subsubRes.data || []);
      setBrands(brandRes.data || []);
      setVendors(vendorRes.data || []);
      setStores(storeRes.data || []);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:category_id (name),
          subcategory:subcategory_id (name),
          sub_subcategory:sub_subcategory_id (name),
          brand:brand_id (name),
          vendor:vendor_id (name),
          store_stocks ( store_id, stock_qty )
        `);

      if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
      if (filters.subcategoryId) query = query.eq('subcategory_id', filters.subcategoryId);
      if (filters.subSubcategoryId) query = query.eq('sub_subcategory_id', filters.subSubcategoryId);
      if (filters.brandId) query = query.eq('brand_id', filters.brandId);
      if (filters.vendorId) query = query.eq('vendor_id', filters.vendorId);
      
      if (filters.itemName) query = query.ilike('item_name', `%${filters.itemName}%`);
      if (filters.searchQuery) {
        query = query.or(`item_name.ilike.%${filters.searchQuery}%,code.ilike.%${filters.searchQuery}%,barcode.ilike.%${filters.searchQuery}%`);
      }
      
      if (!filters.showZeroStock) {
        // If a specific store is selected, we filter on-the-fly in JS below
        if (!filters.store) {
          query = query.or('wh_stock.gt.0,str_stock.gt.0');
        }
      }

      if (filters.mrpOperator && filters.mrpValue) {
        const val = parseFloat(filters.mrpValue);
        switch (filters.mrpOperator) {
          case 'EQUAL TO': query = query.eq('mrp', val); break;
          case 'GREATER THAN': query = query.gt('mrp', val); break;
          case 'GREATER OR EQUAL TO': query = query.gte('mrp', val); break;
          case 'LESS THAN': query = query.lt('mrp', val); break;
          case 'LESS OR EQUAL TO': query = query.lte('mrp', val); break;
          default: break;
        }
      }

      if (filters.cpuOperator && filters.cpuValue) {
        const val = parseFloat(filters.cpuValue);
        switch (filters.cpuOperator) {
          case 'EQUAL TO': query = query.eq('purchase_price', val); break;
          case 'GREATER THAN': query = query.gt('purchase_price', val); break;
          case 'GREATER OR EQUAL TO': query = query.gte('purchase_price', val); break;
          case 'LESS THAN': query = query.lt('purchase_price', val); break;
          case 'LESS OR EQUAL TO': query = query.lte('purchase_price', val); break;
          default: break;
        }
      }

      let { data, error } = await query;
      
      // Fallback: If backend returns error, query base products and filter client-side
      if (error) {
        console.warn("Retrying with simple query and client-side filtering:", error);
        const { data: allProds, error: fallbackError } = await supabase
          .from('products')
          .select('*, store_stocks(store_id, stock_qty)');
        if (fallbackError) throw fallbackError;

        let filtered = allProds || [];
        if (filters.categoryId) filtered = filtered.filter(p => String(p.category_id) === String(filters.categoryId));
        if (filters.subcategoryId) filtered = filtered.filter(p => String(p.subcategory_id) === String(filters.subcategoryId));
        if (filters.subSubcategoryId) filtered = filtered.filter(p => String(p.sub_subcategory_id) === String(filters.subSubcategoryId));
        if (filters.brandId) filtered = filtered.filter(p => String(p.brand_id) === String(filters.brandId));
        if (filters.vendorId) filtered = filtered.filter(p => String(p.vendor_id) === String(filters.vendorId));
        if (filters.itemName) filtered = filtered.filter(p => (p.item_name || '').toLowerCase().includes(filters.itemName.toLowerCase()));
        if (filters.searchQuery) {
          const sq = filters.searchQuery.toLowerCase();
          filtered = filtered.filter(p => 
            (p.item_name || '').toLowerCase().includes(sq) || 
            (p.code || '').toLowerCase().includes(sq) || 
            (p.barcode || '').toLowerCase().includes(sq)
          );
        }
        data = filtered;
      }

      // Attach category/brand labels if missing from nested joins
      if (data && data.length > 0) {
        data.forEach(p => {
          if (!p.category && p.category_id) p.category = categories.find(c => String(c.id) === String(p.category_id)) || null;
          if (!p.subcategory && p.subcategory_id) p.subcategory = subcategories.find(c => String(c.id) === String(p.subcategory_id)) || null;
          if (!p.sub_subcategory && p.sub_subcategory_id) p.sub_subcategory = subSubcategories.find(c => String(c.id) === String(p.sub_subcategory_id)) || null;
          if (!p.brand && p.brand_id) p.brand = brands.find(b => String(b.id) === String(p.brand_id)) || null;
          if (!p.vendor && p.vendor_id) p.vendor = vendors.find(v => String(v.id) === String(p.vendor_id)) || null;
        });
      }
      
      // Perform JS filtering for selected store stock
      if (filters.store && data) {
        if (filters.store === 'central_store') {
          if (!filters.showZeroStock) {
            data = data.filter(p => (p.wh_stock || 0) > 0);
          }
        } else {
          if (!filters.showZeroStock) {
            data = data.filter(p => {
              const qty = p.store_stocks?.find(s => s.store_id === filters.store)?.stock_qty || 0;
              return qty > 0;
            });
          }
        }
      }
      
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Error fetching products: " + (error?.message || 'Check database connection'));
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProfitTP = (product) => {
    const tp = parseFloat(product.purchase_price) || 0;
    const mrp = parseFloat(product.mrp) || 0;
    if (tp === 0) return 0;
    return (((mrp - tp) / tp) * 100).toFixed(2);
  };

  const calculateProfitMRP = (product) => {
    const tp = parseFloat(product.purchase_price) || 0;
    const mrp = parseFloat(product.mrp) || 0;
    if (mrp === 0) return 0;
    return (((mrp - tp) / mrp) * 100).toFixed(2);
  };

  const exportToExcel = () => {
    const exportData = products.map((p, index) => ({
      SL: index + 1,
      Code: p.code,
      'User Barcode': p.barcode,
      'Item Name': p.item_name,
      Category: p.category?.name || '',
      'Sub Category': p.subcategory?.name || '',
      'Sub Subcategory': p.sub_subcategory?.name || '',
      Brand: p.brand?.name || '',
      Vendor: p.vendor?.name || '',
      Status: p.status || 'Active',
      Stock: filters.store === 'central_store'
        ? (p.wh_stock || 0)
        : filters.store
          ? (p.store_stocks?.find(s => s.store_id === filters.store)?.stock_qty || 0)
          : (() => {
              const whStockText = (p.wh_stock || 0) > 0 ? [`${p.wh_stock} (Central Store)`] : [];
              const shopStocksText = p.store_stocks
                ?.filter(s => s.stock_qty > 0)
                ?.map(s => {
                  const storeName = stores.find(st => st.id === s.store_id)?.name || 'Store';
                  return `${s.stock_qty} (${storeName})`;
                }) || [];
              return [...whStockText, ...shopStocksText].join(', ') || '0';
            })(),
      'VAT(%)': p.sale_vat_percent || 0,
      CPU: p.purchase_price,
      MRP: p.mrp,
      'Profit(%) On TP': calculateProfitTP(p),
      'Profit(%) On MRP': calculateProfitMRP(p)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "Product_Search_List.xlsx");
  };

  const operatorOptions = [
    { value: '', label: '-- Select --' },
    { value: 'EQUAL TO', label: 'EQUAL TO' },
    { value: 'GREATER THAN', label: 'GREATER THAN' },
    { value: 'GREATER OR EQUAL TO', label: 'GREATER OR EQUAL TO' },
    { value: 'LESS THAN', label: 'LESS THAN' },
    { value: 'LESS OR EQUAL TO', label: 'LESS OR EQUAL TO' }
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)' }}>
      <LoadingOverlay isLoading={isLoading} message="Searching products... Please wait" />
      <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>Product Search</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Category</label>
            <CustomSelect name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </CustomSelect>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Sub Category</label>
            <CustomSelect name="subcategoryId" value={filters.subcategoryId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {subcategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </CustomSelect>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Sub Subcategory</label>
            <CustomSelect name="subSubcategoryId" value={filters.subSubcategoryId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {subSubcategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </CustomSelect>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Brand</label>
            <CustomSelect name="brandId" value={filters.brandId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {brands.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </CustomSelect>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Item Name</label>
            <input type="text" name="itemName" value={filters.itemName} onChange={handleFilterChange} className="input-animated" placeholder="-- ALL --" />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>MRP</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <CustomSelect name="mrpOperator" value={filters.mrpOperator} onChange={handleFilterChange} className="input-animated" style={{ flex: 1 }}>
                {operatorOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </CustomSelect>
              {filters.mrpOperator && (
                <input type="number" name="mrpValue" value={filters.mrpValue} onChange={handleFilterChange} className="input-animated" placeholder="Value" style={{ flex: 1 }} />
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>CPU</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <CustomSelect name="cpuOperator" value={filters.cpuOperator} onChange={handleFilterChange} className="input-animated" style={{ flex: 1 }}>
                {operatorOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </CustomSelect>
              {filters.cpuOperator && (
                <input type="number" name="cpuValue" value={filters.cpuValue} onChange={handleFilterChange} className="input-animated" placeholder="Value" style={{ flex: 1 }} />
              )}
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Store</label>
            <CustomSelect name="store" value={filters.store} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              <option value="central_store">Central Store</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </CustomSelect>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Vendor</label>
            <CustomSelect name="vendorId" value={filters.vendorId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {vendors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </CustomSelect>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
          <input 
            type="text" 
            name="searchQuery" 
            value={filters.searchQuery} 
            onChange={handleFilterChange} 
            className="input-animated" 
            placeholder="Search" 
            style={{ flex: 1 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input type="checkbox" name="showZeroStock" checked={filters.showZeroStock} onChange={handleFilterChange} />
            Show store with zero stock
          </label>
          <button className="btn-theme" 
            onClick={handleSearch} 
            disabled={isLoading}
            style={{ padding: '10px 30px', backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLoading ? 'Searching...' : 'Show'}
          </button>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <button className="btn-info" 
            onClick={exportToExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <Download size={16} /> Preview In Excel
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>SL</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}><input type="checkbox" /></th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Code</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>User Barcode</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Item Name</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Category</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Sub Category</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Sub Subcategory</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Brand</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Vendor</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Stock</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>VAT(%)</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>CPU</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>MRP</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Profit(%) On TP</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Profit(%) On MRP</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan="16" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Loading...
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px' }}>{i + 1}</td>
                    <td style={{ padding: '12px' }}><input type="checkbox" /></td>
                    <td style={{ padding: '12px' }}>{p.code}</td>
                    <td style={{ padding: '12px' }}>{p.barcode}</td>
                    <td style={{ padding: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.item_name}</td>
                    <td style={{ padding: '12px' }}>{p.category?.name}</td>
                    <td style={{ padding: '12px' }}>{p.subcategory?.name}</td>
                    <td style={{ padding: '12px' }}>{p.sub_subcategory?.name}</td>
                    <td style={{ padding: '12px' }}>{p.brand?.name}</td>
                    <td style={{ padding: '12px' }}>{p.vendor?.name}</td>
                    <td style={{ padding: '12px' }}>{p.status || 'Active'}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>
                      {filters.store === 'central_store'
                        ? (p.wh_stock || 0)
                        : filters.store
                          ? (p.store_stocks?.find(s => s.store_id === filters.store)?.stock_qty || 0)
                          : (() => {
                              const whStockText = (p.wh_stock || 0) > 0 ? [`${p.wh_stock} (Central Store)`] : [];
                              const shopStocksText = p.store_stocks
                                ?.filter(s => s.stock_qty > 0)
                                ?.map(s => {
                                  const storeName = stores.find(st => st.id === s.store_id)?.name || 'Store';
                                  return `${s.stock_qty} (${storeName})`;
                                }) || [];
                              return [...whStockText, ...shopStocksText].join(', ') || '0';
                            })()
                      }
                    </td>
                    <td style={{ padding: '12px' }}>{p.sale_vat_percent || 0}</td>
                    <td style={{ padding: '12px' }}>{p.purchase_price}</td>
                    <td style={{ padding: '12px' }}>{p.mrp}</td>
                    <td style={{ padding: '12px' }}>{calculateProfitTP(p)}</td>
                    <td style={{ padding: '12px' }}>{calculateProfitMRP(p)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="16" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No products found matching the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductQuickSearch;
