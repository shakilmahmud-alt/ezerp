import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import CRM from './pages/CRM';
import Settings from './pages/Settings';
import PlaceholderPage from './pages/PlaceholderPage';
import Category from './pages/Category';
import SubCategory from './pages/SubCategory';
import SubSubcategory from './pages/SubSubcategory';
import Brand from './pages/Brand';
import VatPolicy from './pages/VatPolicy';
import Vendor from './pages/Vendor';
import Product from './pages/Product';
import ProductQuickSearch from './pages/ProductQuickSearch';
import VendorWiseProductList from './pages/VendorWiseProductList';
import StoreTransferPermission from './pages/StoreTransferPermission';
import PurchaseOrderVendor from './pages/PurchaseOrderVendor';
import PurchaseReceive from './pages/PurchaseReceive';
import PurchaseReturn from './pages/PurchaseReturn';
import ReceiveFromShop from './pages/ReceiveFromShop';
import DamageAndLost from './pages/DamageAndLost';
import StoreDelivery from './pages/StoreDelivery';
import BarcodePrint from './pages/BarcodePrint';
import Reprint from './pages/Reprint';
import PriceChangeExcel from './pages/PriceChangeExcel';
import Promotion from './pages/Promotion';
import CustomerType from './pages/CustomerType';
import CustomerEntry from './pages/CustomerEntry';
import PointEarnPolicy from './pages/PointEarnPolicy';
import CustomerReport from './pages/CustomerReport';
import RequisitionApproval from './pages/RequisitionApproval';
import Area from './pages/store/Area';
import StoreList from './pages/store/StoreList';
import Terminal from './pages/store/Terminal';
import PosDistribution from './pages/store/PosDistribution';
import Designation from './pages/employee/Designation';
import EmployeeList from './pages/employee/EmployeeList';
import UserMenuDistribution from './pages/employee/UserMenuDistribution';
import PaymentMethod from './pages/PaymentMethod';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

