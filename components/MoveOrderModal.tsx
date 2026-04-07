
import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, ScanLine, Loader2, Search, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ScannerModal from './ScannerModal';
import ItemSearchInput from './ItemSearchInput';
import IssueSlipPrintTemplate from './IssueSlipPrintTemplate';

interface MoveOrderItem {
  id: string;
  name: string;
  sku: string;
  uom: string;
  size: string;
  onHand: string;
  reqQty: string;
  unitPrice: number;
  remarks: string;
}

interface MoveOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MoveOrderModal: React.FC<MoveOrderModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<MoveOrderItem[]>([
    { id: '1', name: '', sku: '', uom: '', size: '', onHand: '', reqQty: '', unitPrice: 0, remarks: '' }
  ]);
  const [refText, setRefText] = useState('');
  const [purpose, setPurpose] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [section, setSection] = useState('');
  const [subSection, setSubSection] = useState('');
  const [shift, setShift] = useState('');
  const [note, setNote] = useState('');
  const [costCenters, setCostCenters] = useState<string[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setItems([{ id: '1', name: '', sku: '', uom: '', size: '', onHand: '', reqQty: '', unitPrice: 0, remarks: '' }]);
      setRefText('');
      setPurpose('');
      setDepartment('');
      setEmployeeName('');
      setEmployeeId('');
      setSection('');
      setSubSection('');
      setShift('');
      setNote('');
      setShowSuccess(null);
    } else {
      fetchCostCenters();
      if (user) {
        setEmployeeName(user.fullName || '');
        setEmployeeId(user.officeId || '');
        setDepartment(user.department || '');
      }
    }
  }, [isOpen, user]);

  const generateReference = async (deptName: string) => {
    if (!deptName) return;
    
    const prefix = deptName.substring(0, 3).toUpperCase();
    try {
      const { data, error: fetchError } = await supabase
        .from('move_orders')
        .select('reference')
        .ilike('reference', `${prefix}-%`)
        .order('reference', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      let nextNum = 1001;
      if (data && data.length > 0) {
        const lastRef = data[0].reference;
        const lastNum = parseInt(lastRef.split('-')[1]);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
      setRefText(`${prefix}-${nextNum}`);
    } catch (err) {
      console.error("Error generating reference:", err);
      setRefText(`${prefix}-1001`);
    }
  };

  useEffect(() => {
    if (department) {
      generateReference(department);
    }
  }, [department]);

  const fetchCostCenters = async () => {
    setLoadingCenters(true);
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('name')
        .order('name', { ascending: true });
      
      if (data && !error) {
        setCostCenters(data.map(cc => cc.name));
      }
    } catch (err) {
      console.error("Error fetching centers:", err);
    } finally {
      setLoadingCenters(false);
    }
  };

  if (!isOpen) return null;

  const addItem = (itemData?: Partial<MoveOrderItem>) => {
    setItems(prev => [
      ...prev, 
      { 
        id: Date.now().toString(), 
        name: itemData?.name || '', 
        sku: itemData?.sku || '', 
        uom: itemData?.uom || '', 
        size: itemData?.size || '',
        onHand: itemData?.onHand || '', 
        reqQty: itemData?.reqQty || '', 
        unitPrice: itemData?.unitPrice || 0,
        remarks: itemData?.remarks || '' 
      }
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof MoveOrderItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async () => {
    if (!department || !employeeName || !employeeId || !shift) {
      alert("Please fill in all mandatory fields: Department, Employee Name, Employee ID, and Shift.");
      return;
    }

    if (items.some(i => !i.sku || !i.reqQty)) {
      alert("Please fill in SKU and Required Quantity for all items.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: lastMO } = await supabase
        .from('move_orders')
        .select('mo_no')
        .order('mo_no', { ascending: false })
        .limit(1);

      let nextMoNo = '100001';
      if (lastMO && lastMO.length > 0) {
        nextMoNo = (parseInt(lastMO[0].mo_no) + 1).toString();
      }

      const totalValue = items.reduce((acc, i) => acc + (Number(i.reqQty) * i.unitPrice), 0);

      const insertData: any = {
        mo_no: nextMoNo,
        reference: refText,
        header_text: purpose,
        department: department,
        employee_name: employeeName,
        employee_id: employeeId,
        section: section,
        sub_section: subSection,
        shift: shift,
        total_value: totalValue,
        items: items,
        status: 'Pending',
        requested_by: user?.fullName || 'System',
        note: note // Try to save to note column
      };

      let { error } = await supabase.from('move_orders').insert([insertData]);

      // Fallback: If 'note' column doesn't exist or isn't in schema cache, append note to header_text
      if (error && (
        error.message.includes("column \"note\" of relation \"move_orders\" does not exist") || 
        error.message.includes("Could not find the 'note' column") ||
        error.code === 'PGRST204' // PostgREST error for missing column in schema cache
      )) {
        delete insertData.note;
        insertData.header_text = `${purpose}${note ? ` (Note: ${note})` : ''}`;
        const retry = await supabase.from('move_orders').insert([insertData]);
        error = retry.error;
      }

      if (error) throw error;

      setShowSuccess(nextMoNo);
      setIsSubmitting(false);
    } catch (err: any) {
      alert("Submission failed: " + err.message);
      setIsSubmitting(false);
    }
  };

  const handleScannedCode = async (code: string) => {
    setIsScannerOpen(false);
    setIsSearching(true);
    
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('sku', code)
        .maybeSingle();

      if (data && !error) {
        const firstRow = items[0];
        if (items.length === 1 && !firstRow.sku && !firstRow.name) {
          setItems([{
            id: firstRow.id,
            sku: data.sku,
            name: data.name,
            uom: data.uom,
            size: data.size || '',
            onHand: String(data.on_hand_stock || '0'),
            unitPrice: data.avg_price || data.last_price || 0,
            reqQty: '',
            remarks: ''
          }]);
        } else {
          addItem({
            sku: data.sku,
            name: data.name,
            uom: data.uom,
            size: data.size || '',
            unitPrice: data.avg_price || data.last_price || 0,
            onHand: String(data.on_hand_stock || '0')
          });
        }
      } else {
        alert(`Item with SKU "${code}" not found.`);
      }
    } catch (err) {
      console.error("Lookup error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 bg-black/30 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-[1400px] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {showSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-[#fcfcfc] w-full max-w-[1100px] rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh] animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <div className="flex items-center space-x-4">
                  <div className="bg-[#2d808e] p-2 rounded-lg text-white shadow-lg shadow-cyan-900/20">
                    <Printer size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#2d808e] uppercase tracking-tight">Move Order Request Slip</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TNX.NO: {refText || `#${showSuccess}`}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => window.print()}
                    className="bg-[#2d808e] text-white px-8 py-2 rounded-lg text-xs font-black hover:bg-[#256b78] flex items-center space-x-3 uppercase tracking-widest transition-all"
                  >
                    <Printer size={18} />
                    <span>Execute Print</span>
                  </button>
                  <button 
                    onClick={() => { setShowSuccess(null); onClose(); }}
                    className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-12 bg-gray-200/20 scrollbar-thin">
                <div className="bg-white shadow-2xl border border-gray-200 rounded-sm printable">
                  <IssueSlipPrintTemplate mo={{
                    mo_no: showSuccess,
                    reference: refText,
                    header_text: purpose,
                    department: department,
                    employee_name: employeeName,
                    employee_id: employeeId,
                    section: section,
                    sub_section: subSection,
                    shift: shift,
                    items: items,
                    note: note,
                    isRequest: true,
                    created_at: new Date().toISOString()
                  }} />
                </div>
              </div>
              <div className="px-8 py-4 bg-white border-t border-gray-100 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Move Order Request Submitted Successfully • Pending Approval</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">Move Order Request</h2>
            {isSearching && <Loader2 size={16} className="animate-spin text-[#2d808e]" />}
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center px-6 py-2 text-sm font-black text-white bg-[#2d808e] rounded hover:bg-[#256b78] transition-all shadow-md group uppercase tracking-widest"
            >
              <ScanLine size={18} className="mr-2 group-hover:scale-110 transition-transform" />
              MO Scanner
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button 
              onClick={onClose}
              className="px-6 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || !!showSuccess}
              className="px-8 py-2 text-sm font-semibold text-white bg-[#2d808e] rounded hover:bg-[#256b78] transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Submit
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#2d808e]">TNX.NO</label>
              <div className="relative">
                <input 
                  type="text" 
                  readOnly
                  value={refText}
                  placeholder="Auto-generated"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-sm font-bold text-[#2d808e]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#2d808e]">
                <span className="text-red-500 mr-1">*</span>Department
              </label>
              <div className="relative">
                <select 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={loadingCenters}
                  className="w-full px-3 py-2.5 bg-white border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-sm text-gray-700 appearance-none disabled:bg-gray-50 font-bold uppercase"
                >
                  <option value="">Select Cost Center</option>
                  {costCenters.map(center => (
                    <option key={center} value={center}>{center}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                  {loadingCenters ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#2d808e]">
                <span className="text-red-500 mr-1">*</span>Employee Name
              </label>
              <input 
                type="text" 
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#2d808e]">
                <span className="text-red-500 mr-1">*</span>Employee ID
              </label>
              <input 
                type="text" 
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#2d808e]">Purpose</label>
              <input 
                type="text" 
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Purpose of movement"
                className="w-full px-3 py-2.5 bg-white border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#2d808e]">Section</label>
              <input 
                type="text" 
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#2d808e]">Sub-Section</label>
              <input 
                type="text" 
                value={subSection}
                onChange={(e) => setSubSection(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#2d808e]">
                <span className="text-red-500 mr-1">*</span>Shift
              </label>
              <input 
                type="text" 
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-sm"
              />
            </div>

            <div className="md:col-span-4 space-y-2">
              <label className="text-sm font-bold text-[#2d808e]">Note</label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Additional notes or instructions..."
                rows={2}
                className="w-full px-3 py-2.5 bg-white border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-sm resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#2d808e]">Item Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-[11px] font-bold text-gray-800 text-left">
                    <th className="pb-2 pr-2">Name</th>
                    <th className="pb-2 px-2 w-[180px]">Part/SKU</th>
                    <th className="pb-2 px-2 w-[100px]">UOM</th>
                    <th className="pb-2 px-2 w-[100px]">Size</th>
                    <th className="pb-2 px-2 w-[100px]">On-Hand</th>
                    <th className="pb-2 px-2 w-[100px]">Req. Qty</th>
                    <th className="pb-2 px-2">Remarks</th>
                    <th className="pb-2 w-[40px]"></th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {items.map((item) => (
                    <tr key={item.id} className="group border-b border-gray-50 last:border-0">
                      <td className="pr-2 py-1">
                        <ItemSearchInput
                          value={item.name}
                          onChange={(val) => updateItem(item.id, 'name', val)}
                          onSelect={(data) => {
                            setItems(prev => prev.map(i => i.id === item.id ? {
                              ...i,
                              sku: data.sku,
                              name: data.name,
                              uom: data.uom,
                              size: data.size || '',
                              onHand: String(data.on_hand_stock || '0'),
                              unitPrice: data.avg_price || data.last_price || 0,
                            } : i));
                          }}
                          placeholder="Item Name"
                          searchField="name"
                          className="w-full px-3 py-2 bg-[#f8f9fa] border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-xs font-bold uppercase"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <ItemSearchInput
                          value={item.sku}
                          onChange={(val) => updateItem(item.id, 'sku', val)}
                          onSelect={(data) => {
                            setItems(prev => prev.map(i => i.id === item.id ? {
                              ...i,
                              sku: data.sku,
                              name: data.name,
                              uom: data.uom,
                              size: data.size || '',
                              onHand: String(data.on_hand_stock || '0'),
                              unitPrice: data.avg_price || data.last_price || 0,
                            } : i));
                          }}
                          placeholder="SKU/Code"
                          searchField="sku"
                          className="w-full px-3 py-2 bg-white border border-[#2d808e]/40 rounded focus:border-[#2d808e] outline-none text-xs font-black text-[#2d808e]"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input 
                          type="text" 
                          value={item.uom}
                          readOnly
                          className="w-full px-3 py-2 bg-[#f8f9fa] border border-transparent rounded text-xs text-gray-500 text-center uppercase"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input 
                          type="text" 
                          placeholder="Size"
                          value={item.size}
                          onChange={(e) => updateItem(item.id, 'size', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-xs text-center"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input 
                          type="text" 
                          value={item.onHand}
                          readOnly
                          className="w-full px-3 py-2 bg-[#f8f9fa] border border-transparent rounded text-xs text-[#2d808e] font-black text-center"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input 
                          type="number" 
                          placeholder="0"
                          value={item.reqQty}
                          onChange={(e) => updateItem(item.id, 'reqQty', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-xs font-black text-center"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input 
                          type="text" 
                          placeholder="Remarks"
                          value={item.remarks}
                          onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-xs placeholder:text-gray-300"
                        />
                      </td>
                      <td className="pl-2 py-1">
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-pink-500 hover:bg-pink-50 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button 
              onClick={() => addItem()}
              className="w-full py-2 bg-gray-50 border border-dashed border-[#2d808e]/30 text-[#2d808e] flex items-center justify-center space-x-2 text-[11px] font-bold rounded hover:bg-white transition-all uppercase"
            >
              <Plus size={14} strokeWidth={3} />
              <span>Add Item Row</span>
            </button>
          </div>
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
};

const ChevronDown = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default MoveOrderModal;
