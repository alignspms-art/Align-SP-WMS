import React, { useState, useEffect, useMemo } from 'react';
import { Home, Inbox, Loader2 } from 'lucide-react';
import ManualGRN from './ManualGRN';
import MakeGRNForm from './MakeGRNForm';
import { supabase } from '../lib/supabase';
import ColumnFilter from './ColumnFilter';

const Receive: React.FC = () => {
  const [view, setView] = useState<'list' | 'manual' | 'make-grn'>('list');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const fetchPendingPOItems = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('purchase_orders')
        .select('*')
        .in('status', ['Open', 'Approved'])
        .order('created_at', { ascending: false });

      if (data) {
        const flattened: any[] = [];
        data.forEach(po => {
          const poItems = po.items || [];
          poItems.forEach((item: any, idx: number) => {
            const poQty = Number(item.poQty || 0);
            const receivedQty = Number(item.receivedQty || 0);
            
            // Only show items that haven't been fully received
            if (receivedQty < poQty) {
              flattened.push({
                id: `${po.id}_${idx}`,
                poId: po.id,
                poNo: po.po_no,
                sku: item.sku,
                name: item.name,
                uom: item.uom || 'SET',
                poQty: poQty,
                alreadyReceived: receivedQty,
                unitPrice: item.unitPrice || 0,
                grnQty: 0, 
                reqBy: item.reqBy || 'N/A',
                reqDept: item.reqDept || 'N/A',
                supplier: po.supplier_name
              });
            }
          });
        });
        setPendingItems(flattened);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPOItems();
  }, []);

  const handleManualGRNSubmit = () => {
    setView('list');
    fetchPendingPOItems();
  };

  const handleMakeGRNSubmit = () => {
    setView('list');
    setSelectedItems(new Set());
    fetchPendingPOItems();
  };

  const filteredPendingItems = useMemo(() => {
    return pendingItems.filter(item => {
      return Object.entries(columnFilters).every(([column, value]) => {
        if (!value) return true;
        const itemValue = String(item[column] || '').toLowerCase();
        return itemValue.includes(value.toLowerCase());
      });
    });
  }, [pendingItems, columnFilters]);

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredPendingItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredPendingItems.map(item => item.id)));
    }
  };

  const getSelectedItemsData = () => {
    return pendingItems.filter(item => selectedItems.has(item.id));
  };

  if (view === 'manual') {
    return <ManualGRN onBack={() => setView('list')} onSubmit={handleManualGRNSubmit} />;
  }

  return (
    <div className="flex flex-col space-y-4 font-sans antialiased text-gray-800">
      {view === 'make-grn' && (
        <MakeGRNForm 
          selectedItems={getSelectedItemsData()} 
          onClose={() => setView('list')} 
          onSubmit={handleMakeGRNSubmit} 
        />
      )}
      {/* Top Header Matching Image 1 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">
          <Home size={14} className="text-gray-400" />
          <span className="text-gray-300">/</span>
          <span className="border border-[#2d808e] px-2 py-0.5 rounded text-[#2d808e] font-black">RECEIVE</span>
        </div>
        <button 
          onClick={() => setView('manual')}
          className="bg-[#2d808e] text-white px-6 py-1.5 rounded text-[11px] font-black shadow-sm hover:bg-[#256b78] transition-all uppercase tracking-widest"
        >
          Manual GRN
        </button>
      </div>

      <div className="flex items-center">
        <button 
          disabled={selectedItems.size === 0}
          onClick={() => setView('make-grn')}
          className={`px-8 py-1.5 rounded text-[11px] font-black transition-all border uppercase tracking-widest ${
            selectedItems.size > 0 
              ? 'bg-[#2d808e] text-white border-[#2d808e] hover:bg-[#256b78] shadow-md' 
              : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
          }`}
        >
          Make GRN
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden min-h-[500px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#fafbfc]">
              <tr className="text-[11px] font-black text-gray-700 uppercase tracking-tight border-b border-gray-100">
                <th className="px-4 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-[#2d808e]" 
                    checked={filteredPendingItems.length > 0 && selectedItems.size === filteredPendingItems.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-4 text-center relative group w-48">
                   <div className="flex items-center justify-center space-x-2">
                     <span>PO No</span>
                     <ColumnFilter columnName="PO No" currentValue={columnFilters.poNo || ''} onFilter={(val) => handleColumnFilter('poNo', val)} />
                   </div>
                </th>
                <th className="px-4 py-4 text-center relative group w-48">
                   <div className="flex items-center justify-center space-x-2">
                     <span>SKU</span>
                     <ColumnFilter columnName="SKU" currentValue={columnFilters.sku || ''} onFilter={(val) => handleColumnFilter('sku', val)} />
                   </div>
                </th>
                <th className="px-4 py-4">
                  <div className="flex items-center">
                    <span>Name</span>
                    <ColumnFilter columnName="Name" currentValue={columnFilters.name || ''} onFilter={(val) => handleColumnFilter('name', val)} />
                  </div>
                </th>
                <th className="px-4 py-4 text-center w-32">PO Qty</th>
                <th className="px-4 py-4 text-center w-32">GRN Qty</th>
                <th className="px-4 py-4 text-center w-64">
                  <div className="flex items-center justify-center">
                    <span>Req. By</span>
                    <ColumnFilter columnName="Req By" currentValue={columnFilters.reqBy || ''} onFilter={(val) => handleColumnFilter('reqBy', val)} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-bold text-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-32 text-center uppercase tracking-widest text-gray-400">
                    <Loader2 className="animate-spin inline mr-2" size={16} /> 
                    Synchronizing...
                  </td>
                </tr>
              ) : filteredPendingItems.length > 0 ? (
                filteredPendingItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-50">
                    <td className="px-4 py-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#2d808e]"
                      />
                    </td>
                    <td className="px-4 py-4 text-center font-black text-blue-500">{item.poNo}</td>
                    <td className="px-4 py-4 text-center text-gray-400 font-medium">{item.sku}</td>
                    <td className="px-4 py-4 uppercase text-gray-800 leading-tight">{item.name}</td>
                    <td className="px-4 py-4 text-center text-gray-500">{item.poQty}</td>
                    <td className="px-4 py-4 text-center text-[#2d808e] font-black">{item.grnQty}</td>
                    <td className="px-4 py-4 text-center uppercase text-gray-400 whitespace-nowrap">{item.reqBy}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-32">
                    <div className="flex flex-col items-center justify-center text-gray-300 space-y-2">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                        <Inbox size={32} strokeWidth={1} />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-widest">No data</p>
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

export default Receive;