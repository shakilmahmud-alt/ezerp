import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [posTerminal, setPosTerminal] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage on initial load
    const storedUser = localStorage.getItem('erp_user');
    const storedPosTerminal = localStorage.getItem('erp_pos_terminal');
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        if (storedPosTerminal) {
          setPosTerminal(JSON.parse(storedPosTerminal));
        }
        loadPermissions(parsedUser.id);
      } catch (err) {
        localStorage.removeItem('erp_user');
        localStorage.removeItem('erp_pos_terminal');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const loadPermissions = async (employeeId) => {
    try {
      const { data, error } = await supabase
        .from('user_menu_permissions')
        .select('permissions')
        .eq('employee_id', employeeId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading permissions:', error);
      }
      
      setPermissions(data && data.permissions ? data.permissions : {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      // In a production environment, you should hash passwords and use an API endpoint.
      // For this implementation based on user requirements, we query the employees table.
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) {
        toast.error('Invalid username or password');
        setLoading(false);
        return false;
      }

      if (data.status !== 'ACTIVE') {
        toast.error('Your account is inactive');
        setLoading(false);
        return false;
      }

      // Login success
      setUser(data);
      localStorage.setItem('erp_user', JSON.stringify(data));
      await loadPermissions(data.id);
      return true;
    } catch (err) {
      console.error(err);
      toast.error('An error occurred during login');
      setLoading(false);
      return false;
    }
  };

  const posLogin = async (username, password, terminalId) => {
    setLoading(true);
    try {
      // 1. Verify Terminal
      const { data: terminalDataArray, error: terminalError } = await supabase
        .from('terminals')
        .select('*, stores(name)')
        .eq('counter_id', terminalId)
        .eq('status', 'ACTIVE')
        .limit(1);
        
      if (terminalError || !terminalDataArray || terminalDataArray.length === 0) {
        toast.error('Invalid or Inactive Terminal ID');
        setLoading(false);
        return false;
      }
      
      const terminalData = terminalDataArray[0];
      
      // 2. Verify User
      const { data: userData, error: userError } = await supabase
        .from('employees')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();
        
      if (userError || !userData) {
        toast.error('Invalid username or password');
        setLoading(false);
        return false;
      }
      
      if (userData.status !== 'ACTIVE') {
        toast.error('Your account is inactive');
        setLoading(false);
        return false;
      }
      
      const posTerminalInfo = {
        counter_id: terminalData.counter_id,
        store_id: terminalData.store_id,
        store_name: terminalData.stores?.name
      };
      
      // 3. Login success
      setUser(userData);
      setPosTerminal(posTerminalInfo);
      localStorage.setItem('erp_user', JSON.stringify(userData));
      localStorage.setItem('erp_pos_terminal', JSON.stringify(posTerminalInfo));
      
      await loadPermissions(userData.id);
      return true;
    } catch (err) {
      console.error(err);
      toast.error('An error occurred during POS login');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setPermissions({});
    localStorage.removeItem('erp_user');
  };

  const hasViewPermission = (moduleName) => {
    if (!user) return false;
    if (user.username === 'msmraqeeb@gmail.com' || user.username === 'admin@email.com') return true; // Super Admin bypass
    return !!permissions[`view_${moduleName}`];
  };

  const hasEditPermission = (moduleName) => {
    if (!user) return false;
    if (user.username === 'msmraqeeb@gmail.com' || user.username === 'admin@email.com') return true; // Super Admin bypass
    return !!permissions[`edit_${moduleName}`];
  };

  const value = {
    user,
    posTerminal,
    permissions,
    login,
    posLogin,
    logout,
    loading,
    hasViewPermission,
    hasEditPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
