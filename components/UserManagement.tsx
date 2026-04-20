
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Role, User, ModulePermissions } from '../types';
import { X, User as UserIcon, Plus, Check, ChevronDown, Save, Eye, EyeOff, Loader2 } from 'lucide-react';
import { PERMISSION_MODULES } from '../constants/permissions';

interface PermissionCardProps {
  label: string;
  moduleId: string;
  permissions: ModulePermissions;
  onChange: (moduleId: string, field: keyof ModulePermissions, value: boolean) => void;
}

const PermissionCard: React.FC<PermissionCardProps> = ({ label, moduleId, permissions, onChange }) => {
  const standardFields = ['view', 'edit', 'dl'] as const;
  const requisitionFields = ['prepared', 'checked', 'confirmed', 'approved'] as const;
  const poFields = ['prepared', 'checked', 'confirmed', 'approved', 'accepted'] as const;
  const approvalFields = ['view'] as const;
  
  return (
    <div className="bg-white border border-cyan-100/50 rounded-lg p-3.5 flex flex-col space-y-3.5 shadow-sm">
      <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{label}</span>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {(moduleId.includes('approval') ? approvalFields : standardFields).map((field) => (
          <label key={field} className="flex items-center space-x-1.5 cursor-pointer group">
            <div 
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                permissions[field] ? 'bg-[#2d808e] border-[#2d808e]' : 'border-gray-300 group-hover:border-[#2d808e]'
              }`}
            >
              {permissions[field] && <Check size={10} className="text-white" strokeWidth={4} />}
              <input 
                type="checkbox" 
                className="hidden" 
                checked={permissions[field]} 
                onChange={(e) => onChange(moduleId, field as keyof ModulePermissions, e.target.checked)} 
              />
            </div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{field}</span>
          </label>
        ))}
        {moduleId === 'requisition' && requisitionFields.map((field) => (
          <label key={field} className="flex items-center space-x-1.5 cursor-pointer group">
            <div 
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                permissions[field] ? 'bg-[#2d808e] border-[#2d808e]' : 'border-gray-300 group-hover:border-[#2d808e]'
              }`}
            >
              {permissions[field] && <Check size={10} className="text-white" strokeWidth={4} />}
              <input 
                type="checkbox" 
                className="hidden" 
                checked={permissions[field] || false} 
                onChange={(e) => onChange(moduleId, field, e.target.checked)} 
              />
            </div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{field}</span>
          </label>
        ))}
        {moduleId === 'purchase_order' && poFields.map((field) => (
          <label key={field} className="flex items-center space-x-1.5 cursor-pointer group">
            <div 
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                permissions[field] ? 'bg-[#2d808e] border-[#2d808e]' : 'border-gray-300 group-hover:border-[#2d808e]'
              }`}
            >
              {permissions[field] && <Check size={10} className="text-white" strokeWidth={4} />}
              <input 
                type="checkbox" 
                className="hidden" 
                checked={permissions[field] || false} 
                onChange={(e) => onChange(moduleId, field, e.target.checked)} 
              />
            </div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{field}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

const UserManagement: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, user: currentUser, dbError } = useAuth();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<any>({});

  React.useEffect(() => {
    const fetchCostCenters = async () => {
      const { data } = await supabase.from('cost_centers').select('name').order('name');
      if (data) setCostCenters(data);
    };
    fetchCostCenters();
  }, []);

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user });
  };

  const handleCommitChanges = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData);
        setEditingUser(null);
      } else if (isAdding) {
        if (!formData.username || !formData.fullName) {
          alert("Full Name and Username are required for new users");
          return;
        }
        await addUser(formData);
        setIsAdding(false);
      }
    } catch (err: any) {
      console.error("Failed to save changes:", err);
      if (err.message?.includes("rate limit")) {
        alert("Email rate limit exceeded. Please wait a few minutes before adding more users, or disable 'Email Confirmation' in your Supabase Auth settings to bypass this.");
      } else {
        alert("Error saving user access changes: " + err.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermissionChange = (moduleId: string, field: keyof ModulePermissions, value: boolean) => {
    const current = formData.granularPermissions || {};
    const modulePerms = current[moduleId] || { view: false, edit: false, dl: false };
    
    setFormData({
      ...formData,
      granularPermissions: {
        ...current,
        [moduleId]: { ...modulePerms, [field]: value }
      }
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'Never') return 'Never';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Never';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric'
    }) + ', ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">User Management</h2>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-0.5">Control system access levels and permissions</p>
          {dbError && (
            <div className="mt-2 px-3 py-1 bg-amber-50 border border-amber-100 rounded flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Sync Warning: {dbError} (Using Local Storage)</span>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setFormData({ 
              role: '', 
              status: '',
              username: '',
              password: '',
              fullName: '',
              officeId: '',
              contactNumber: '',
              email: '',
              department: '',
              granularPermissions: {} 
            });
          }}
          className="flex items-center px-6 py-2 bg-[#2d808e] text-white text-xs font-bold rounded shadow-sm hover:bg-[#256b78] transition-all uppercase tracking-widest"
        >
          <Plus size={14} className="mr-2" /> Add User
        </button>
      </div>

      <div className="bg-white rounded border border-gray-100 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-white">
            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-6 py-6 text-left">User</th>
              <th className="px-6 py-6 text-left">Office ID</th>
              <th className="px-6 py-6 text-left">Department</th>
              <th className="px-6 py-6 text-left">Role</th>
              <th className="px-6 py-6 text-left">Status</th>
              <th className="px-6 py-6 text-left">Last Login</th>
              <th className="px-6 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/30 transition-colors">
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shadow-inner">
                      <UserIcon size={18} className="text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <div className="text-[12px] font-black text-gray-800 uppercase tracking-tight">{u.fullName}</div>
                      <div className="text-[10px] text-gray-400 font-medium">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-[11px] font-medium text-gray-600">
                  {u.officeId || 'N/A'}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-[11px] font-medium text-gray-600">
                  {u.department || 'N/A'}
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest border border-gray-200 rounded-md text-gray-600 bg-white shadow-sm">
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${
                    u.status === 'Active' 
                      ? 'bg-green-50 text-green-600 border-green-100' 
                      : 'bg-red-50 text-red-600 border-red-100'
                  }`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-[11px] font-medium text-gray-400">
                  {formatDate(u.lastLogin)}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end space-x-5">
                    <button 
                      onClick={() => handleEditClick(u)}
                      className="text-[#2d808e] text-[12px] font-black hover:underline uppercase tracking-tight"
                    >
                      Edit Access
                    </button>
                    <button 
                      disabled={u.id === currentUser?.id}
                      onClick={() => {
                         if(window.confirm(`Delete user ${u.fullName}?`)) deleteUser(u.id);
                      }}
                      className="text-red-500 text-[12px] font-black hover:underline uppercase tracking-tight disabled:opacity-20"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(editingUser || isAdding) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-[1100px] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col my-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h3 className="text-lg font-black text-gray-800 tracking-tight">
                {isAdding ? 'New User Access' : `Edit Access: ${editingUser?.fullName}`}
              </h3>
              <button onClick={() => { setEditingUser(null); setIsAdding(false); }} className="text-gray-300 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-12 overflow-y-auto max-h-[75vh] scrollbar-thin">
              {/* Profile Setup */}
              <div className="flex flex-col md:flex-row gap-10 items-start">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 w-full">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                    <input 
                      type="text" 
                      value={formData.fullName || ''}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded outline-none focus:border-[#2d808e] text-sm text-gray-700 font-medium transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Office ID</label>
                    <input 
                      type="text" 
                      value={formData.officeId || ''}
                      onChange={(e) => setFormData({...formData, officeId: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded outline-none focus:border-[#2d808e] text-sm text-gray-700 font-medium transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Number</label>
                    <input 
                      type="text" 
                      value={formData.contactNumber || ''}
                      onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded outline-none focus:border-[#2d808e] text-sm text-gray-700 font-medium transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                    <input 
                      type="text" 
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded outline-none focus:border-[#2d808e] text-sm text-gray-700 font-medium transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Department</label>
                    <div className="relative">
                      <select 
                        value={formData.department || ''}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded outline-none focus:border-[#2d808e] text-sm text-gray-700 font-medium appearance-none transition-all"
                      >
                        <option value="">Select Department</option>
                        {costCenters.map((cc, idx) => (
                          <option key={idx} value={cc.name}>{cc.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Username</label>
                    <input 
                      type="text" 
                      value={formData.username || ''}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded outline-none focus:border-[#2d808e] text-sm text-gray-700 font-medium transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Set secure password"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded outline-none focus:border-[#2d808e] text-sm text-gray-700 font-medium transition-all" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#2d808e]"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Role Template</label>
                    <div className="relative">
                      <select 
                        value={formData.role || ''}
                        onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded outline-none focus:border-[#2d808e] text-sm text-gray-700 font-bold appearance-none transition-all"
                      >
                        <option value="">Select Role</option>
                        <option value={Role.USER}>User</option>
                        <option value={Role.MANAGER}>Manager</option>
                        <option value={Role.ADMIN}>Admin</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Status</label>
                    <div className="relative">
                      <select 
                        value={formData.status || ''}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded outline-none focus:border-[#2d808e] text-sm text-gray-700 font-bold appearance-none transition-all"
                      >
                        <option value="">Select Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Granular Section */}
              <div className="space-y-8">
                <div className="flex items-center space-x-3.5">
                   <div className="w-1.5 h-6 bg-[#2d808e] rounded-full"></div>
                   <h4 className="text-[13px] font-black text-gray-700 uppercase tracking-widest">Granular Module Restrictions</h4>
                </div>

                <div className="space-y-10">
                  {Array.from(new Set(PERMISSION_MODULES.map(m => m.category))).map(category => (
                    <div key={category} className="space-y-4">
                      <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2.5">{category}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {PERMISSION_MODULES.filter(m => m.category === category).map(module => (
                          <PermissionCard 
                            key={module.id}
                            label={module.label} 
                            moduleId={module.id} 
                            permissions={formData.granularPermissions?.[module.id] || {view: false, edit: false, dl: false}} 
                            onChange={handlePermissionChange} 
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-gray-100 flex items-center justify-end space-x-10 bg-white sticky bottom-0 z-10">
              <button 
                onClick={() => { setEditingUser(null); setIsAdding(false); }}
                className="text-[13px] font-black text-gray-400 hover:text-gray-800 uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCommitChanges}
                disabled={isSaving}
                className={`flex items-center px-12 py-3 text-[13px] font-black rounded-lg shadow-lg transition-all uppercase tracking-widest active:scale-[0.98] ${
                  isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2d808e] text-white hover:bg-[#256b78]'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="mr-3 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-3" strokeWidth={3} />
                    Commit Access Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
