import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [posTerminal, setPosTerminal] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [posPermissions, setPosPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage on initial load
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('erp_user');
      const storedPosTerminal = localStorage.getItem('erp_pos_terminal');
      const storedPosPerms = localStorage.getItem('erp_pos_permissions');
      
      if (storedPosPerms) {
        try {
          setPosPermissions(JSON.parse(storedPosPerms));
        } catch (e) {}
      }
      
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          let terminalObj = null;
          if (storedPosTerminal) {
            terminalObj = JSON.parse(storedPosTerminal);
            
            // If store_name is missing, fetch from stores table
            if (terminalObj && terminalObj.store_id && !terminalObj.store_name) {
              try {
                const { data: storeData } = await supabase
                  .from('stores')
                  .select('name')
                  .eq('id', terminalObj.store_id)
                  .single();
                if (storeData && storeData.name) {
                  terminalObj.store_name = storeData.name;
                  localStorage.setItem('erp_pos_terminal', JSON.stringify(terminalObj));
                }
              } catch (e) {
                console.warn('Could not backfill store name:', e);
              }
            }
            
            setPosTerminal(terminalObj);
          }
          
          await Promise.all([
            loadPermissions(parsedUser.id),
            terminalObj?.store_id ? loadPosPermissions(parsedUser.id, terminalObj.store_id) : Promise.resolve()
          ]);
        } catch (err) {
          localStorage.removeItem('erp_user');
          localStorage.removeItem('erp_pos_terminal');
          localStorage.removeItem('erp_pos_permissions');
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
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
      console.error('Failed to load permissions:', err);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  const loadPosPermissions = async (employeeId, storeId) => {
    try {
      let query = supabase
        .from('pos_user_permissions')
        .select('permissions')
        .eq('employee_id', employeeId);
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.warn('Error loading pos permissions:', error);
      }
      
      const perms = (data && Array.isArray(data.permissions)) ? data.permissions : [];
      setPosPermissions(perms);
      localStorage.setItem('erp_pos_permissions', JSON.stringify(perms));
    } catch (err) {
      console.error('Failed to load pos permissions:', err);
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
        .select('*')
        .eq('counter_id', terminalId)
        .eq('status', 'ACTIVE')
        .limit(1);
        
      if (terminalError || !terminalDataArray || terminalDataArray.length === 0) {
        toast.error('Invalid or Inactive Terminal ID');
        setLoading(false);
        return false;
      }
      
      const terminalData = terminalDataArray[0];

      // 2. Fetch Store Name
      let storeName = terminalData.stores?.name || '';
      if (!storeName && terminalData.store_id) {
        try {
          const { data: storeData } = await supabase
            .from('stores')
            .select('name')
            .eq('id', terminalData.store_id)
            .single();
          if (storeData && storeData.name) {
            storeName = storeData.name;
          }
        } catch (e) {
          console.warn('Could not fetch store name for terminal:', e);
        }
      }
      
      // 3. Verify User
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
        store_name: storeName
      };
      
      // 4. Login success
      setUser(userData);
      setPosTerminal(posTerminalInfo);
      localStorage.setItem('erp_user', JSON.stringify(userData));
      localStorage.setItem('erp_pos_terminal', JSON.stringify(posTerminalInfo));
      
      await Promise.all([
        loadPermissions(userData.id),
        loadPosPermissions(userData.id, terminalData.store_id)
      ]);
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
    setPosTerminal(null);
    setPermissions({});
    setPosPermissions([]);
    localStorage.removeItem('erp_user');
    localStorage.removeItem('erp_pos_terminal');
    localStorage.removeItem('erp_pos_permissions');
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

  const hasPosPermission = (permName) => {
    if (!user) return false;
    // Super Admin bypass
    if (user.username === 'msmraqeeb@gmail.com' || user.username === 'admin@email.com') return true;
    if (!posPermissions || !Array.isArray(posPermissions)) return false;
    return posPermissions.includes(permName);
  };

  const value = {
    user,
    posTerminal,
    setPosTerminal,
    permissions,
    posPermissions,
    hasPosPermission,
    loadPosPermissions,
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
