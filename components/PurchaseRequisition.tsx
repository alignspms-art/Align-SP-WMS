import React, { useState, useEffect, useMemo } from 'react';
import { Home, Edit2, Trash2, Loader2, Filter } from 'lucide-react';
import NewPurchaseRequisition from './NewPurchaseRequisition';
import PRPreviewModal from './PRPreviewModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ColumnFilter from './ColumnFilter';

const PurchaseRequisition: React.FC = () => {
  const { user } = useAuth();
  const [view, setView] = useState<'list' | 'new'>('list');
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPr, setPreviewPr] = useState<any>(null);
  const [editingPr, setEditingPr] = useState<any>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const fetchRequisitions = React.useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('requisitions')
      .select('*');

    // Apply column filters
    Object.entries(columnFilters).forEach(([column, value]) => {
      if (value) {
        if (['pr_no', 'reference', 'req_by_name', 'reqDpt'].includes(column)) {
          query = query.ilike(column, `%${value}%`);
        }
      }
    });

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (data && !error) {
      setRequisitions(data);
    }
    setLoading(false);
  }, [columnFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequisitions();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchRequisitions]);

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const handleCreateNew = () => {
    setEditingPr(null);
    setView('new');
  };

  const handleEdit = (pr: any) => {
    setEditingPr(pr);
    setView('new');
  };

  const handleDelete = async (id: string, prNo: string) => {
    if (window.confirm(`Are you sure you want to delete PR No: ${prNo}?`)) {
      const { error } = await supabase.from('requisitions').delete().eq('id', id);
      if (error) {
        alert("Delete failed: " + error.message);
      } else {
        fetchRequisitions();
      }
    }
  };

  const handlePrClick = (pr: any) => {
    setPreviewPr(pr);
  };

  if (view === 'new') {
    return (
      <NewPurchaseRequisition 
        onBack={() => setView('list')} 
        onSubmit={() => { 
          setView('list'); 
          fetchRequisitions(); 
        }} 
        initialData={editingPr} 
      />
    );
  }

  return (
    <div className="flex flex-col space-y-4 font-sans max-w-[1600px] mx-auto w-full">
      {/* Breadcrumb & Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[10px] font-bold text-[#2d808e] uppercase tracking-wider">
          <Home size={14} className="text-gray-400" />
          <span className="text-gray-400">/</span>
          <span className="text-[#2d808e] font-black uppercase tracking-tight">PURCHASE-REQUISITION</span>
        </div>
        <button 
          onClick={handleCreateNew}
          className="bg-[#2d808e] text-white px-6 py-2 rounded text-[12px] font-black shadow-lg shadow-cyan-900/10 hover:bg-[#256b78] transition-all uppercase tracking-widest"
        >
          New Requisition
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#fcfcfc]">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-6 py-5 text-center w-16">SL</th>
                <th className="px-6 py-5 text-center">
                  <div className="flex items-center justify-center">
                    <span>PR NO</span>
                    <ColumnFilter columnName="PR No" currentValue={columnFilters.pr_no || ''} onFilter={(val) => handleColumnFilter('pr_no', val)} />
                  </div>
                </th>
                <th className="px-6 py-5 text-center">SKU</th>
                <th className="px-6 py-5 text-center">
                  <div className="flex items-center justify-center">
                    <span>REF.NO</span>
                    <ColumnFilter columnName="Ref No" currentValue={columnFilters.reference || ''} onFilter={(val) => handleColumnFilter('reference', val)} />
                  </div>
                </th>
                <th className="px-6 py-5 text-center">REQ. QTY</th>
                <th className="px-6 py-5 text-center">
                  <div className="flex items-center justify-center">
                    <span>REQ. BY</span>
                    <ColumnFilter columnName="Req By" currentValue={columnFilters.req_by_name || ''} onFilter={(val) => handleColumnFilter('req_by_name', val)} />
                  </div>
                </th>
                <th className="px-6 py-5 text-center">
                  <div className="flex items-center justify-center">
                    <span>REQ. DEPT.</span>
                    <ColumnFilter columnName="Dept" currentValue={columnFilters.reqDpt || ''} onFilter={(val) => handleColumnFilter('reqDpt', val)} />
                  </div>
                </th>
                <th className="px-6 py-5 text-center w-32">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-bold text-gray-600 uppercase tracking-tighter">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="animate-spin text-[#2d808e]" size={24} />
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Syncing Requisitions...</span>
                    </div>
                  </td>
                </tr>
              ) : requisitions.map((item, index) => {
                const prItems = item.items || [];
                const firstSku = prItems.length > 0 ? prItems[0].sku : 'N/A';
                const totalReqQty = prItems.reduce((acc: number, i: any) => acc + (Number(i.reqQty) || 0), 0);
                
                const skuDisplay = prItems.length > 1 ? `${firstSku} (+${prItems.length - 1})` : firstSku;

                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 border-b border-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-center text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handlePrClick(item)}
                        className="text-blue-500 font-black hover:underline transition-all"
                      >
                        {item.pr_no}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-800 font-black tracking-tight">{skuDisplay}</td>
                    <td className="px-6 py-4 text-center font-black text-gray-800">{item.reference || item.pr_no}</td>
                    <td className="px-6 py-4 text-center text-[#2d808e] font-black text-sm">{totalReqQty}</td>
                    <td className="px-6 py-4 text-center uppercase tracking-tighter text-gray-500">{item.req_by_name || 'USER'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded text-[9px] font-black uppercase tracking-tight">
                        {item.reqDpt || 'LOCAL'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-gray-300 hover:text-[#2d808e] border border-gray-100 rounded hover:bg-[#2d808e]/5 transition-all"
                          title="Edit Requisition"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id, item.pr_no)}
                          className="p-1.5 text-gray-300 hover:text-red-500 border border-gray-100 rounded hover:bg-red-50 transition-all"
                          title="Delete Requisition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && requisitions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-gray-300 uppercase font-black tracking-widest text-[9px]">No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewPr && (
        <PRPreviewModal 
          pr={previewPr} 
          onClose={() => {
            setPreviewPr(null);
            fetchRequisitions(); // Refresh list to catch saved changes/images
          }} 
        />
      )}
    </div>
  );
};

export default PurchaseRequisition;