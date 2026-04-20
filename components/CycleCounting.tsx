
import React, { useState, useEffect, useMemo } from 'react';
import { Home, ScanLine, Plus, X, Loader2, CheckCircle2, History, FileSpreadsheet, Calendar, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ScannerModal from './ScannerModal';
import ColumnFilter from './ColumnFilter';
import ItemSearchInput from './ItemSearchInput';
import * as XLSX from 'xlsx';

interface CycleCount {
  id: string;
  counting_date: string;
  user_id: string;
  sku: string;
  item_name: string;
  location: string;
  uom: string;
  physical_qty: number;
  system_qty: number;
  pending_receive: number;
  pending_issue: number;
  short_over: number;
  remarks: string;
  created_at: string;
}

const CycleCounting: React.FC = () => {
  const { user, hasGranularPermission } = useAuth() || {};
  const [view, setView] = useState<'list' | 'add'>('list');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<CycleCount[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const getLocalToday = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getLocalToday()); // YYYY-MM-DD

  // Form State
  const [sku, setSku] = useState('');
  const [itemName, setItemName] = useState('');
  const [location, setLocation] = useState('');
  const [uom, setUom] = useState('');
  const [systemQty, setSystemQty] = useState(0);
  const [pendingReceive, setPendingReceive] = useState(0);
  const [pendingIssue, setPendingIssue] = useState(0);
  const [physicalQty, setPhysicalQty] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const fetchCounts = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('cycle_counts')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedDate) {
        const start = `${selectedDate}T00:00:00Z`;
        const end = `${selectedDate}T23:59:59Z`;
        query = query.gte('counting_date', start).lte('counting_date', end);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setCounts(data);
      }
    } catch (err: any) {
      console.error("Error fetching counts:", err);
      // If it's a schema error, maybe the table is missing columns
      if (err.message?.includes("column") || err.message?.includes("relation")) {
        console.warn("Database schema issue detected for cycle_counts");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const setToday = () => {
    setSelectedDate(getLocalToday());
  };

  const setYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleSkuLookup = async (lookupSku: string) => {
    if (!lookupSku) return;
    setIsSearching(true);
    try {
      // 1. Fetch Item Master Details
      const { data: item, error: itemError } = await supabase
        .from('items')
        .select('name, location, uom, on_hand_stock')
        .eq('sku', lookupSku)
        .maybeSingle();

      if (item && !itemError) {
        setItemName(item.name);
        setLocation(item.location || 'N/A');
        setUom(item.uom || 'PC');
        setSystemQty(item.on_hand_stock || 0);
      } else {
        setItemName('ITEM NOT FOUND');
        setLocation('');
        setUom('');
        setSystemQty(0);
      }

      // 2. Fetch Pending Receive (Open POs)
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('items')
        .eq('status', 'Open');
      
      let pReceive = 0;
      if (pos) {
        pos.forEach(po => {
          (po.items || []).forEach((i: any) => {
            if (i.sku === lookupSku) pReceive += (Number(i.poQty) || 0);
          });
        });
      }
      setPendingReceive(pReceive);

      // 3. Fetch Pending Issue (Approved MOs)
      const { data: mos } = await supabase
        .from('move_orders')
        .select('items')
        .eq('status', 'Approved');
      
      let pIssue = 0;
      if (mos) {
        mos.forEach(mo => {
          (mo.items || []).forEach((i: any) => {
            if (i.sku === lookupSku) pIssue += (Number(i.reqQty) || 0);
          });
        });
      }
      setPendingIssue(pIssue);

    } catch (err) {
      console.error("Lookup error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sku) {
      alert("Please enter or scan a SKU.");
      return;
    }
    
    if (physicalQty === '') {
      alert("Please enter the physical quantity counted.");
      return;
    }

    if (itemName === 'ITEM NOT FOUND') {
      alert("This SKU does not exist in the Item Master. You can only perform cycle counting for existing items.");
      return;
    }

    if (isSearching) {
      alert("Please wait for item lookup to complete.");
      return;
    }

    setIsSubmitting(true);
    try {
      const shortOver = Number(physicalQty) - systemQty;
      
      const { error } = await supabase.from('cycle_counts').insert([{
        sku,
        item_name: itemName,
        location,
        uom,
        system_qty: systemQty,
        physical_qty: Number(physicalQty),
        pending_receive: pendingReceive,
        pending_issue: pendingIssue,
        short_over: shortOver,
        remarks,
        user_id: user?.username || 'SYSTEM_USER',
        counting_date: new Date().toISOString()
      }]);

      if (error) {
        console.error("Supabase Insert Error:", error);
        throw error;
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setView('list');
        resetForm();
        fetchCounts();
      }, 2000);

    } catch (err: any) {
      console.error("Full Error Object:", err);
      alert("Error saving count: " + (err.message || "Unknown error occurred. Check console."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSku('');
    setItemName('');
    setLocation('');
    setUom('');
    setSystemQty(0);
    setPendingReceive(0);
    setPendingIssue(0);
    setPhysicalQty('');
    setRemarks('');
  };

  const handleScannedCode = (code: string) => {
    setSku(code);
    handleSkuLookup(code);
    setIsScannerOpen(false);
  };

  const filteredCounts = useMemo(() => {
    return counts.filter(c => {
      const countDate = c.counting_date ? c.counting_date.split('T')[0] : '';
      const matchesDate = !selectedDate || countDate === selectedDate;
      
      const matchesColumnFilters = Object.entries(columnFilters).every(([column, value]) => {
        if (!value) return true;
        const itemValue = String((c as any)[column] || '').toLowerCase();
        return itemValue.includes(value.toLowerCase());
      });

      return matchesDate && matchesColumnFilters;
    });
  }, [counts, selectedDate, columnFilters]);

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredCounts);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cycle Counts");
    XLSX.writeFile(workbook, `Cycle_Counts_${selectedDate}.xlsx`);
  };

  if (view === 'add') {
    return (
      <div className="flex flex-col space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[11px] font-bold text-[#2d808e] uppercase">
            <Home size={14} className="text-gray-400" />
            <span className="text-gray-300">/</span>
            <span className="text-gray-400">Warehouse</span>
            <span className="text-gray-300">/</span>
            <span className="border border-[#2d808e] px-2 py-0.5 rounded text-[#2d808e] font-bold">New Cycle Count</span>
          </div>
          <button 
            onClick={() => { setView('list'); resetForm(); }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
          <div className="p-8 md:p-12">
            <div className="flex items-center space-x-4 mb-10">
              <div className="w-12 h-12 bg-[#2d808e]/10 rounded-2xl flex items-center justify-center">
                <ScanLine size={24} className="text-[#2d808e]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 uppercase">Daily Cycle Counting</h2>
                <p className="text-sm text-gray-400 font-medium">Verify physical inventory against system records</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* SKU Input */}
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Item SKU / Scanner</label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <ItemSearchInput
                        value={sku}
                        onChange={(val) => setSku(val)}
                        onSelect={(data) => {
                          setSku(data.sku);
                          handleSkuLookup(data.sku);
                        }}
                        placeholder="Scan or type SKU..."
                        searchField="sku"
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:border-[#2d808e] focus:bg-white outline-none text-sm font-bold text-[#2d808e] uppercase transition-all"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="p-4 bg-[#2d808e] text-white rounded-2xl hover:bg-[#256b78] transition-all shadow-lg shadow-[#2d808e]/20"
                    >
                      <ScanLine size={24} />
                    </button>
                  </div>
                  <div className="mt-4">
                    <label className="text-[11px] font-bold text-gray-400 uppercase">Item Name</label>
                    <ItemSearchInput
                      value={itemName}
                      onChange={(val) => setItemName(val)}
                      onSelect={(data) => {
                        setSku(data.sku);
                        handleSkuLookup(data.sku);
                      }}
                      placeholder="Search by name..."
                      searchField="name"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:border-[#2d808e] focus:bg-white outline-none text-sm font-bold text-[#2d808e] uppercase transition-all"
                    />
                  </div>
                  {itemName && itemName !== 'ITEM NOT FOUND' && (
                    <div className="flex items-center space-x-2 mt-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase bg-[#2d808e]/5 text-[#2d808e]">
                      <CheckCircle2 size={14} />
                      <span>{itemName}</span>
                    </div>
                  )}
                  {itemName === 'ITEM NOT FOUND' && (
                    <div className="flex items-center space-x-2 mt-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase bg-red-50 text-red-500">
                      <X size={14} />
                      <span>{itemName}</span>
                    </div>
                  )}
                </div>

                {/* Location & UOM */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 uppercase">Location</label>
                    <div className="px-5 py-4 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-gray-500 uppercase">
                      {location || '---'}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 uppercase">UOM</label>
                    <div className="px-5 py-4 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-gray-500 uppercase">
                      {uom || '---'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {hasGranularPermission('cc_form_system_qty', 'view') && (
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">System Qty</p>
                    <p className="text-xl font-bold text-gray-800">{systemQty}</p>
                  </div>
                )}
                {hasGranularPermission('cc_form_pend_receive', 'view') && (
                  <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Pend. Receive</p>
                    <p className="text-xl font-bold text-blue-600">{pendingReceive}</p>
                  </div>
                )}
                {hasGranularPermission('cc_form_pend_issue', 'view') && (
                  <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-400 uppercase mb-1">Pend. Issue</p>
                    <p className="text-xl font-bold text-amber-600">{pendingIssue}</p>
                  </div>
                )}
                {hasGranularPermission('cc_form_short_over', 'view') && (
                  <div className="p-5 bg-[#2d808e]/5 rounded-2xl border border-[#2d808e]/10">
                    <p className="text-[10px] font-bold text-[#2d808e] uppercase mb-1">Short / Over</p>
                    <p className={`text-xl font-bold ${physicalQty !== '' ? (Number(physicalQty) - systemQty >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-400'}`}>
                      {physicalQty !== '' ? (Number(physicalQty) - systemQty > 0 ? `+${Number(physicalQty) - systemQty}` : Number(physicalQty) - systemQty) : '0'}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-[#2d808e] uppercase tracking-widest">Physical Quantity</label>
                  <input 
                    type="number" 
                    value={physicalQty}
                    onChange={(e) => setPhysicalQty(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Enter actual count..."
                    required
                    className="w-full px-5 py-4 bg-white border-2 border-[#2d808e]/20 rounded-2xl focus:border-[#2d808e] outline-none text-lg font-black text-gray-800 transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Remarks</label>
                  <input 
                    type="text" 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Any observations..."
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:border-[#2d808e] focus:bg-white outline-none text-sm font-bold text-gray-800 transition-all"
                  />
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit"
                  disabled={isSubmitting || !sku || physicalQty === '' || itemName === 'ITEM NOT FOUND'}
                  className="w-full py-5 bg-[#2d808e] text-white text-sm font-black uppercase rounded-2xl tracking-[0.2em] hover:bg-[#256b78] shadow-xl shadow-[#2d808e]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : showSuccess ? (
                    <>
                      <CheckCircle2 size={20} />
                      <span>Count Recorded</span>
                    </>
                  ) : (
                    <span>Submit Cycle Count</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {isScannerOpen && (
          <ScannerModal 
            onScan={handleScannedCode} 
            onClose={() => setIsScannerOpen(false)} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">
          <Home size={14} className="text-gray-400" />
          <span className="text-gray-300">/</span>
          <span className="text-gray-400">Warehouse</span>
          <span className="text-gray-300">/</span>
          <span className="border border-[#2d808e] px-2 py-0.5 rounded text-[#2d808e] font-black">Cycle Counting</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center gap-2 mr-2">
            <button 
              onClick={setToday}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all shadow-sm ${selectedDate === getLocalToday() ? 'bg-[#2d808e] text-white border border-[#2d808e]' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              Today
            </button>
            <button 
              onClick={setYesterday}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all shadow-sm ${selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'bg-[#2d808e] text-white border border-[#2d808e]' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              Yesterday
            </button>
          </div>
          <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm focus-within:border-[#2d808e]/50 transition-all">
            <Calendar size={14} className="text-gray-400 mr-2" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-[11px] font-black text-gray-700 outline-none uppercase bg-transparent"
            />
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate('')}
                className="ml-2 p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                title="Clear Date Filter"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button 
            onClick={handleExportExcel}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-[11px] font-bold uppercase rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <FileSpreadsheet size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button 
            onClick={() => setView('add')}
            className="flex items-center space-x-2 px-5 py-2 bg-[#2d808e] text-white text-[11px] font-bold uppercase rounded-xl hover:bg-[#256b78] transition-all shadow-lg shadow-[#2d808e]/20"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Count</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {selectedDate && filteredCounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {hasGranularPermission('cc_daily_counts', 'view') && (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Daily Counts</p>
              <p className="text-xl font-black text-[#2d808e]">{filteredCounts.length}</p>
            </div>
          )}
          {hasGranularPermission('cc_daily_shortage', 'view') && (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Daily Shortage</p>
              <p className="text-xl font-black text-red-600">
                {filteredCounts.reduce((acc, c) => acc + (c.short_over < 0 ? Math.abs(c.short_over) : 0), 0)}
              </p>
            </div>
          )}
          {hasGranularPermission('cc_daily_overage', 'view') && (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Daily Overage</p>
              <p className="text-xl font-black text-emerald-600">
                {filteredCounts.reduce((acc, c) => acc + (c.short_over > 0 ? c.short_over : 0), 0)}
              </p>
            </div>
          )}
          {hasGranularPermission('cc_daily_variance', 'view') && (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Daily Variance</p>
              <p className={`text-xl font-black ${filteredCounts.reduce((acc, c) => acc + c.short_over, 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {filteredCounts.reduce((acc, c) => acc + c.short_over, 0) > 0 ? '+' : ''}{filteredCounts.reduce((acc, c) => acc + c.short_over, 0)}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead className="bg-[#fcfcfc]">
              <tr className="text-[10px] font-bold text-gray-400 border-b border-gray-100 uppercase">
                <th className="px-6 py-5 text-center w-16">SL</th>
                <th className="px-6 py-5">
                  <div className="flex items-center">
                    <span>Date</span>
                    <ColumnFilter columnName="Date" currentValue={columnFilters.counting_date || ''} onFilter={(val) => setColumnFilters(prev => ({...prev, counting_date: val}))} />
                  </div>
                </th>
                <th className="px-6 py-5">
                  <div className="flex items-center">
                    <span>User ID</span>
                    <ColumnFilter columnName="User" currentValue={columnFilters.user_id || ''} onFilter={(val) => setColumnFilters(prev => ({...prev, user_id: val}))} />
                  </div>
                </th>
                <th className="px-6 py-5">
                  <div className="flex items-center">
                    <span>SKU</span>
                    <ColumnFilter columnName="SKU" currentValue={columnFilters.sku || ''} onFilter={(val) => setColumnFilters(prev => ({...prev, sku: val}))} />
                  </div>
                </th>
                <th className="px-6 py-5">
                  <div className="flex items-center">
                    <span>Item Name</span>
                    <ColumnFilter columnName="Name" currentValue={columnFilters.item_name || ''} onFilter={(val) => setColumnFilters(prev => ({...prev, item_name: val}))} />
                  </div>
                </th>
                <th className="px-6 py-5">
                  <div className="flex items-center">
                    <span>Location</span>
                    <ColumnFilter columnName="Loc" currentValue={columnFilters.location || ''} onFilter={(val) => setColumnFilters(prev => ({...prev, location: val}))} />
                  </div>
                </th>
                <th className="px-6 py-5 text-center">UOM</th>
                <th className="px-6 py-5 text-center bg-gray-50/50">Physical</th>
                <th className="px-6 py-5 text-center">System</th>
                <th className="px-6 py-5 text-center text-blue-600">Pend. Rec.</th>
                <th className="px-6 py-5 text-center text-amber-600">Pend. Iss.</th>
                <th className="px-6 py-5 text-center font-bold">Short/Over</th>
                <th className="px-6 py-5">Remarks</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-medium text-gray-600 uppercase">
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <Loader2 size={40} className="animate-spin text-[#2d808e]" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Scanning Records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCounts.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center space-y-3 opacity-20">
                      <History size={48} />
                      <span className="text-[10px] font-bold uppercase">No counting history for this period</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCounts.map((count, idx) => (
                  <tr key={count.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-center text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(count.counting_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{count.user_id}</td>
                    <td className="px-6 py-4 text-[#2d808e]">{count.sku}</td>
                    <td className="px-6 py-4 text-gray-800">{count.item_name}</td>
                    <td className="px-6 py-4">{count.location}</td>
                    <td className="px-6 py-4 text-center">{count.uom}</td>
                    <td className="px-6 py-4 text-center bg-gray-50/30 text-gray-900">{count.physical_qty}</td>
                    <td className="px-6 py-4 text-center">{count.system_qty}</td>
                    <td className="px-6 py-4 text-center text-blue-600">{count.pending_receive}</td>
                    <td className="px-6 py-4 text-center text-amber-600">{count.pending_issue}</td>
                    <td className={`px-6 py-4 text-center font-bold ${count.short_over >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {count.short_over > 0 ? `+${count.short_over}` : count.short_over}
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-medium normal-case">{count.remarks || '---'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CycleCounting;
