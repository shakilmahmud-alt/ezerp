import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className={`app-container ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="main-content">
        <Topbar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="content-area animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
