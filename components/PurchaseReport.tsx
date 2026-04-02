
import React, { useState, useEffect, useMemo } from 'react';
import { Home, FileSpreadsheet, Inbox, Filter, ChevronDown, Loader2, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import ColumnFilter from './ColumnFilter';

interface PurchaseReportEntry {
  sl: number;
  tnxDate: string;
  tnxType: string;
  docRef: string;
  sku: string;
  name: string;
  uom: string;
  unitPrice: number;
  qty: number;
  tnxValue: number;
  status: string;
  createdBy: string;
  updatedBy: string;
}

const PurchaseReport: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  
  // State for Filters
  const [skuSearch, setSkuSearch] = useState('');
  const [filterDateStart, setFilterDateStart] = useState(today);
  const [filterDateEnd, setFilterDateEnd] = useState(today);
  const [tnxType, setTnxType] = useState('All');
  const [status, setStatus] = useState('All');
  const [docRef, setDocRef] = useState('');
  
  const [reportData, setReportData] = useState<PurchaseReportEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const fetchReport = async () => {
    setLoading(true);
    try {
      const allData: PurchaseReportEntry[] = [];
      let slCount = 1;

      // Logic: If tnxType is 'All' or 'Purchase Requisition', fetch PRs
      if (tnxType === 'All' || tnxType === 'Purchase Requisition') {
        let query = supabase.from('requisitions').select('*');
        
        if (filterDateStart && filterDateEnd) {
          query = query.gte('created_at', `${filterDateStart}T00:00:00`).lte('created_at', `${filterDateEnd}T23:59:59`);
        }
        if (status !== 'All') {
          // Map UI "Pending" back to DB "Open" if necessary, though PRs usually use "Pending"
          const dbStatus = status === 'Pending' ? 'Open' : status;
          query = query.eq('status', dbStatus);
        }
        if (docRef) {
          query = query.ilike('pr_no', `%${docRef}%`);
        }

        const { data: prData } = await query;
        
        if (prData) {
          prData.forEach(pr => {
            const items = pr.items || [];
            items.forEach((item: any) => {
              // Apply SKU filter locally if SKU search is active
              if (skuSearch && !item.sku?.toLowerCase().includes(skuSearch.toLowerCase())) return;

              allData.push({
                sl: slCount++,
                tnxDate: new Date(pr.created_at).toLocaleDateString(),
                tnxType: 'Purchase Requisition',
                docRef: pr.pr_no,
                sku: item.sku || 'N/A',
                name: item.name || 'N/A',
                uom: item.uom || 'N/A',
                unitPrice: Number(item.unitPrice) || 0,
                qty: Number(item.reqQty) || 0,
                tnxValue: (Number(item.reqQty) || 0) * (Number(item.unitPrice) || 0),
                status: pr.status,
                createdBy: pr.req_by_name || 'System',
                updatedBy: 'System'
              });
            });
          });
        }
      }

      // Logic: If tnxType is 'All' or 'Purchase Order', fetch POs
      if (tnxType === 'All' || tnxType === 'Purchase Order') {
        let query = supabase.from('purchase_orders').select('*');
        
        if (filterDateStart && filterDateEnd) {
          query = query.gte('created_at', `${filterDateStart}T00:00:00`).lte('created_at', `${filterDateEnd}T23:59:59`);
        }
        if (status !== 'All') {
          // POs in this system often use "Open" as initial state. Map UI "Pending" to DB "Open".
          const dbStatus = status === 'Pending' ? 'Open' : status;
          query = query.eq('status', dbStatus);
        }
        if (docRef) {
          query = query.ilike('po_no', `%${docRef}%`);
        }

        const { data: poData } = await query;
        
        if (poData) {
          poData.forEach(po => {
            const items = po.items || [];
            items.forEach((item: any) => {
              if (skuSearch && !item.sku?.toLowerCase().includes(skuSearch.toLowerCase())) return;

              allData.push({
                sl: slCount++,
                tnxDate: new Date(po.created_at).toLocaleDateString(),
                tnxType: 'Purchase Order',
                docRef: po.po_no,
                sku: item.sku || 'N/A',
                name: item.name || 'N/A',
                uom: item.uom || 'N/A',
                unitPrice: Number(item.poPrice) || 0,
                qty: Number(item.poQty) || 0,
                tnxValue: (Number(item.poQty) || 0) * (Number(item.poPrice) || 0),
                status: po.status,
                createdBy: 'System',
                updatedBy: 'System'
              });
            });
          });
        }
      }

      setReportData(allData);
    } catch (err) {
      console.error("Report fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReportData = useMemo(() => {
    return reportData.filter(row => {
      return Object.entries(columnFilters).every(([column, value]) => {
        if (!value) return true;
        const itemValue = String(row[column as keyof PurchaseReportEntry] || '').toLowerCase();
        return itemValue.includes(value.toLowerCase());
      });
    });
  }, [reportData, columnFilters]);

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const columnSuggestions = useMemo(() => {
    const suggestions: Record<string, string[]> = {};
    const columns = ['tnxType', 'docRef', 'sku', 'name', 'uom', 'status', 'createdBy'];
    
    columns.forEach(col => {
      const uniqueValues = Array.from(new Set(reportData.map(item => String(item[col as keyof PurchaseReportEntry] || ''))))
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
      XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Report");
      XLSX.writeFile(workbook, `Purchase_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <div className="flex flex-col space-y-4 font-sans antialiased">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-[10px] font-bold text-[#2d808e] uppercase tracking-wider">
          <Home size={12} className="text-gray-400" />
          <span className="text-gray-300">/</span>
          <span>PURCHASE-REPORT</span>
        </div>

        {/* Filters Area */}
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {/* Field 1: SKU Search from Master */}
          <div className="relative flex-1 min-w-[150px] md:flex-initial">
             <input 
              type="text" 
              placeholder="Search Item SKU"
              value={skuSearch}
              onChange={(e) => setSkuSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-[11px] text-gray-600 font-medium outline-none focus:border-[#2d808e] transition-all"
            />
            <Search size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
          </div>

          {/* Field 2: Start Date */}
          <div className="relative flex-1 min-w-[130px] md:flex-initial">
            <input 
              type="date" 
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 rounded px-2 py-1.5 text-[11px] text-gray-600 font-medium outline-none focus:border-[#2d808e] transition-all"
            />
          </div>

          {/* Field 3: End Date */}
          <div className="relative flex-1 min-w-[130px] md:flex-initial">
            <input 
              type="date" 
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 rounded px-2 py-1.5 text-[11px] text-gray-600 font-medium outline-none focus:border-[#2d808e] transition-all"
            />
          </div>

          {/* Field 4: Dropdown (All, Purchase Requisition, Purchase Order) */}
          <div className="relative flex-1 min-w-[150px] md:flex-initial">
            <select 
              value={tnxType}
              onChange={(e) => setTnxType(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 rounded px-3 py-1.5 text-[11px] text-gray-600 font-black outline-none focus:border-[#2d808e] transition-all"
            >
              <option value="All">All</option>
              <option value="Purchase Requisition">Purchase Requisition</option>
              <option value="Purchase Order">Purchase Order</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
          </div>

          {/* Field 5: Dropdown (All, Ordered, Pending, Approved) */}
          <div className="relative flex-1 min-w-[120px] md:flex-initial">
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 rounded px-3 py-1.5 text-[11px] text-gray-600 font-medium outline-none focus:border-[#2d808e] transition-all"
            >
              <option value="All">All</option>
              <option value="Ordered">Ordered</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
          </div>

          {/* Field 6: According to PR OR PO number */}
          <input 
            type="text" 
            placeholder="PR / PO Number"
            value={docRef}
            onChange={(e) => setDocRef(e.target.value)}
            className="flex-1 md:flex-initial bg-white border border-gray-200 rounded px-3 py-1.5 text-[11px] text-gray-600 font-medium outline-none focus:border-[#2d808e] transition-all md:w-[130px]"
          />

          <button 
            onClick={fetchReport}
            disabled={loading}
            className="bg-[#2d808e] text-white px-8 py-1.5 rounded text-[11px] font-black shadow-sm hover:bg-[#256b78] transition-all whitespace-nowrap flex items-center gap-2"
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            Find
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleExportExcel}
          className="flex items-center space-x-1.5 border border-[#2d808e] bg-white px-3 py-1 rounded text-[10px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
        >
          <FileSpreadsheet size={13} className="text-gray-900" />
          <span>Excel</span>
        </button>
      </div>

      <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead className="bg-[#fcfcfc]">
              <tr className="text-[10px] font-bold text-gray-800 border-b border-gray-100 uppercase tracking-tighter">
                <th className="px-4 py-4 text-center w-12 border-r border-gray-50">SL</th>
                <th className="px-4 py-4 text-left border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Tnx. Date</span>
                    <ColumnFilter columnName="Date" currentValue={columnFilters.tnxDate || ''} onFilter={(val) => handleColumnFilter('tnxDate', val)} suggestions={columnSuggestions.tnxDate} />
                  </div>
                </th>
                <th className="px-4 py-4 text-left border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Tnx. Type</span>
                    <ColumnFilter columnName="Type" currentValue={columnFilters.tnxType || ''} onFilter={(val) => handleColumnFilter('tnxType', val)} suggestions={columnSuggestions.tnxType} />
                  </div>
                </th>
                <th className="px-4 py-4 text-left border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Doc.Ref</span>
                    <ColumnFilter columnName="Doc Ref" currentValue={columnFilters.docRef || ''} onFilter={(val) => handleColumnFilter('docRef', val)} suggestions={columnSuggestions.docRef} />
                  </div>
                </th>
                <th className="px-4 py-4 text-left border-r border-gray-50">
                  <div className="flex items-center">
                    <span>SKU</span>
                    <ColumnFilter columnName="SKU" currentValue={columnFilters.sku || ''} onFilter={(val) => handleColumnFilter('sku', val)} suggestions={columnSuggestions.sku} />
                  </div>
                </th>
                <th className="px-4 py-4 text-left border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Name</span>
                    <ColumnFilter columnName="Name" currentValue={columnFilters.name || ''} onFilter={(val) => handleColumnFilter('name', val)} suggestions={columnSuggestions.name} />
                  </div>
                </th>
                <th className="px-4 py-4 text-center border-r border-gray-50">UOM</th>
                <th className="px-4 py-4 text-right border-r border-gray-50">Unit Price</th>
                <th className="px-4 py-4 text-center border-r border-gray-50">Qty</th>
                <th className="px-4 py-4 text-right border-r border-gray-50">Trnx. Value</th>
                <th className="px-4 py-4 text-center border-r border-gray-50">
                  <div className="flex items-center justify-center">
                    <span>Status</span>
                    <ColumnFilter columnName="Status" currentValue={columnFilters.status || ''} onFilter={(val) => handleColumnFilter('status', val)} />
                  </div>
                </th>
                <th className="px-4 py-4 text-center border-r border-gray-50">
                  <div className="flex items-center justify-center">
                    <span>Created By</span>
                    <ColumnFilter columnName="By" currentValue={columnFilters.createdBy || ''} onFilter={(val) => handleColumnFilter('createdBy', val)} />
                  </div>
                </th>
                <th className="px-4 py-4 text-center">Updated By</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-medium text-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-32 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <Loader2 className="animate-spin text-[#2d808e]" size={32} />
                      <span className="font-black uppercase tracking-widest text-[10px]">Filtering Report Data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredReportData.length > 0 ? (
                filteredReportData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50 text-[10px] hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-center">{row.sl}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.tnxDate}</td>
                    <td className="px-4 py-3 font-bold text-[#2d808e]">{row.tnxType}</td>
                    <td className="px-4 py-3 text-blue-500 font-black">{row.docRef}</td>
                    <td className="px-4 py-3">{row.sku}</td>
                    <td className="px-4 py-3 font-black uppercase text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-center">{row.uom}</td>
                    <td className="px-4 py-3 text-right">{row.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center font-bold">{row.qty}</td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">{row.tnxValue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                        row.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                      }`}>
                        {row.status === 'Open' ? 'Pending' : row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap uppercase text-gray-400">{row.createdBy}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap uppercase text-gray-400">{row.updatedBy}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="py-28">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="bg-gray-50/50 p-4 rounded-full mb-3">
                        <Inbox size={56} strokeWidth={1} className="text-gray-200" />
                      </div>
                      <p className="text-[12px] font-black uppercase tracking-widest text-gray-300">Click Find to Load Records</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseReport;
