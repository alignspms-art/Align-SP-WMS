import React, { useState, useEffect } from 'react';
import { Home, FileSpreadsheet, Search, List, Loader2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import ColumnFilter from './ColumnFilter';

interface InventoryItem {
  id: string;
  code: string;
  sku: string;
  name: string;
  uom: string;
  receivedQty: number;
  issuedQty: number;
  onHandQty: number;
  safetyStock: number;
  itemType: string;
  costCenter: string;
  lastReceivedQty?: number;
  lastReceivedDate?: string;
  lastIssuedQty?: number;
  lastIssuedDate?: string;
  expiryDate?: string;
  batchNumber?: string;
}

const Inventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const fetchInventory = React.useCallback(async () => {
    setLoading(true);
    try {
      let allData: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('items')
          .select('*');

        if (searchTerm) {
          query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
        }

        // Apply column filters
        Object.entries(columnFilters).forEach(([column, value]) => {
          if (value) {
            if (column === 'code' || column === 'sku' || column === 'name' || column === 'uom' || column === 'type' || column === 'group_name' || column === 'department') {
              query = query.ilike(column, `%${value}%`);
            } else if (column === 'received_qty' || column === 'issued_qty' || column === 'on_hand_stock' || column === 'safety_stock') {
              query = query.eq(column, parseInt(value) || 0);
            }
          }
        });

        const { data, error } = await query
          .order('name', { ascending: true })
          .range(from, from + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
        
        // Safety break to prevent infinite loops if something goes wrong
        if (from > 20000) hasMore = false;
      }

      const mapped: InventoryItem[] = allData.map(item => ({
        id: item.id,
        code: item.code || 'N/A',
        sku: item.sku || 'N/A',
        name: item.name,
        uom: item.uom || 'N/A',
        receivedQty: item.received_qty || 0,
        issuedQty: item.issued_qty || 0,
        onHandQty: item.on_hand_stock || 0,
        safetyStock: item.safety_stock || 0,
        itemType: item.type || 'N/A',
        costCenter: item.department || 'N/A',
        lastReceivedQty: item.last_received_qty,
        lastReceivedDate: item.last_received_date,
        lastIssuedQty: item.last_issued_qty,
        lastIssuedDate: item.last_issued_date,
        expiryDate: item.expiry_date,
        batchNumber: item.batch_number
      }));
      setInventory(mapped);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, columnFilters]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventory();
  };

  const columnSuggestions = React.useMemo(() => {
    const suggestions: Record<string, string[]> = {};
    const columns = ['code', 'sku', 'name', 'uom', 'type', 'group_name', 'department'];
    
    columns.forEach(col => {
      const key = col === 'type' ? 'itemType' : col === 'department' ? 'costCenter' : col === 'batch_number' ? 'batchNumber' : col === 'expiry_date' ? 'expiryDate' : col;
      const uniqueValues = Array.from(new Set(inventory.map(item => String((item as any)[key] || ''))))
        .filter(val => val && val !== 'N/A')
        .sort();
      suggestions[col] = uniqueValues;
    });
    
    return suggestions;
  }, [inventory]);

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(inventory);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, `Inventory_Status_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-4">
      {/* Expiry Notifications */}
      {inventory.some(item => {
        if (!item.expiryDate) return false;
        const expiry = new Date(item.expiryDate);
        const today = new Date();
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      }) && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 shrink-0 rounded shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 font-bold uppercase tracking-tight">
                Attention: Some items are expiring within 7 days!
              </p>
              <div className="mt-1 text-xs text-red-600 max-h-20 overflow-y-auto">
                {inventory
                  .filter(item => {
                    if (!item.expiryDate) return false;
                    const expiry = new Date(item.expiryDate);
                    const today = new Date();
                    const diffTime = expiry.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays >= 0 && diffDays <= 7;
                  })
                  .map(item => `${item.name} (${item.sku}) - Exp: ${item.expiryDate}`)
                  .join(', ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb Section */}
      <div className="flex items-center space-x-2 text-[11px] font-bold text-[#2d808e] uppercase tracking-wider shrink-0">
        <Home size={14} className="text-gray-400" />
        <span className="text-gray-400">/</span>
        <span>INVENTORY</span>
      </div>

      {/* Header Actions Bar */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-1.5 bg-[#2d808e] text-white px-4 py-1.5 rounded text-[12px] font-bold shadow-sm">
            <span>Stock</span>
          </button>
          <button className="flex items-center space-x-1.5 border border-[#2d808e] bg-white px-4 py-1.5 rounded text-[12px] font-bold text-[#2d808e] hover:bg-gray-50 transition-all shadow-sm">
            <List size={14} />
            <span>Listview</span>
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 border border-gray-300 bg-white px-4 py-1.5 rounded text-[12px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <FileSpreadsheet size={14} className="text-gray-500" />
            <span>Excel</span>
          </button>
        </div>

        <div className="flex items-center">
          <form onSubmit={handleSearch} className="relative flex">
            <input 
              type="text" 
              placeholder="Search by Name or Code"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 px-4 py-1.5 border border-gray-200 rounded-l outline-none text-xs text-gray-600 focus:border-[#2d808e]"
            />
            <button type="submit" className="bg-[#2d808e] text-white px-3 rounded-r flex items-center justify-center hover:bg-[#256b78]">
              <Search size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 bg-white rounded shadow-sm border border-gray-100 overflow-auto scrollbar-thin relative">
        <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-[#fcfcfc] sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
              <tr className="text-[12px] font-bold text-gray-800 border-b border-gray-100">
                <th className="px-6 py-4 text-center w-16 border-r border-gray-50">SL</th>
                <th className="px-6 py-4 text-left w-32">
                  <div className="flex items-center">
                    <span>Code</span>
                    <ColumnFilter columnName="Code" currentValue={columnFilters.code || ''} onFilter={(val) => handleColumnFilter('code', val)} suggestions={columnSuggestions.code} />
                  </div>
                </th>
                <th className="px-6 py-4 text-left w-32">
                  <div className="flex items-center">
                    <span>SKU</span>
                    <ColumnFilter columnName="SKU" currentValue={columnFilters.sku || ''} onFilter={(val) => handleColumnFilter('sku', val)} suggestions={columnSuggestions.sku} />
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center">
                    <span>Name</span>
                    <ColumnFilter columnName="Name" currentValue={columnFilters.name || ''} onFilter={(val) => handleColumnFilter('name', val)} suggestions={columnSuggestions.name} />
                  </div>
                </th>
                <th className="px-6 py-4 text-center w-20">
                  <div className="flex items-center justify-center">
                    <span>UOM</span>
                    <ColumnFilter columnName="UOM" currentValue={columnFilters.uom || ''} onFilter={(val) => handleColumnFilter('uom', val)} suggestions={columnSuggestions.uom} />
                  </div>
                </th>
                <th className="px-6 py-4 text-center w-32">
                  <div className="flex items-center justify-center">
                    <span>Received Qty</span>
                    <ColumnFilter columnName="Received Qty" currentValue={columnFilters.received_qty || ''} onFilter={(val) => handleColumnFilter('received_qty', val)} />
                  </div>
                </th>
                <th className="px-6 py-4 text-center w-32">
                  <div className="flex items-center justify-center">
                    <span>Issued Qty</span>
                    <ColumnFilter columnName="Issued Qty" currentValue={columnFilters.issued_qty || ''} onFilter={(val) => handleColumnFilter('issued_qty', val)} />
                  </div>
                </th>
                <th className="px-6 py-4 text-center w-32">
                  <div className="flex items-center justify-center">
                    <span>Batch No</span>
                    <ColumnFilter columnName="Batch No" currentValue={columnFilters.batch_number || ''} onFilter={(val) => handleColumnFilter('batch_number', val)} suggestions={columnSuggestions.batch_number} />
                  </div>
                </th>
                <th className="px-6 py-4 text-center w-32">
                  <div className="flex items-center justify-center">
                    <span>Expiry Date</span>
                    <ColumnFilter columnName="Expiry Date" currentValue={columnFilters.expiry_date || ''} onFilter={(val) => handleColumnFilter('expiry_date', val)} suggestions={columnSuggestions.expiry_date} />
                  </div>
                </th>
                <th className="px-6 py-4 text-center w-32">
                  <div className="flex items-center justify-center">
                    <span>On-Hand Qty</span>
                    <ColumnFilter columnName="On-Hand" currentValue={columnFilters.on_hand_stock || ''} onFilter={(val) => handleColumnFilter('on_hand_stock', val)} />
                  </div>
                </th>
                <th className="px-6 py-4 text-center w-32">
                  <div className="flex items-center justify-center">
                    <span>Safety Stock</span>
                    <ColumnFilter columnName="Safety" currentValue={columnFilters.safety_stock || ''} onFilter={(val) => handleColumnFilter('safety_stock', val)} />
                  </div>
                </th>
                <th className="px-6 py-4 text-left w-40">
                  <div className="flex items-center">
                    <span>Item Type</span>
                    <ColumnFilter columnName="Type" currentValue={columnFilters.type || ''} onFilter={(val) => handleColumnFilter('type', val)} suggestions={columnSuggestions.type} />
                  </div>
                </th>
                <th className="px-6 py-4 text-left w-40">
                  <div className="flex items-center">
                    <span>Cost Center</span>
                    <ColumnFilter columnName="Cost Center" currentValue={columnFilters.department || ''} onFilter={(val) => handleColumnFilter('department', val)} suggestions={columnSuggestions.department} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-[12px] text-gray-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-gray-400 uppercase tracking-widest">
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 size={24} className="animate-spin text-[#2d808e]" />
                      <span>Loading Inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : inventory.length > 0 ? (
                inventory.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                    <td className="px-6 py-4 text-center border-r border-gray-50 text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-4 text-left">{item.code}</td>
                    <td className="px-6 py-4 text-left font-mono text-xs">{item.sku}</td>
                    <td className="px-6 py-4 font-bold uppercase">{item.name}</td>
                    <td className="px-6 py-4 text-center">{item.uom}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-bold">{item.receivedQty}</div>
                      {item.lastReceivedQty !== undefined && item.lastReceivedQty !== null && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Last: {item.lastReceivedQty}
                          {item.lastReceivedDate && <span className="ml-1">({new Date(item.lastReceivedDate).toLocaleDateString()})</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-bold">{item.issuedQty}</div>
                      {item.lastIssuedQty !== undefined && item.lastIssuedQty !== null && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Last: {item.lastIssuedQty}
                          {item.lastIssuedDate && <span className="ml-1">({new Date(item.lastIssuedDate).toLocaleDateString()})</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">{item.batchNumber || '-'}</td>
                    <td className={`px-6 py-4 text-center ${
                      item.expiryDate && new Date(item.expiryDate).getTime() < new Date().getTime() + (7 * 24 * 60 * 60 * 1000)
                        ? 'text-red-600 font-bold'
                        : ''
                    }`}>
                      {item.expiryDate || '-'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-[#2d808e]">{item.onHandQty}</td>
                    <td className="px-6 py-4 text-center">{item.safetyStock}</td>
                    <td className="px-6 py-4 text-left whitespace-nowrap">{item.itemType}</td>
                    <td className="px-6 py-4 text-left whitespace-nowrap font-medium">{item.costCenter}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-gray-400 uppercase tracking-widest">
                    No items found in inventory
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>

      {/* Pagination Footer Section - Removed as all items are shown on one page */}
    </div>
  );
};

export default Inventory;