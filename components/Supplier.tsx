
import React, { useState, useEffect, useMemo } from 'react';
import { Home, Search, Edit2, ChevronDown, X, Loader2, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ColumnFilter from './ColumnFilter';

interface SupplierData {
  id?: string;
  name: string;
  code: string;
  tin: string;
  type: string;
  phone_office: string;
  phone_contact: string;
  phone_alternate: string;
  email_office: string;
  email_contact: string;
  email_alternate: string;
  tax_name: string;
  tax_bin: string;
  tax_address: string;
  address_street: string;
  address_city: string;
  address_country: string;
  address_postal: string;
  pay_acc_name: string;
  pay_acc_number: string;
  pay_bank_name: string;
  pay_branch_name: string;
  pay_routing_number: string;
  pay_swift_number: string;
}

const Supplier: React.FC = () => {
  const [view, setView] = useState<'list' | 'add'>('list');
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const initialFormState: SupplierData = {
    name: '',
    code: '',
    tin: '',
    type: '',
    phone_office: '',
    phone_contact: '',
    phone_alternate: '',
    email_office: '',
    email_contact: '',
    email_alternate: '',
    tax_name: '',
    tax_bin: '',
    tax_address: '',
    address_street: '',
    address_city: '',
    address_country: '',
    address_postal: '',
    pay_acc_name: '',
    pay_acc_number: '',
    pay_bank_name: '',
    pay_branch_name: '',
    pay_routing_number: '',
    pay_swift_number: ''
  };

  const [formData, setFormData] = useState<SupplierData>(initialFormState);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data && !error) setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.tin || !formData.type) {
      alert("Please fill in mandatory fields (*)");
      return;
    }

    setIsSubmitting(true);

    try {
      // Fetch next sequential code starting from 4000000001
      const { data: lastSupplier } = await supabase
        .from('suppliers')
        .select('code')
        .order('code', { ascending: false })
        .limit(1);

      let nextCode = '4000000001';
      if (lastSupplier && lastSupplier.length > 0) {
        const lastCodeNum = parseInt(lastSupplier[0].code);
        if (!isNaN(lastCodeNum) && lastCodeNum >= 4000000000) {
          nextCode = (lastCodeNum + 1).toString();
        }
      }

      const payload = {
        ...formData,
        code: nextCode
      };

      const { error } = await supabase.from('suppliers').insert([payload]);
      
      if (!error) {
        setFormData(initialFormState);
        setView('list');
        fetchSuppliers();
      } else {
        alert("Error: " + error.message);
      }
    } catch (err: any) {
      alert("Unexpected error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           s.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesColumnFilters = Object.entries(columnFilters).every(([column, value]) => {
        if (!value) return true;
        const itemValue = String(s[column as keyof SupplierData] || '').toLowerCase();
        return itemValue.includes(value.toLowerCase());
      });

      return matchesSearch && matchesColumnFilters;
    });
  }, [suppliers, searchTerm, columnFilters]);

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  if (view === 'add') {
    return (
      <div className="flex flex-col space-y-6 max-w-[1000px] mx-auto animate-slide-up">
        <div className="flex items-center space-x-2 text-[10px] font-bold text-[#2d808e] uppercase tracking-wider">
          <Home size={14} className="text-gray-400" />
          <span className="text-gray-400">/</span>
          <button onClick={() => setView('list')} className="text-[#2d808e] font-black hover:underline uppercase">SUPPLIER</button>
          <span className="text-gray-400">/</span>
          <span className="text-[#2d808e] uppercase">NEW</span>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#2d808e] tracking-tight">Add New Supplier</h1>
        </div>

        <form onSubmit={handleFormSubmit} className="bg-white rounded border border-gray-100 p-10 space-y-10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#2d808e] uppercase tracking-wider flex items-center">
                <span className="text-red-500 mr-1">*</span> Supplier Name
              </label>
              <div className="relative">
                <input 
                  type="text" maxLength={50}
                  className="w-full px-3 py-2.5 border border-[#2d808e]/30 rounded focus:border-[#2d808e] outline-none text-xs font-medium placeholder-gray-300" 
                  placeholder="Supplier Name"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <span className="absolute right-2 top-2.5 text-[10px] text-gray-300 font-bold">{formData.name.length} / 50</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#2d808e] uppercase tracking-wider flex items-center">
                <span className="text-red-500 mr-1">*</span> TIN
              </label>
              <div className="relative">
                <input 
                  type="text" maxLength={50}
                  className="w-full px-3 py-2.5 border border-[#2d808e]/30 rounded focus:border-[#2d808e] outline-none text-xs font-medium placeholder-gray-300" 
                  placeholder="TIN No"
                  value={formData.tin}
                  onChange={e => setFormData({...formData, tin: e.target.value})}
                />
                <span className="absolute right-2 top-2.5 text-[10px] text-gray-300 font-bold">{formData.tin.length} / 50</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#2d808e] uppercase tracking-wider flex items-center">
                <span className="text-red-500 mr-1">*</span> Type
              </label>
              <div className="relative">
                <select 
                  className="w-full px-3 py-2.5 border border-[#2d808e]/30 rounded focus:border-[#2d808e] outline-none text-xs font-medium appearance-none text-gray-400 bg-white"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="">Supplier Type</option>
                  <option value="Local">Local</option>
                  <option value="Import">Import</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[12px] font-bold text-[#2d808e] uppercase tracking-widest border-b border-gray-50 pb-2">Phone Numbers</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Office Phone Number" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.phone_office} onChange={e => setFormData({...formData, phone_office: e.target.value})} />
              <input type="text" placeholder="Contact Phone Number" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.phone_contact} onChange={e => setFormData({...formData, phone_contact: e.target.value})} />
              <input type="text" placeholder="Alternate Phone Number" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.phone_alternate} onChange={e => setFormData({...formData, phone_alternate: e.target.value})} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[12px] font-bold text-[#2d808e] uppercase tracking-widest border-b border-gray-50 pb-2">Email Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="email" placeholder="Office mail address" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.email_office} onChange={e => setFormData({...formData, email_office: e.target.value})} />
              <input type="email" placeholder="Contact mail address" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.email_contact} onChange={e => setFormData({...formData, email_contact: e.target.value})} />
              <input type="email" placeholder="Alternate mail address" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.email_alternate} onChange={e => setFormData({...formData, email_alternate: e.target.value})} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[12px] font-bold text-[#2d808e] uppercase tracking-widest border-b border-gray-50 pb-2">Tax Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Input Name" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.tax_name} onChange={e => setFormData({...formData, tax_name: e.target.value})} />
              <input type="text" placeholder="Input BIN" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.tax_bin} onChange={e => setFormData({...formData, tax_bin: e.target.value})} />
              <input type="text" placeholder="Input Address" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.tax_address} onChange={e => setFormData({...formData, tax_address: e.target.value})} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[12px] font-bold text-[#2d808e] uppercase tracking-widest border-b border-gray-50 pb-2">Office Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input type="text" placeholder="Office street" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.address_street} onChange={e => setFormData({...formData, address_street: e.target.value})} />
              <input type="text" placeholder="Office city" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.address_city} onChange={e => setFormData({...formData, address_city: e.target.value})} />
              <input type="text" placeholder="Office country" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.address_country} onChange={e => setFormData({...formData, address_country: e.target.value})} />
              <input type="text" placeholder="Office postal" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.address_postal} onChange={e => setFormData({...formData, address_postal: e.target.value})} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[12px] font-bold text-[#2d808e] uppercase tracking-widest border-b border-gray-50 pb-2">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Account name" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.pay_acc_name} onChange={e => setFormData({...formData, pay_acc_name: e.target.value})} />
              <input type="text" placeholder="Account number" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.pay_acc_number} onChange={e => setFormData({...formData, pay_acc_number: e.target.value})} />
              <input type="text" placeholder="Bank name" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.pay_bank_name} onChange={e => setFormData({...formData, pay_bank_name: e.target.value})} />
              <input type="text" placeholder="Branch name" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.pay_branch_name} onChange={e => setFormData({...formData, pay_branch_name: e.target.value})} />
              <input type="text" placeholder="Routing number" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.pay_routing_number} onChange={e => setFormData({...formData, pay_routing_number: e.target.value})} />
              <input type="text" placeholder="Swift number" className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-xs outline-none focus:border-[#2d808e]" value={formData.pay_swift_number} onChange={e => setFormData({...formData, pay_swift_number: e.target.value})} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-3 bg-[#2d808e] text-white font-bold text-sm uppercase tracking-widest rounded shadow-xl hover:bg-[#256b78] transition-all flex items-center justify-center space-x-2"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
            <span>Add Supplier</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[10px] font-bold text-[#2d808e] uppercase tracking-wider">
          <Home size={14} className="text-gray-400" />
          <span className="text-gray-400">/</span>
          <span className="bg-[#e2eff1] text-[#2d808e] px-3 py-1 rounded-md font-black">SUPPLIER</span>
        </div>
        <button 
          onClick={() => setView('add')}
          className="bg-[#2d808e] text-white px-6 py-2 rounded text-[13px] font-black shadow-lg shadow-cyan-900/10 hover:bg-[#256b78] transition-all uppercase tracking-tight"
        >
          Add Supplier
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button className="border border-[#2d808e] text-[#2d808e] px-8 py-1.5 rounded text-[12px] font-bold hover:bg-gray-50 transition-all uppercase">
          Logs
        </button>
        <div className="flex items-center">
          <div className="relative flex">
            <input 
              type="text" 
              placeholder="Search by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 px-4 py-1.5 border border-gray-200 rounded-l outline-none text-[12px] text-gray-600 focus:border-[#2d808e]"
            />
            <button className="bg-[#2d808e] text-white px-3 rounded-r flex items-center justify-center hover:bg-[#256b78]">
              <Search size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-[#fcfcfc]">
              <tr className="text-[11px] font-bold text-gray-800 border-b border-gray-100 uppercase text-center">
                <th className="px-6 py-5 w-16">SL</th>
                <th className="px-6 py-5">
                  <div className="flex items-center justify-center">
                    <span>Code</span>
                    <ColumnFilter columnName="Code" currentValue={columnFilters.code || ''} onFilter={(val) => handleColumnFilter('code', val)} />
                  </div>
                </th>
                <th className="px-6 py-5">
                  <div className="flex items-center justify-center">
                    <span>Name</span>
                    <ColumnFilter columnName="Name" currentValue={columnFilters.name || ''} onFilter={(val) => handleColumnFilter('name', val)} />
                  </div>
                </th>
                <th className="px-6 py-5">Email</th>
                <th className="px-6 py-5">Phone</th>
                <th className="px-6 py-5">
                  <div className="flex items-center justify-center">
                    <span>Type</span>
                    <ColumnFilter columnName="Type" currentValue={columnFilters.type || ''} onFilter={(val) => handleColumnFilter('type', val)} />
                  </div>
                </th>
                <th className="px-6 py-5 w-24">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-medium text-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center uppercase tracking-widest text-gray-400">
                    <Loader2 className="animate-spin inline mr-2" size={16} /> 
                    Synchronizing suppliers...
                  </td>
                </tr>
              ) : filteredSuppliers.map((s, idx) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-6 text-center">{idx + 1}</td>
                  <td className="px-6 py-6 text-center font-bold text-gray-700">{s.code}</td>
                  <td className="px-6 py-6 font-black uppercase text-gray-800 leading-tight">
                    {s.name}
                  </td>
                  <td className="px-6 py-6 text-[10px] text-gray-500 leading-relaxed">
                    Office: {s.email_office || 'N/A'}<br/>
                    Contact: {s.email_contact || 'N/A'}<br/>
                    Alternate: {s.email_alternate || 'N/A'}
                  </td>
                  <td className="px-6 py-6 text-[10px] text-gray-500 leading-relaxed">
                    Office: {s.phone_office || 'N/A'}<br/>
                    Contact: {s.phone_contact || 'N/A'}<br/>
                    Alternate: {s.phone_alternate || 'N/A'}
                  </td>
                  <td className="px-6 py-6 text-center">{s.type}</td>
                  <td className="px-6 py-6 text-center">
                    <button className="p-2 text-blue-500 hover:bg-blue-50 border border-blue-100 rounded transition-all">
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-32 text-center text-gray-300 uppercase font-black tracking-widest">No suppliers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Supplier;
