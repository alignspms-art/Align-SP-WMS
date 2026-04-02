
import React, { useState } from 'react';
import { Home, Trash2, Loader2, Save, Plus, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface IssueItem {
  id: string;
  name: string;
  sku: string;
  uom: string;
  avgPrice: string;
  location: string;
  issueQty: string;
  remarks: string;
}

interface ManualIssueProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
}

const ManualIssue: React.FC<ManualIssueProps> = ({ onBack, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSku, setLoadingSku] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    documentDate: new Date().toISOString().split('T')[0],
    issueDate: new Date().toISOString().split('T')[0],
    transactionType: 'Issue',
    costCenter: '',
    reference: '',
    headerText: ''
  });

  const [items, setItems] = useState<IssueItem[]>([
    { id: '1', name: '', sku: '', uom: '', avgPrice: '', location: '', issueQty: '', remarks: '' }
  ]);

  const handleSkuLookup = async (id: string, sku: string) => {
    if (!sku) return;
    setLoadingSku(id);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('sku', sku)
      .maybeSingle();

    if (data && !error) {
      setItems(prev => prev.map(item => item.id === id ? {
        ...item,
        name: data.name,
        uom: data.uom,
        avgPrice: String(data.avg_price || '0.00'),
        location: data.location || '',
      } : item));
    }
    setLoadingSku(null);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', sku: '', uom: '', avgPrice: '', location: '', issueQty: '', remarks: '' }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof IssueItem, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.sku || !i.issueQty)) {
      alert("Please ensure SKU and Issue Quantity are filled.");
      return;
    }

    setIsSubmitting(true);
    try {
      const issueId = `ISS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // MASTER LOGIC: Reduce stock for each item in DB (negative change)
      for (const item of items) {
        const qty = parseInt(item.issueQty) || 0;
        const { error: rpcError } = await supabase.rpc('update_item_stock', {
          item_sku: item.sku,
          qty_change: -qty,
          is_receive: false,
          ref_no: issueId,
          dept: formData.costCenter
        });
        
        // Update the "last" fields and cost center for inventory tracking
        await supabase
          .from('items')
          .update({ 
            last_issued_qty: qty,
            last_issued_date: new Date().toISOString(),
            cost_center: formData.costCenter || 'N/A'
          })
          .eq('sku', item.sku);
        
        // If RPC fails (e.g., doesn't exist), try direct update for stock
        if (rpcError) {
          console.warn('RPC update_item_stock failed, trying direct update:', rpcError);
          const { data: currentItem } = await supabase
            .from('items')
            .select('on_hand_stock')
            .eq('sku', item.sku)
            .single();
          
          if (currentItem) {
            const newStock = (Number(currentItem.on_hand_stock) || 0) - qty;
            await supabase
              .from('items')
              .update({ on_hand_stock: newStock })
              .eq('sku', item.sku);
          }
        }
      }

      // Generate random Issue No from 500000+
      const issueNo = (500000 + Math.floor(Math.random() * 9999)).toString();
      const firstItem = items[0];
      
      setShowNotification({
        issueNo,
        itemName: firstItem.name,
        qty: firstItem.issueQty,
        totalItems: items.length
      });

      setIsSubmitting(false);
    } catch (err: any) {
      alert("Error reducing Master Stock: " + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 min-h-screen bg-[#f1f3f4] pb-12 relative">
      
      {/* Centered Top-up Notification Overlay */}
      {showNotification && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-emerald-500 p-8 text-center text-white">
              <CheckCircle2 size={56} className="mx-auto mb-4" strokeWidth={3} />
              <h4 className="text-xl font-black uppercase tracking-tight">Issue Committed</h4>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Issue Number</span>
                  <span className="text-[15px] font-black text-[#2d808e]">#{showNotification.issueNo}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">MO Number</span>
                  <span className="text-[13px] font-black text-gray-300 italic">N/A (Manual)</span>
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Summary</span>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-[12px] font-black text-gray-800 leading-tight uppercase">{showNotification.itemName}</p>
                    <p className="text-[11px] font-bold text-[#2d808e] mt-1">Quantity: {showNotification.qty}</p>
                  </div>
                </div>
                {showNotification.totalItems > 1 && (
                  <p className="text-[10px] text-center text-gray-400 font-bold uppercase italic">
                    + {showNotification.totalItems - 1} other items processed
                  </p>
                )}
              </div>
              <button 
                onClick={() => { setShowNotification(null); onSubmit({ ...formData, items }); }} 
                className="w-full py-3 bg-[#2d808e] text-white font-black text-[13px] uppercase tracking-widest rounded-xl shadow-lg hover:bg-[#256b78] transition-all active:scale-[0.98]"
              >
                Close & Finish
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">
          <Home size={14} className="text-gray-400" />
          <span className="text-gray-400">/</span>
          <button onClick={onBack} className="text-gray-400 hover:text-[#2d808e]">ISSUE</button>
          <span className="text-gray-400">/</span>
          <span>NEW-ISSUE</span>
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#2d808e] tracking-tight uppercase">Manual Goods Issue (Stock Reduction)</h1>
      </div>

      <div className="bg-white rounded shadow-sm border border-gray-100 p-8 space-y-8 max-w-[1400px] mx-auto w-full transition-all">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#2d808e]">Issue Date</label>
            <input type="date" value={formData.issueDate} onChange={(e) => setFormData({...formData, issueDate: e.target.value})} className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#2d808e]">Cost Center</label>
            <select value={formData.costCenter} onChange={(e) => setFormData({...formData, costCenter: e.target.value})} className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-sm">
              <option value="">Select Center</option>
              <option value="DEPT1">Production</option>
              <option value="DEPT2">Maintenance</option>
              <option value="DEPT3">Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#2d808e]">Reference</label>
            <input type="text" placeholder="MO Ref..." value={formData.reference} onChange={(e) => setFormData({...formData, reference: e.target.value})} className="w-full px-3 py-2 border border-[#2d808e]/30 rounded text-sm" />
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h3 className="text-sm font-bold text-[#2d808e]">Item Details (SKU Lookup)</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-[11px] font-bold text-gray-800 text-left uppercase border-b border-gray-50">
                  <th className="pb-3 px-1 w-[15%]">SKU *</th>
                  <th className="pb-3 px-1">Item Name</th>
                  <th className="pb-3 px-1 w-[10%] text-center">UOM</th>
                  <th className="pb-3 px-1 w-[12%] text-center">Avg.Price</th>
                  <th className="pb-3 px-1 w-[10%] text-center">Issue Qty *</th>
                  <th className="pb-3 px-1">Remarks</th>
                  <th className="pb-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 px-1">
                      <div className="relative">
                        <input type="text" placeholder="SKU..." className="w-full px-2 py-1.5 border border-[#2d808e]/30 rounded text-[11px] font-bold" value={item.sku} onChange={(e) => updateItem(item.id, 'sku', e.target.value)} onBlur={(e) => handleSkuLookup(item.id, e.target.value)} />
                        {loadingSku === item.id && <Loader2 size={12} className="absolute right-1 top-2 animate-spin text-gray-400" />}
                      </div>
                    </td>
                    <td className="py-2 px-1">
                      <input type="text" className="w-full px-2 py-1.5 border border-gray-50 bg-gray-50 rounded text-[11px] font-bold" value={item.name} readOnly />
                    </td>
                    <td className="py-2 px-1 text-center">
                      <input type="text" className="w-full px-2 py-1.5 border border-gray-50 bg-gray-50 rounded text-[11px] text-center" value={item.uom} readOnly />
                    </td>
                    <td className="py-2 px-1 text-center">
                      <input type="text" className="w-full px-2 py-1.5 border border-gray-50 bg-gray-50 rounded text-[11px] text-center" value={item.avgPrice} readOnly />
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" className="w-full px-2 py-1.5 border border-red-200 rounded text-[11px] text-center font-black text-red-600" value={item.issueQty} onChange={(e) => updateItem(item.id, 'issueQty', e.target.value)} />
                    </td>
                    <td className="py-2 px-1">
                      <input type="text" className="w-full px-2 py-1.5 border border-gray-100 rounded text-[11px]" value={item.remarks} onChange={(e) => updateItem(item.id, 'remarks', e.target.value)} />
                    </td>
                    <td className="py-2 px-1 text-center">
                      <button onClick={() => removeItem(item.id)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addItem} className="w-full py-2 bg-gray-50 text-[#2d808e] border border-[#2d808e]/20 flex items-center justify-center space-x-2 text-xs font-bold rounded hover:bg-white transition-all">
            <Plus size={14} /> <span>Add New Item Row</span>
          </button>
        </div>

        <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-3 bg-[#2d808e] text-white text-sm font-black rounded shadow-lg hover:bg-[#256b78] transition-all flex items-center justify-center space-x-3 uppercase tracking-widest disabled:opacity-50">
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          <span>Commit Goods Issue (Reduce Master Stock)</span>
        </button>
      </div>
    </div>
  );
};

export default ManualIssue;
