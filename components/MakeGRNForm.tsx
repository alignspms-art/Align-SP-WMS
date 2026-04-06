
import React, { useState, useEffect } from 'react';
import { X, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import GRNPreviewModal from './GRNPreviewModal';

interface GRNItem {
  id: string;
  poId: string;
  poNo: string;
  sku: string;
  name: string;
  uom: string;
  poQty: number;
  alreadyReceived: number;
  grnPrice: number;
  grnQty: number;
  location: string;
  reqDept?: string;
  masterLocation?: string;
  masterStock?: number;
  remarks: string;
  expiryDate: string;
}

interface MakeGRNFormProps {
  selectedItems: any[];
  onClose: () => void;
  onSubmit: () => void;
}

const MakeGRNForm: React.FC<MakeGRNFormProps> = ({ selectedItems, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<GRNItem[]>([]);
  const [allLocations, setAllLocations] = useState<{name: string, count: number}[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [grnId, setGrnId] = useState('');
  const [formData, setFormData] = useState({
    documentDate: new Date().toISOString().split('T')[0],
    receiveDate: new Date().toISOString().split('T')[0],
    headerText: '',
    invoiceNo: '',
    blMushokNo: '',
    blContainer: ''
  });

  useEffect(() => {
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
      } catch (_) {
        setGrnId('4000000001');
      }
    };
    fetchNextGrnId();

    const fetchAllLocations = async () => {
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
    fetchAllLocations();

    const initializeItems = async () => {
      // Fetch master item details for all selected SKUs
      const skus = selectedItems.map(i => i.sku);
      const { data: masterItems } = await supabase
        .from('items')
        .select('sku, location, on_hand_stock')
        .in('sku', skus);

      const masterMap = (masterItems || []).reduce((acc: any, item: any) => {
        acc[item.sku] = { location: item.location, stock: item.on_hand_stock };
        return acc;
      }, {});

      // Initialize items from selectedItems
      const initialItems = selectedItems.map(item => {
        const master = masterMap[item.sku] || { location: '', stock: 0 };
        const locationDisplay = master.location ? `${master.location} (${master.stock || 0})` : '';
        return {
          id: item.id,
          poId: item.poId,
          poNo: item.poNo,
          sku: item.sku,
          name: item.name,
          uom: item.uom || 'SET',
          poQty: item.poQty || 0,
          alreadyReceived: item.alreadyReceived || 0,
          grnPrice: item.unitPrice || 0,
          grnQty: item.poQty - (item.alreadyReceived || 0),
          location: locationDisplay,
          reqDept: item.reqDept || 'N/A',
          masterLocation: master.location,
          masterStock: master.stock,
          remarks: '',
          expiryDate: ''
        };
      });
      setItems(initialItems);
    };

    initializeItems();
  }, [selectedItems]);

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof GRNItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (items.length === 0) return;
    if (!grnId) {
      alert("GRN ID is not generated yet. Please wait or try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create GRN Record
      const { error: grnError } = await supabase.from('grns').insert([{
        grn_no: grnId,
        document_date: formData.documentDate,
        receive_date: formData.receiveDate,
        header_text: formData.headerText,
        invoice_no: formData.invoiceNo,
        bl_mushok_no: formData.blMushokNo,
        bl_container: formData.blContainer,
        source_ref: items[0]?.poNo || '',
        items: items
      }]);
      
      if (grnError) {
        console.error('GRN Insert Error:', grnError);
        throw grnError;
      }

      // 2. Update Item Stock
      for (const item of items) {
        const { error: rpcError } = await supabase.rpc('update_item_stock', {
          item_sku: item.sku,
          qty_change: Number(item.grnQty),
          is_receive: true,
          ref_no: grnId,
          dept: item.reqDept,
          unit_price: Number(item.grnPrice)
        });
        
        // Update the "last" fields and cost center for inventory tracking
        await supabase
          .from('items')
          .update({ 
            last_received_qty: Number(item.grnQty),
            last_received_date: new Date().toISOString(),
            cost_center: item.reqDept || 'N/A',
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
            const newStock = (Number(currentItem.on_hand_stock) || 0) + Number(item.grnQty);
            await supabase
              .from('items')
              .update({ on_hand_stock: newStock })
              .eq('sku', item.sku);
          }
        }
      }

      // 3. Update PO items received qty
      const poIds = Array.from(new Set(items.map(i => i.poId)));
      for (const poId of poIds) {
        const { data: po } = await supabase.from('purchase_orders').select('items').eq('id', poId).single();
        if (po && po.items) {
          const updatedPoItems = po.items.map((poItem: any) => {
            const grnItem = items.find(gi => gi.poId === poId && gi.sku === poItem.sku);
            if (grnItem) {
              const currentReceived = Number(poItem.receivedQty || 0);
              return { ...poItem, receivedQty: currentReceived + Number(grnItem.grnQty) };
            }
            return poItem;
          });

          // Check if all items are fully received
          const allReceived = updatedPoItems.every((i: any) => Number(i.receivedQty || 0) >= Number(i.poQty || 0));
          
          await supabase.from('purchase_orders')
            .update({ 
              items: updatedPoItems,
              status: allReceived ? 'Closed' : 'Open'
            })
            .eq('id', poId);
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
    return <GRNPreviewModal grnId={grnId} onClose={onSubmit} />;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[1600px] rounded-lg shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <h2 className="text-[16px] font-bold text-gray-800">Make a Goods Receive Note(GRN)</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={onClose}
              className="px-6 py-1.5 border border-gray-200 text-gray-600 text-[13px] font-medium rounded hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || items.length === 0}
              className="px-8 py-1.5 bg-[#2d808e] text-white text-[13px] font-bold rounded hover:bg-[#256b78] transition-all flex items-center space-x-2"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              <span>Submit</span>
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Top Fields */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-600"><span className="text-red-500 mr-1">*</span>Document Date</label>
              <input 
                type="date" 
                value={formData.documentDate}
                onChange={(e) => setFormData({...formData, documentDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-100 rounded text-[13px] outline-none focus:border-[#2d808e] bg-gray-50/30" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-600"><span className="text-red-500 mr-1">*</span>Receive Date</label>
              <input 
                type="date" 
                value={formData.receiveDate}
                onChange={(e) => setFormData({...formData, receiveDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-100 rounded text-[13px] outline-none focus:border-[#2d808e] bg-gray-50/30" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-600">Header Text</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Source Ref."
                  maxLength={50}
                  value={formData.headerText}
                  onChange={(e) => setFormData({...formData, headerText: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-100 rounded text-[13px] outline-none focus:border-[#2d808e] pr-12 bg-gray-50/30 placeholder:text-gray-300" 
                />
                <span className="absolute right-2 top-2.5 text-[10px] text-gray-300 font-medium">{formData.headerText.length} / 50</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-600">Invoice No</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Invoice Ref."
                  maxLength={50}
                  value={formData.invoiceNo}
                  onChange={(e) => setFormData({...formData, invoiceNo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-100 rounded text-[13px] outline-none focus:border-[#2d808e] pr-12 bg-gray-50/30 placeholder:text-gray-300" 
                />
                <span className="absolute right-2 top-2.5 text-[10px] text-gray-300 font-medium">{formData.invoiceNo.length} / 50</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-600">BL/MUSHOK No</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="BL/MUSHOK Ref."
                  maxLength={50}
                  value={formData.blMushokNo}
                  onChange={(e) => setFormData({...formData, blMushokNo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-100 rounded text-[13px] outline-none focus:border-[#2d808e] pr-12 bg-gray-50/30 placeholder:text-gray-300" 
                />
                <span className="absolute right-2 top-2.5 text-[10px] text-gray-300 font-medium">{formData.blMushokNo.length} / 50</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-600">B/L Container</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="B/L Container Ref."
                  maxLength={50}
                  value={formData.blContainer}
                  onChange={(e) => setFormData({...formData, blContainer: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-100 rounded text-[13px] outline-none focus:border-[#2d808e] pr-12 bg-gray-50/30 placeholder:text-gray-300" 
                />
                <span className="absolute right-2 top-2.5 text-[10px] text-gray-300 font-medium">{formData.blContainer.length} / 50</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[12px] font-bold text-gray-800 border-b border-gray-100">
                  <th className="px-4 py-4 text-center">SKU</th>
                  <th className="px-4 py-4">name</th>
                  <th className="px-4 py-4 text-center">UOM</th>
                  <th className="px-4 py-4 text-center">PO Qty</th>
                  <th className="px-4 py-4 text-center">Already Recevied</th>
                  <th className="px-4 py-4 text-center">GRN Price</th>
                  <th className="px-4 py-4 text-center">GRN Qty</th>
                  <th className="px-4 py-4">Expiry Date</th>
                  <th className="px-4 py-4">Receive Location</th>
                  <th className="px-4 py-4">GRN Remarks</th>
                  <th className="px-4 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                    <td className="px-4 py-5 text-center text-gray-600">{item.sku}</td>
                    <td className="px-4 py-5 text-gray-700 font-medium uppercase max-w-[350px] leading-tight">{item.name}</td>
                    <td className="px-4 py-5 text-center text-gray-600">{item.uom}</td>
                    <td className="px-4 py-5 text-center text-gray-600">{item.poQty}</td>
                    <td className="px-4 py-5 text-center text-gray-600">
                      <input 
                        type="number" 
                        value={item.alreadyReceived}
                        onChange={(e) => updateItem(item.id, 'alreadyReceived', Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-100 rounded text-center outline-none focus:border-[#2d808e] bg-gray-50/30"
                      />
                    </td>
                    <td className="px-4 py-5 text-center text-gray-600">{item.grnPrice}</td>
                    <td className="px-4 py-5 text-center">
                      <input 
                        type="number" 
                        value={item.grnQty}
                        onChange={(e) => updateItem(item.id, 'grnQty', Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-100 rounded text-center outline-none focus:border-[#2d808e] bg-gray-50/30"
                      />
                    </td>
                    <td className="px-4 py-5">
                      <input 
                        type="date" 
                        value={item.expiryDate}
                        onChange={(e) => updateItem(item.id, 'expiryDate', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-100 rounded text-[12px] outline-none focus:border-[#2d808e] bg-gray-50/30"
                      />
                    </td>
                    <td className="px-4 py-5">
                      <div className="relative group/loc">
                        <input 
                          type="text" 
                          list={`locations-${item.id}`}
                          value={item.location}
                          onChange={(e) => updateItem(item.id, 'location', e.target.value)}
                          placeholder="Select Location"
                          className="w-full px-3 py-1.5 border border-gray-100 rounded text-[12px] outline-none focus:border-[#2d808e] bg-gray-50/30"
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
                          <option value="QC-AREA">QC Area</option>
                        </datalist>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <input 
                        type="text" 
                        value={item.remarks}
                        onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-100 rounded text-[12px] outline-none focus:border-[#2d808e] bg-gray-50/30"
                      />
                    </td>
                    <td className="px-4 py-5 text-center">
                      <button onClick={() => removeItem(item.id)} className="text-pink-300 hover:text-pink-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MakeGRNForm;
