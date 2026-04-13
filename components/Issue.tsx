
import React, { useState, useEffect, useMemo } from 'react';
import { Home, Filter, Search, ChevronLeft, ChevronRight, ChevronDown, Loader2, Inbox, Eye, Printer, X as CloseIcon } from 'lucide-react';
import MaterialsMovementForm from './MaterialsMovementForm';
import ManualIssue from './ManualIssue';
import { supabase } from '../lib/supabase';
import { getPrintRoot } from '../lib/printRoot';
import ColumnFilter from './ColumnFilter';
import IssueSlipPrintTemplate from './IssueSlipPrintTemplate';

interface IssueItem {
  id: string;
  moNo: string;
  refNo: string;
  sku: string;
  name: string;
  moQty: number;
  issueQty: number;
  unitPrice: number;
  uom: string;
  reqDept: string;
  reqBy: string;
  fullMo?: any;
}

const Issue: React.FC = () => {
  const [view, setView] = useState<'list' | 'manual' | 'mo-issue'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [previewMo, setPreviewMo] = useState<any | null>(null);

  const handlePrint = (mo: any) => {
    const printSection = document.getElementById('print-section');
    if (!printSection) {
      window.print();
      return;
    }
    printSection.classList.add('printable');
    const root = getPrintRoot(printSection);
    root.render(<IssueSlipPrintTemplate mo={mo} />);
    
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        printSection.classList.remove('printable');
        root.render(null);
      }, 1000);
    }, 500);
  };

  const fetchApprovedMOs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('move_orders')
        .select('*')
        .eq('status', 'Approved')
        .order('created_at', { ascending: false });

      if (data && !error) {
        const flattened: IssueItem[] = [];
        data.forEach(mo => {
          (mo.items || []).forEach((item: any, idx: number) => {
            flattened.push({
              id: `${mo.id}_${idx}`,
              moNo: mo.mo_no,
              refNo: mo.reference || 'N/A',
              sku: item.sku || 'N/A',
              name: item.name || 'N/A',
              moQty: Number(item.reqQty) || 0,
              issueQty: Number(item.issuedQty) || 0,
              unitPrice: Number(item.unitPrice) || 0,
              uom: item.uom || 'PC',
              reqDept: mo.department || 'N/A',
              reqBy: mo.requested_by || 'N/A',
              fullMo: mo
            });
          });
        });
        setIssues(flattened);
      }
    } catch (err) {
      console.error("Fetch issues error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedMOs();
  }, []);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === issues.length && issues.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(issues.map(i => i.id)));
  };

  const handleMOIssueSubmit = (data: any) => {
    setView('list');
    setSelectedIds(new Set());
    fetchApprovedMOs();
  };

  const handleManualIssueSubmit = (data: any) => {
    setView('list');
    fetchApprovedMOs();
  };

  const filteredIssues = useMemo(() => {
    return issues.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           i.moNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           i.refNo.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesColumnFilters = Object.entries(columnFilters).every(([column, value]) => {
        if (!value) return true;
        const itemValue = String(i[column as keyof IssueItem] || '').toLowerCase();
        return itemValue.includes(value.toLowerCase());
      });

      return matchesSearch && matchesColumnFilters;
    });
  }, [issues, searchTerm, columnFilters]);

  if (view === 'mo-issue') {
    const selectedItems = issues.filter(i => selectedIds.has(i.id));
    return (
      <MaterialsMovementForm 
        selectedItems={selectedItems}
        onCancel={() => setView('list')}
        onSubmit={handleMOIssueSubmit}
      />
    );
  }

  if (view === 'manual') {
    return (
      <ManualIssue 
        onBack={() => setView('list')} 
        onSubmit={handleManualIssueSubmit} 
      />
    );
  }

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  return (
    <div className="flex flex-col space-y-4 font-sans antialiased text-gray-800">
      {/* Breadcrumbs & Top Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">
          <Home size={14} className="text-gray-400" />
          <span className="text-gray-300">/</span>
          <span className="text-[#2d808e] font-black">ISSUE</span>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-1.5 border border-[#2d808e] bg-white px-5 py-1.5 rounded text-[12px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm uppercase tracking-tight">
            <span>Logs</span>
          </button>
          <button 
            onClick={() => setView('manual')}
            className="bg-[#2d808e] text-white px-6 py-1.5 rounded text-[12px] font-black shadow-lg shadow-cyan-900/10 hover:bg-[#256b78] transition-all uppercase tracking-widest"
          >
            Manual Issue
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between pt-1">
        <button 
          onClick={() => setView('mo-issue')}
          disabled={selectedIds.size === 0}
          className={`px-8 py-2 rounded text-[12px] font-bold border transition-all uppercase tracking-widest ${
            selectedIds.size > 0 
              ? 'bg-[#2d808e] text-white border-[#2d808e] hover:bg-[#256b78] shadow-md' 
              : 'bg-[#f4f7f8] text-[#c0cdd0] border-gray-200 cursor-not-allowed'
          }`}
        >
          MO Issue
        </button>

        <div className="flex items-center">
          <div className="relative flex shadow-sm">
            <input 
              type="text" 
              placeholder="Search by Name, SKU, TNX.NO or REF.NO"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-80 px-4 py-2 border border-gray-200 rounded-l outline-none text-[12px] text-gray-600 focus:border-[#2d808e] transition-all"
            />
            <button className="bg-[#2d808e] text-white px-3.5 rounded-r flex items-center justify-center hover:bg-[#256b78] transition-colors">
              <Search size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-[#fafbfc]">
              <tr className="text-[11px] font-black text-gray-800 uppercase tracking-tight border-b border-gray-100">
                <th className="px-4 py-5 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size === issues.length && issues.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 accent-[#2d808e]"
                  />
                </th>
                <th className="px-4 py-5 text-center border-r border-gray-50/50 w-32 relative">
                  <div className="flex items-center justify-center gap-2">
                    <span>MO No</span>
                    <ColumnFilter columnName="MO No" currentValue={columnFilters.moNo || ''} onFilter={(val) => handleColumnFilter('moNo', val)} />
                  </div>
                </th>
                <th className="px-4 py-5 text-center border-r border-gray-50/50 w-32 relative">
                  <div className="flex items-center justify-center gap-2">
                    <span>Ref.No</span>
                    <ColumnFilter columnName="Ref No" currentValue={columnFilters.refNo || ''} onFilter={(val) => handleColumnFilter('refNo', val)} />
                  </div>
                </th>
                <th className="px-4 py-5 text-center border-r border-gray-50/50 w-40 relative">
                  <div className="flex items-center justify-center gap-2">
                    <span>SKU</span>
                    <ColumnFilter columnName="SKU" currentValue={columnFilters.sku || ''} onFilter={(val) => handleColumnFilter('sku', val)} />
                  </div>
                </th>
                <th className="px-4 py-5 border-r border-gray-50/50">
                  <div className="flex items-center">
                    <span>Name</span>
                    <ColumnFilter columnName="Name" currentValue={columnFilters.name || ''} onFilter={(val) => handleColumnFilter('name', val)} />
                  </div>
                </th>
                <th className="px-4 py-5 text-center border-r border-gray-50/50 w-28 uppercase">MO Qty</th>
                <th className="px-4 py-5 text-center border-r border-gray-50/50 w-28 uppercase">Issue Qty</th>
                <th className="px-4 py-5 text-center border-r border-gray-50/50 w-40 uppercase">
                  <div className="flex items-center justify-center">
                    <span>Req. Dept.</span>
                    <ColumnFilter columnName="Dept" currentValue={columnFilters.reqDept || ''} onFilter={(val) => handleColumnFilter('reqDept', val)} />
                  </div>
                </th>
                <th className="px-4 py-5 text-center w-48 uppercase">
                  <div className="flex items-center justify-center">
                    <span>Req. By</span>
                    <ColumnFilter columnName="Req By" currentValue={columnFilters.reqBy || ''} onFilter={(val) => handleColumnFilter('reqBy', val)} />
                  </div>
                </th>
                <th className="px-4 py-5 text-center w-24 uppercase">Preview</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-bold text-gray-600 uppercase tracking-tighter">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="animate-spin text-[#2d808e]" size={32} />
                      <span className="text-gray-400 font-black tracking-widest uppercase">Syncing Issue Repository...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredIssues.length > 0 ? (
                filteredIssues.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0 group">
                    <td className="px-4 py-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 rounded border-gray-300 accent-[#2d808e]"
                      />
                    </td>
                    <td className="px-4 py-4 text-center border-r border-gray-50/50">
                      <button className="text-blue-500 font-black hover:underline transition-all">
                        {item.moNo}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-center border-r border-gray-50/50 text-gray-700">{item.refNo}</td>
                    <td className="px-4 py-4 text-center border-r border-gray-50/50 text-gray-700">{item.sku}</td>
                    <td className="px-4 py-4 border-r border-gray-50/50 uppercase text-gray-800 leading-tight">
                      {item.name}
                    </td>
                    <td className="px-4 py-4 text-center border-r border-gray-50/50 text-gray-500">{item.moQty}</td>
                    <td className="px-4 py-4 text-center border-r border-gray-50/50 font-black text-gray-800">{item.issueQty}</td>
                    <td className="px-4 py-4 text-center border-r border-gray-50/50 text-gray-500 whitespace-nowrap">{item.reqDept}</td>
                    <td className="px-4 py-4 text-center text-gray-500 whitespace-nowrap border-r border-gray-50/50">{item.reqBy}</td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => setPreviewMo(item.fullMo)}
                        className="p-1.5 text-[#2d808e] hover:bg-cyan-50 rounded-lg transition-all"
                        title="View Issue Slip"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-300 space-y-2">
                      <Inbox size={48} strokeWidth={1} />
                      <p className="text-[11px] font-black uppercase tracking-[0.2em]">Empty Issue Node</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-end space-x-4 pt-3 pb-8">
        <div className="flex items-center space-x-1.5">
          <button className="p-1 text-gray-300 hover:text-gray-500 transition-colors"><ChevronLeft size={16} /></button>
          <button className="w-7 h-7 flex items-center justify-center text-[11px] font-black rounded border border-[#2d808e] bg-white text-[#2d808e] shadow-sm">1</button>
          <button className="p-1 text-gray-300 hover:text-[#2d808e] transition-colors"><ChevronRight size={16} /></button>
        </div>
        
        <div className="relative group shadow-sm">
          <select 
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="appearance-none bg-white border border-gray-200 rounded px-4 py-1.5 text-[11px] font-bold text-gray-500 pr-10 focus:border-[#2d808e] outline-none transition-all cursor-pointer"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none group-hover:text-gray-400 transition-colors" />
        </div>
      </div>

      {/* Issue Slip Preview Modal */}
      {previewMo && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto print-mode-active">
          <div className="bg-white w-full max-w-[1000px] h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white no-print">
              <div className="flex items-center space-x-4">
                <div className="bg-[#2d808e] p-2 rounded-lg text-white shadow-lg shadow-cyan-900/20">
                  <Printer size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-800 tracking-tight uppercase">Issue Slip Preview</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction: #{previewMo.reference || previewMo.mo_no}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => handlePrint(previewMo)}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-[#2d808e] text-white rounded-lg text-xs font-black uppercase hover:bg-[#256b78] transition-all shadow-lg shadow-cyan-900/20 active:scale-95"
                >
                  <Printer size={16} />
                  <span>Print Slip</span>
                </button>
                <button 
                  onClick={() => setPreviewMo(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <CloseIcon size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50 p-12 scrollbar-thin">
              <div className="bg-white shadow-2xl mx-auto ring-1 ring-gray-200 printable">
                <IssueSlipPrintTemplate mo={previewMo} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Issue;
