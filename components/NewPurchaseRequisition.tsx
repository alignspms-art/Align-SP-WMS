import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, Loader2, MinusCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface RequisitionItem {
  id: string;
  name: string;
  sku: string;
  specification: string;
  brand: string;
  uom: string;
  unitPrice: string;
  onHand: string;
  stockInHand: string;
  reqQty: string;
  remarks: string;
}

interface NewPurchaseRequisitionProps {
  onBack: () => void;
  onSubmit: (newPR: any) => void;
  initialData?: any;
}

const NewPurchaseRequisition: React.FC<NewPurchaseRequisitionProps> = ({ onBack, onSubmit, initialData }) => {
  const { user } = useAuth();
  const [loadingSku, setLoadingSku] = useState<string | null>(null);
  const [costCenters] = useState<string[]>([
    'Maintenance', 'Security', 'Safety', 'QC', 'PDI', 'Paint Shop', 
    'Outbound Logistic', 'MMT', 'Medical', 'IT', 'HR', 'Finance', 
    'Civil', 'Audit', 'Assembly', 'Admin'
  ]);
  
  // Header Fields
  const [prNo, setPrNo] = useState(initialData?.pr_no || '');
  const [prReference, setPrReference] = useState(initialData?.reference || '');
  const [supplierType, setSupplierType] = useState(initialData?.type || '');
  const [prNote, setPrNote] = useState(initialData?.note || '');
  
  // Requester Details
  const [requesterName, setRequesterName] = useState(initialData?.req_by_name || '');
  const [contactNumber, setContactNumber] = useState(initialData?.contact || '');
  const [emailAddress, setEmailAddress] = useState(initialData?.email || '');
  const [department, setDepartment] = useState(initialData?.reqDpt || 'Maintenance');

  // Set requester details from user profile if not editing
  useEffect(() => {
    if (user && !initialData) {
      setRequesterName(user.fullName || '');
      setContactNumber(user.contactNumber || '');
      setEmailAddress(user.email || '');
      if (user.department) {
        setDepartment(user.department);
      }
    }
  }, [user, initialData]);

  const [items, setItems] = useState<RequisitionItem[]>(
    initialData?.items || [
      {
        id: '1',
        name: '',
        sku: '',
        specification: '',
        brand: '',
        uom: '',
        unitPrice: '',
        onHand: '',
        reqQty: '',
        remarks: '',
      }
    ]
  );

  // Fetch the next sequential PR number
  useEffect(() => {
    const fetchNextPrNo = async () => {
      if (initialData?.pr_no) return; // If editing, keep the existing number

      try {
        const { data, error } = await supabase
          .from('requisitions')
          .select('pr_no')
          .order('pr_no', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const lastNo = parseInt(data[0].pr_no);
          if (!isNaN(lastNo) && lastNo >= 2000000000) {
            setPrNo((lastNo + 1).toString());
          } else {
            setPrNo('2000000001');
          }
        } else {
          setPrNo('2000000001');
        }
      } catch (err) {
        console.error("Error fetching last PR number:", err);
        setPrNo((2000000000 + Math.floor(Math.random() * 999999)).toString());
      }
    };

    fetchNextPrNo();
  }, [initialData]);

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
        unitPrice: String(data.last_price || '0'),
        onHand: String(data.on_hand_stock || '0'),
        stockInHand: '',
        specification: data.type || '',
        brand: data.brand || '',
      } : item));
    }
    setLoadingSku(null);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        name: '',
        sku: '',
        specification: '',
        brand: '',
        uom: '',
        unitPrice: '',
        onHand: '',
        stockInHand: '',
        reqQty: '',
        remarks: '',
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof RequisitionItem, value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleFormSubmit = async () => {
    if (!supplierType) {
      alert('Please select a Supplier Type.');
      return;
    }
    
    if (!prNo) {
      alert('PR Number is generating, please wait...');
      return;
    }

    if (items.some(item => !item.name || !item.reqQty)) {
      alert('Please fill in Item Name and Required Quantity for all items.');
      return;
    }
    
    const totalValue = items.reduce((sum, item) => sum + (Number(item.reqQty) * Number(item.unitPrice) || 0), 0);
    
    const prPayload = {
      pr_no: prNo,
      reference: prReference,
      type: supplierType,
      status: 'Pending',
      req_by_name: requesterName,
      contact: contactNumber,
      email: emailAddress,
      reqDpt: department,
      note: prNote,
      total_value: totalValue,
      items: items,
      images: [], // Ensure initialized
      justification: [] // Ensure initialized
    };

    try {
      const { error } = await supabase.from('requisitions').upsert([prPayload]);

      if (!error) {
        onSubmit(prPayload);
      } else {
        console.error("Supabase Error:", error);
        alert(`Error saving PR: ${error.message}`);
      }
    } catch (err: any) {
      alert("Unexpected error: " + err.message);
    }
  };

  return (
    <div className="flex flex-col space-y-6 font-sans max-w-[1500px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between px-2">
        <button onClick={onBack} className="text-gray-400 hover:text-[#2d808e] transition-colors">
          <X size={20} />
        </button>
        <h1 className="text-xl font-bold text-[#2d808e] tracking-tight">New Purchase Requisition</h1>
        <div className="w-10"></div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 space-y-4">
        {/* Top Header Fields */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">PR Number</label>
            <input 
              type="text" 
              value={prNo} 
              readOnly
              className="w-full px-3 py-2 bg-gray-50 border border-cyan-700/10 rounded text-[12px] font-black text-[#2d808e] outline-none cursor-not-allowed" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">PR Reference</label>
            <div className="relative">
              <input 
                type="text" 
                maxLength={30}
                value={prReference} 
                onChange={(e) => setPrReference(e.target.value)} 
                className="w-full px-3 py-2 border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-[12px] font-medium placeholder-gray-300" 
                placeholder="PR Reference" 
              />
              <span className="absolute right-3 top-2.5 text-[10px] text-gray-300 font-bold">{prReference.length} / 30</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#2d808e] uppercase tracking-wider flex items-center">
              <span className="text-red-500 mr-1">*</span> Type
            </label>
            <div className="relative">
              <select 
                value={supplierType} 
                onChange={(e) => setSupplierType(e.target.value)} 
                className="w-full px-3 py-2 border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-[12px] font-medium appearance-none text-gray-400"
              >
                <option value="">Supplier Type</option>
                <option value="Local">Local</option>
                <option value="Foreign">Foreign</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">PR Note</label>
            <div className="relative">
              <input 
                type="text" 
                maxLength={50}
                value={prNote} 
                onChange={(e) => setPrNote(e.target.value)} 
                className="w-full px-3 py-2 border border-cyan-700/30 rounded focus:border-[#2d808e] outline-none text-[12px] font-medium placeholder-gray-300" 
                placeholder="PR Note" 
              />
              <span className="absolute right-3 top-2.5 text-[10px] text-gray-300 font-bold">{prNote.length} / 50</span>
            </div>
          </div>
        </div>

        {/* Requester Details */}
        <div className="space-y-1 pt-2">
          <h3 className="text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">Requester Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-bold">Name</label>
              <input 
                type="text" 
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[12px] text-gray-700 focus:border-[#2d808e] outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-bold">Contact Number</label>
              <input 
                type="text" 
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[12px] text-gray-700 focus:border-[#2d808e] outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-bold">Email</label>
              <input 
                type="email" 
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[12px] text-gray-700 focus:border-[#2d808e] outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-bold">Department</label>
              <div className="relative">
                <select 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[12px] text-gray-700 focus:border-[#2d808e] outline-none appearance-none"
                >
                  {costCenters.map(cc => (
                    <option key={cc} value={cc}>{cc}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Item Details Table */}
        <div className="space-y-4 pt-2">
          <h3 className="text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">Item Details</h3>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[10px] font-bold text-gray-800 border-b border-gray-100 uppercase">
                  <th className="pb-3 px-1 w-[320px]">Name <span className="text-red-500">*</span></th>
                  <th className="pb-3 px-1 w-[160px]">SKU/Code</th>
                  <th className="pb-3 px-1 w-[160px]">Specification</th>
                  <th className="pb-3 px-1 w-[120px]">Brand</th>
                  <th className="pb-3 px-1 w-[100px]">UOM*</th>
                  <th className="pb-3 px-1 w-[100px] text-center">Unit Price</th>
                  <th className="pb-3 px-1 w-[100px] text-center">Stock in Store [B]</th>
                  <th className="pb-3 px-1 w-[100px] text-center">Stock in Hand [A]</th>
                  <th className="pb-3 px-1 w-[100px] text-center">Req. Qty*</th>
                  <th className="pb-3 px-1 w-[160px]">Remarks</th>
                  <th className="pb-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="group">
                    <td className="py-1 px-1">
                      <input 
                        type="text" 
                        placeholder="Item Name"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] focus:border-[#2d808e] outline-none placeholder-gray-200 font-bold"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="SKU/Code"
                          value={item.sku}
                          onChange={(e) => updateItem(item.id, 'sku', e.target.value)}
                          onBlur={(e) => handleSkuLookup(item.id, e.target.value)}
                          className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] focus:border-[#2d808e] outline-none placeholder-gray-200"
                        />
                        {loadingSku === item.id && <Loader2 size={12} className="absolute right-1 top-2.5 animate-spin text-gray-400" />}
                      </div>
                    </td>
                    <td className="py-1 px-1">
                      <input 
                        type="text" 
                        placeholder="Specification"
                        value={item.specification}
                        onChange={(e) => updateItem(item.id, 'specification', e.target.value)}
                        className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] focus:border-[#2d808e] outline-none placeholder-gray-200"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <input 
                        type="text" 
                        placeholder="Brand"
                        value={item.brand}
                        onChange={(e) => updateItem(item.id, 'brand', e.target.value)}
                        className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] focus:border-[#2d808e] outline-none placeholder-gray-200"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <input 
                        type="text" 
                        placeholder="UOM"
                        value={item.uom}
                        onChange={(e) => updateItem(item.id, 'uom', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] text-center focus:border-[#2d808e] outline-none placeholder-gray-200 uppercase"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <input 
                        type="text" 
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                        className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] text-center focus:border-[#2d808e] outline-none placeholder-gray-200"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <input 
                        type="text" 
                        placeholder="Stock Store"
                        value={item.onHand}
                        readOnly
                        className="w-full px-3 py-2 bg-gray-50 border border-cyan-700/30 rounded text-[11px] text-center text-gray-400 outline-none"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <input 
                        type="text" 
                        placeholder="Stock Hand"
                        value={item.stockInHand}
                        onChange={(e) => updateItem(item.id, 'stockInHand', e.target.value)}
                        className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] text-center focus:border-[#2d808e] outline-none placeholder-gray-200"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <input 
                        type="text" 
                        placeholder="Req. Qty"
                        value={item.reqQty}
                        onChange={(e) => updateItem(item.id, 'reqQty', e.target.value)}
                        className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] text-center font-bold focus:border-[#2d808e] outline-none placeholder-gray-200"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <input 
                        type="text" 
                        placeholder="Remarks"
                        value={item.remarks}
                        onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                        className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] focus:border-[#2d808e] outline-none placeholder-gray-200"
                      />
                    </td>
                    <td className="py-1 px-1 text-center">
                      <button 
                        onClick={() => removeItem(item.id)} 
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <MinusCircle size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button 
            onClick={addItem} 
            className="w-full py-2 bg-[#2d808e] text-white flex items-center justify-center space-x-2 text-[11px] font-bold rounded shadow-sm hover:bg-[#256b78] transition-all uppercase tracking-widest"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Add Item</span>
          </button>
        </div>

        {/* Submit Action */}
        <button 
          onClick={handleFormSubmit} 
          className="w-full py-3 bg-[#2d808e] text-white text-[13px] font-black rounded shadow-xl hover:bg-[#256b78] transition-all active:scale-[0.99] uppercase tracking-widest"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default NewPurchaseRequisition;