import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Download, Edit, Loader } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

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
    const matchesSearch = p.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = searchBrand ? p.brand?.name?.toLowerCase().includes(searchBrand.toLowerCase()) : true;
    return matchesSearch && matchesBrand;
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
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Plus size={16} /> Add New
          </button>
        </div>

        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
          
          {/* Top Filters Row */}
          <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>Order By</label>
              <select 
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
              </select>
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
                  <th style={{ textAlign: 'center', padding: '12px', fontWeight: 600 }}>Action</th>
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
                    <select className="input-animated" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value, subcategory_id: '', sub_subcategory_id: ''})} disabled={isLoading}>
                      <option value="">Select a Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Sub Category <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select className="input-animated" value={formData.subcategory_id} onChange={e => setFormData({...formData, subcategory_id: e.target.value, sub_subcategory_id: ''})} disabled={isLoading || !formData.category_id}>
                      <option value="">Select a Sub Category</option>
                      {subcategories.filter(sc => sc.category_name === categories.find(c => c.id === formData.category_id)?.name).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Sub Subcategory <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select className="input-animated" value={formData.sub_subcategory_id} onChange={e => setFormData({...formData, sub_subcategory_id: e.target.value})} disabled={isLoading || !formData.subcategory_id}>
                      <option value="">Select a Sub Subcategory</option>
                      {subSubcategories.filter(ssc => ssc.subcategory_name === subcategories.find(sc => sc.id === formData.subcategory_id)?.name).map(ssc => <option key={ssc.id} value={ssc.id}>{ssc.name}</option>)}
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Brand <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select className="input-animated" value={formData.brand_id} onChange={e => setFormData({...formData, brand_id: e.target.value})} disabled={isLoading}>
                        <option value="">Select a Brand</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
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
                    <select className="input-animated" value={formData.vendor_id} onChange={e => setFormData({...formData, vendor_id: e.target.value})} disabled={isLoading}>
                      <option value="">Select a Vendor</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
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
                    <select className="input-animated" value={formData.retailer_service_type} onChange={e => setFormData({...formData, retailer_service_type: e.target.value})} disabled={isLoading}>
                      <option value="Readymade Graments (Other's Brand) : 7.5">Readymade Graments (Other's Brand) : 7.5</option>
                      <option value="Zero VAT % : 0">Zero VAT % : 0</option>
                    </select>
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

    </div>
  );
};

export default Product;
