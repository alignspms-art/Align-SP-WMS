
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, AuthState } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean, message?: string }>;
  logout: () => void;
  addUser: (userData: any) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  users: User[];
  hasPermission: (permissionId: string) => boolean;
  hasGranularPermission: (moduleId: string, action: string) => boolean;
  loading: boolean;
  dbError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<User[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  // Load users from LocalStorage as a primary/fallback source
  const loadLocalUsers = () => {
    const saved = localStorage.getItem('align_managed_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  };

  const saveLocalUsers = (newUsers: User[]) => {
    localStorage.setItem('align_managed_users', JSON.stringify(newUsers));
    setUsers(newUsers);
  };

  const fetchUserProfile = React.useCallback(async (userId: string) => {
    // First check local users
    const localUsers = loadLocalUsers();
    const localUser = localUsers.find((u: User) => u.id === userId);
    
    if (localUser) {
      setUser(localUser);
      setIsAuthenticated(true);
    }

    // Then try to refresh from DB
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        const metadata = data.granular_permissions?._metadata || {};
        const mappedUser: User = {
          id: data.id,
          email: data.email || metadata.email || '',
          fullName: metadata.fullName || data.full_name || 'User',
          username: metadata.username || data.username || 'user',
          password: metadata.password || data.password,
          officeId: data.office_id || metadata.officeId,
          contactNumber: data.contact_number || metadata.contactNumber,
          department: data.department || metadata.department,
          roleTemplate: data.role_template || metadata.roleTemplate,
          role: (metadata.role || data.role || Role.USER) as Role,
          status: (metadata.status || data.status || 'Active') as 'Active' | 'Inactive',
          lastLogin: data.last_login,
          avatarUrl: data.avatar_url,
          permissions: [],
          granularPermissions: data.granular_permissions || {},
          createdAt: data.created_at
        };
        setUser(mappedUser);
        setIsAuthenticated(true);
        
        // Update local cache for this user
        const updatedLocal = localUsers.map((u: User) => u.id === userId ? mappedUser : u);
        if (!localUser) updatedLocal.push(mappedUser);
        localStorage.setItem('align_managed_users', JSON.stringify(updatedLocal));
      }
    } catch {
      console.warn("Profile fetch failed, using local session");
    }
  }, []);

  const fetchUsers = React.useCallback(async () => {
    // Start with local data
    const localUsers = loadLocalUsers();
    setUsers(localUsers);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setDbError(error.message);
        return;
      }

      if (data) {
        const mappedUsers = data.map((u: any) => {
          const metadata = u.granular_permissions?._metadata || {};
          return {
            id: u.id,
            email: u.email || metadata.email || '',
            fullName: metadata.fullName || u.full_name || 'User',
            username: metadata.username || u.username || 'user',
            password: metadata.password || u.password,
            officeId: u.office_id || metadata.officeId,
            contactNumber: u.contact_number || metadata.contactNumber,
            department: u.department || metadata.department,
            roleTemplate: u.role_template || metadata.roleTemplate,
            role: (metadata.role || u.role || Role.USER) as Role,
            status: (metadata.status || u.status || 'Active') as 'Active' | 'Inactive',
            lastLogin: u.last_login,
            avatarUrl: u.avatar_url,
            permissions: [],
            granularPermissions: u.granular_permissions || {},
            createdAt: u.created_at
          };
        });
        
        // Merge: Keep local users that are not in DB yet (likely unsynced)
        const dbIds = new Set(mappedUsers.map((u: User) => u.id));
        const unsyncedUsers = localUsers.filter((u: User) => !dbIds.has(u.id));
        const mergedUsers = [...mappedUsers, ...unsyncedUsers];
        
        setUsers(mergedUsers);
        localStorage.setItem('align_managed_users', JSON.stringify(mergedUsers));
        setDbError(null);
      }
    } catch (e: any) {
      setDbError(e.message);
    }
  }, []);

  useEffect(() => {
    // Check current session from localStorage
    const initAuth = async () => {
      const savedUserId = localStorage.getItem('align_session_id');
      if (savedUserId) {
        await fetchUserProfile(savedUserId);
      }
      setLoading(false);
    };

    initAuth();

    const timer = setTimeout(() => {
      fetchUsers();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [fetchUserProfile, fetchUsers]);

  const login = async (username: string, password: string) => {
    try {
      const cleanUsername = username.trim().toLowerCase();
      
      // 1. Check local users first (Resilience fallback)
      // This ensures that if a user was added but sync failed, they can still log in
      const localUsers = loadLocalUsers();
      const localProfile = localUsers.find((u: User) => 
        (u.username || '').toLowerCase() === cleanUsername
      );

      if (localProfile) {
        const pPassword = localProfile.password;
        if (pPassword === password) {
          return completeLogin(localProfile);
        } else {
          return { success: false, message: "Invalid password" };
        }
      }
      
      // 2. If not found locally, check profiles table directly
      const { data: allProfiles, error: fetchError } = await supabase
        .from('profiles')
        .select('*');

      if (fetchError) {
        console.error("Database Fetch Error:", fetchError);
        // Special fallback for 'rakib' if DB is completely down
        if (cleanUsername === 'rakib' && password === '123456') {
          return loginWithFallback('rakib-fallback-id', 'Rakib Admin (System Fallback)');
        }
        return { success: false, message: `Database error: ${fetchError.message}` };
      }

      // Find the profile manually in the returned list to be schema-agnostic
      const profile = allProfiles?.find(p => {
        const metadata = p.granular_permissions?._metadata || {};
        const pUsername = (metadata.username || p.username || '').toLowerCase();
        return pUsername === cleanUsername;
      });

      // Auto-create 'rakib' if it doesn't exist in DB or Local
      if (!profile && cleanUsername === 'rakib' && password === '123456') {
        const newId = crypto.randomUUID();
        const { data: newProfile, error: createError } = await supabase.from('profiles').insert([{
          id: newId,
          granular_permissions: {
            _metadata: {
              email: 'rakib@system.local',
              fullName: 'Rakib Admin',
              username: 'rakib',
              password: '123456',
              role: Role.ADMIN,
              status: 'Active'
            }
          }
        }]).select().single();
        
        if (createError) {
          console.error("Failed to initialize admin profile:", createError);
          return loginWithFallback(newId, 'Rakib Admin (Fallback)');
        }
        return completeLogin(newProfile);
      }

      if (!profile) return { success: false, message: "Invalid username or password" };
      
      const metadata = profile.granular_permissions?._metadata || {};
      const pPassword = metadata.password || profile.password;

      // Check password
      if (pPassword !== password) {
        return { success: false, message: "Invalid username or password" };
      }

      return completeLogin(profile);
    } catch (err: any) {
      console.error("Login Exception:", err);
      if (username.trim().toLowerCase() === 'rakib' && password === '123456') {
        return loginWithFallback('rakib-final-fallback', 'Rakib Admin (Final Fallback)');
      }
      return { success: false, message: `System error: ${err.message || 'Unknown error'}` };
    }
  };

  const loginWithFallback = (id: string, name: string) => {
    const fallbackAdmin: User = {
      id,
      email: 'rakib@system.local',
      fullName: name,
      username: 'rakib',
      role: Role.ADMIN,
      status: 'Active',
      lastLogin: new Date().toISOString(),
      avatarUrl: undefined,
      permissions: [],
      granularPermissions: {},
      createdAt: new Date().toISOString()
    };
    setUser(fallbackAdmin);
    setIsAuthenticated(true);
    localStorage.setItem('align_session_id', id);
    return { success: true };
  };

  const completeLogin = async (profile: any) => {
    // Handle both DB profile (snake_case) and Local User (camelCase)
    const metadata = profile.granular_permissions?._metadata || {};
    const mappedUser: User = {
      id: profile.id,
      email: profile.email || metadata.email || '',
      fullName: profile.fullName || metadata.fullName || profile.full_name || 'User',
      username: profile.username || metadata.username || profile.username || 'user',
      password: profile.password || metadata.password,
      officeId: profile.officeId || metadata.officeId || profile.office_id,
      contactNumber: profile.contactNumber || metadata.contactNumber || profile.contact_number,
      department: profile.department || metadata.department || profile.department,
      roleTemplate: profile.roleTemplate || metadata.roleTemplate || profile.role_template,
      role: (profile.role || metadata.role || Role.USER) as Role,
      status: (profile.status || metadata.status || 'Active') as 'Active' | 'Inactive',
      lastLogin: new Date().toISOString(),
      avatarUrl: profile.avatarUrl || profile.avatar_url,
      permissions: [],
      granularPermissions: profile.granularPermissions || profile.granular_permissions || {},
      createdAt: profile.createdAt || profile.created_at
    };

    setUser(mappedUser);
    setIsAuthenticated(true);
    localStorage.setItem('align_session_id', profile.id);

    // Update last login if possible
    try {
      await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', profile.id);
    } catch {
      // Ignore errors
    }
    
    return { success: true };
  };

  const logout = async () => {
    localStorage.removeItem('align_session_id');
    setUser(null);
    setIsAuthenticated(false);
  };

  const addUser = async (userData: any) => {
    const newId = crypto.randomUUID();
    const systemEmail = `${userData.username.trim().toLowerCase()}@system.local`;
    
    const newUser: User = {
      id: newId,
      email: userData.email || systemEmail,
      fullName: userData.fullName,
      username: userData.username,
      password: userData.password || 'Fair@123456',
      officeId: userData.officeId,
      contactNumber: userData.contactNumber,
      department: userData.department,
      roleTemplate: userData.roleTemplate,
      role: userData.role,
      status: userData.status,
      lastLogin: 'Never',
      permissions: [],
      granularPermissions: userData.granularPermissions || {},
      createdAt: new Date().toISOString()
    };

    // Update local first
    const updatedUsers = [newUser, ...users];
    saveLocalUsers(updatedUsers);

    // Try to sync with DB
    try {
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: newId,
        email: userData.email || systemEmail,
        full_name: userData.fullName,
        username: userData.username,
        office_id: userData.officeId,
        contact_number: userData.contactNumber,
        department: userData.department,
        role_template: userData.roleTemplate,
        role: userData.role,
        status: userData.status,
        password: userData.password || 'Fair@123456',
        granular_permissions: {
          ...(userData.granularPermissions || {}),
          _metadata: {
            ...userData,
            email: userData.email || systemEmail,
            password: userData.password || 'Fair@123456'
          }
        }
      }]);
      
      if (profileError) {
        console.error("DB Sync Error:", profileError);
        let msg = profileError.message;
        if (msg.includes("granular_permissions")) {
          msg = "Database schema is outdated (missing 'granular_permissions' column). Please run the SQL repair script in Supabase.";
        } else if (msg.includes("profiles_id_fkey")) {
          msg = "Foreign key constraint error. Please run the SQL repair script in Supabase to remove the 'profiles_id_fkey' constraint.";
        }
        setDbError(`Sync failed: ${msg}. Data is saved locally.`);
      }
    } catch (e: any) {
      setDbError(`System error during sync: ${e.message}`);
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    // Update local first
    const updatedUsers = users.map(u => u.id === userId ? { ...u, ...updates } : u);
    saveLocalUsers(updatedUsers);
    if (user?.id === userId) setUser({ ...user, ...updates });

    // Try to sync with DB
    try {
      const { error } = await supabase.from('profiles').update({
        email: updates.email,
        full_name: updates.fullName,
        username: updates.username,
        office_id: updates.officeId,
        contact_number: updates.contactNumber,
        department: updates.department,
        role_template: updates.roleTemplate,
        role: updates.role,
        status: updates.status,
        password: updates.password,
        granular_permissions: {
          ...(updates.granularPermissions || {}),
          _metadata: {
            ...updates
          }
        }
      }).eq('id', userId);

      if (error) {
        console.error("DB Sync Error:", error);
        setDbError(`Sync failed: ${error.message}. Changes saved locally.`);
      }
    } catch (e: any) {
      setDbError(`System error during sync: ${e.message}`);
    }
  };

  const deleteUser = async (userId: string) => {
    // Update local first
    const updatedUsers = users.filter(u => u.id !== userId);
    saveLocalUsers(updatedUsers);

    // Try to sync with DB
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) {
        setDbError(`Delete sync failed: ${error.message}. User removed locally.`);
      }
    } catch (e: any) {
      setDbError(`System error during delete sync: ${e.message}`);
    }
  };

  const hasPermission = (permissionId: string) => {
    if (user?.username === 'rakib' || user?.role === Role.ADMIN) return true;
    return !!user?.granularPermissions?.[permissionId]?.view;
  };

  const hasGranularPermission = (moduleId: string, action: string) => {
    if (user?.username === 'rakib' || user?.role === Role.ADMIN) return true;
    const modulePerms = user?.granularPermissions?.[moduleId];
    if (!modulePerms) return false;
    return !!(modulePerms as any)[action];
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      login, 
      logout, 
      addUser, 
      updateUser,
      deleteUser, 
      users,
      hasPermission,
      hasGranularPermission,
      loading,
      dbError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
