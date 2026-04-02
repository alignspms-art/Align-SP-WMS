
import React, { useState, useMemo } from 'react';
import { Home, FileSpreadsheet, Inbox, ChevronDown, Search, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import MODetailsModal from './MODetailsModal';
import ColumnFilter from './ColumnFilter';

const MOReport: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [dateStart, setDateStart] = useState(today);
  const [dateEnd, setDateEnd] = useState(today);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [selectedMo, setSelectedMo] = useState<any>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const fetchReport = async () => {
    setLoading(true);
    try {
      let query = supabase.from('move_orders').select('*');
      
      if (dateStart && dateEnd) {
        query = query.gte('created_at', `${dateStart}T00:00:00`).lte('created_at', `${dateEnd}T23:59:59`);
      }

      if (statusFilter !== 'All') {
        let dbStatus = statusFilter;
        if (statusFilter === 'In-Process') dbStatus = 'Pending';
        if (statusFilter === 'Hold') dbStatus = 'On Hold';
        if (statusFilter === 'ISSUED') dbStatus = 'Completed';
        query = query.eq('status', dbStatus);
      }

      const { data: moveOrders, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (moveOrders) {
        const flattened: any[] = [];
        let sl = 1;
        moveOrders.forEach(mo => {
          const items = mo.items || [];
          items.forEach((item: any) => {
            const matchesSearch = !searchQuery || 
              item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
              item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return;

            flattened.push({
              sl: sl++,
              date: new Date(mo.created_at).toLocaleDateString(),
              moRef: mo.mo_no,
              moNo: mo.reference || mo.mo_no,
              sku: item.sku || 'N/A',
              name: item.name || 'N/A',
              uom: item.uom || 'N/A',
              unitPrice: Number(item.unitPrice) || 0,
              moQty: Number(item.reqQty) || 0,
              moValue: (Number(item.reqQty) || 0) * (Number(item.unitPrice) || 0),
              issueQty: Number(item.issuedQty || 0),
              issueValue: (Number(item.issuedQty || 0)) * (Number(item.unitPrice) || 0),
              costCenter: mo.department || 'N/A',
              status: mo.status,
              createdBy: mo.requested_by || 'System',
              updatedBy: mo.updated_by || 'System',
              fullMo: mo // Keep reference to original object for details view
            });
          });
        });
        setReportData(flattened);
      }
    } catch (err) {
      console.error("Error fetching MO report:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReportData = useMemo(() => {
    return reportData.filter(row => {
      return Object.entries(columnFilters).every(([column, value]) => {
        if (!value) return true;
        const itemValue = String(row[column] || '').toLowerCase();
        return itemValue.includes(value.toLowerCase());
      });
    });
  }, [reportData, columnFilters]);

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const columnSuggestions = useMemo(() => {
    const suggestions: Record<string, string[]> = {};
    const columns = ['date', 'moRef', 'moNo', 'sku', 'name', 'uom', 'costCenter', 'status', 'createdBy'];
    
    columns.forEach(col => {
      const uniqueValues = Array.from(new Set(reportData.map(item => String(item[col] || ''))))
        .filter(val => val && val !== 'N/A')
        .sort();
      suggestions[col] = uniqueValues;
    });
    
    return suggestions;
  }, [reportData]);

  const handleExportExcel = () => {
    try {
      const exportData = filteredReportData.length > 0 ? filteredReportData : [{ Message: "No data found" }];
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "MO Report");
      XLSX.writeFile(workbook, `MO_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'approved': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pending': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'on hold': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col space-y-4 font-sans">
      <div className="flex items-center space-x-2 text-[10px] font-bold text-[#2d808e] uppercase tracking-wider">
        <Home size={12} className="text-[#2d808e]" />
        <span className="text-gray-300">/</span>
        <span className="text-[#2d808e] cursor-pointer">MO-REPORT</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-lg border border-gray-100 shadow-sm justify-end">
        <div className="relative min-w-[200px]">
          <input 
            type="text" 
            placeholder="Search Name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded text-[11px] font-medium outline-none focus:border-[#2d808e]"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="flex items-center space-x-2">
          <input 
            type="date" 
            value={dateStart} 
            onChange={(e) => setDateStart(e.target.value)} 
            className="border border-gray-200 rounded px-2 py-1.5 text-[11px] outline-none focus:border-[#2d808e] w-[130px]" 
          />
          <span className="text-gray-300 text-[11px]">to</span>
          <input 
            type="date" 
            value={dateEnd} 
            onChange={(e) => setDateEnd(e.target.value)} 
            className="border border-gray-200 rounded px-2 py-1.5 text-[11px] outline-none focus:border-[#2d808e] w-[130px]" 
          />
        </div>

        <div className="relative min-w-[150px]">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="w-full appearance-none bg-white border border-gray-200 rounded px-3 py-1.5 text-[11px] font-bold outline-none focus:border-[#2d808e]"
          >
            <option value="All">All Status</option>
            <option value="In-Process">In-Process</option>
            <option value="Approved">Approved</option>
            <option value="ISSUED">ISSUED</option>
            <option value="Hold">Hold</option>
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <button 
          onClick={fetchReport}
          disabled={loading}
          className="bg-[#2d808e] text-white px-8 py-1.5 rounded text-[11px] font-black shadow-sm hover:bg-[#256b78] transition-all flex items-center gap-2 uppercase"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : null}
          Find
        </button>
      </div>

      <div className="flex justify-end">
        <button onClick={handleExportExcel} className="flex items-center space-x-1.5 border border-[#2d808e] bg-white px-4 py-1.5 rounded text-[11px] font-bold text-[#2d808e] hover:bg-cyan-50 transition-all shadow-sm uppercase tracking-tight">
          <FileSpreadsheet size={14} />
          <span>Export Excel</span>
        </button>
      </div>

      <div className="bg-white rounded border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[2000px]">
            <thead className="bg-[#fcfcfc] sticky top-0 z-10">
              <tr className="text-[10px] font-black text-gray-500 border-b border-gray-100 uppercase tracking-widest">
                <th className="px-3 py-4 text-center w-12 border-r border-gray-50">SL</th>
                <th className="px-3 py-4 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Date</span>
                    <ColumnFilter columnName="Date" currentValue={columnFilters.date || ''} onFilter={(val) => handleColumnFilter('date', val)} suggestions={columnSuggestions.date} />
                  </div>
                </th>
                <th className="px-3 py-4 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Ref No</span>
                    <ColumnFilter columnName="Ref" currentValue={columnFilters.moRef || ''} onFilter={(val) => handleColumnFilter('moRef', val)} suggestions={columnSuggestions.moRef} />
                  </div>
                </th>
                <th className="px-3 py-4 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>TNX.NO</span>
                    <ColumnFilter columnName="MO No" currentValue={columnFilters.moNo || ''} onFilter={(val) => handleColumnFilter('moNo', val)} suggestions={columnSuggestions.moNo} />
                  </div>
                </th>
                <th className="px-3 py-4 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>SKU</span>
                    <ColumnFilter columnName="SKU" currentValue={columnFilters.sku || ''} onFilter={(val) => handleColumnFilter('sku', val)} suggestions={columnSuggestions.sku} />
                  </div>
                </th>
                <th className="px-3 py-4 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Name</span>
                    <ColumnFilter columnName="Name" currentValue={columnFilters.name || ''} onFilter={(val) => handleColumnFilter('name', val)} suggestions={columnSuggestions.name} />
                  </div>
                </th>
                <th className="px-3 py-4 border-r border-gray-50 text-center">UOM</th>
                <th className="px-3 py-4 border-r border-gray-50 text-right">Unit Price</th>
                <th className="px-3 py-4 border-r border-gray-50 text-center">MO Qty</th>
                <th className="px-3 py-4 border-r border-gray-50 text-right">MO Value</th>
                <th className="px-3 py-4 border-r border-gray-50 text-center">Issue Qty</th>
                <th className="px-3 py-4 border-r border-gray-50 text-right">Issue Value</th>
                <th className="px-3 py-4 border-r border-gray-50 text-center">
                  <div className="flex items-center justify-center">
                    <span>Cost Center</span>
                    <ColumnFilter columnName="Cost Center" currentValue={columnFilters.costCenter || ''} onFilter={(val) => handleColumnFilter('costCenter', val)} suggestions={columnSuggestions.costCenter} />
                  </div>
                </th>
                <th className="px-3 py-4 border-r border-gray-50 text-center">
                  <div className="flex items-center justify-center">
                    <span>Status</span>
                    <ColumnFilter columnName="Status" currentValue={columnFilters.status || ''} onFilter={(val) => handleColumnFilter('status', val)} suggestions={columnSuggestions.status} />
                  </div>
                </th>
                <th className="px-3 py-4 border-r border-gray-50 text-center">
                  <div className="flex items-center justify-center">
                    <span>Created By</span>
                    <ColumnFilter columnName="By" currentValue={columnFilters.createdBy || ''} onFilter={(val) => handleColumnFilter('createdBy', val)} suggestions={columnSuggestions.createdBy} />
                  </div>
                </th>
                <th className="px-3 py-4 text-center">Updated By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={16} className="py-32 text-center text-gray-400 uppercase font-black text-[11px] tracking-widest">
                    <Loader2 size={32} className="animate-spin text-[#2d808e] mx-auto mb-4" />
                    Scanning Database Records...
                  </td>
                </tr>
              ) : filteredReportData.length > 0 ? (
                filteredReportData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50 text-[10px] hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-3 text-center border-r border-gray-50 text-gray-400">{row.sl}</td>
                    <td className="px-3 py-3 border-r border-gray-50 whitespace-nowrap">{row.date}</td>
                    <td className="px-3 py-3 border-r border-gray-50 text-gray-500 font-medium">{row.moRef}</td>
                    <td className="px-3 py-3 border-r border-gray-50 font-black text-blue-500">
                      <button 
                        onClick={() => setSelectedMo(row.fullMo)} 
                        className="hover:underline hover:text-blue-700 transition-all cursor-pointer"
                      >
                        {row.moNo}
                      </button>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-50 font-bold text-gray-600">{row.sku}</td>
                    <td className="px-3 py-3 border-r border-gray-50 font-black uppercase text-gray-800 leading-tight">{row.name}</td>
                    <td className="px-3 py-3 border-r border-gray-50 text-center uppercase font-bold text-gray-400">{row.uom}</td>
                    <td className="px-3 py-3 border-r border-gray-50 text-right font-bold text-gray-700">{row.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 border-r border-gray-50 text-center font-black text-gray-800">{row.moQty}</td>
                    <td className="px-3 py-3 border-r border-gray-50 text-right font-black text-[#2d808e]">{row.moValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 border-r border-gray-50 text-center font-black text-emerald-600">{row.issueQty}</td>
                    <td className="px-3 py-3 border-r border-gray-50 text-right font-black text-emerald-600">{row.issueValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 border-r border-gray-50 text-center font-bold uppercase text-gray-500">{row.costCenter}</td>
                    <td className="px-3 py-3 border-r border-gray-50 text-center">
                      <span className={`px-3 py-0.5 rounded-full text-[8px] font-black uppercase border shadow-sm ${getStatusStyle(row.status)}`}>
                        {row.status === 'Pending' ? 'In-Process' : row.status === 'Completed' ? 'ISSUED' : row.status === 'On Hold' ? 'Hold' : row.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-50 text-center whitespace-nowrap text-gray-400 font-bold uppercase">{row.createdBy}</td>
                    <td className="px-3 py-3 text-center whitespace-nowrap text-gray-400 font-bold uppercase">{row.updatedBy}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={16} className="py-40">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="bg-gray-50 p-6 rounded-full mb-4 ring-1 ring-gray-100">
                        <Inbox size={64} strokeWidth={1} className="text-gray-200" />
                      </div>
                      <p className="text-[12px] font-black uppercase tracking-[0.3em] text-gray-300">No Move Order History</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-200 mt-2">Filter and click Find to query</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedMo && <MODetailsModal mo={selectedMo} onClose={() => setSelectedMo(null)} />}
    </div>
  );
};

export default MOReport;