import HomeSelector from './pages/HomeSelector';
import PosLayout from './components/pos/PosLayout';
import PosLogin from './pages/pos/PosLogin';
import PosDashboard from './pages/pos/PosDashboard';
import PosCustomerManagement from './pages/pos/PosCustomerManagement';
import PosStockSearch from './pages/pos/PosStockSearch';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster 
          position="bottom-left" 
          toastOptions={{ 
            success: { style: { background: 'var(--accent-primary)', color: '#fff' }, iconTheme: { primary: '#fff', secondary: 'var(--accent-primary)' } },
            error: { style: { background: 'var(--danger)', color: '#fff' }, iconTheme: { primary: '#fff', secondary: 'var(--danger)' } }
          }} 
        />
        <Routes>
          <Route path="/" element={<HomeSelector />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/pos/login" element={<PosLogin />} />
          <Route path="/pos" element={<PosLayout />}>
            <Route index element={<PosDashboard />} />
            <Route path="customers" element={<PosCustomerManagement />} />
            <Route path="stock-search" element={<PosStockSearch />} />
          </Route>
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<ProtectedRoute moduleName="Dashboard"><Dashboard /></ProtectedRoute>} />
            
            <Route path="catalog" element={<Settings />} />
            <Route path="catalog/category" element={<ProtectedRoute moduleName="Category"><Category /></ProtectedRoute>} />
            <Route path="catalog/subcategory" element={<ProtectedRoute moduleName="Subcategory"><SubCategory /></ProtectedRoute>} />
            <Route path="catalog/sub-sub-category" element={<ProtectedRoute moduleName="Sub sub-category"><SubSubcategory /></ProtectedRoute>} />
            <Route path="catalog/brand" element={<ProtectedRoute moduleName="Brand"><Brand /></ProtectedRoute>} />
            <Route path="catalog/vat-policy" element={<ProtectedRoute moduleName="VAT Policy Setup"><VatPolicy /></ProtectedRoute>} />
            <Route path="catalog/vendor" element={<ProtectedRoute moduleName="Vendor"><Vendor /></ProtectedRoute>} />
            <Route path="catalog/product" element={<ProtectedRoute moduleName="Product"><Product /></ProtectedRoute>} />
            <Route path="catalog/measuring-unit" element={<ProtectedRoute moduleName="Measuring Unit"><PlaceholderPage /></ProtectedRoute>} />
            <Route path="catalog/product-quick-search" element={<ProtectedRoute moduleName="Product Quick Search"><ProductQuickSearch /></ProtectedRoute>} />
            <Route path="catalog/vendorwise-product-list" element={<ProtectedRoute moduleName="Vendorwise Product List"><VendorWiseProductList /></ProtectedRoute>} />
            <Route path="catalog/store-transfer-permission" element={<ProtectedRoute moduleName="Store Transfer Permission"><StoreTransferPermission /></ProtectedRoute>} />
            
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/purchase-order-vendor" element={<ProtectedRoute moduleName="Purchase Order by Vendor"><PurchaseOrderVendor /></ProtectedRoute>} />
            <Route path="inventory/purchase-receive" element={<ProtectedRoute moduleName="Purchase Receive"><PurchaseReceive /></ProtectedRoute>} />
            <Route path="inventory/purchase-return" element={<ProtectedRoute moduleName="Purchase Return"><PurchaseReturn /></ProtectedRoute>} />
            <Route path="inventory/receive-from-shop" element={<ProtectedRoute moduleName="Receive From Shop"><ReceiveFromShop /></ProtectedRoute>} />
            <Route path="inventory/damage-and-lost" element={<ProtectedRoute moduleName="Damage and Lost"><DamageAndLost /></ProtectedRoute>} />
            <Route path="inventory/store-delivery" element={<ProtectedRoute moduleName="Store Delivery"><StoreDelivery /></ProtectedRoute>} />
            <Route path="inventory/barcode-print" element={<ProtectedRoute moduleName="Barcode Print"><BarcodePrint /></ProtectedRoute>} />
            <Route path="inventory/reprint" element={<ProtectedRoute moduleName="Reprint"><Reprint /></ProtectedRoute>} />
            
            <Route path="promotion" element={<PlaceholderPage />} />
            <Route path="promotion/price-change-excel" element={<ProtectedRoute moduleName="Price Change (Excel)"><PriceChangeExcel /></ProtectedRoute>} />
            <Route path="promotion/promotion" element={<ProtectedRoute moduleName="Promotion"><Promotion /></ProtectedRoute>} />
            <Route path="promotion/price-change" element={<ProtectedRoute moduleName="Price Change"><PlaceholderPage /></ProtectedRoute>} />
            <Route path="promotion/promotion-extend" element={<ProtectedRoute moduleName="Promotion Extend"><PlaceholderPage /></ProtectedRoute>} />
            <Route path="promotion/promotion-inactive" element={<ProtectedRoute moduleName="Promotion InActive"><PlaceholderPage /></ProtectedRoute>} />
            
            <Route path="crm" element={<CRM />} />
            <Route path="crm/customer-type" element={<ProtectedRoute moduleName="Customer Type"><CustomerType /></ProtectedRoute>} />
            <Route path="crm/customer-entry" element={<ProtectedRoute moduleName="Customer Entry"><CustomerEntry /></ProtectedRoute>} />
            <Route path="crm/point-earn-policy" element={<ProtectedRoute moduleName="Point Earn Policy"><PointEarnPolicy /></ProtectedRoute>} />
            <Route path="crm/customer-report" element={<ProtectedRoute moduleName="Customer Report"><CustomerReport /></ProtectedRoute>} />
            <Route path="crm/discount-reference" element={<ProtectedRoute moduleName="Discount Reference"><PlaceholderPage /></ProtectedRoute>} />
            
            <Route path="app-module" element={<PlaceholderPage />} />
            
            <Route path="store" element={<PlaceholderPage />} />
            <Route path="store/area" element={<Area />} />
            <Route path="store/store-list" element={<StoreList />} />
            <Route path="store/terminal" element={<Terminal />} />
            <Route path="store/pos-distribution" element={<PosDistribution />} />
            
            <Route path="employee" element={<PlaceholderPage />} />
            <Route path="employee/designation" element={<Designation />} />
            <Route path="employee/employee-list" element={<EmployeeList />} />
            <Route path="employee/user-menu-distribution" element={<UserMenuDistribution />} />
            <Route path="employee/payment-method" element={<ProtectedRoute moduleName="Payment Method"><PaymentMethod /></ProtectedRoute>} />
            
            <Route path="approval" element={<PlaceholderPage />} />
            <Route path="approval/requisition-approval" element={<ProtectedRoute moduleName="Requisition Approval"><RequisitionApproval /></ProtectedRoute>} />
            
            <Route path="*" element={<PlaceholderPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
