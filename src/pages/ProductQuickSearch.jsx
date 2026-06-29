import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const ProductQuickSearch = () => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subSubcategories, setSubSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [filters, setFilters] = useState({
    categoryId: '',
    subcategoryId: '',
    subSubcategoryId: '',
    brandId: '',
    vendorId: '',
    itemName: '',
    mrpOperator: '',
    mrpValue: '',
    cpuOperator: '',
    cpuValue: '',
    store: '',
    searchQuery: '',
    showZeroStock: false
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [catRes, subcatRes, subsubRes, brandRes, vendorRes] = await Promise.all([
        supabase.from('categories').select('id, name'),
        supabase.from('subcategories').select('id, name'),
        supabase.from('sub_subcategories').select('id, name'),
        supabase.from('brands').select('id, name'),
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
          vendor:vendor_id (name)
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

      const { data, error } = await query;
      if (error) throw error;
      
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Error fetching products");
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
      <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>Product Search</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Category</label>
            <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Sub Category</label>
            <select name="subcategoryId" value={filters.subcategoryId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {subcategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Sub Subcategory</label>
            <select name="subSubcategoryId" value={filters.subSubcategoryId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {subSubcategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Brand</label>
            <select name="brandId" value={filters.brandId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {brands.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Item Name</label>
            <input type="text" name="itemName" value={filters.itemName} onChange={handleFilterChange} className="input-animated" placeholder="-- ALL --" />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>MRP</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <select name="mrpOperator" value={filters.mrpOperator} onChange={handleFilterChange} className="input-animated" style={{ flex: 1 }}>
                {operatorOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {filters.mrpOperator && (
                <input type="number" name="mrpValue" value={filters.mrpValue} onChange={handleFilterChange} className="input-animated" placeholder="Value" style={{ flex: 1 }} />
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>CPU</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <select name="cpuOperator" value={filters.cpuOperator} onChange={handleFilterChange} className="input-animated" style={{ flex: 1 }}>
                {operatorOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {filters.cpuOperator && (
                <input type="number" name="cpuValue" value={filters.cpuValue} onChange={handleFilterChange} className="input-animated" placeholder="Value" style={{ flex: 1 }} />
              )}
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Store</label>
            <select name="store" value={filters.store} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              <option value="Main Store">Main Store</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Vendor</label>
            <select name="vendorId" value={filters.vendorId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {vendors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
