
import React, { useState, useEffect } from 'react';
import { X, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SelectedItem {
  id: string;
  prNo: string;
  sku: string;
  name: string;
  specification: string;
  reqQty: number;
  poPending: number;
  poQty: number;
  unitPrice: number; // Incoming from PR
  poPrice: number;   // Form field
  vatPercent: string;
  remarks: string;
}

interface CreatePODetailsProps {
  items: SelectedItem[];
  onCancel: () => void;
  onSubmit: (finalData: any) => void;
}

const CreatePODetails: React.FC<CreatePODetailsProps> = ({ items: initialItems, onCancel, onSubmit }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<SelectedItem[]>(
    initialItems.map(item => ({
      ...item,
      poQty: item.reqQty, 
      poPending: item.reqQty, 
      poPrice: item.unitPrice || 0,
      vatPercent: '', 
      remarks: '' 
    }))
  );

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [poNo, setPoNo] = useState('');
  const [poType, setPoType] = useState('Local');
  const [currency, setCurrency] = useState('BDT');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [poNote, setPoNote] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState(`1. Delivery has to be done within 03 working days after receiving PO by the supplier.
2. Delivery has to be done as per specification of PO and quotation.
3. Incase of failure of work within the given time, supplier will be penalized as per company policy.
4. If any damage or problem occurs with the product, the supplier/seller will immediately replace/make arrangements with a new product.`);
  const [deliveryLocation, setDeliveryLocation] = useState('Contact Person: ZZZ (+8801 222 222 22)\nPlot- 12/A & 12/B, Block-C, Kaliakoir Hi-Tech Park, Gazipur, Bangladesh, 1750.');
  const [billSubmission, setBillSubmission] = useState('Contact Person: KKK (+880 111 222 333)\n76/B, Khawaja Palace, Road-11 Banani, Dhaka, Bangladesh, 1213.');
  const [documentsRequired, setDocumentsRequired] = useState(`1. Fully signed PO copy accept by supplier.
2. Delivery challan with receiving sign from inventory/warehouse officials.
3. Mushok 6.3.
4. Price quotation.`);
  const [paymentTerms, setPaymentTerms] = useState(`1. 100% payment will be made within 30 working days of successful delivery of required .
2. VAT and AIT applicable as per BD Govt. rules.`);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [deliveryTarget, setDeliveryTarget] = useState('');

  useEffect(() => {
    const initData = async () => {
      const { data: supplierData } = await supabase.from('suppliers').select('*').order('name');
      if (supplierData) setSuppliers(supplierData);

      const { data: lastPO } = await supabase
        .from('purchase_orders')
        .select('po_no')
        .order('po_no', { ascending: false })
        .limit(1);

      if (lastPO && lastPO.length > 0) {
        const lastVal = parseInt(lastPO[0].po_no);
        if (!isNaN(lastVal) && lastVal >= 3000000000) {
          setPoNo((lastVal + 1).toString());
        } else {
          setPoNo('3000000001');
        }
      } else {
        setPoNo('3000000001');
      }
    };
    initData();
  }, []);

  const updateItem = (id: string, field: keyof SelectedItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const handleFinalSubmit = async () => {
    if (!selectedSupplier) return alert("Please select a supplier.");
    if (!deliveryTarget) return alert("Please select a delivery target date.");

    setIsSubmitting(true);
    const totalValue = items.reduce((sum, item) => sum + (Number(item.poQty) * Number(item.poPrice)), 0);

    const poPayload = {
      po_no: poNo,
      type: poType,
      supplier_id: selectedSupplier.id,
      supplier_name: selectedSupplier.name,
      currency: currency,
      total_value: totalValue,
      status: 'Pending Approval',
      items: items,
      terms: {
        deliveryTerms,
        deliveryLocation,
        billSubmission,
        documentsRequired,
        paymentTerms,
        paymentMethod,
        deliveryTarget,
        requested_by: user?.fullName || 'N/A',
        requested_contact: user?.email || 'N/A',
        // Move these here to be safe
        supplier_address: `${selectedSupplier.address_street || ''}, ${selectedSupplier.address_city || ''}, ${selectedSupplier.address_country || ''}`,
        supplier_vat: selectedSupplier.tax_bin || 'N/A',
        supplier_tin: selectedSupplier.tin || 'N/A',
        supplier_email: selectedSupplier.email_office || 'N/A',
        supplier_contact: selectedSupplier.phone_office || 'N/A',
      },
      note: poNote
    };

    try {
      const { error: poError } = await supabase.from('purchase_orders').insert([poPayload]);
      if (poError) throw poError;
      
      const uniquePrNos = Array.from(new Set(items.map(i => i.prNo)));
      await supabase
        .from('requisitions')
        .update({ status: 'Ordered' })
        .in('pr_no', uniquePrNos);
      
      alert(`PO ${poNo} submitted as Pending Approval.`);
      onSubmit(poPayload);
      navigate('/purchase-order');
    } catch (err: any) {
      alert("Error creating PO: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen font-sans antialiased text-gray-800">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 sticky top-0 bg-white z-50">
        <div className="flex items-center space-x-3">
          <button onClick={onCancel} className="p-1 hover:bg-gray-50 rounded">
            <X size={20} className="text-gray-400" />
          </button>
          <h1 className="text-[18px] font-black tracking-tight text-gray-800 uppercase">Make a Purchase Order(PO)</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={onCancel} className="px-10 py-2 text-[13px] font-bold border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition-all">Cancel</button>
          <button 
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="px-12 py-2 text-[13px] font-black text-white bg-[#2d808e] rounded shadow-xl hover:bg-[#256b78] transition-all flex items-center space-x-2 active:scale-[0.98]"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>Submit for Approval</span>
          </button>
        </div>
      </div>

      <div className="p-4 max-w-[1600px] mx-auto space-y-4">
        <div className="bg-white rounded border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#fcfcfc]">
              <tr className="font-bold text-gray-800 border-b border-gray-100 uppercase text-[10px]">
                <th className="px-3 py-3 text-center w-32 border-r border-gray-50">SKU</th>
                <th className="px-3 py-3 border-r border-gray-50">name</th>
                <th className="px-3 py-3 border-r border-gray-50">Specification</th>
                <th className="px-3 py-3 text-center border-r border-gray-50">Req.Qty</th>
                <th className="px-3 py-3 text-center border-r border-gray-50">PO Pending</th>
                <th className="px-3 py-3 text-center border-r border-gray-50">PO Qty</th>
                <th className="px-3 py-3 text-center border-r border-gray-50 text-[#2d808e]">PO Price</th>
                <th className="px-3 py-3 text-center border-r border-gray-50">% of VAT</th>
                <th className="px-3 py-3 border-r border-gray-50">PO Remarks</th>
                <th className="px-3 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                  <td className="px-3 py-2 text-center border-r border-gray-50">{item.sku}</td>
                  <td className="px-3 py-2 font-bold uppercase border-r border-gray-50 leading-tight">{item.name}</td>
                  <td className="px-3 py-2 border-r border-gray-50 text-[9px] text-gray-500 leading-tight">{item.specification}</td>
                  <td className="px-3 py-2 text-center border-r border-gray-50">{item.reqQty}</td>
                  <td className="px-3 py-2 text-center border-r border-gray-50">{item.poPending}</td>
                  <td className="px-3 py-2 text-center border-r border-gray-50">
                    <input 
                      type="number" 
                      value={item.poQty}
                      onChange={(e) => updateItem(item.id, 'poQty', Number(e.target.value))}
                      className="w-14 px-1 py-1 text-center border border-gray-200 rounded outline-none font-bold"
                    />
                  </td>
                  <td className="px-3 py-2 text-center border-r border-gray-50">
                    <input 
                      type="number" 
                      value={item.poPrice}
                      onChange={(e) => updateItem(item.id, 'poPrice', Number(e.target.value))}
                      className="w-20 px-1 py-1 text-center border border-gray-200 rounded outline-none font-bold"
                    />
                  </td>
                  <td className="px-3 py-2 text-center border-r border-gray-50">
                    <input 
                      type="text" 
                      value={item.vatPercent}
                      placeholder=""
                      onChange={(e) => updateItem(item.id, 'vatPercent', e.target.value)}
                      className="w-10 px-1 py-1 text-center border border-gray-200 rounded outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 border-r border-gray-50">
                    <input 
                      type="text" 
                      value={item.remarks}
                      onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                      className="w-full px-1 py-1 border border-gray-200 rounded outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => removeItem(item.id)} className="text-pink-400 hover:text-pink-600">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">Supplier</label>
              <div className="relative">
                <select 
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs text-gray-400 outline-none appearance-none"
                  onChange={(e) => {
                    const s = suppliers.find(sup => sup.id === e.target.value);
                    setSelectedSupplier(s);
                  }}
                >
                  <option value="">Select a Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">Delivery Location</label>
              <textarea 
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                className="w-full h-20 px-3 py-2 border border-gray-200 rounded text-[10px] outline-none resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">Payment Terms</label>
              <textarea 
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full h-20 px-3 py-2 border border-gray-200 rounded text-[10px] outline-none resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">PO Type</label>
              <div className="relative">
                <select 
                  value={poType}
                  onChange={(e) => setPoType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[10px] text-gray-400 outline-none appearance-none"
                >
                  <option value="Local">Local</option>
                  <option value="Import">Import</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">Bill Submission</label>
              <textarea 
                value={billSubmission}
                onChange={(e) => setBillSubmission(e.target.value)}
                className="w-full h-20 px-3 py-2 border border-gray-200 rounded text-[10px] outline-none resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">Supplier Payment Methode</label>
              <textarea 
                placeholder="Payment methode details..."
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-20 px-3 py-2 border border-gray-200 rounded text-[10px] outline-none resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">PO Note</label>
              <textarea 
                placeholder="Please enter PO Note..."
                value={poNote}
                onChange={(e) => setPoNote(e.target.value)}
                className="w-full h-20 px-3 py-2 border border-gray-200 rounded text-[10px] outline-none resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">Documents Requied For Billing</label>
              <textarea 
                value={documentsRequired}
                onChange={(e) => setDocumentsRequired(e.target.value)}
                className="w-full h-20 px-3 py-2 border border-gray-200 rounded text-[10px] outline-none resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">PO Currency</label>
              <input 
                type="text"
                placeholder="BDT/USD/..."
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-[10px] outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">Delivery Terms</label>
              <textarea 
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                className="w-full h-[150px] px-3 py-2 border border-gray-200 rounded text-[10px] outline-none resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">Delivery Target</label>
              <div className="relative">
                <input 
                  type="date"
                  value={deliveryTarget}
                  onChange={(e) => setDeliveryTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-[10px] outline-none text-gray-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePODetails;
