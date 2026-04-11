
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  FileSpreadsheet, 
  Edit2, 
  Printer,
  Loader2,
  Trash2,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import NewPurchaseOrder from './NewPurchaseOrder';
import CreatePODetails from './CreatePODetails';
import POPrintTemplate from './POPrintTemplate';
import POPreviewModal from './POPreviewModal';
import { supabase } from '../lib/supabase';
import ColumnFilter from './ColumnFilter';
import { getPrintRoot } from '../lib/printRoot';

const PurchaseOrder: React.FC = () => {
  const [view, setView] = useState<'list' | 'select-items' | 'create-details'>('list');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPRItems, setSelectedPRItems] = useState<any[]>([]);
  const [editingPO, setEditingPO] = useState<any>(null);
  const [previewPo, setPreviewPo] = useState<any>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data && !error) setOrders(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const handleExportExcel = () => {
    const flattenedForExport = orders.flatMap(po => 
      (po.items || []).map((item: any) => ({
        'PO No': po.po_no,
        'PR No': item.prNo,
        'SKU': item.sku,
        'Name': item.name,
        'PO Price': item.poPrice,
        'PO Qty': item.poQty,
        'PO Value': Number(item.poQty || 0) * Number(item.poPrice || 0),
        'GRN Qty': item.receivedQty || 0,
        'Req. By': item.reqBy,
        'Supplier': po.supplier_name,
        'Status': po.status
      }))
    );
    const worksheet = XLSX.utils.json_to_sheet(flattenedForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order Items");
    XLSX.writeFile(workbook, "Purchase_Order_Items_Report.xlsx");
  };

  const handlePrint = (po: any) => {
    const printSection = document.getElementById('print-section');
    if (!printSection) return;
    printSection.innerHTML = '';
    const root = getPrintRoot(printSection);
    root.render(<POPrintTemplate po={po} />);
    setTimeout(() => window.print(), 600);
  };

  const handleEdit = (po: any) => {
    const itemsWithIds = (po.items || []).map((item: any, idx: number) => ({
      ...item,
      id: item.id || `${po.id}_${idx}`
    }));
    setSelectedPRItems(itemsWithIds);
    setEditingPO(po);
    setView('create-details');
  };

  const handleDelete = async (id: string, poNo: string) => {
    if (window.confirm(`Are you sure you want to delete PO No: ${poNo}?`)) {
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
      if (error) {
        alert("Delete failed: " + error.message);
      } else {
        fetchOrders();
      }
    }
  };

  const flattenedItems = useMemo(() => {
    const items = orders.flatMap(po => 
      (po.items || []).map((item: any) => ({
        ...item,
        po_no: po.po_no,
        supplier_name: po.supplier_name,
        po_status: po.status,
        full_po_obj: po 
      }))
    );

    // Apply column filters
    return items.filter(item => {
      return Object.entries(columnFilters).every(([column, value]) => {
        if (!value) return true;
        const itemValue = String(item[column] || '').toLowerCase();
        return itemValue.includes(value.toLowerCase());
      });
    });
  }, [orders, columnFilters]);

  if (view === 'select-items') {
    return <NewPurchaseOrder onBack={() => setView('list')} onSubmit={(items) => { setSelectedPRItems(items); setEditingPO(null); setView('create-details'); }} />;
  }

  if (view === 'create-details') {
    return (
      <CreatePODetails 
        items={selectedPRItems} 
        onCancel={() => setView(editingPO ? 'list' : 'select-items')} 
        onSubmit={() => { setView('list'); setEditingPO(null); fetchOrders(); }} 
      />
    );
  }

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  return (
    <div className="flex flex-col space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[10px] font-black text-[#2d808e] uppercase tracking-widest">
          <Home size={14} className="text-gray-400" />
          <span className="text-gray-400">/</span>
          <span>Purchase-Order</span>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleExportExcel}
            className="flex items-center space-x-2 border border-[#2d808e] text-[#2d808e] px-4 py-2 rounded text-[12px] font-black hover:bg-cyan-50 transition-all uppercase tracking-tight"
          >
            <FileSpreadsheet size={14} />
            <span>Excel</span>
          </button>
          <button 
            onClick={() => setView('select-items')}
            className="bg-[#2d808e] text-white px-8 py-2 rounded text-[12px] font-black shadow-lg shadow-cyan-900/10 hover:bg-[#256b78] transition-all uppercase tracking-widest"
          >
            New Purchase Order
          </button>
        </div>
      </div>

      <div className="bg-white rounded border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1700px]">
            <thead className="bg-[#fafbfc]">
              <tr className="text-[10px] font-black text-gray-700 uppercase tracking-widest border-b border-gray-100">
                <th className="px-4 py-5 text-center w-12 border-r border-gray-50">SL</th>
                <th className="px-4 py-5 text-center border-r border-gray-50">
                  <div className="flex items-center justify-center">
                    <span>PO No</span>
                    <ColumnFilter columnName="PO No" currentValue={columnFilters.po_no || ''} onFilter={(val) => handleColumnFilter('po_no', val)} />
                  </div>
                </th>
                <th className="px-4 py-5 text-center border-r border-gray-50 w-24">
                  <div className="flex items-center justify-center">
                    <span>Status</span>
                    <ColumnFilter columnName="Status" currentValue={columnFilters.po_status || ''} onFilter={(val) => handleColumnFilter('po_status', val)} />
                  </div>
                </th>
                <th className="px-4 py-5 text-center border-r border-gray-50">
                  <div className="flex items-center justify-center">
                    <span>PR No</span>
                    <ColumnFilter columnName="PR No" currentValue={columnFilters.prNo || ''} onFilter={(val) => handleColumnFilter('prNo', val)} />
                  </div>
                </th>
                <th className="px-4 py-5 text-center border-r border-gray-50">
                  <div className="flex items-center justify-center">
                    <span>SKU</span>
                    <ColumnFilter columnName="SKU" currentValue={columnFilters.sku || ''} onFilter={(val) => handleColumnFilter('sku', val)} />
                  </div>
                </th>
                <th className="px-4 py-5 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Name</span>
                    <ColumnFilter columnName="Name" currentValue={columnFilters.name || ''} onFilter={(val) => handleColumnFilter('name', val)} />
                  </div>
                </th>
                <th className="px-4 py-5 text-right border-r border-gray-50">PO Price</th>
                <th className="px-4 py-5 text-center border-r border-gray-50">PO Qty</th>
                <th className="px-4 py-5 text-right border-r border-gray-50">PO Value</th>
                <th className="px-4 py-5 text-center border-r border-gray-50">GRN Qty</th>
                <th className="px-4 py-5 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Req. By</span>
                    <ColumnFilter columnName="Req By" currentValue={columnFilters.reqBy || ''} onFilter={(val) => handleColumnFilter('reqBy', val)} />
                  </div>
                </th>
                <th className="px-4 py-5 border-r border-gray-50">
                  <div className="flex items-center">
                    <span>Supplier</span>
                    <ColumnFilter columnName="Supplier" currentValue={columnFilters.supplier_name || ''} onFilter={(val) => handleColumnFilter('supplier_name', val)} />
                  </div>
                </th>
                <th className="px-4 py-5 text-center w-32">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-bold text-gray-600 uppercase tracking-tighter">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="animate-spin text-[#2d808e]" size={24} />
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Syncing PO Items...</span>
                    </div>
                  </td>
                </tr>
              ) : flattenedItems.length > 0 ? (
                flattenedItems.map((item, index) => {
                  const poValue = Number(item.poQty || 0) * Number(item.poPrice || 0);
                  const displayStatus = item.po_status;
                  const isApproved = item.po_status === 'Approved' || item.po_status === 'Open' || item.po_status === 'Closed';
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors border-b border-gray-50">
                      <td className="px-4 py-4 text-center text-gray-400 border-r border-gray-50">{index + 1}</td>
                      <td className="px-4 py-4 text-center font-black text-blue-500 border-r border-gray-50">
                        <button onClick={() => setPreviewPo(item.full_po_obj)} className="hover:underline">{item.po_no}</button>
                      </td>
                      <td className="px-4 py-4 text-center border-r border-gray-50">
                        <span className={`px-3 py-1 rounded text-[9px] font-black shadow-sm ${
                          isApproved 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center border-r border-gray-50">{item.prNo}</td>
                      <td className="px-4 py-4 text-center border-r border-gray-50 text-gray-400">{item.sku}</td>
                      <td className="px-4 py-4 border-r border-gray-50 leading-tight w-64 uppercase">{item.name}</td>
                      <td className="px-4 py-4 text-right border-r border-gray-50 font-black">{Number(item.poPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-center border-r border-gray-50">{item.poQty}</td>
                      <td className="px-4 py-4 text-right border-r border-gray-50 font-black text-[#2d808e]">{poValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-center border-r border-gray-50 text-orange-600 font-black">{item.receivedQty || 0}</td>
                      <td className="px-4 py-4 border-r border-gray-50 text-gray-400 font-medium whitespace-nowrap">{item.reqBy}</td>
                      <td className="px-4 py-4 border-r border-gray-50 leading-tight">{item.supplier_name}</td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => setPreviewPo(item.full_po_obj)} 
                            className="p-1.5 text-gray-400 hover:text-cyan-500 border border-gray-100 rounded transition-all"
                            title="Preview PO"
                          >
                            <Eye size={12} />
                          </button>
                          <button 
                            onClick={() => handlePrint(item.full_po_obj)} 
                            className="p-1.5 text-gray-400 hover:text-blue-500 border border-gray-100 rounded transition-all"
                            title="Print PO"
                          >
                            <Printer size={12} />
                          </button>
                          <button 
                            onClick={() => handleEdit(item.full_po_obj)}
                            className="p-1.5 text-gray-400 hover:text-[#2d808e] border border-gray-100 rounded transition-all"
                            title="Edit PO"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.full_po_obj.id, item.po_no)}
                            className="p-1.5 text-gray-400 hover:text-red-500 border border-gray-100 rounded transition-all"
                            title="Delete PO"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} className="py-24 text-center text-gray-300 uppercase font-black tracking-[0.2em] text-[10px]">
                    No Purchase Orders Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {previewPo && <POPreviewModal po={previewPo} onClose={() => { setPreviewPo(null); fetchOrders(); }} />}
    </div>
  );
};

export default PurchaseOrder;
