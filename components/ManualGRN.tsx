
import React, { useState } from 'react';
import { Home, Plus, MinusCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import GRNPreviewModal from './GRNPreviewModal';
import ItemSearchInput from './ItemSearchInput';

interface GRNItem {
  id: string;
  name: string;
  sku: string;
  uom: string;
  unitPrice: string;
  recQty: string;
  location: string;
  masterLocation?: string;
  masterStock?: number;
  remarks: string;
  expiryDate: string;
}

interface ManualGRNProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
}

const ManualGRN: React.FC<ManualGRNProps> = ({ onBack, onSubmit }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allLocations, setAllLocations] = useState<{name: string, count: number}[]>([]);
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [grnId, setGrnId] = useState('');

  React.useEffect(() => {
    const fetchNextGrnId = async () => {
      try {
        const { data } = await supabase
          .from('grns')
          .select('grn_no')
          .order('grn_no', { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          const lastNo = parseInt(data[0].grn_no);
          setGrnId((lastNo + 1).toString());
        } else {
          setGrnId('4000000001');
        }
      } catch {
        setGrnId('4000000001');
      }
    };
    fetchNextGrnId();

    const fetchLocations = async () => {
      const { data } = await supabase.from('items').select('location');
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(i => {
          if (i.location) {
            counts[i.location] = (counts[i.location] || 0) + 1;
          }
        });
        const locList = Object.entries(counts).map(([name, count]) => ({ name, count }));
        setAllLocations(locList);
      }
    };
    fetchLocations();

    const fetchDepts = async () => {
      const { data } = await supabase.from('cost_centers').select('name').order('name');
      if (data) setAllDepartments(data.map(d => d.name));
    };
    fetchDepts();
  }, []);
  
  const [formData, setFormData] = useState({
    documentDate: new Date().toISOString().split('T')[0],
    receiveDate: new Date().toISOString().split('T')[0],
    transactionType: '',
    department: '',
    sourceType: '',
    sourceRef: '',
    headerText: '',
    invoiceNo: '',
    blMushokNo: '',
    blContainer: ''
  });

  const [items, setItems] = useState<GRNItem[]>([
    { id: '1', name: '', sku: '', uom: '', unitPrice: '', recQty: '', location: '', remarks: '', expiryDate: '' }
  ]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', sku: '', uom: '', unitPrice: '', recQty: '', location: '', remarks: '', expiryDate: '' }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof GRNItem, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.sku || !i.recQty)) {
      alert("Please ensure SKU and Quantity are filled for all items.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create GRN Record
      const { error: grnError } = await supabase.from('grns').insert([{
        grn_no: grnId,
        document_date: formData.documentDate,
        receive_date: formData.receiveDate,
        transaction_type: formData.transactionType,
        source_type: formData.sourceType,
        source_ref: formData.sourceRef,
        header_text: formData.headerText,
        invoice_no: formData.invoiceNo,
        bl_mushok_no: formData.blMushokNo,
        bl_container: formData.blContainer,
        items: items
      }]);

      if (grnError) throw grnError;

      // 2. Logic to update master inventory stock
      for (const item of items) {
        const qty = parseInt(item.recQty) || 0;
        const { error: rpcError } = await supabase.rpc('update_item_stock', {
          item_sku: item.sku,
          qty_change: qty,
          is_receive: true,
          ref_no: grnId,
          dept: formData.department,
          unit_price: parseFloat(item.unitPrice) || 0
        });
        
        // Update the "last" fields and cost center for inventory tracking
        await supabase
          .from('items')
          .update({ 
            last_received_qty: qty,
            last_received_date: new Date().toISOString(),
            cost_center: formData.department || 'N/A',
            expiry_date: item.expiryDate || null
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
            const newStock = (Number(currentItem.on_hand_stock) || 0) + qty;
            await supabase
              .from('items')
              .update({ on_hand_stock: newStock })
              .eq('sku', item.sku);
          }
        }
      }
      
      setShowSuccess(true);
    } catch (err: any) {
      console.error('GRN Submission Error:', err);
      alert("Error: " + err.message + (err.message?.includes('relation "grns" does not exist') ? "\n\nPlease ensure the 'grns' table is created in your Supabase database." : ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <GRNPreviewModal 
        grnId={grnId} 
        onClose={() => onSubmit({ ...formData, items })} 
        onPrintLabels={(items) => {
          onSubmit({ ...formData, items });
          navigate('/label', { state: { items } });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col space-y-6 font-sans antialiased text-gray-800">
      {/* Breadcrumb Matching Image 2 */}
      <div className="flex items-center space-x-2 text-[10px] font-bold text-[#2d808e] uppercase tracking-wider">
        <Home size={12} className="text-gray-400" />
        <span className="text-gray-300">/</span>
        <button onClick={onBack} className="text-gray-400 hover:text-[#2d808e] transition-colors">RECEIVE</button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-400">NEW</span>
      </div>

      <div className="text-center py-2">
        <h1 className="text-[20px] font-black text-[#2d808e] tracking-tight">Goods Receive</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded shadow-sm border border-gray-100 p-8 space-y-10 max-w-[1600px] mx-auto w-full">
        
        {/* Row 1: Dates and Types */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#2d808e] uppercase"><span className="text-red-500 mr-1">*</span>Document Date</label>
            <div className="relative">
              <input 
                type="date" 
                value={formData.documentDate} 
                onChange={(e) => setFormData({...formData, documentDate: e.target.value})} 
                className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] outline-none" 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#2d808e] uppercase"><span className="text-red-500 mr-1">*</span>Receive Date</label>
            <div className="relative">
              <input 
                type="date" 
                value={formData.receiveDate} 
                onChange={(e) => setFormData({...formData, receiveDate: e.target.value})} 
                className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] outline-none" 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#2d808e] uppercase"><span className="text-red-500 mr-1">*</span>Transaction Type</label>
            <select 
              value={formData.transactionType}
              onChange={(e) => setFormData({...formData, transactionType: e.target.value})}
              className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] text-gray-400 outline-none appearance-none bg-white"
            >
              <option value="">Transaction Type</option>
              <option value="Standard">Standard Receive</option>
              <option value="Return">Return Receive</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#2d808e] uppercase"><span className="text-red-500 mr-1">*</span>Source Type</label>
            <select 
              value={formData.sourceType}
              onChange={(e) => setFormData({...formData, sourceType: e.target.value})}
              className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] text-gray-400 outline-none appearance-none bg-white"
            >
              <option value="">Source Type</option>
              <option value="PO">Purchase Order</option>
              <option value="Local">Local Purchase</option>
              <option value="Transfer">Stock Transfer</option>
            </select>
          </div>
        </div>

        {/* Row 2: References */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-[#2d808e] uppercase">Source Reference</label>
            <div className="relative">
              <input 
                type="text" 
                maxLength={50}
                placeholder="Source Ref."
                value={formData.sourceRef} 
                onChange={(e) => setFormData({...formData, sourceRef: e.target.value})} 
                className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] outline-none placeholder-gray-300" 
              />
              <span className="absolute right-2 top-2.5 text-[8px] font-bold text-gray-300">{formData.sourceRef.length} / 50</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-[#2d808e] uppercase">Header Text</label>
            <div className="relative">
              <input 
                type="text" 
                maxLength={50}
                placeholder="Source Ref."
                value={formData.headerText} 
                onChange={(e) => setFormData({...formData, headerText: e.target.value})} 
                className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] outline-none placeholder-gray-300" 
              />
              <span className="absolute right-2 top-2.5 text-[8px] font-bold text-gray-300">{formData.headerText.length} / 50</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-[#2d808e] uppercase">Department</label>
            <select 
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] outline-none bg-white"
            >
              <option value="">Select Department</option>
              {allDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-[#2d808e] uppercase">Invoice No</label>
            <div className="relative">
              <input 
                type="text" 
                maxLength={50}
                placeholder="Invoice Ref."
                value={formData.invoiceNo} 
                onChange={(e) => setFormData({...formData, invoiceNo: e.target.value})} 
                className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] outline-none placeholder-gray-300" 
              />
              <span className="absolute right-2 top-2.5 text-[8px] font-bold text-gray-300">{formData.invoiceNo.length} / 50</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-[#2d808e] uppercase">BL/MUSHOK No</label>
            <div className="relative">
              <input 
                type="text" 
                maxLength={50}
                placeholder="BL/MUSHOK Ref."
                value={formData.blMushokNo} 
                onChange={(e) => setFormData({...formData, blMushokNo: e.target.value})} 
                className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] outline-none placeholder-gray-300" 
              />
              <span className="absolute right-2 top-2.5 text-[8px] font-bold text-gray-300">{formData.blMushokNo.length} / 50</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-[#2d808e] uppercase">B/L Container</label>
            <div className="relative">
              <input 
                type="text" 
                maxLength={50}
                placeholder="B/L Container Ref."
                value={formData.blContainer} 
                onChange={(e) => setFormData({...formData, blContainer: e.target.value})} 
                className="w-full px-3 py-2 border border-cyan-700/30 rounded text-[11px] outline-none placeholder-gray-300" 
              />
              <span className="absolute right-2 top-2.5 text-[8px] font-bold text-gray-300">{formData.blContainer.length} / 50</span>
            </div>
          </div>
        </div>

        {/* Item Details Section */}
        <div className="space-y-4">
          <h3 className="text-[12px] font-black text-[#2d808e] uppercase tracking-tighter">Item Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-[10px] font-bold text-gray-800 text-left uppercase">
                  <th className="pb-2 px-1 w-[350px]">Name</th>
                  <th className="pb-2 px-1 w-[180px]">Part/SKU</th>
                  <th className="pb-2 px-1 w-[100px]">UOM</th>
                  <th className="pb-2 px-1 w-[120px]">Unit Price</th>
                  <th className="pb-2 px-1 w-[100px]">Rec. Qty</th>
                  <th className="pb-2 px-1 w-[150px]">Expiry Date</th>
                  <th className="pb-2 px-1 w-[180px]">Location</th>
                  <th className="pb-2 px-1">Remarks</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="space-y-0">
                {items.map((item) => (
                  <tr key={item.id} className="group border-b border-gray-50 last:border-0">
                    <td className="py-2 px-1">
                      <ItemSearchInput
                        value={item.name}
                        onChange={(val) => updateItem(item.id, 'name', val)}
                        onSelect={(data) => {
                          const locationDisplay = data.location ? `${data.location} (${data.on_hand_stock || 0})` : '';
                          setItems(prev => prev.map(i => i.id === item.id ? {
                            ...i,
                            sku: data.sku,
                            name: data.name,
                            uom: data.uom,
                            unitPrice: String(data.last_price || '0.00'),
                            location: locationDisplay,
                            masterLocation: data.location,
                            masterStock: data.on_hand_stock
                          } : i));
                        }}
                        placeholder="Item name"
                        searchField="name"
                        className="w-full px-3 py-1.5 border border-cyan-700/30 rounded text-[11px] outline-none placeholder-gray-200"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <ItemSearchInput
                        value={item.sku}
                        onChange={(val) => updateItem(item.id, 'sku', val)}
                        onSelect={(data) => {
                          const locationDisplay = data.location ? `${data.location} (${data.on_hand_stock || 0})` : '';
                          setItems(prev => prev.map(i => i.id === item.id ? {
                            ...i,
                            sku: data.sku,
                            name: data.name,
                            uom: data.uom,
                            unitPrice: String(data.last_price || '0.00'),
                            location: locationDisplay,
                            masterLocation: data.location,
                            masterStock: data.on_hand_stock
                          } : i));
                        }}
                        placeholder="SKU/Code"
                        searchField="sku"
                        className="w-full px-3 py-1.5 border border-cyan-700/30 rounded text-[11px] outline-none placeholder-gray-200 bg-white font-bold"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input 
                        type="text" 
                        placeholder="UOM"
                        value={item.uom}
                        onChange={(e) => updateItem(item.id, 'uom', e.target.value)}
                        className="w-full px-3 py-1.5 border border-cyan-700/30 rounded text-[11px] outline-none placeholder-gray-200 text-center"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input 
                        type="text" 
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                        className="w-full px-3 py-1.5 border border-cyan-700/30 rounded text-[11px] outline-none placeholder-gray-200 text-center"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input 
                        type="number" 
                        placeholder="Rec. Qty"
                        value={item.recQty}
                        onChange={(e) => updateItem(item.id, 'recQty', e.target.value)}
                        className="w-full px-3 py-1.5 border border-cyan-700/30 rounded text-[11px] outline-none placeholder-gray-200 text-center font-black"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input 
                        type="date" 
                        value={item.expiryDate}
                        onChange={(e) => updateItem(item.id, 'expiryDate', e.target.value)}
                        className="w-full px-3 py-1.5 border border-cyan-700/30 rounded text-[11px] outline-none"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <div className="relative">
                        <input 
                          type="text" 
                          list={`locations-${item.id}`}
                          value={item.location}
                          onChange={(e) => updateItem(item.id, 'location', e.target.value)}
                          placeholder="Location"
                          className="w-full px-3 py-1.5 border border-cyan-700/30 rounded text-[11px] outline-none bg-white"
                        />
                        <datalist id={`locations-${item.id}`}>
                          {item.masterLocation && (
                            <option value={`${item.masterLocation} (${item.masterStock || 0})`}>
                              {item.masterLocation} (Master Stock: {item.masterStock || 0})
                            </option>
                          )}
                          {allLocations.filter(l => l.name !== item.masterLocation).map(loc => (
                            <option key={loc.name} value={loc.name}>
                              {loc.name} ({loc.count} items)
                            </option>
                          ))}
                          <option value="WH-01">Warehouse 01</option>
                          <option value="WH-02">Warehouse 02</option>
                        </datalist>
                      </div>
                    </td>
                    <td className="py-2 px-1">
                      <input 
                        type="text" 
                        placeholder="Remarks"
                        value={item.remarks}
                        onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                        className="w-full px-3 py-1.5 border border-cyan-700/30 rounded text-[11px] outline-none placeholder-gray-200"
                      />
                    </td>
                    <td className="py-2 px-1 text-center">
                      <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <MinusCircle size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button 
            type="button" 
            onClick={addItem}
            className="w-full py-1.5 bg-[#2d808e] text-white flex items-center justify-center space-x-2 text-[11px] font-black rounded hover:bg-[#256b78] transition-all uppercase"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Add Item</span>
          </button>
        </div>

        {/* Footer Submit Bar Matching Image 2 */}
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full py-2 bg-[#2d808e] text-white text-[11px] font-black rounded hover:bg-[#256b78] transition-all flex items-center justify-center space-x-3 uppercase tracking-widest disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null}
          <span>Submit</span>
        </button>
      </form>
    </div>
  );
};

export default ManualGRN;
