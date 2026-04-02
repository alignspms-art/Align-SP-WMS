
import React, { useState, useEffect, useMemo } from 'react';
import { Home, FileSpreadsheet, Filter, Inbox, ChevronDown, Search, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import TnxDetailsModal from './TnxDetailsModal';
import ColumnFilter from './ColumnFilter';

const TnxReport: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [dateStart, setDateStart] = useState(today);
  const [dateEnd, setDateEnd] = useState(today);
  const [searchQuery, setSearchQuery] = useState('');
  const [tnxType, setTnxType] = useState('All');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [selectedTnx, setSelectedTnx] = useState<any>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const fetchReport = async () => {
    setLoading(true);
    try {
      const combinedData: any[] = [];
      let slCount = 1;

      const { data: itemMaster } = await supabase.from('items').select('sku, name, location').limit(5000);
      const skuLocationMap: Record<string, string> = {};
      const nameLocationMap: Record<string, string> = {};
      
      if (itemMaster) {
        itemMaster.forEach(i => {
          if (i.sku) skuLocationMap[i.sku] = i.location || 'N/A';
          if (i.name) nameLocationMap[i.name.toUpperCase()] = i.location || 'N/A';
        });
      }

      const getMasterLocation = (sku: string, name: string) => {
        return (sku && skuLocationMap[sku]) || (name && nameLocationMap[name.toUpperCase()]) || 'N/A';
      };

      const getSafePrice = (item: any) => {
        return Number(item.unitPrice || item.poPrice || item.price || 0);
      };

      if (tnxType === 'All' || tnxType === 'PO' || tnxType === 'GRN') {
        let poQuery = supabase.from('purchase_orders').select('*');
        if (dateStart && dateEnd) {
          poQuery = poQuery.gte('created_at', `${dateStart}T00:00:00`).lte('created_at', `${dateEnd}T23:59:59`);
        }
        const { data: pos } = await poQuery;
        if (pos) {
          pos.forEach(po => {
            const items = po.items || [];
            items.forEach((item: any) => {
              const matchesSearch = !searchQuery || 
                item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
              if (!matchesSearch) return;

              const price = getSafePrice(item);
              if (tnxType === 'All' || tnxType === 'PO') {
                const qty = Number(item.poQty || item.reqQty || 0);
                combinedData.push({
                  sl: slCount++,
                  tnxDate: new Date(po.created_at).toLocaleDateString(),
                  docDate: new Date(po.created_at).toLocaleDateString(),
                  tnxRef: po.po_no,
                  tnxType: 'PO',
                  docRef: po.po_no,
                  sku: item.sku || 'N/A',
                  name: item.name || 'N/A',
                  uom: item.uom || 'N/A',
                  unitPrice: price,
                  tnxQty: qty,
                  tnxValue: qty * price,
                  location: item.location || getMasterLocation(item.sku, item.name),
                  costCenter: po.reqDpt || item.reqDept || 'N/A',
                  remarks: po.note || '',
                  usedOn: po.supplier_name,
                  status: po.status,
                  tnxBy: 'System',
                  fullObj: po
                });
              }
              if ((tnxType === 'All' || tnxType === 'GRN') && (Number(item.receivedQty || 0) > 0)) {
                const qty = Number(item.receivedQty || 0);
                combinedData.push({
                  sl: slCount++,
                  tnxDate: new Date(po.updated_at || po.created_at).toLocaleDateString(),
                  docDate: new Date(po.updated_at || po.created_at).toLocaleDateString(),
                  tnxRef: `GRN-${po.po_no}`,
                  tnxType: 'GRN',
                  docRef: po.po_no,
                  sku: item.sku || 'N/A',
                  name: item.name || 'N/A',
                  uom: item.uom || 'N/A',
                  unitPrice: price,
                  tnxQty: qty,
                  tnxValue: qty * price,
                  location: item.location || getMasterLocation(item.sku, item.name),
                  costCenter: po.reqDpt || item.reqDept || 'N/A',
                  remarks: 'PO Received',
                  usedOn: po.supplier_name,
                  status: 'Completed',
                  tnxBy: 'System',
                  fullObj: po
                });
              }
            });
          });
        }
      }

      if (tnxType === 'All' || tnxType === 'Move Order') {
        let moQuery = supabase.from('move_orders').select('*');
        if (dateStart && dateEnd) {
          moQuery = moQuery.gte('created_at', `${dateStart}T00:00:00`).lte('created_at', `${dateEnd}T23:59:59`);
        }
        const { data: mos } = await moQuery;
        if (mos) {
          mos.forEach(mo => {
            const items = mo.items || [];
            items.forEach((item: any) => {
              const matchesSearch = !searchQuery || 
                item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
              if (!matchesSearch) return;

              const price = getSafePrice(item);
              const qty = mo.status === 'Completed' ? Number(item.issuedQty || item.reqQty || 0) : Number(item.reqQty || 0);

              combinedData.push({
                sl: slCount++,
                tnxDate: new Date(mo.created_at).toLocaleDateString(),
                docDate: new Date(mo.created_at).toLocaleDateString(),
                tnxRef: mo.mo_no,
                tnxType: 'Move Order',
                docRef: mo.reference || mo.mo_no,
                sku: item.sku || 'N/A',
                name: item.name || 'N/A',
                uom: item.uom || 'N/A',
                unitPrice: price,
                tnxQty: qty,
                tnxValue: qty * price,
                location: item.location || getMasterLocation(item.sku, item.name),
                costCenter: mo.department || 'N/A',
                remarks: item.remarks || '',
                usedOn: mo.department,
                status: mo.status,
                tnxBy: mo.requested_by || 'System',
                fullObj: mo
              });
            });
          });
        }
      }
      setReportData(combinedData);
    } catch (err) {
      console.error(err);
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
    const columns = ['tnxType', 'tnxRef', 'docRef', 'sku', 'name', 'uom', 'location', 'costCenter', 'usedOn', 'status'];
    
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
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transaction Report");
      XLSX.writeFile(workbook, `Transaction_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    <div className="flex flex-col space-y-4">
      <div className="flex items-center space-x-2 text-[10px] font-bold text-[#2d808e] uppercase tracking-wider">
        <Home size={12} className="text-[#2d808e]" />
        <span className="text-gray-300">/</span>
        <span className="text-[#2d808e] cursor-pointer uppercase font-black">TNX-REPORT</span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
        <div className="relative min-w-[200px]">
          <input 
            type="text" 
            placeholder="Search Name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-md text-[11px] text-gray-700 font-medium outline-none focus:border-[#2d808e] transition-all"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="flex items-center space-x-2">
          <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-[11px] text-gray-600 font-medium w-[130px]" />
          <span className="text-gray-300">to</span>
          <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-[11px] text-gray-600 font-medium w-[130px]" />
        </div>

        <div className="relative min-w-[150px]">
          <select value={tnxType} onChange={(e) => setTnxType(e.target.value)} className="w-full appearance-none bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-[11px] text-gray-700 font-bold outline-none">
            <option value="All">All Transactions</option>
            <option value="PO">PO (Purchase Order)</option>
            <option value="GRN">GRN (Goods Receive)</option>
            <option value="Move Order">Move Order</option>
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        <button onClick={fetchReport} disabled={loading} className="bg-[#2d808e] text-white px-8 py-1.5 rounded text-[11px] font-black shadow-sm hover:bg-[#256b78] transition-all uppercase tracking-widest">
          {loading ? <Loader2 size={12} className="animate-spin" /> : 'Find'}
        </button>
      </div>

      <div className="flex justify-end">
        <button onClick={handleExportExcel} className="flex items-center space-x-1.5 border border-[#2d808e] bg-white px-4 py-1.5 rounded text-[11px] font-bold text-[#2d808e] hover:bg-cyan-50 transition-all uppercase tracking-tight shadow-sm">
          <FileSpreadsheet size={14} />
          <span>Export Excel</span>
        </button>
      </div>

      <div className="bg-white rounded border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[2200px]">
            <thead className="bg-[#fcfcfc] sticky top-0 z-10">
              <tr className="text-[10px] font-black text-gray-500 border-b border-gray-100 uppercase tracking-widest">
                <th className="px-4 py-4 text-center w-12 border-r border-gray-50">SL</th>
                <th className="px-4 py-4 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Tnx. Date</span>
                    <ColumnFilter columnName="Date" currentValue={columnFilters.tnxDate || ''} onFilter={(val) => handleColumnFilter('tnxDate', val)} />
                  </div>
                </th>
                <th className="px-4 py-4 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Doc. Date</span>
                    <ColumnFilter columnName="Doc Date" currentValue={columnFilters.docDate || ''} onFilter={(val) => handleColumnFilter('docDate', val)} />
                  </div>
                </th>
                <th className="px-4 py-4 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Tnx. Ref.</span>
                    <ColumnFilter columnName="Ref" currentValue={columnFilters.tnxRef || ''} onFilter={(val) => handleColumnFilter('tnxRef', val)} suggestions={columnSuggestions.tnxRef} />
                  </div>
                </th>
                <th className="px-4 py-4 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Tnx. Type</span>
                    <ColumnFilter columnName="Type" currentValue={columnFilters.tnxType || ''} onFilter={(val) => handleColumnFilter('tnxType', val)} suggestions={columnSuggestions.tnxType} />
                  </div>
                </th>
                <th className="px-4 py-4 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Doc. Ref.</span>
                    <ColumnFilter columnName="Doc Ref" currentValue={columnFilters.docRef || ''} onFilter={(val) => handleColumnFilter('docRef', val)} suggestions={columnSuggestions.docRef} />
                  </div>
                </th>
                <th className="px-4 py-4 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>SKU</span>
                    <ColumnFilter columnName="SKU" currentValue={columnFilters.sku || ''} onFilter={(val) => handleColumnFilter('sku', val)} suggestions={columnSuggestions.sku} />
                  </div>
                </th>
                <th className="px-4 py-4 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Name</span>
                    <ColumnFilter columnName="Name" currentValue={columnFilters.name || ''} onFilter={(val) => handleColumnFilter('name', val)} suggestions={columnSuggestions.name} />
                  </div>
                </th>
                <th className="px-4 py-4 border-r border-gray-50 text-center">UOM</th>
                <th className="px-4 py-4 border-r border-gray-50 text-right">Unit Price</th>
                <th className="px-4 py-4 border-r border-gray-50 text-center">Tnx. Qty</th>
                <th className="px-4 py-4 border-r border-gray-50 text-right">Tnx. Value</th>
                <th className="px-4 py-4 border-r border-gray-50 text-center">
                  <div className="flex items-center justify-center">
                    <span>Location</span>
                    <ColumnFilter columnName="Location" currentValue={columnFilters.location || ''} onFilter={(val) => handleColumnFilter('location', val)} suggestions={columnSuggestions.location} />
                  </div>
                </th>
                <th className="px-4 py-4 border-r border-gray-50 text-center">
                  <div className="flex items-center justify-center">
                    <span>Cost Center</span>
                    <ColumnFilter columnName="Cost Center" currentValue={columnFilters.costCenter || ''} onFilter={(val) => handleColumnFilter('costCenter', val)} suggestions={columnSuggestions.costCenter} />
                  </div>
                </th>
                <th className="px-4 py-4 border-r border-gray-50">Remarks</th>
                <th className="px-4 py-4 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Used On</span>
                    <ColumnFilter columnName="Used On" currentValue={columnFilters.usedOn || ''} onFilter={(val) => handleColumnFilter('usedOn', val)} suggestions={columnSuggestions.usedOn} />
                  </div>
                </th>
                <th className="px-4 py-4 border-r border-gray-50 text-center">
                  <div className="flex items-center justify-center">
                    <span>Status</span>
                    <ColumnFilter columnName="Status" currentValue={columnFilters.status || ''} onFilter={(val) => handleColumnFilter('status', val)} suggestions={columnSuggestions.status} />
                  </div>
                </th>
                <th className="px-4 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <span>Tnx. By</span>
                    <ColumnFilter columnName="By" currentValue={columnFilters.tnxBy || ''} onFilter={(val) => handleColumnFilter('tnxBy', val)} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={18} className="py-32 text-center text-gray-400">
                    <Loader2 className="animate-spin text-[#2d808e] mx-auto mb-4" size={32} />
                    <span className="font-black uppercase tracking-widest text-[10px]">Filtering Transaction Node...</span>
                  </td>
                </tr>
              ) : filteredReportData.length > 0 ? (
                filteredReportData.map((row) => (
                  <tr key={row.sl} className="border-b border-gray-50 text-[10px] hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-center border-r border-gray-50 text-gray-400">{row.sl}</td>
                    <td className="px-4 py-3 border-r border-gray-50 font-medium whitespace-nowrap">{row.tnxDate}</td>
                    <td className="px-4 py-3 border-r border-gray-50 font-medium whitespace-nowrap">{row.docDate}</td>
                    <td className="px-4 py-3 border-r border-gray-50 font-black text-blue-500 uppercase">
                      <button onClick={() => setSelectedTnx(row.fullObj)} className="hover:underline">{row.tnxRef}</button>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-50 font-black text-[#2d808e] uppercase">{row.tnxType}</td>
                    <td className="px-4 py-3 border-r border-gray-50 uppercase text-gray-500 font-bold">{row.docRef}</td>
                    <td className="px-4 py-3 border-r border-gray-50 text-gray-600 font-black">{row.sku}</td>
                    <td className="px-4 py-3 border-r border-gray-50 font-black uppercase text-gray-800 leading-tight">{row.name}</td>
                    <td className="px-4 py-3 border-r border-gray-50 text-center font-bold text-gray-400">{row.uom}</td>
                    <td className="px-4 py-3 border-r border-gray-50 text-right font-bold text-gray-700">{Number(row.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 border-r border-gray-50 text-center font-black text-gray-800">{row.tnxQty}</td>
                    <td className="px-4 py-3 border-r border-gray-50 text-right font-black text-[#2d808e]">{Number(row.tnxValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 border-r border-gray-50 text-center uppercase text-[#2d808e] font-black">{row.location}</td>
                    <td className="px-4 py-3 border-r border-gray-50 text-center uppercase text-gray-600 font-bold">{row.costCenter}</td>
                    <td className="px-4 py-3 border-r border-gray-50 text-left truncate max-w-[200px] text-gray-400 italic">{row.remarks}</td>
                    <td className="px-4 py-3 border-r border-gray-50 uppercase font-bold text-gray-500">{row.usedOn}</td>
                    <td className="px-4 py-3 border-r border-gray-50 text-center">
                      <span className={`px-3 py-0.5 rounded-full text-[8px] font-black uppercase border shadow-sm ${getStatusStyle(row.status)}`}>
                        {row.status === 'Pending' ? 'In-Process' : row.status === 'Completed' ? 'ISSUED' : row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap text-gray-400 uppercase font-black">{row.tnxBy}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={18} className="py-40 text-center">
                    <Inbox size={64} className="text-gray-200 mx-auto mb-4" />
                    <p className="text-[12px] font-black uppercase tracking-[0.3em] text-gray-300">No data found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedTnx && <TnxDetailsModal tnx={selectedTnx} onClose={() => setSelectedTnx(null)} />}
    </div>
  );
};

export default TnxReport;
