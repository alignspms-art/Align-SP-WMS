import React, { useState, useEffect } from 'react';
import { X, Trash2, Search, ChevronDown, Loader2, CheckCircle2, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import IssueSlipPrintTemplate from './IssueSlipPrintTemplate';

interface MovementItem {
  id: string;
  moId?: string;
  moNo?: string;
  sku: string;
  name: string;
  uom: string;
  unitPrice: number;
  reqQty: number;
  issuedQty: number;
  tnxQty: number;
  location: string;
  usedDept: string;
  remarks: string;
}

interface MaterialsMovementFormProps {
  selectedItems: any[];
  onCancel: () => void;
  onSubmit: (data: any) => void;
}

const MaterialsMovementForm: React.FC<MaterialsMovementFormProps> = ({ selectedItems, onCancel, onSubmit }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allLocations, setAllLocations] = useState<string[]>([]);
  const [showNotification, setShowNotification] = useState<any>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [items, setItems] = useState<MovementItem[]>(
    selectedItems.map(item => {
      const moId = item.fullMo?.id;
      const moNo = item.moNo;
      return {
        id: item.id,
        moId: moId,
        moNo: moNo,
        sku: item.sku,
        name: item.name,
        uom: item.uom || 'PC',
        unitPrice: item.unitPrice || 0,
        reqQty: item.moQty,
        issuedQty: item.issueQty,
        tnxQty: Math.max(0, (item.moQty || 0) - (item.issueQty || 0)),
        location: '', 
        usedDept: item.reqDept,
        remarks: ''
      };
    })
  );

  useEffect(() => {
    const fetchMasterData = async () => {
      const skus = Array.from(new Set(items.map(i => i.sku)));
      if (skus.length > 0) {
        try {
          const { data: itemData } = await supabase
            .from('items')
            .select('sku, location')
            .in('sku', skus);

          if (itemData) {
            const locationMap = itemData.reduce((acc: any, item: any) => {
              acc[item.sku] = item.location;
              return acc;
            }, {});

            setItems(prev => prev.map(item => ({
              ...item,
              location: item.location || locationMap[item.sku] || ''
            })));
          }
        } catch (err) {
          console.error("Error fetching master locations:", err);
        }
      }

      try {
        const { data: locData } = await supabase
          .from('items')
          .select('location')
          .not('location', 'is', null);
        
        if (locData) {
          // Fix: Explicitly cast mapping results to string to resolve 'unknown[]' type mismatch with string[] state
          const uniqueLocs = Array.from(new Set(locData.map((l: any) => l.location as string).filter(Boolean)));
          setAllLocations(uniqueLocs);
        }
      } catch (err) {
        console.error("Error fetching unique locations:", err);
      }
    };

    fetchMasterData();
    // Only run once on mount based on initial items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('cost_centers')
          .select('name')
          .order('name', { ascending: true });
        
        if (data && !error) {
          setDepartments(data.map(cc => cc.name));
        } else {
          // Fallback if table is empty or error
          setDepartments(['Maintenance', 'Security', 'Safety', 'QC', 'PDI', 'Paint Shop', 'Outbound Logistic', 'MMT', 'Medical', 'IT', 'HR', 'Finance', 'Civil', 'Audit', 'Assembly', 'Admin']);
        }
      } catch (err) {
        console.error("Error fetching departments:", err);
      }
    };
    fetchDepartments();
  }, []);

  const updateItem = (id: string, field: keyof MovementItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleFinalSubmit = async () => {
    if (items.some(i => !i.location)) {
      alert("Please ensure all items have an Issue Location assigned.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Reduce stock for each item in DB
      for (const item of items) {
        const qty = item.tnxQty || 0;
        const { error } = await supabase.rpc('update_item_stock', {
          item_sku: item.sku,
          qty_change: -qty,
          is_receive: false,
          ref_no: item.moNo || 'N/A',
          dept: item.usedDept || 'N/A'
        });
        
        // Update the "last" fields and cost center for inventory tracking
        await supabase
          .from('items')
          .update({ 
            last_issued_qty: qty,
            last_issued_date: new Date().toISOString(),
            cost_center: item.usedDept || 'N/A'
          })
          .eq('sku', item.sku);

        if (error) throw error;
      }

      // 2. Complete the issue task by updating Move Order status and item locations
      const uniqueMoIds = Array.from(new Set(items.map(i => i.moId).filter(Boolean)));
      for (const moId of uniqueMoIds) {
        // Get the department from the first item of this MO (assuming all items in an MO should have the same dept)
        const moItemsForThisId = items.filter(i => i.moId === moId);
        const updatedDept = moItemsForThisId[0]?.usedDept || '';

        // Construct the new items array for the Move Order, preserving critical fields
        const moItems = moItemsForThisId.map(i => ({
          sku: i.sku,
          name: i.name,
          uom: i.uom,
          unitPrice: i.unitPrice, // Preserved
          reqQty: i.reqQty,       // Preserved
          issuedQty: Number(i.issuedQty || 0) + Number(i.tnxQty), // Updated
          location: i.location,
          remarks: i.remarks
        }));

        const { error: updateError } = await supabase
          .from('move_orders')
          .update({ 
            status: 'Completed',
            items: moItems, 
            department: updatedDept, // Save the corrected department
            updated_at: new Date().toISOString(),
            updated_by: user?.fullName || 'System'
          })
          .eq('id', moId);
        
        if (updateError) throw updateError;
      }

      // 3. Show Success Notification starting from 500000
      const giId = (500000 + Math.floor(Math.random() * 5000)).toString();
      const firstItem = items[0];
      
      const notificationData = {
        giId: giId,
        moNo: firstItem.moNo || 'N/A',
        itemsCount: items.length,
        details: `Item: ${firstItem.name} | Qty: ${firstItem.tnxQty} | Loc: ${firstItem.location}`,
        items: items.map(i => ({ ...i, tnxQty: i.tnxQty })), // Capture current tnxQty
        department: firstItem.usedDept || '',
        requested_by: user?.fullName || 'System'
      };

      setShowNotification(notificationData);
      setPrintData(notificationData);

      setIsSubmitting(false);
    } catch (err: any) {
      alert("Error processing issue: " + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen relative">
      <datalist id="location-suggestions">
        {allLocations.map((loc, idx) => (
          <option key={idx} value={loc} />
        ))}
      </datalist>

      {/* Success Notification Popup (Floating Center-Top) */}
      {showNotification && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="w-[450px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-emerald-100 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-emerald-500 p-6 text-center">
              <CheckCircle2 size={48} className="text-white mx-auto mb-3" strokeWidth={3} />
              <h4 className="text-xl font-black text-white uppercase tracking-tight">MO Issue Completed</h4>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Issue Number</span>
                  <span className="text-[13px] font-black text-[#2d808e]">#{showNotification.giId}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">MO Number</span>
                  <span className="text-[13px] font-black text-blue-600">#{showNotification.moNo}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Details</span>
                  <p className="text-[14px] font-bold text-gray-800 leading-tight bg-gray-50 p-3 rounded-lg border border-gray-100">{showNotification.details}</p>
                </div>
                <p className="text-[10px] text-center text-gray-400 font-medium">Total Items Processed: {showNotification.itemsCount}</p>
              </div>
              <div className="flex flex-col space-y-3">
                <button 
                  onClick={() => setShowPrintPreview(true)}
                  className="w-full bg-[#2d808e] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-900/20 hover:bg-[#256b78] transition-all flex items-center justify-center space-x-3"
                >
                  <Printer size={16} />
                  <span>Print Issue Slip</span>
                </button>
                <button 
                  onClick={() => { setShowNotification(null); onSubmit({ items }); }} 
                  className="w-full py-3 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-all"
                >
                  Close & Proceed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && printData && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto no-print">
          <div className="bg-[#fcfcfc] w-full max-w-[1100px] rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]">
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div className="flex items-center space-x-4">
                <button onClick={() => setShowPrintPreview(false)} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl transition-colors">
                  <X size={20} />
                </button>
                <h2 className="text-sm font-black text-[#2d808e] uppercase tracking-tight">Issue Slip Preview</h2>
              </div>
              <button 
                onClick={() => window.print()}
                className="bg-[#2d808e] text-white px-8 py-2 rounded-lg text-xs font-black hover:bg-[#256b78] flex items-center space-x-3 uppercase tracking-widest transition-all"
              >
                <Printer size={18} />
                <span>Execute Print</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 bg-gray-200/20">
              <div className="bg-white shadow-2xl border border-gray-200 rounded-sm">
                <IssueSlipPrintTemplate mo={{
                  ...printData,
                  reference: printData.giId,
                  mo_no: printData.moNo,
                  items: printData.items,
                  department: printData.department,
                  created_at: new Date().toISOString()
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
          <h2 className="text-[15px] font-bold text-gray-800 tracking-tight uppercase">Materials Movement (MO Issue)</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={onCancel} className="px-8 py-1.5 text-[13px] font-bold text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-all">Cancel</button>
          <button 
            onClick={handleFinalSubmit}
            disabled={isSubmitting || !!showNotification}
            className="px-10 py-1.5 text-[13px] font-black text-white bg-[#2d808e] rounded hover:bg-[#256b78] shadow-lg shadow-cyan-900/10 transition-all flex items-center space-x-2 active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="animate-spin" size={14} />}
            <span>Commit MO Issue</span>
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-[#fafbfc]">
              <tr className="text-[11px] font-black text-gray-700 border-b border-gray-100 uppercase tracking-tight">
                <th className="px-4 py-4 w-32 text-center border-r border-gray-50">SKU</th>
                <th className="px-4 py-4 border-r border-gray-50">Name</th>
                <th className="px-4 py-4 text-center w-24 border-r border-gray-50">UOM</th>
                <th className="px-4 py-4 text-center w-24 border-r border-gray-50">Req. Qty</th>
                <th className="px-4 py-4 text-center w-28 border-r border-gray-50">Tnx. Qty *</th>
                <th className="px-4 py-4 text-center w-56 border-r border-gray-50">Issue Location</th>
                <th className="px-4 py-4 text-center w-40 border-r border-gray-50">Used Dept.</th>
                <th className="px-4 py-4 border-r border-gray-50">Remarks</th>
                <th className="px-4 py-4 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-gray-600 font-bold uppercase">
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                  <td className="px-4 py-5 text-center border-r border-gray-50">{item.sku}</td>
                  <td className="px-4 py-5 font-black uppercase text-gray-800 leading-tight border-r border-gray-50">{item.name}</td>
                  <td className="px-4 py-5 text-center border-r border-gray-50">{item.uom}</td>
                  <td className="px-4 py-5 text-center border-r border-gray-50">{item.reqQty}</td>
                  <td className="px-4 py-5 text-center border-r border-gray-50">
                    <input 
                      type="number" 
                      value={item.tnxQty}
                      onChange={(e) => updateItem(item.id, 'tnxQty', Number(e.target.value))}
                      className="w-20 px-2 py-1.5 border border-[#2d808e]/30 rounded text-center font-black text-[#2d808e] focus:border-[#2d808e] outline-none"
                    />
                  </td>
                  <td className="px-4 py-5 text-center border-r border-gray-50">
                    <div className="relative group">
                      <input 
                        type="text" 
                        list="location-suggestions"
                        value={item.location}
                        onChange={(e) => updateItem(item.id, 'location', e.target.value)}
                        placeholder="Type location..."
                        className="w-full px-3 py-1.5 border border-gray-200 rounded text-gray-800 font-black focus:border-[#2d808e] outline-none transition-all placeholder:font-medium placeholder:text-gray-300"
                      />
                      <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    </div>
                  </td>
                  <td className="px-4 py-5 text-center border-r border-gray-50">
                    <div className="relative group">
                      <select 
                        value={item.usedDept}
                        onChange={(e) => updateItem(item.id, 'usedDept', e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#fcfcfc] border border-gray-100 rounded text-gray-700 font-bold focus:border-[#2d808e] outline-none appearance-none transition-all cursor-pointer"
                      >
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    </div>
                  </td>
                  <td className="px-4 py-5 border-r border-gray-50">
                    <input 
                      type="text" 
                      value={item.remarks} 
                      onChange={(e) => updateItem(item.id, 'remarks', e.target.value)} 
                      className="w-full px-2 py-1.5 border border-gray-100 rounded text-[10px] outline-none focus:border-[#2d808e] transition-all placeholder:text-gray-200"
                      placeholder="Add notes..."
                    />
                  </td>
                  <td className="px-4 py-5 text-center">
                    <button 
                      onClick={() => removeItem(item.id)} 
                      className="text-pink-400 hover:text-pink-600 p-2 rounded hover:bg-pink-50 transition-all"
                      title="Remove Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-[10px] font-black text-gray-300 uppercase tracking-widest px-2">
           <span>* Negative stock transaction will be committed to Master SKU List</span>
           <span>Proprietary Inventory Node</span>
        </div>
      </div>
    </div>
  );
};

export default MaterialsMovementForm;