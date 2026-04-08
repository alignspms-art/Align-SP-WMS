import React, { useState, useEffect } from 'react';
import { Home, Filter, ChevronRight, Loader2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PendingPRItem {
  id: string;
  prNo: string;
  sku: string;
  name: string;
  specification: string;
  reqQty: number;
  poQty: number;
  receivedQty: number;
  reqBy: string;
  reqDept: string;
  unitPrice: number; // Keep for backend mapping
}

interface NewPurchaseOrderProps {
  onBack: () => void;
  onSubmit: (selectedItems: PendingPRItem[]) => void;
}

const NewPurchaseOrder: React.FC<NewPurchaseOrderProps> = ({ onBack, onSubmit }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingItems, setPendingItems] = useState<PendingPRItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchApprovedPrItems = async () => {
      setLoading(true);
      try {
        // 1. Fetch all approved requisitions
        const { data: prData, error: prError } = await supabase
          .from('requisitions')
          .select('*')
          .eq('status', 'Approved')
          .order('created_at', { ascending: false });

        if (prError) throw prError;

        // 2. Fetch all purchase orders to identify PRs that are already processed
        // We fetch all POs to ensure we don't show PRs that already have a PO, 
        // even if the PR status hasn't updated yet or if it was partially ordered.
        const { data: poData, error: poError } = await supabase
          .from('purchase_orders')
          .select('items');

        if (poError) throw poError;

        // 3. Collect all PR item IDs that are already linked to a PO
        const usedPrItemIds = new Set<string>();
        if (poData) {
          poData.forEach(po => {
            const poItems = po.items || [];
            poItems.forEach((item: any) => {
              if (item.id) usedPrItemIds.add(item.id);
            });
          });
        }

        if (prData) {
          const flattened: PendingPRItem[] = [];
          prData.forEach(pr => {
            const prItems = pr.items || [];
            prItems.forEach((item: any, idx: number) => {
              const itemId = `${pr.id}_${idx}`;
              // ONLY include items that are NOT already in a PO
              if (!usedPrItemIds.has(itemId)) {
                flattened.push({
                  id: itemId,
                  prNo: pr.pr_no,
                  sku: item.sku || 'N/A',
                  name: item.name || 'N/A',
                  specification: item.specification || '',
                  reqQty: Number(item.reqQty) || 0,
                  poQty: 0, 
                  receivedQty: 0,
                  reqBy: pr.req_by_name || 'N/A',
                  reqDept: pr.req_by_dept || pr.reqDpt || 'N/A',
                  unitPrice: Number(item.unitPrice) || 0
                });
              }
            });
          });
          setPendingItems(flattened);
        }
      } catch (err: any) {
        console.error("Error fetching approved items:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedPrItems();
  }, []);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingItems.length && pendingItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingItems.map(item => item.id)));
    }
  };

  const handleMakePO = () => {
    if (selectedIds.size === 0) return;
    const selectedItems = pendingItems.filter(item => selectedIds.has(item.id));
    // Pass items to the details form, mapping PO Qty back to Req Qty for editing
    onSubmit(selectedItems.map(item => ({ ...item, poQty: item.reqQty })));
  };

  return (
    <div className="flex flex-col space-y-4 font-sans antialiased text-gray-800">
      {/* Breadcrumb matching image exactly */}
      <div className="flex items-center space-x-2 text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">
        <Home size={14} className="text-gray-400" />
        <span className="text-gray-400">/</span>
        <button onClick={onBack} className="text-[#2d808e] hover:underline uppercase">PURCHASE-ORDER</button>
        <span className="text-gray-400">/</span>
        <span className="text-[#2d808e] uppercase">NEW</span>
      </div>

      {/* Selected counter and Make PO button */}
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-bold text-[#2d808e]">
          Selected <span className="text-orange-500">{selectedIds.size}</span> items
        </div>
        <button 
          onClick={handleMakePO}
          disabled={selectedIds.size === 0 || loading}
          className={`px-8 py-1.5 rounded text-[12px] font-black transition-all shadow-sm uppercase tracking-widest ${
            selectedIds.size > 0 
              ? 'bg-[#2d808e] text-white hover:bg-[#256b78] active:scale-[0.98]' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
        >
          {loading ? 'Syncing...' : 'Make PO'}
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead className="bg-[#cbd5e1]/40 border-b border-gray-200">
              <tr className="text-[11px] font-black text-gray-800 uppercase tracking-tight">
                <th className="px-3 py-4 text-center w-12 border-r border-gray-200/50">
                   <input 
                    type="checkbox" 
                    checked={selectedIds.size === pendingItems.length && pendingItems.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300" 
                  />
                </th>
                <th className="px-4 py-4 text-center w-40 border-r border-gray-200/50 relative group">
                  <div className="flex items-center justify-center space-x-1">
                    <span>PR No</span>
                    <Filter size={10} className="text-gray-400" />
                  </div>
                </th>
                <th className="px-4 py-4 text-center w-40 border-r border-gray-200/50 relative group">
                  <div className="flex items-center justify-center space-x-1">
                    <span>SKU</span>
                    <Filter size={10} className="text-gray-400" />
                  </div>
                </th>
                <th className="px-4 py-4 text-center border-r border-gray-200/50">Name</th>
                <th className="px-4 py-4 text-center border-r border-gray-200/50">Specification</th>
                <th className="px-4 py-4 text-center w-24 border-r border-gray-200/50">Req. Qty</th>
                <th className="px-4 py-4 text-center w-24 border-r border-gray-200/50">PO Qty</th>
                <th className="px-4 py-4 text-center w-28 border-r border-gray-200/50">Received Qty</th>
                <th className="px-4 py-4 text-center w-48 border-r border-gray-200/50">Req. By</th>
                <th className="px-4 py-4 text-center w-40">Req. Dept.</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-gray-600 font-bold uppercase">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="animate-spin text-[#2d808e]" size={32} />
                      <span className="text-gray-400 font-black tracking-widest">Loading Real Database Records...</span>
                    </div>
                  </td>
                </tr>
              ) : pendingItems.length > 0 ? (
                pendingItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`transition-colors border-b border-gray-100 hover:bg-gray-50 ${selectedIds.has(item.id) ? 'bg-[#e2e8f0]/30' : ''}`}
                  >
                    <td className="px-3 py-4 text-center border-r border-gray-100/50">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(item.id)} 
                        onChange={() => toggleSelect(item.id)} 
                        className="w-4 h-4 rounded border-gray-300 accent-[#2d808e]" 
                      />
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-gray-700 border-r border-gray-100/50">{item.prNo}</td>
                    <td className="px-4 py-4 text-center text-[#2d808e] border-r border-gray-100/50">{item.sku}</td>
                    <td className="px-4 py-4 text-left border-r border-gray-100/50 leading-tight w-64">{item.name}</td>
                    <td className="px-4 py-4 text-left text-gray-400 italic border-r border-gray-100/50 w-64">{item.specification}</td>
                    <td className="px-4 py-4 text-center border-r border-gray-100/50">{item.reqQty}</td>
                    <td className="px-4 py-4 text-center border-r border-gray-100/50">{item.poQty}</td>
                    <td className="px-4 py-4 text-center border-r border-gray-100/50">{item.receivedQty}</td>
                    <td className="px-4 py-4 text-center whitespace-nowrap border-r border-gray-100/50">{item.reqBy}</td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">{item.reqDept}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-24 text-center text-gray-300 uppercase font-black tracking-[0.2em]">
                    No Approved Requisitions Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination matching footer look in image */}
      <div className="flex items-center justify-end space-x-4 pt-2">
        <div className="flex items-center space-x-1">
          <button className="p-1 text-gray-300"><ChevronRight size={16} className="rotate-180" /></button>
          <button className="w-7 h-7 flex items-center justify-center text-[11px] font-black rounded border border-[#2d808e] bg-white text-[#2d808e]">1</button>
          <button className="w-7 h-7 flex items-center justify-center text-[11px] font-bold text-gray-400 hover:bg-gray-50">2</button>
          <button className="w-7 h-7 flex items-center justify-center text-[11px] font-bold text-gray-400 hover:bg-gray-50">3</button>
          <button className="w-7 h-7 flex items-center justify-center text-[11px] font-bold text-gray-400 hover:bg-gray-50">4</button>
          <button className="p-1 text-gray-400 hover:text-[#2d808e]"><ChevronRight size={16} /></button>
        </div>
        <div className="relative group">
          <select className="appearance-none bg-white border border-gray-200 rounded px-4 py-1 text-[11px] font-bold text-gray-500 pr-8">
            <option>10 / page</option>
            <option>20 / page</option>
            <option>50 / page</option>
          </select>
          <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-gray-300 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default NewPurchaseOrder;