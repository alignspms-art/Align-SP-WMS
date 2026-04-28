
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import CycleCounting from './CycleCounting';
import UserManagement from './UserManagement';
import MoveOrderModal from './MoveOrderModal';
import MOApprovalModal from './MOApprovalModal';
import StockStatusModal from './StockStatusModal';
import PRPreviewModal from './PRPreviewModal';
import POPreviewModal from './POPreviewModal';
import PurchaseRequisition from './PurchaseRequisition';
import PurchaseOrder from './PurchaseOrder';
import Supplier from './Supplier';
import PurchaseReport from './PurchaseReport';
import Inventory from './Inventory';
import Receive from './Receive';
import Issue from './Issue';
import TnxReport from './TnxReport';
import MOReport from './MOReport';
import ItemList from './ItemList';
import ItemUOM from './ItemUOM';
import ItemType from './ItemType';
import CostCenter from './CostCenter';
import LabelManagement from './LabelManagement';
import TnxDetailsModal from './TnxDetailsModal';
import LocationTransferModal from './LocationTransferModal';
import GRNPreviewModal from './GRNPreviewModal';
import MODetailsModal from './MODetailsModal';
import IssueSlipPrintTemplate from './IssueSlipPrintTemplate';
import LowStockInventory from './LowStockInventory';
import ABCAnalysis from './ABCAnalysis';
import ReportingIssueReceive from './ReportingIssueReceive';
import MovingUpdate from './MovingUpdate';
import ItemDetailViewModal from './ItemDetailViewModal';
import { getPrintRoot } from '../lib/printRoot';
import { supabase } from '../lib/supabase';
import { 
  Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList, ComposedChart
} from 'recharts';
import { 
  Gauge, 
  ShoppingCart, 
  Warehouse, 
  LayoutGrid, 
  ChevronDown, 
  User as UserIcon,
  Search,
  Menu,
  FileText,
  Bell,
  Home,
  ShoppingBag,
  ShieldAlert,
  Printer,
  PackageSearch,
  FileDown,
  MoveHorizontal,
  LogOut as LogOutIcon,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Truck,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Tag, 
  Boxes, 
  ArrowUpRight,
  Phone,
  Briefcase,
  IdCard,
  MapPin,
  ClipboardList,
  Mail,
  Lock,
  Activity,
  TrendingUp
} from 'lucide-react';

import { useNotifications, Notification } from '../context/NotificationContext';

const SidebarItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  hasSubmenu?: boolean;
  isOpen?: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}> = ({ icon, label, active, hasSubmenu, isOpen, isCollapsed, onClick, children }) => {
  return (
    <div className="w-full px-2 mb-1">
      <button
        onClick={onClick}
        title={isCollapsed ? label : ''}
        className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 transition-all duration-200 rounded-lg border ${
          active 
            ? 'text-[#2d808e] bg-white border-[#2d808e] font-bold shadow-sm' 
            : 'text-[#5e718d] hover:bg-gray-50 border-transparent font-medium'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className={`${active ? 'text-[#2d808e]' : 'text-[#8da2c0]'} shrink-0`}>
            {icon && React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 18 }) : icon}
          </div>
          {!isCollapsed && <span className="text-[13px] tracking-tight">{label}</span>}
        </div>
        {!isCollapsed && hasSubmenu && (
          <div className="shrink-0 text-gray-300">
            {isOpen ? <ChevronDown size={12} /> : <ChevronDown size={12} className="opacity-40" />}
          </div>
        )}
      </button>
      {!isCollapsed && isOpen && children && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
};

const SubmenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 pl-10 pr-4 py-1.5 text-[12px] transition-all duration-200 rounded-md ${
      active 
        ? 'text-[#2d808e] font-bold' 
        : 'text-[#5e718d] hover:text-[#2d808e] hover:bg-gray-50'
    }`}
  >
    <div className={`${active ? 'text-[#2d808e]' : 'text-gray-300'} shrink-0`}>
      {icon && React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 14 }) : icon}
    </div>
    <span className="truncate">{label}</span>
  </button>
);

const KPICard: React.FC<{ label: string; value: string; subValue?: string }> = ({ label, value, subValue }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group border-b-4 border-b-[#2d808e]/10 hover:border-b-[#2d808e]">
    <h3 className="text-xs text-[#2d808e] font-bold uppercase mb-2">{label}</h3>
    <div className="flex items-baseline space-x-2">
      <p className="text-2xl font-bold text-gray-800 group-hover:text-[#2d808e] transition-colors">{value}</p>
      {subValue && <p className="text-sm font-medium text-gray-300">({subValue})</p>}
    </div>
  </div>
);

const DashboardOverview: React.FC<{ 
  onCheckStock: () => void; 
  onMoveOrder: () => void; 
  onLocTransfer: () => void;
  onPreviewPr: (pr: any) => void; 
  onPreviewPo: (po: any) => void; 
  onPreviewMo: (mo: any) => void; 
  onPreviewMoDetail: (mo: any) => void;
  onPreviewGrn: (grnId: string) => void;
  refreshKey?: number;
}> = ({ onCheckStock, onMoveOrder, onPreviewPr, onPreviewPo, onPreviewMo, onPreviewMoDetail, onLocTransfer, onPreviewGrn, refreshKey }) => {
  const navigate = useNavigate();
  const { user, hasGranularPermission } = useAuth();
  const [dateTime, setDateTime] = useState(new Date());
  const [pendingPrs, setPendingPrs] = useState<any[]>([]);
  const [pendingPos, setPendingPos] = useState<any[]>([]);
  const [pendingMos, setPendingMos] = useState<any[]>([]);
  const [latestPRs, setLatestPRs] = useState<any[]>([]);
  const [latestMOs, setLatestMOs] = useState<any[]>([]);
  const [latestGRNs, setLatestGRNs] = useState<any[]>([]);
  const [latestPOs, setLatestPOs] = useState<any[]>([]);
  const [stockTypes, setStockTypes] = useState<any[]>([]);
  const [monthlyCCStats, setMonthlyCCStats] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [costCenterData, setCostCenterData] = useState<any[]>([]);
  const [weeklyGrnData, setWeeklyGrnData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  
  const [dailyStartDate, setDailyStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
  const [dailyEndDate, setDailyEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [valuationYear, setValuationYear] = useState(new Date().getFullYear().toString());
  const [valuationMonth, setValuationMonth] = useState('ALL');

  const [stats, setStats] = useState({
    todayOrderQty: '0', todayOrderCount: '0', todayOrderValue: '0',
    lastDayOrderQty: '0', lastDayOrderCount: '0', lastDayOrderValue: '0',
    weeklyOrderQty: '0', weeklyOrderCount: '0', weeklyOrderValue: '0',
    monthlyOrderQty: '0', monthlyOrderCount: '0', monthlyOrderValue: '0',
    weeklyPrQty: '0', weeklyPrCount: '0', weeklyPrValue: '0',
    monthlyPrQty: '0', monthlyPrCount: '0', monthlyPrValue: '0'
  });

  const [selectedFilterMonth, setSelectedFilterMonth] = useState(new Date().getMonth());
  const [selectedFilterYear, setSelectedFilterYear] = useState(new Date().getFullYear());

  const canViewPrApprovals = hasGranularPermission('pr_approval', 'view') || hasGranularPermission('requisition', 'approved');
  const canViewPoApprovals = hasGranularPermission('po_approval', 'view') || hasGranularPermission('purchase_order', 'approved');
  const canViewMoApprovals = hasGranularPermission('mo_approval', 'view') || hasGranularPermission('move_order', 'approved');

  // KPI Visibility
  const canViewKpiToday = hasGranularPermission('dash_kpi_today_orders', 'view');
  const canViewKpiLastDay = hasGranularPermission('dash_kpi_last_day_orders', 'view');
  const canViewKpiWeekly = hasGranularPermission('dash_kpi_weekly_orders', 'view');
  const canViewKpiMonthly = hasGranularPermission('dash_kpi_monthly_orders', 'view');
  const canViewKpiWeeklyPr = hasGranularPermission('dash_kpi_weekly_pr', 'view');
  const canViewKpiMonthlyPr = hasGranularPermission('dash_kpi_monthly_pr', 'view');

  // Charts & Tables Visibility
  const canViewChartWeekly = hasGranularPermission('dash_chart_weekly_movement', 'view');
  const canViewChartAnnual = hasGranularPermission('dash_chart_annual_valuation', 'view');
  const canViewChartPo = hasGranularPermission('dash_chart_weekly_po', 'view');
  const canViewChartGrn = hasGranularPermission('dash_chart_weekly_grn', 'view');
  const canViewChartSegmentation = hasGranularPermission('dash_chart_stock_segmentation', 'view');
  const canViewTableMo = hasGranularPermission('dash_table_latest_mo', 'view');
  const canViewTablePr = hasGranularPermission('dash_table_latest_pr', 'view');
  const canViewTablePo = hasGranularPermission('dash_table_latest_po', 'view');
  const canViewTableGrn = hasGranularPermission('dash_table_latest_grn', 'view');

  // Action Buttons Visibility
  const canActionPrintLabels = hasGranularPermission('dash_action_print_labels', 'view');
  const canActionCheckStock = hasGranularPermission('dash_action_check_stock', 'view');
  const canActionMoveOrder = hasGranularPermission('dash_action_move_order', 'view');
  const canActionLocTransfer = hasGranularPermission('dash_action_loc_transfer', 'view');

  const fetchDashboardData = useCallback(async () => {
    const { data: prApprovals } = await supabase.from('requisitions').select('*').eq('status', 'Pending').order('created_at', { ascending: false });
    if (prApprovals) setPendingPrs(prApprovals);
    const { data: poApprovals } = await supabase.from('purchase_orders').select('*').in('status', ['Pending', 'Pending Approval']).order('created_at', { ascending: false });
    if (poApprovals) setPendingPos(poApprovals);
    const { data: moApprovals } = await supabase.from('move_orders').select('*').eq('status', 'Pending').order('created_at', { ascending: false });
    if (moApprovals) setPendingMos(moApprovals);
    const { data: prLogs } = await supabase.from('requisitions').select('*').order('created_at', { ascending: false });
    if (prLogs) setLatestPRs(prLogs);
    const { data: moLogs } = await supabase.from('move_orders').select('*').in('status', ['Approved', 'Completed', 'On Hold', 'Pending']).order('created_at', { ascending: false }).limit(10);
    if (moLogs) setLatestMOs(moLogs);
    const { data: grnLogs, error: grnError } = await supabase.from('grns').select('*').order('created_at', { ascending: false });
    if (grnError) console.error('Error fetching GRNs:', grnError);
    if (grnLogs) setLatestGRNs(grnLogs);
    const { data: poLogs, error: poError } = await supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
    if (poError) console.error('Error fetching POs:', poError);
    if (poLogs) setLatestPOs(poLogs);
    
    const { data: items } = await supabase.from('items').select('*');
    if (items) {
      const types: Record<string, number> = {};
      items.forEach(item => { const type = item.type || 'Other'; types[type] = (types[type] || 0) + 1; });
      setStockTypes(Object.entries(types).map(([name, value]) => ({ name, value })));
    }

    const startOfRange = new Date(selectedFilterYear, selectedFilterMonth, 1);
    const endOfRange = new Date(selectedFilterYear, selectedFilterMonth + 1, 0, 23, 59, 59, 999);

    const { data: tnxData } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', startOfRange.toISOString())
      .lte('created_at', endOfRange.toISOString());

    if (tnxData && items) {
      const itemMap = new Map(items.map(i => [i.sku, i]));
      const ccAgg: Record<string, { issue: number, grn: number }> = {};
      tnxData.forEach(t => {
        const dept = t.department || 'N/A';
        const itemInfo = itemMap.get(t.item_sku);
        const realtimePrice = itemInfo ? (Number(itemInfo.avg_price) || Number(itemInfo.last_price) || 0) : 0;
        
        if (!ccAgg[dept]) ccAgg[dept] = { issue: 0, grn: 0 };
        const cost = (Number(t.quantity) || 0) * realtimePrice;
        if (t.type === 'Issue') {
          ccAgg[dept].issue += cost;
        } else if (t.type === 'Receive') {
          ccAgg[dept].grn += cost;
        }
      });
      setMonthlyCCStats(Object.entries(ccAgg)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => (b.issue + b.grn) - (a.issue + a.grn))
      );
    }

    const { data: moveOrders } = await supabase.from('move_orders').select('*').in('status', ['Approved', 'Completed']).order('created_at', { ascending: true });
    if (moveOrders && items) {
      const itemMap = new Map(items.map(i => [i.sku, i]));
      
      const getRealtimeValue = (mo: any) => {
        return (mo.items || []).reduce((acc: number, item: any) => {
          const itemInfo = itemMap.get(item.sku);
          const price = itemInfo ? (Number(itemInfo.avg_price) || Number(itemInfo.last_price) || 0) : 0;
          return acc + ((Number(item.issuedQty) || Number(item.reqQty) || 0) * price);
        }, 0);
      };

      // Daily Charts Filter
      const dStart = new Date(dailyStartDate);
      const dEnd = new Date(dailyEndDate);
      dEnd.setHours(23, 59, 59, 999);
      
      const filteredMOs = moveOrders.filter(mo => {
        const d = new Date(mo.created_at);
        return d >= dStart && d <= dEnd;
      });

      // Cost Center Data
      const costCenterAgg: Record<string, { qty: number, value: number }> = {};
      filteredMOs.forEach(mo => {
        const dept = mo.department || 'Unknown';
        const qty = mo.items?.reduce((acc: number, item: any) => acc + (Number(item.reqQty) || 0), 0) || 0;
        const val = getRealtimeValue(mo);
        if (!costCenterAgg[dept]) costCenterAgg[dept] = { qty: 0, value: 0 };
        costCenterAgg[dept].qty += qty;
        costCenterAgg[dept].value += val;
      });
      setCostCenterData(Object.entries(costCenterAgg)
        .map(([name, data]) => ({ name, qty: data.qty, value: data.value }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 8)
      );

      // Daily Movement Analytics
      const dailyAgg: any[] = [];
      const diffTime = Math.abs(dEnd.getTime() - dStart.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      for (let i = 0; i < diffDays; i++) {
        const d = new Date(dStart);
        d.setDate(d.getDate() + i);
        const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit' }) + '-' + d.toLocaleDateString('en-GB', { weekday: 'short' });
        const dayOrders = moveOrders.filter(mo => new Date(mo.created_at).toDateString() === d.toDateString());
        const qty = dayOrders.reduce((acc, mo) => acc + (mo.items?.reduce((iAcc: number, item: any) => iAcc + (Number(item.reqQty) || 0), 0) || 0), 0);
        const value = dayOrders.reduce((acc, mo) => acc + getRealtimeValue(mo), 0);
        dailyAgg.push({ name: dateStr, qty, value });
      }
      setWeeklyData(dailyAgg);

      const { data: allGrns } = await supabase.from('grns').select('*').order('created_at', { ascending: true });
      if (allGrns) {
        const dailyGrnAgg: any[] = [];
        for (let i = 0; i < diffDays; i++) {
          const d = new Date(dStart);
          d.setDate(d.getDate() + i);
          const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit' }) + '-' + d.toLocaleDateString('en-GB', { weekday: 'short' });
          const dayGrns = allGrns.filter(g => new Date(g.created_at).toDateString() === d.toDateString());
          const qty = dayGrns.reduce((acc, g) => acc + (g.items?.reduce((iAcc: number, item: any) => iAcc + (Number(item.grnQty) || 0), 0) || 0), 0);
          const value = dayGrns.reduce((acc, g) => {
            const grnVal = g.items?.reduce((iAcc: number, item: any) => {
              const itemInfo = itemMap.get(item.sku);
              const price = itemInfo ? (Number(itemInfo.avg_price) || Number(itemInfo.last_price) || 0) : (Number(item.grnPrice) || 0);
              return iAcc + ((Number(item.grnQty) || 0) * price);
            }, 0) || 0;
            return acc + grnVal;
          }, 0);
          dailyGrnAgg.push({ name: dateStr, qty, value });
        }
        setWeeklyGrnData(dailyGrnAgg);
      }

      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      if (valuationMonth === 'ALL') {
        setMonthlyData(months.map((month, idx) => {
          const value = moveOrders.filter(mo => {
            const d = new Date(mo.created_at);
            return d.getFullYear().toString() === valuationYear && d.getMonth() === idx;
          }).reduce((acc, mo) => acc + getRealtimeValue(mo), 0);
          return { name: month, value };
        }));
      } else {
        const monthIdx = months.indexOf(valuationMonth);
        const daysInMonth = new Date(Number(valuationYear), monthIdx + 1, 0).getDate();
        const dailyMonthAgg: any[] = [];
        for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(Number(valuationYear), monthIdx, i);
          const dateStr = i.toString();
          const dayValue = moveOrders.filter(mo => new Date(mo.created_at).toDateString() === d.toDateString())
            .reduce((acc, mo) => acc + getRealtimeValue(mo), 0);
          dailyMonthAgg.push({ name: dateStr, value: dayValue });
        }
        setMonthlyData(dailyMonthAgg);
      }
    }

    const today = new Date(); today.setHours(0,0,0,0);
    const { data: allPo } = await supabase.from('purchase_orders').select('items, created_at');
    const { data: allPr } = await supabase.from('requisitions').select('items, created_at');
    
    const sumQty = (list: any[], dateLimit: Date) => {
      let qty = 0; let count = 0; let value = 0;
      list?.filter(entry => new Date(entry.created_at) >= dateLimit).forEach(entry => {
        count++; 
        (entry.items || []).forEach((item: any) => {
          const itemQty = Number(item.poQty || item.reqQty || item.issuedQty || 0);
          qty += itemQty;
          
          if (items) {
            const itemMap = new Map(items.map(i => [i.sku, i]));
            const itemInfo = itemMap.get(item.sku);
            const price = itemInfo ? (Number(itemInfo.avg_price) || Number(itemInfo.last_price) || 0) : 0;
            value += itemQty * price;
          }
        });
      });
      const formatValue = (v: number) => v > 1000 ? (v/1000).toFixed(1) + 'K' : v.toFixed(0);
      return { 
        qty: qty > 1000 ? Number(qty/1000).toFixed(1) + 'K' : qty.toString(), 
        count: count.toString(),
        value: formatValue(value)
      };
    };

    const combinedOrders = [...(allPo || []), ...(moveOrders || [])];

    const todayStats = sumQty(combinedOrders, today);
    const lastDayStats = sumQty(combinedOrders, new Date(today.getTime() - 86400000));
    const weeklyStats = sumQty(combinedOrders, new Date(today.getTime() - 7*86400000));
    const monthlyStats = sumQty(combinedOrders, new Date(today.getTime() - 30*86400000));
    const weeklyPrStats = sumQty(allPr || [], new Date(today.getTime() - 7*86400000));
    const monthlyPrStats = sumQty(allPr || [], new Date(today.getTime() - 30*86400000));

    setStats({
      todayOrderQty: todayStats.qty, todayOrderCount: todayStats.count, todayOrderValue: todayStats.value,
      lastDayOrderQty: lastDayStats.qty, lastDayOrderCount: lastDayStats.count, lastDayOrderValue: lastDayStats.value,
      weeklyOrderQty: weeklyStats.qty, weeklyOrderCount: weeklyStats.count, weeklyOrderValue: weeklyStats.value,
      monthlyOrderQty: monthlyStats.qty, monthlyOrderCount: monthlyStats.count, monthlyOrderValue: monthlyStats.value,
      weeklyPrQty: weeklyPrStats.qty, weeklyPrCount: weeklyPrStats.count, weeklyPrValue: weeklyPrStats.value,
      monthlyPrQty: monthlyPrStats.qty, monthlyPrCount: monthlyPrStats.count, monthlyPrValue: monthlyPrStats.value
    });
  }, [dailyStartDate, dailyEndDate, valuationYear, valuationMonth, selectedFilterMonth, selectedFilterYear]);

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    fetchDashboardData();
    return () => clearInterval(timer);
  }, [refreshKey, fetchDashboardData]);

  const COLORS = ['#2d808e', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff7300', '#3b82f6', '#1e293b'];

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + " BDT";
  };

  return (
    <div className="space-y-6 animate-slide-up pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.avatarUrl && (
            <div className="w-12 h-12 rounded-xl border-2 border-[#2d808e]/20 overflow-hidden shadow-sm">
              <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-[#2d808e] leading-none">Welcome, {user?.fullName?.split(' ')[0] || 'Admin'}</h1>
            <p className="text-xs font-medium text-gray-400 mt-2 uppercase">{dateTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {canActionPrintLabels && <button onClick={() => navigate('/label')} className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-[#2d808e] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#2d808e]/10 hover:bg-[#256b78] uppercase transition-all flex items-center justify-center gap-2"><Printer size={16} /><span>Print Labels</span></button>}
          {canActionCheckStock && <button onClick={onCheckStock} className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-[#2d808e] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#2d808e]/10 hover:bg-[#256b78] uppercase transition-all flex items-center justify-center gap-2"><PackageSearch size={16} /><span>Check Stock</span></button>}
          {canActionMoveOrder && <button onClick={onMoveOrder} className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-[#2d808e] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#2d808e]/10 hover:bg-[#256b78] uppercase transition-all flex items-center justify-center gap-2"><MoveHorizontal size={16} /><span>Move Order</span></button>}
          {canActionLocTransfer && <button onClick={onLocTransfer} className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-[#2d808e] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#2d808e]/10 hover:bg-[#256b78] uppercase transition-all flex items-center justify-center gap-2"><MapPin size={16} /><span>Loc. Transfer</span></button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {canViewKpiToday && <KPICard label="Today Orders" value={stats.todayOrderQty} subValue={stats.todayOrderCount} />}
        {canViewKpiLastDay && <KPICard label="Last Day Orders" value={stats.lastDayOrderQty} subValue={stats.lastDayOrderCount} />}
        {canViewKpiWeekly && <KPICard label="Weekly Orders" value={stats.weeklyOrderQty} subValue={stats.weeklyOrderCount} />}
        {canViewKpiMonthly && <KPICard label="Monthly Orders" value={stats.monthlyOrderQty} subValue={stats.monthlyOrderCount} />}
        {canViewKpiWeeklyPr && <KPICard label="Weekly PR" value={stats.weeklyPrQty} subValue={stats.weeklyPrCount} />}
        {canViewKpiMonthlyPr && <KPICard label="Monthly PR" value={stats.monthlyPrQty} subValue={stats.monthlyPrCount} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canViewPrApprovals && pendingPrs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h3 className="text-xs font-bold text-[#2d808e] uppercase">PR Approvals</h3><span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded-full uppercase">{pendingPrs.length} Pending</span></div>
            <div className="overflow-y-auto max-h-[220px] scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 sticky top-0"><tr className="text-[10px] font-medium text-gray-400 uppercase border-b border-gray-50"><th className="px-5 py-3">Date</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3">By</th><th className="px-5 py-3 text-right">Value</th></tr></thead>
                <tbody className="text-xs font-medium text-gray-600">
                  {pendingPrs.map((pr) => (
                    <tr key={pr.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                      <td className="px-5 py-3">{new Date(pr.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3"><button onClick={() => onPreviewPr(pr)} className="text-blue-500 font-bold hover:underline">{pr.pr_no}</button></td>
                      <td className="px-5 py-3 truncate max-w-[80px]">{pr.req_by_name || 'N/A'}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-800">{(pr.total_value || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {canViewPoApprovals && pendingPos.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h3 className="text-xs font-bold text-[#2d808e] uppercase">PO Approvals</h3><span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase">{pendingPos.length} Pending</span></div>
            <div className="overflow-y-auto max-h-[220px] scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 sticky top-0"><tr className="text-[10px] font-medium text-gray-400 uppercase border-b border-gray-50"><th className="px-5 py-3">Date</th><th className="px-5 py-3">Order No</th><th className="px-5 py-3">Supplier</th><th className="px-5 py-3 text-right">Value</th></tr></thead>
                <tbody className="text-xs font-medium text-gray-600">
                  {pendingPos.map((po) => (
                    <tr key={po.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                      <td className="px-5 py-3">{new Date(po.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3"><button onClick={() => onPreviewPo(po)} className="text-blue-500 font-bold hover:underline">{po.po_no}</button></td>
                      <td className="px-5 py-3 truncate max-w-[100px]">{po.supplier_name || 'N/A'}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-800">{(po.total_value || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {canViewMoApprovals && pendingMos.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h3 className="text-xs font-bold text-[#2d808e] uppercase">MO Approvals</h3><span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full uppercase">{pendingMos.length} Pending</span></div>
            <div className="overflow-y-auto max-h-[220px] scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 sticky top-0"><tr className="text-[10px] font-medium text-gray-400 uppercase border-b border-gray-50"><th className="px-5 py-3">Date</th><th className="px-5 py-3">TNX.NO</th><th className="px-5 py-3 text-right">Department</th></tr></thead>
                <tbody className="text-xs font-medium text-gray-600">
                  {pendingMos.map((mo) => (
                    <tr key={mo.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">{new Date(mo.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3"><button onClick={() => onPreviewMo(mo)} className="text-blue-500 font-bold hover:underline">{mo.reference || mo.mo_no}</button></td>
                      <td className="px-5 py-3 text-right font-medium text-gray-800 uppercase">{mo.department || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {canViewChartWeekly && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-[#2d808e] uppercase tracking-widest">Daily Movement Analytics</h3>
              <div className="flex items-center gap-2">
                <input type="date" value={dailyStartDate} onChange={(e) => setDailyStartDate(e.target.value)} className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#2d808e] outline-none" />
                <span className="text-[10px] text-gray-400 font-bold">TO</span>
                <input type="date" value={dailyEndDate} onChange={(e) => setDailyEndDate(e.target.value)} className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#2d808e] outline-none" />
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, (max: number) => Math.ceil(max * 1.3)]} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, (max: number) => Math.ceil(max * 1.3)]} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar yAxisId="left" dataKey="qty" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={24}>
                    <LabelList dataKey="qty" position="top" offset={22} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e293b' }} />
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 4 }}>
                    <LabelList dataKey="value" position="top" offset={8} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#f97316' }} formatter={(val: number) => val > 1000 ? Number(val/1000).toFixed(1) + 'K' : Number(val).toFixed(0)} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {canViewChartAnnual && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-[#2d808e] uppercase tracking-widest">Annual Valuation Trend</h3>
              <div className="flex items-center gap-2">
                <select value={valuationYear} onChange={(e) => setValuationYear(e.target.value)} className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#2d808e] outline-none font-bold">
                  {[2024, 2025, 2026].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                </select>
                <select value={valuationMonth} onChange={(e) => setValuationMonth(e.target.value)} className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#2d808e] outline-none font-bold">
                  <option value="ALL">ALL MONTHS</option>
                  {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, (max: number) => Math.ceil(max * 1.2)]} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 6, strokeWidth: 2, stroke: '#fff' }}>
                    <LabelList dataKey="value" position="top" offset={12} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#3b82f6' }} formatter={(val: number) => val > 1000 ? Number(val/1000).toFixed(1) + 'K' : Number(val).toFixed(0)} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {canViewChartPo && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-[#2d808e] uppercase tracking-widest">Daily Movement by Cost Center</h3>
              <div className="flex items-center gap-2">
                <input type="date" value={dailyStartDate} onChange={(e) => setDailyStartDate(e.target.value)} className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#2d808e] outline-none" />
                <span className="text-[10px] text-gray-400 font-bold">TO</span>
                <input type="date" value={dailyEndDate} onChange={(e) => setDailyEndDate(e.target.value)} className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#2d808e] outline-none" />
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={costCenterData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, (max: number) => Math.ceil(max * 1.3)]} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, (max: number) => Math.ceil(max * 1.3)]} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar yAxisId="left" dataKey="qty" radius={[4, 4, 0, 0]} barSize={32}>
                    {costCenterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#0C8EA8', '#131D90', '#2563eb', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b'][index % 8]} />
                    ))}
                    <LabelList dataKey="qty" position="top" offset={22} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e293b' }} />
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 4 }}>
                    <LabelList dataKey="value" position="top" offset={8} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#f97316' }} formatter={(val: number) => val > 1000 ? Number(val/1000).toFixed(1) + 'K' : Number(val).toFixed(0)} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {canViewChartGrn && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-[#2d808e] uppercase tracking-widest">Daily GRN Analytics</h3>
              <div className="flex items-center gap-2">
                <input type="date" value={dailyStartDate} onChange={(e) => setDailyStartDate(e.target.value)} className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#2d808e] outline-none" />
                <span className="text-[10px] text-gray-400 font-bold">TO</span>
                <input type="date" value={dailyEndDate} onChange={(e) => setDailyEndDate(e.target.value)} className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#2d808e] outline-none" />
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyGrnData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, (max: number) => Math.ceil(max * 1.3)]} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, (max: number) => Math.ceil(max * 1.3)]} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar yAxisId="left" dataKey="qty" fill="#131D90" radius={[4, 4, 0, 0]} barSize={24}>
                    <LabelList dataKey="qty" position="top" offset={22} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e293b' }} />
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 4 }}>
                    <LabelList dataKey="value" position="top" offset={8} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#f97316' }} formatter={(val: number) => val > 1000 ? Number(val/1000).toFixed(1) + 'K' : Number(val).toFixed(0)} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-1">
        <h3 className="text-xs font-black text-[#2d808e] uppercase tracking-widest">Monthly Cost Center Analytics Filter</h3>
        <div className="flex items-center gap-2">
          <select 
            value={selectedFilterYear} 
            onChange={(e) => setSelectedFilterYear(Number(e.target.value))} 
            className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#2d808e] outline-none font-bold"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select 
            value={selectedFilterMonth} 
            onChange={(e) => setSelectedFilterMonth(Number(e.target.value))} 
            className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#2d808e] outline-none font-bold"
          >
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
              <option key={m} value={i}>{m.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black text-[#2d808e] uppercase tracking-widest">Monthly Issue by Cost Center</h3>
            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{new Date(selectedFilterYear, selectedFilterMonth).toLocaleString('en-GB', { month: 'short' })}</span>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="h-40 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={monthlyCCStats.filter(s => s.issue > 0).sort((a, b) => b.issue - a.issue).slice(0, 5)} 
                    innerRadius={40} 
                    outerRadius={60} 
                    paddingAngle={4} 
                    dataKey="issue"
                  >
                    {monthlyCCStats.filter(s => s.issue > 0).sort((a, b) => b.issue - a.issue).slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Value']}
                    contentStyle={{ fontSize: '10px', borderRadius: '8px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[120px] scrollbar-thin pr-2">
              {monthlyCCStats.filter(s => s.issue > 0).sort((a, b) => b.issue - a.issue).slice(0, 5).map((stat, idx) => {
                const totalIssue = monthlyCCStats.reduce((acc, curr) => acc + (curr.issue || 0), 0);
                const percent = totalIssue > 0 ? ((stat.issue / totalIssue) * 100).toFixed(0) : 0;
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full border border-gray-100" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-[10px] font-black text-gray-700 uppercase truncate max-w-[100px]">{stat.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600">{percent}%</span>
                  </div>
                );
              })}
              {monthlyCCStats.filter(s => s.issue > 0).length === 0 && (
                <div className="h-full flex items-center justify-center text-gray-300 py-10 italic text-[10px]">No Issue Data</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black text-[#2d808e] uppercase tracking-widest">Monthly GRN by Cost Center</h3>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">{new Date(selectedFilterYear, selectedFilterMonth).toLocaleString('en-GB', { month: 'short' })}</span>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="h-40 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={monthlyCCStats.filter(s => s.grn > 0).sort((a, b) => b.grn - a.grn).slice(0, 5)} 
                    innerRadius={40} 
                    outerRadius={60} 
                    paddingAngle={4} 
                    dataKey="grn"
                  >
                    {monthlyCCStats.filter(s => s.grn > 0).sort((a, b) => b.grn - a.grn).slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Value']}
                    contentStyle={{ fontSize: '10px', borderRadius: '8px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[120px] scrollbar-thin pr-2">
              {monthlyCCStats.filter(s => s.grn > 0).sort((a, b) => b.grn - a.grn).slice(0, 5).map((stat, idx) => {
                const totalGrn = monthlyCCStats.reduce((acc, curr) => acc + (curr.grn || 0), 0);
                const percent = totalGrn > 0 ? ((stat.grn / totalGrn) * 100).toFixed(0) : 0;
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full border border-gray-100" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-[10px] font-black text-gray-700 uppercase truncate max-w-[100px]">{stat.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">{percent}%</span>
                  </div>
                );
              })}
              {monthlyCCStats.filter(s => s.grn > 0).length === 0 && (
                <div className="h-full flex items-center justify-center text-gray-300 py-10 italic text-[10px]">No GRN Data</div>
              )}
            </div>
          </div>
        </div>
        {canViewChartSegmentation && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col shadow-sm">
            <h3 className="text-xs font-bold text-[#2d808e] uppercase mb-6 text-center">Stock Segmentation</h3>
            <div className="flex flex-1 items-center justify-around gap-4">
              <div className="h-40 w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stockTypes} innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                      {stockTypes.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 flex flex-col space-y-2 overflow-y-auto max-h-[160px] scrollbar-thin pr-2">
                {stockTypes.map((type, index) => { 
                  const total = stockTypes.reduce((acc, curr) => acc + curr.value, 0); 
                  const percent = total > 0 ? Number((type.value / total) * 100).toFixed(0) : 0; 
                  return (
                    <div key={index} className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <div className="flex items-center space-x-2 overflow-hidden">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-[10px] font-medium text-gray-500 uppercase truncate leading-none">{type.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-800 ml-2">{percent}%</span>
                    </div>
                  ); 
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {canViewTableMo && (
          <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
            <h2 className="text-xl font-bold text-[#2d808e] mb-6">Latest Move orders</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-medium text-gray-400 border-b border-gray-50 uppercase">
                    <th className="px-2 py-4 text-center w-12 border-r border-gray-50">#</th>
                    <th className="px-4 py-4 text-center border-r border-gray-50">DATE</th>
                    <th className="px-4 py-4 text-center border-r border-gray-50">TNX.NO</th>
                    <th className="px-4 py-4 border-r border-gray-50">ITEM NAME</th>
                    <th className="px-4 py-4 text-center border-r border-gray-50">QTY</th>
                    <th className="px-4 py-4 text-center border-r border-gray-50">STATUS</th>
                    <th className="px-4 py-4 text-right">VALUE</th>
                  </tr>
                </thead>
                <tbody className="text-[12px] font-medium">
                  {latestMOs.map((mo, idx) => {
                    const firstItem = mo.items?.[0] || {};
                    const itemNameDisplay = mo.items?.length > 1 
                      ? `${firstItem.name || 'N/A'} (+${mo.items.length - 1})`
                      : (firstItem.name || 'N/A');
                    const totalQty = mo.items?.reduce((acc: number, i: any) => {
                      const qty = (Number(i.issuedQty) || Number(i.reqQty) || 0);
                      return acc + qty;
                    }, 0);

                    return (
                      <tr key={mo.id} className={`hover:bg-gray-50/40 transition-colors ${mo.status === 'On Hold' ? 'bg-yellow-50/50' : ''}`}>
                        <td className="px-2 py-4 text-center text-gray-400 border-r border-gray-50">{idx + 1}</td>
                        <td className="px-4 py-4 text-center border-r border-gray-50 whitespace-nowrap text-gray-600">{formatDateShort(mo.created_at)}</td>
                        <td className="px-4 py-4 text-center border-r border-gray-50">
                          <button 
                            onClick={() => onPreviewMoDetail(mo)} 
                            className={`font-bold hover:underline transition-all ${mo.status === 'On Hold' ? 'text-orange-600' : 'text-blue-500'}`}
                          >
                            {mo.reference || mo.mo_no}
                          </button>
                        </td>
                        <td className="px-4 py-4 uppercase truncate max-w-[200px] font-medium text-gray-700 border-r border-gray-50" title={itemNameDisplay}>{itemNameDisplay}</td>
                        <td className="px-4 py-4 text-center font-bold text-gray-800 border-r border-gray-50">{totalQty}</td>
                        <td className="px-4 py-4 text-center border-r border-gray-50 whitespace-nowrap">
                          {mo.status === 'Approved' || mo.status === 'Completed' ? (
                            <div className="flex items-center justify-center text-emerald-500">
                              <CheckCircle2 size={12} className="mr-1" />
                              <span className="text-[10px] font-black uppercase">Approved</span>
                            </div>
                          ) : mo.status === 'On Hold' ? (
                            <div className="flex items-center justify-center text-orange-500">
                              <AlertCircle size={12} className="mr-1" />
                              <span className="text-[10px] font-black uppercase">Hold</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center text-blue-500">
                              <span className="text-[10px] font-black uppercase">Created</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-gray-800">{formatCurrency(mo.total_value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {canViewTablePr && (
          <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
            <h2 className="text-xl font-black text-[#2d808e] mb-6 tracking-tight">Latest PR</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 border-b border-gray-50 uppercase tracking-wider">
                    <th className="px-2 py-4 text-center w-12 border-r border-gray-50">#</th>
                    <th className="px-4 py-4 text-center border-r border-gray-50">DATE</th>
                    <th className="px-4 py-4 text-center border-r border-gray-50">PR NO</th>
                    <th className="px-4 py-4 border-r border-gray-50">REQUESTED BY</th>
                    <th className="px-4 py-4 text-center border-r border-gray-50">STATUS</th>
                    <th className="px-4 py-4 text-right">VALUE</th>
                  </tr>
                </thead>
                <tbody className="text-[12px] font-medium">
                  {latestPRs.map((pr, idx) => {
                    return (
                      <tr key={pr.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="px-2 py-4 text-center text-gray-400 border-r border-gray-50">{idx + 1}</td>
                        <td className="px-4 py-4 text-center border-r border-gray-50 whitespace-nowrap text-gray-600">{formatDateShort(pr.created_at)}</td>
                        <td className="px-4 py-4 text-center border-r border-gray-50">
                          <button onClick={() => onPreviewPr(pr)} className="text-blue-500 font-bold hover:underline transition-all">{pr.pr_no}</button>
                        </td>
                        <td className="px-4 py-4 uppercase truncate max-w-[150px] font-bold text-gray-700 border-r border-gray-50">{pr.req_by_name || 'N/A'}</td>
                        <td className="px-4 py-4 text-center border-r border-gray-50">
                          {['Approved', 'Ordered', 'Closed', 'APPROVED', 'ORDERED', 'CLOSED'].includes(pr.status) ? (
                            <div className="flex items-center justify-center text-emerald-500">
                              <CheckCircle2 size={14} className="mr-1" />
                              <span className="text-[10px] font-black uppercase">{pr.status}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-orange-500 uppercase">{pr.status || 'Pending'}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-black text-gray-800">{formatCurrency(pr.total_value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {canViewTableGrn && (
          <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
            <h2 className="text-xl font-black text-[#2d808e] mb-6 tracking-tight">Latest GRN</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 border-b border-gray-50 uppercase tracking-wider">
                    <th className="px-2 py-4 text-center w-12 border-r border-gray-50">#</th>
                    <th className="px-4 py-4 text-center border-r border-gray-50">DATE</th>
                    <th className="px-4 py-4 text-center border-r border-gray-50">GRN NO</th>
                    <th className="px-4 py-4 border-r border-gray-50">SOURCE REF</th>
                    <th className="px-4 py-4 text-center border-r border-gray-50">QTY</th>
                    <th className="px-4 py-4 text-right">INVOICE NO</th>
                  </tr>
                </thead>
                <tbody className="text-[12px] font-medium">
                  {latestGRNs.map((grn, idx) => {
                    const totalQty = grn.items?.reduce((acc: number, i: any) => acc + (Number(i.grnQty || i.recQty) || 0), 0);
                    
                    return (
                      <tr key={grn.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="px-2 py-4 text-center text-gray-400 border-r border-gray-50">{idx + 1}</td>
                        <td className="px-4 py-4 text-center border-r border-gray-50 whitespace-nowrap text-gray-600">{formatDateShort(grn.created_at)}</td>
                        <td className="px-4 py-4 text-center border-r border-gray-50 font-bold text-[#2d808e]">
                          <button onClick={() => onPreviewGrn(grn.grn_no)} className="hover:underline">
                            {grn.grn_no}
                          </button>
                        </td>
                        <td className="px-4 py-4 uppercase truncate max-w-[150px] font-bold text-gray-700 border-r border-gray-50">{grn.source_ref || 'N/A'}</td>
                        <td className="px-4 py-4 text-center font-black text-gray-800 border-r border-gray-50">{totalQty}</td>
                        <td className="px-4 py-4 text-right font-black text-gray-800">{grn.invoice_no || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {canViewTablePo && (
          <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
            <h2 className="text-xl font-black text-[#2d808e] mb-6 tracking-tight">Latest PO</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 border-b border-gray-50 uppercase tracking-wider">
                    <th className="px-2 py-4 text-center w-12 border-r border-gray-50">#</th>
                    <th className="px-4 py-4 text-center border-r border-gray-50">DATE</th>
                    <th className="px-4 py-4 text-center border-r border-gray-50">PO NO</th>
                    <th className="px-4 py-4 border-r border-gray-50">SUPPLIER</th>
                    <th className="px-4 py-4 text-center border-r border-gray-50">STATUS</th>
                    <th className="px-4 py-4 text-right">VALUE</th>
                  </tr>
                </thead>
                <tbody className="text-[12px] font-medium">
                  {latestPOs.map((po, idx) => {
                    return (
                      <tr key={po.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="px-2 py-4 text-center text-gray-400 border-r border-gray-50">{idx + 1}</td>
                        <td className="px-4 py-4 text-center border-r border-gray-50 whitespace-nowrap text-gray-600">{formatDateShort(po.created_at)}</td>
                        <td className="px-4 py-4 text-center border-r border-gray-50 font-bold text-[#2d808e]">
                          <button onClick={() => onPreviewPo(po)} className="hover:underline">
                            {po.po_no}
                          </button>
                        </td>
                        <td className="px-4 py-4 uppercase truncate max-w-[150px] font-bold text-gray-700 border-r border-gray-50">{po.supplier_name || 'N/A'}</td>
                        <td className="px-4 py-4 text-center border-r border-gray-50">
                          {['Approved', 'Ordered', 'Open', 'Closed', 'APPROVED', 'ORDERED', 'OPEN', 'CLOSED'].includes(po.status) ? (
                            <div className="flex items-center justify-center text-emerald-500">
                              <CheckCircle2 size={14} className="mr-1" />
                              <span className="text-[10px] font-black uppercase">{['Ordered', 'ORDERED'].includes(po.status) ? 'Approved' : po.status}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-orange-500 uppercase">{po.status || 'Pending'}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-black text-gray-800">{formatCurrency(po.total_value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileModal: React.FC<{ user: any, isOpen: boolean, onClose: () => void, logout: () => void }> = ({ user, isOpen, onClose, logout }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors z-20">
          <X size={24} />
        </button>
        <div className="bg-[#2d808e] p-8 flex flex-col items-center justify-center text-white text-center relative overflow-hidden">
           <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute -top-10 -left-10 w-32 h-32 border-8 border-white rounded-full"></div>
              <div className="absolute -bottom-10 -right-10 w-48 h-48 border-4 border-white rounded-full"></div>
           </div>
           <div className="w-20 h-20 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mb-4 shadow-xl backdrop-blur-sm z-10 overflow-hidden">
             {user?.avatarUrl ? (
               <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               <UserIcon size={40} className="text-white" />
             )}
           </div>
           <h2 className="text-xl font-black uppercase tracking-tighter mb-1 z-10">{user?.fullName || 'SYSTEM ADMINISTRATOR'}</h2>
           <p className="text-[10px] font-black text-white/60 uppercase tracking-widest z-10">NODE ID: {user?.id?.substring(0,8).toUpperCase() || 'N/A'}</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[45vh] overflow-y-auto scrollbar-thin">
          {[
            { icon: <UserIcon size={18} />, label: 'Full Name', value: user?.fullName },
            { icon: <IdCard size={18} />, label: 'Office ID', value: user?.officeId || 'N/A' },
            { icon: <Phone size={18} />, label: 'Contact Number', value: user?.contactNumber || 'N/A' },
            { icon: <Mail size={18} />, label: 'Email Address', value: user?.email },
            { icon: <Briefcase size={18} />, label: 'Department', value: user?.department || 'N/A' },
            { icon: <UserIcon size={18} />, label: 'Username', value: user?.username },
            { icon: <Lock size={18} />, label: 'Password', value: user?.password || '********' },
            { icon: <ShieldAlert size={18} />, label: 'Role Template', value: user?.roleTemplate || user?.role },
            { icon: <Activity size={18} />, label: 'Account Status', value: user?.status, isStatus: true }
          ].map((field, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-[#2d808e]/30 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-[#2d808e] group-hover:bg-[#2d808e] group-hover:text-white transition-all duration-300 shrink-0">
                {field.icon}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{field.label}</span>
                <span className={`text-xs font-bold tracking-tight truncate ${field.isStatus ? (field.value === 'Active' ? 'text-emerald-600' : 'text-red-500') : 'text-gray-700'}`}>
                  {field.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Active Permissions Section */}
        <div className="px-6 pb-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-50 pb-2">Active Module Restrictions</h3>
          <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto scrollbar-thin pr-2">
            {user?.granularPermissions && Object.entries(user.granularPermissions).map(([moduleId, perms]: [string, any]) => {
              if (moduleId === '_metadata') return null;
              const activeActions = Object.entries(perms).filter(([, val]) => val === true).map(([action]) => action);
              if (activeActions.length === 0) return null;
              
              return (
                <div key={moduleId} className="px-3 py-2 bg-cyan-50/50 border border-cyan-100 rounded-lg flex flex-col gap-1">
                  <span className="text-[9px] font-black text-[#2d808e] uppercase tracking-tighter">{moduleId.replace(/_/g, ' ')}</span>
                  <div className="flex gap-1">
                    {activeActions.map(action => (
                      <span key={action} className="text-[8px] font-bold text-gray-400 uppercase bg-white px-1 rounded border border-gray-100">{action}</span>
                    ))}
                  </div>
                </div>
              );
            })}
            {(!user?.granularPermissions || Object.keys(user.granularPermissions).filter(k => k !== '_metadata').length === 0) && (
              <p className="text-[10px] text-gray-400 font-medium italic">No specific module restrictions applied.</p>
            )}
          </div>
        </div>
        <div className="px-6 pb-6">
          <button 
            onClick={logout}
            className="w-full py-3 border border-red-100 rounded-xl flex items-center justify-center gap-3 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all active:scale-[0.98]"
          >
            <LogOutIcon size={16} />
            <span>TERMINATE SESSION</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const SearchResults: React.FC<{ 
  results: {pr: any[], po: any[], mo: any[], items: any[], grn: any[], transactions: any[]}, 
  onNavigate: (type: string, obj: any) => void
}> = ({ results, onNavigate }) => {
  const hasResults = results.pr.length > 0 || results.po.length > 0 || results.mo.length > 0 || results.items.length > 0 || results.grn.length > 0 || results.transactions.length > 0;
  return (
    <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[80vh] overflow-y-auto z-[2000] scrollbar-thin">
      {!hasResults ? (
        <div className="p-10 text-center text-gray-400">
          <Search size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-xs font-bold uppercase tracking-widest">No matching records found in system</p>
        </div>
      ) : (
        <div className="p-2 space-y-4">
          {results.items.length > 0 && (
            <div className="space-y-1">
              <h4 className="px-3 py-1 text-[9px] font-black text-[#2d808e] uppercase tracking-widest border-b border-gray-50">Master Items</h4>
              {results.items.map(i => (
                <button key={i.id} onClick={() => onNavigate('item', i)} className="w-full text-left px-4 py-2 hover:bg-[#2d808e]/5 rounded-lg flex items-center justify-between group transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-gray-800 uppercase tracking-tight">{i.name}</span>
                    <span className="text-[10px] font-bold text-gray-400">SKU: {i.sku} | Loc: {i.location || 'N/A'}</span>
                  </div>
                  <ArrowUpRight size={14} className="text-gray-200 group-hover:text-[#2d808e] transition-colors" />
                </button>
              ))}
            </div>
          )}
          {results.pr.length > 0 && (
            <div className="space-y-1">
              <h4 className="px-3 py-1 text-[9px] font-black text-orange-500 uppercase tracking-widest border-b border-gray-50">Purchase Requisitions</h4>
              {results.pr.map(r => (
                <button key={r.id} onClick={() => onNavigate('pr', r)} className="w-full text-left px-4 py-2 hover:bg-orange-50 rounded-lg flex items-center justify-between group transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-gray-800">PR-{r.pr_no}</span>
                    <span className="text-[10px] font-bold text-gray-400">Ref: {r.reference} | Value: {r.total_value}</span>
                  </div>
                  <ArrowUpRight size={14} className="text-gray-200 group-hover:text-orange-500 transition-colors" />
                </button>
              ))}
            </div>
          )}
          {results.po.length > 0 && (
            <div className="space-y-1">
              <h4 className="px-3 py-1 text-[9px] font-black text-blue-500 uppercase tracking-widest border-b border-gray-50">Purchase Orders</h4>
              {results.po.map(o => (
                <button key={o.id} onClick={() => onNavigate('po', o)} className="w-full text-left px-4 py-2 hover:bg-blue-50 rounded-lg flex items-center justify-between group transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-gray-800">PO-{o.po_no}</span>
                    <span className="text-[10px] font-bold text-gray-400">Supplier: {o.supplier_name} | Total: {o.total_value}</span>
                  </div>
                  <ArrowUpRight size={14} className="text-gray-200 group-hover:text-blue-500 transition-colors" />
                </button>
              ))}
            </div>
          )}
          {results.mo.length > 0 && (
            <div className="space-y-1">
              <h4 className="px-3 py-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest border-b border-gray-50">Move Orders</h4>
              {results.mo.map(m => (
                <div key={m.id} className="w-full px-4 py-3 hover:bg-emerald-50/30 rounded-xl flex flex-col space-y-3 group transition-all border border-transparent hover:border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-black text-gray-800 uppercase tracking-tight">MO-{m.mo_no}</span>
                      <span className="text-[10px] font-bold text-gray-400">Dept: {m.department} | Status: {m.status}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                       <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                         m.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                         m.status === 'Approved' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                         'bg-orange-50 text-orange-600 border-orange-100'
                       }`}>
                         {m.status}
                       </span>
                       <ArrowUpRight size={14} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => onNavigate('mo-request', m)}
                      className="flex items-center justify-center space-x-2 py-2 bg-white border border-emerald-200 text-[9px] font-black text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all uppercase tracking-widest shadow-sm active:scale-95"
                    >
                      <Printer size={12} />
                      <span>1. Request Slip</span>
                    </button>
                    <button 
                      onClick={() => onNavigate('mo-issue', m)}
                      className="flex items-center justify-center space-x-2 py-2 bg-[#2d808e] text-white text-[9px] font-black rounded-lg hover:bg-[#256b78] transition-all uppercase tracking-widest shadow-md active:scale-95"
                    >
                      <Printer size={12} />
                      <span>2. Issue Slip</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {results.grn.length > 0 && (
            <div className="space-y-1">
              <h4 className="px-3 py-1 text-[9px] font-black text-[#2d808e] uppercase tracking-widest border-b border-gray-50">Goods Received Notes</h4>
              {results.grn.map(g => (
                <button key={g.id} onClick={() => onNavigate('grn', g)} className="w-full text-left px-4 py-2 hover:bg-[#2d808e]/5 rounded-lg flex items-center justify-between group transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-gray-800">GRN-{g.grn_no}</span>
                    <span className="text-[10px] font-bold text-gray-400">Ref: {g.source_ref} | Invoice: {g.invoice_no}</span>
                  </div>
                  <ArrowUpRight size={14} className="text-gray-200 group-hover:text-[#2d808e] transition-colors" />
                </button>
              ))}
            </div>
          )}
          {results.transactions.length > 0 && (
            <div className="space-y-1">
              <h4 className="px-3 py-1 text-[9px] font-black text-purple-500 uppercase tracking-widest border-b border-gray-50">Transactions</h4>
              {results.transactions.map(t => (
                <button key={t.id} onClick={() => onNavigate('transaction', t)} className="w-full text-left px-4 py-2 hover:bg-purple-50 rounded-lg flex items-center justify-between group transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-gray-800 uppercase tracking-tight">{t.type}: {t.reference_no}</span>
                    <span className="text-[10px] font-bold text-gray-400">SKU: {t.item_sku} | Qty: {t.quantity} | Date: {new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <ArrowUpRight size={14} className="text-gray-200 group-hover:text-purple-500 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const NotificationDropdown: React.FC<{ 
  notifications: Notification[]; 
  onClose: () => void; 
  onMarkRead: (id: string) => void;
  onNavigate: (link: string, data: any) => void;
}> = ({ notifications, onClose, onMarkRead, onNavigate }) => {
  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
        <h3 className="text-[11px] font-black text-[#2d808e] uppercase tracking-widest">Notifications</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
      <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
        {notifications.length === 0 ? (
          <div className="p-10 text-center">
            <Bell size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-[10px] font-bold text-gray-400 uppercase">No new notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                onMarkRead(n.id);
                onNavigate(n.link, n.data);
                onClose();
              }}
              className={`w-full p-4 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 ${!n.read ? 'bg-[#f0f9fa]/30' : ''}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                n.type === 'STOCK' ? 'bg-red-50 text-red-500' : 
                n.type === 'PR' ? 'bg-blue-50 text-blue-500' : 
                n.type === 'PO' ? 'bg-emerald-50 text-emerald-500' : 
                'bg-amber-50 text-amber-500'
              }`}>
                {n.type === 'STOCK' ? <ShieldAlert size={16} /> : 
                 n.type === 'PR' ? <FileText size={16} /> : 
                 n.type === 'PO' ? <ShoppingBag size={16} /> : 
                 <Activity size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-gray-800 uppercase truncate">{n.title}</p>
                <p className="text-[10px] font-medium text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                <p className="text-[9px] font-bold text-gray-300 uppercase mt-2">{new Date(n.timestamp).toLocaleString()}</p>
              </div>
              {!n.read && <div className="w-1.5 h-1.5 bg-[#2d808e] rounded-full mt-1.5 shrink-0"></div>}
            </button>
          ))
        )}
      </div>
      <div className="p-3 bg-gray-50/50 border-t border-gray-50 text-center">
        <button className="text-[9px] font-black text-[#2d808e] uppercase tracking-widest hover:underline">View All Notifications</button>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user, logout, hasGranularPermission } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'overview';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 768);

  const handleNotificationNavigation = (link: string, data: any) => {
    if (link === 'LOW_STOCK_MODAL') {
      navigate('/low-stock');
      return;
    }
    navigate(link);
    if (link === '/requisition' && data) setPreviewPr(data);
    if (link === '/purchase-order' && data) setPreviewPo(data);
    if (link === '/overview' && data) setPreviewMo(data);
  };

  const menuNavigate = (path: string) => {
    navigate(path);
    if (window.innerWidth < 768) setIsSidebarCollapsed(true);
  };
  const [isMoveOrderModalOpen, setIsMoveOrderModalOpen] = useState(false);
  const [isLocationTransferModalOpen, setIsLocationTransferModalOpen] = useState(false);
  const [isStockStatusModalOpen, setIsStockStatusModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewPr, setPreviewPr] = useState<any>(null);
  const [previewPo, setPreviewPo] = useState<any>(null);
  const [previewMo, setPreviewMo] = useState<any>(null);
  const [previewMoRequest, setPreviewMoRequest] = useState<any>(null);
  const [previewMoIssue, setPreviewMoIssue] = useState<any>(null);
  const [previewMoDetail, setPreviewMoDetail] = useState<any>(null);
  const [previewTnx, setPreviewTnx] = useState<any>(null);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [previewGrn, setPreviewGrn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{pr: any[], po: any[], mo: any[], items: any[], grn: any[], transactions: any[]}>({ pr: [], po: [], mo: [], items: [], grn: [], transactions: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSearchResults({ pr: [], po: [], mo: [], items: [], grn: [], transactions: [] });
        return;
      }
      setIsSearching(true);
      try {
        const [prRes, poRes, moRes, itemRes, grnRes, tnxRes] = await Promise.all([
          supabase.from('requisitions').select('*').or(`pr_no.ilike.%${searchQuery}%,reference.ilike.%${searchQuery}%`).limit(5),
          supabase.from('purchase_orders').select('*').or(`po_no.ilike.%${searchQuery}%,supplier_name.ilike.%${searchQuery}%`).limit(5),
          supabase.from('move_orders').select('*').or(`mo_no.ilike.%${searchQuery}%,reference.ilike.%${searchQuery}%`).limit(5),
          supabase.from('items').select('*').or(`sku.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`).limit(5),
          supabase.from('grns').select('*').or(`grn_no.ilike.%${searchQuery}%,source_ref.ilike.%${searchQuery}%,invoice_no.ilike.%${searchQuery}%`).limit(5),
          supabase.from('transactions').select('*').or(`reference_no.ilike.%${searchQuery}%`).limit(5)
        ]);
        setSearchResults({
          pr: prRes.data || [],
          po: poRes.data || [],
          mo: moRes.data || [],
          items: itemRes.data || [],
          grn: grnRes.data || [],
          transactions: tnxRes.data || []
        });
        setShowSearchResults(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };
    const timeoutId = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchResultNavigation = async (type: string, obj: any) => {
    setShowSearchResults(false);
    setSearchQuery('');
    if (type === 'pr') setPreviewPr(obj);
    if (type === 'po') setPreviewPo(obj);
    if (type === 'mo-request') setPreviewMoRequest(obj);
    if (type === 'mo-issue') setPreviewMoIssue(obj);
    if (type === 'grn') setPreviewGrn(obj.grn_no);
    if (type === 'item') setPreviewItem(obj);
    if (type === 'transaction') {
      if (obj.type === 'Issue') {
        // Try to find the corresponding move order for issue slip preview
        try {
          const { data: moData } = await supabase
            .from('move_orders')
            .select('*')
            .or(`mo_no.eq."${obj.reference_no}",reference.eq."${obj.reference_no}"`)
            .limit(1);
          
          if (moData && moData.length > 0) {
            setPreviewMo(moData[0]);
          } else {
            setPreviewTnx(obj);
          }
        } catch (err) {
          console.error("Error fetching MO for transaction:", err);
          setPreviewTnx(obj);
        }
      } else {
        setPreviewTnx(obj);
      }
    }
  };

  const handlePrintIssueSlip = (mo: any) => {
    const printSection = document.getElementById('print-section');
    if (!printSection) {
      window.print();
      return;
    }
    
    // Ensure we have a clean slate
    printSection.innerHTML = '';
    printSection.classList.add('printable');
    
    const root = getPrintRoot(printSection);
    root.render(<IssueSlipPrintTemplate mo={mo} />);
    
    // Give a small delay for React to render into the print root
    setTimeout(() => {
      window.print();
      // Cleanup after print dialog closes
      setTimeout(() => {
        printSection.classList.remove('printable');
        root.render(null);
      }, 1000);
    }, 800);
  };

  const handleDownloadPDF = async (mo: any) => {
    const printSection = document.getElementById('print-section');
    if (!printSection) return;

    printSection.classList.add('printable');
    const root = getPrintRoot(printSection);
    root.render(<IssueSlipPrintTemplate mo={mo} />);

    try {
      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const element = printSection.querySelector('#issue-slip-print') as HTMLElement;
      if (!element) {
        // Fallback to the whole print section if ID not found
        const canvas = await html2canvas(printSection, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Issue_Slip_${mo.reference || mo.mo_no}.pdf`);
      } else {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Issue_Slip_${mo.reference || mo.mo_no}.pdf`);
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try printing instead.");
    } finally {
      printSection.classList.remove('printable');
      root.render(null);
    }
  };

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    purchase: location.pathname.includes('requisition') || location.pathname.includes('purchase-order') || location.pathname.includes('supplier') || location.pathname.includes('purchase-report'),
    warehouse: location.pathname.includes('inventory') || location.pathname.includes('receive') || location.pathname.includes('issue') || location.pathname.includes('tnx-report') || location.pathname.includes('mo-report'),
    itemMaster: location.pathname.includes('item-list') || location.pathname.includes('item-uom') || location.pathname.includes('item-type') || location.pathname.includes('cost-center'),
    analysis: location.pathname.includes('low-stock') || location.pathname.includes('abc-analysis') || location.pathname.includes('moving-update'),
    admin: location.pathname.includes('users')
  });

  return (
    <div className="flex h-screen bg-[#f3f4f6] overflow-hidden font-sans relative">
      {/* Mobile Overlay */}
      {!isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}
      
      <aside className={`fixed md:relative z-50 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-16 lg:w-20' : 'translate-x-0 w-[240px]'} bg-white flex flex-col h-full shadow-2xl shrink-0 border-r border-gray-100`}>
      <div className="p-6 flex flex-col items-center border-b border-gray-50 mb-4">
        <div className="w-16 h-16 rounded-full bg-[#f0f9fa] flex items-center justify-center mb-3 shadow-inner">
          <UserIcon size={32} className="text-[#2d808e]" />
        </div>
        {!isSidebarCollapsed && (
          <>
            <h3 className="text-[13px] font-black text-[#2d808e] uppercase tracking-tight">{user?.fullName || 'SYSTEM ADMIN'}</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{user?.roleTemplate || user?.role || 'ADMINISTRATOR'}</p>
          </>
        )}
      </div>
      <div className="flex-1 py-2 overflow-y-auto overflow-x-hidden space-y-1 scrollbar-thin scrollbar-thumb-gray-200">
        <SidebarItem 
          icon={<Gauge />} 
          label="Dashboard" 
          active={activeTab === 'overview'} 
          isCollapsed={isSidebarCollapsed} 
          onClick={() => {
            if (isSidebarCollapsed) setIsSidebarCollapsed(false);
            menuNavigate('/overview');
          }} 
        />
        
        {(hasGranularPermission('requisition', 'view') || 
          hasGranularPermission('purchase_order', 'view') || 
          hasGranularPermission('supplier', 'view') || 
          hasGranularPermission('purchase_report', 'view')) && (
          <SidebarItem 
            icon={<ShoppingCart />} 
            label="Purchase" 
            hasSubmenu 
            isOpen={openMenus.purchase} 
            onClick={() => {
              if (isSidebarCollapsed) setIsSidebarCollapsed(false);
              setOpenMenus({...openMenus, purchase: !openMenus.purchase});
            }} 
            isCollapsed={isSidebarCollapsed}
          >
            {hasGranularPermission('requisition', 'view') && <SubmenuItem icon={<FileText />} label="Requisition" active={activeTab === 'requisition'} onClick={() => menuNavigate('/requisition')} />}
            {hasGranularPermission('purchase_order', 'view') && <SubmenuItem icon={<ShoppingBag />} label="Order" active={activeTab === 'purchase-order'} onClick={() => menuNavigate('/purchase-order')} />}
            {hasGranularPermission('supplier', 'view') && <SubmenuItem icon={<Truck />} label="Supplier" active={activeTab === 'supplier'} onClick={() => menuNavigate('/supplier')} />}
            {hasGranularPermission('purchase_report', 'view') && <SubmenuItem icon={<BarChart3 />} label="Report" active={activeTab === 'purchase-report'} onClick={() => menuNavigate('/purchase-report')} />}
          </SidebarItem>
        )}

        {(hasGranularPermission('inventory', 'view') || 
          hasGranularPermission('receive', 'view') || 
          hasGranularPermission('issue', 'view') || 
          hasGranularPermission('tnx_report', 'view') || 
          hasGranularPermission('mo_report', 'view') || 
          hasGranularPermission('cycle_counting', 'view')) && (
          <SidebarItem 
            icon={<Warehouse />} 
            label="Warehouse" 
            hasSubmenu 
            isOpen={openMenus.warehouse} 
            onClick={() => {
              if (isSidebarCollapsed) setIsSidebarCollapsed(false);
              setOpenMenus({...openMenus, warehouse: !openMenus.warehouse});
            }} 
            isCollapsed={isSidebarCollapsed}
          >
            {hasGranularPermission('inventory', 'view') && <SubmenuItem icon={<LayoutGrid />} label="Inventory" active={activeTab === 'inventory'} onClick={() => menuNavigate('/inventory')} />}
            {hasGranularPermission('receive', 'view') && <SubmenuItem icon={<ArrowRight />} label="Receive" active={activeTab === 'receive'} onClick={() => menuNavigate('/receive')} />}
            {hasGranularPermission('issue', 'view') && <SubmenuItem icon={<ArrowLeft />} label="Issue" active={activeTab === 'issue'} onClick={() => menuNavigate('/issue')} />}
            {hasGranularPermission('tnx_report', 'view') && <SubmenuItem icon={<FileText />} label="Tnx-Report" active={activeTab === 'tnx-report'} onClick={() => menuNavigate('/tnx-report')} />}
            {hasGranularPermission('mo_report', 'view') && <SubmenuItem icon={<FileText />} label="MO-Report" active={activeTab === 'mo-report'} onClick={() => menuNavigate('/mo-report')} />}
            {hasGranularPermission('cycle_counting', 'view') && <SubmenuItem icon={<ClipboardList />} label="Cycle Counting" active={activeTab === 'cycle-counting'} onClick={() => menuNavigate('/cycle-counting')} />}
          </SidebarItem>
        )}

        {(hasGranularPermission('item_list', 'view') || 
          hasGranularPermission('item_uom', 'view') || 
          hasGranularPermission('item_type', 'view') || 
          hasGranularPermission('cost_center', 'view')) && (
          <SidebarItem 
            icon={<LayoutGrid />} 
            label="Item Master" 
            hasSubmenu 
            isOpen={openMenus.itemMaster} 
            onClick={() => {
              if (isSidebarCollapsed) setIsSidebarCollapsed(false);
              setOpenMenus({...openMenus, itemMaster: !openMenus.itemMaster});
            }} 
            isCollapsed={isSidebarCollapsed}
          >
            {hasGranularPermission('item_list', 'view') && <SubmenuItem icon={<FileText />} label="Item List" active={activeTab === 'item-list'} onClick={() => menuNavigate('/item-list')} />}
            {hasGranularPermission('item_uom', 'view') && <SubmenuItem icon={<Boxes />} label="Item UOM" active={activeTab === 'item-uom'} onClick={() => menuNavigate('/item-uom')} />}
            {hasGranularPermission('item_type', 'view') && <SubmenuItem icon={<Tag />} label="Item Type" active={activeTab === 'item-type'} onClick={() => menuNavigate('/item-type')} />}
            {hasGranularPermission('cost_center', 'view') && <SubmenuItem icon={<Home />} label="Cost Center" active={activeTab === 'cost-center'} onClick={() => menuNavigate('/cost-center')} />}
          </SidebarItem>
        )}

        {(hasGranularPermission('low_stock_inventory', 'view') || 
          hasGranularPermission('abc_analysis', 'view')) && (
          <SidebarItem 
            icon={<BarChart3 />} 
            label="Analysis" 
            hasSubmenu 
            isOpen={openMenus.analysis} 
            onClick={() => {
              if (isSidebarCollapsed) setIsSidebarCollapsed(false);
              setOpenMenus({...openMenus, analysis: !openMenus.analysis});
            }} 
            isCollapsed={isSidebarCollapsed}
          >
            {hasGranularPermission('low_stock_inventory', 'view') && <SubmenuItem icon={<ShieldAlert />} label="Low Stock Inventory" active={activeTab === 'low-stock'} onClick={() => menuNavigate('/low-stock')} />}
            {hasGranularPermission('abc_analysis', 'view') && <SubmenuItem icon={<TrendingUp />} label="ABC Analysis" active={activeTab === 'abc-analysis'} onClick={() => menuNavigate('/abc-analysis')} />}
            <SubmenuItem icon={<MoveHorizontal />} label="Moving Update" active={activeTab === 'moving-update'} onClick={() => menuNavigate('/moving-update')} />
            {hasGranularPermission('issue_report', 'view') && <SubmenuItem icon={<FileText />} label="Reporting Issue and Receive" active={activeTab === 'reporting-issue-receive'} onClick={() => menuNavigate('/reporting-issue-receive')} />}
          </SidebarItem>
        )}

        {hasGranularPermission('user_management', 'view') && (
          <SidebarItem 
            icon={<ShieldAlert />} 
            label="Admin" 
            active={activeTab === 'users'} 
            hasSubmenu 
            isOpen={openMenus.admin} 
            onClick={() => {
              if (isSidebarCollapsed) setIsSidebarCollapsed(false);
              setOpenMenus({...openMenus, admin: !openMenus.admin});
            }} 
            isCollapsed={isSidebarCollapsed}
          >
            <SubmenuItem icon={<UserIcon />} label="Users" active={activeTab === 'users'} onClick={() => menuNavigate('/users')} />
          </SidebarItem>
        )}
      </div>
        <div className="p-4 border-t border-gray-50">
          <button onClick={logout} className="w-full flex items-center space-x-3 px-3 py-2 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 rounded-lg transition-all"><LogOutIcon size={18} />{!isSidebarCollapsed && <span>EXIT</span>}</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-30 shrink-0">
          <div className="flex items-center gap-2 md:gap-6">
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 hover:bg-gray-50 rounded-lg text-[#2d808e] transition-all"><Menu size={20} /></button>
            <div onClick={() => navigate('/overview')} className="text-lg md:text-xl font-black text-[#2d808e] tracking-tighter cursor-pointer select-none">ALIGN</div>
          </div>
          <div ref={searchContainerRef} className="hidden md:block flex-1 max-w-[600px] mx-4 lg:mx-10 relative">
            <div className="bg-[#f8f9fa] rounded-xl flex items-center px-4 py-1 border border-transparent focus-within:border-[#2d808e]/30 focus-within:bg-white focus-within:shadow-lg transition-all">
              <Search size={16} className="text-gray-300" />
              <input 
                type="text" 
                placeholder="Search PR, PO, MO, SKU, Item..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                className="flex-1 bg-transparent border-none outline-none px-4 text-xs font-bold text-gray-700 placeholder:text-gray-300 placeholder:font-medium"
              />
              {isSearching ? (
                <Loader2 size={14} className="animate-spin text-[#2d808e] mr-2" />
              ) : null}
              <button className="w-8 h-8 bg-[#2d808e] rounded-lg flex items-center justify-center text-white shadow-lg shadow-cyan-900/20 hover:bg-[#256b78] transition-all active:scale-95">
                <ArrowUpRight size={16} />
              </button>
            </div>
            {showSearchResults && <SearchResults results={searchResults} onNavigate={handleSearchResultNavigation} />}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)} 
                className={`relative p-2 hover:bg-gray-50 rounded-lg transition-all group ${isNotificationOpen ? 'bg-gray-50 text-[#2d808e]' : 'text-[#8da2c0]'}`}
              >
                <Bell size={20} className={unreadCount > 0 ? 'animate-wiggle' : ''} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-1 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {isNotificationOpen && (
                <NotificationDropdown 
                  notifications={notifications} 
                  onClose={() => setIsNotificationOpen(false)} 
                  onMarkRead={markAsRead}
                  onNavigate={handleNotificationNavigation}
                />
              )}
            </div>
            <div className="h-6 w-px bg-gray-100 mx-1"></div>
            <button onClick={() => setIsProfileOpen(true)} className="w-9 h-9 rounded-lg bg-[#f0f9fa] border border-gray-100 flex items-center justify-center text-[#2d808e] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <UserIcon size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f9fafb] scrollbar-thin">
          <div className="max-w-[1600px] mx-auto w-full">
            <Routes>
              <Route path="/overview" element={<DashboardOverview refreshKey={refreshKey} onCheckStock={() => setIsStockStatusModalOpen(true)} onMoveOrder={() => setIsMoveOrderModalOpen(true)} onLocTransfer={() => setIsLocationTransferModalOpen(true)} onPreviewPr={setPreviewPr} onPreviewPo={setPreviewPo} onPreviewMo={setPreviewMo} onPreviewMoDetail={setPreviewMoDetail} onPreviewGrn={setPreviewGrn} />} />
              <Route path="/users" element={<UserManagement />} /><Route path="/requisition" element={<PurchaseRequisition />} /><Route path="/purchase-order" element={<PurchaseOrder />} /><Route path="/supplier" element={<Supplier />} /><Route path="/purchase-report" element={<PurchaseReport />} /><Route path="/inventory" element={<Inventory />} /><Route path="/receive" element={<Receive />} /><Route path="/issue" element={<Issue />} /><Route path="/tnx-report" element={<TnxReport />} /><Route path="/mo-report" element={<MOReport />} /><Route path="/item-list" element={<ItemList />} /><Route path="/item-uom" element={<ItemUOM />} /><Route path="/item-type" element={<ItemType />} /><Route path="/cost-center" element={<CostCenter />} /><Route path="/label" element={<LabelManagement />} />              <Route path="/cycle-counting" element={<CycleCounting />} />
              <Route path="/low-stock" element={hasGranularPermission('low_stock_inventory', 'view') ? <LowStockInventory /> : <Navigate to="/overview" replace />} />
              <Route path="/abc-analysis" element={hasGranularPermission('abc_analysis', 'view') ? <ABCAnalysis /> : <Navigate to="/overview" replace />} />
              <Route path="/moving-update" element={<MovingUpdate />} />
              <Route path="/reporting-issue-receive" element={hasGranularPermission('issue_report', 'view') ? <ReportingIssueReceive /> : <Navigate to="/overview" replace />} />
              <Route path="/" element={<Navigate to="/overview" replace />} />
            </Routes>
          </div>
        </main>
        <footer className="h-10 bg-gray-50 border-t border-gray-200 flex items-center justify-center px-8 z-30 shrink-0 text-[11px] font-medium text-gray-600">
          <div>
            All rights Reserved ©ALIGN 2026 | Developed by <span className="text-blue-600 font-bold">Rakib H Shuvo</span>
          </div>
        </footer>
      </div>
      <MoveOrderModal isOpen={isMoveOrderModalOpen} onClose={() => setIsMoveOrderModalOpen(false)} />
      <LocationTransferModal isOpen={isLocationTransferModalOpen} onClose={() => setIsLocationTransferModalOpen(false)} />
      <StockStatusModal isOpen={isStockStatusModalOpen} onClose={() => setIsStockStatusModalOpen(false)} />
      <ItemDetailViewModal item={previewItem} isOpen={!!previewItem} onClose={() => setPreviewItem(null)} />
      {previewPr && <PRPreviewModal pr={previewPr} onClose={() => { setPreviewPr(null); setRefreshKey(prev => prev + 1); }} />}
      {previewPo && <POPreviewModal po={previewPo} onClose={() => { setPreviewPo(null); setRefreshKey(prev => prev + 1); }} />}
      {previewMo && <MOApprovalModal mo={previewMo} isOpen={!!previewMo} onClose={() => { setPreviewMo(null); setRefreshKey(prev => prev + 1); }} />}
      {previewMoDetail && (
        <MODetailsModal 
          mo={previewMoDetail} 
          onClose={() => setPreviewMoDetail(null)} 
          onApprove={() => {
            setPreviewMo(previewMoDetail);
            setPreviewMoDetail(null);
          }}
        />
      )}
      {previewMoRequest && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto print-mode-active">
          <div className="bg-[#fcfcfc] w-full max-w-[1100px] rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh] animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 no-print">
              <div className="flex items-center space-x-4">
                <div className="bg-[#2d808e] p-2 rounded-lg text-white shadow-lg shadow-cyan-900/20">
                  <Printer size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#2d808e] uppercase tracking-tight">Move Order Request Slip</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TNX.NO: {previewMoRequest.reference || previewMoRequest.mo_no}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => handleDownloadPDF({ ...previewMoRequest, isRequest: true })}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg text-xs font-black hover:bg-red-600 flex items-center space-x-3 uppercase tracking-widest transition-all shadow-lg shadow-red-900/20"
                >
                  <FileDown size={18} />
                  <span>Download PDF</span>
                </button>
                <button 
                  onClick={() => handlePrintIssueSlip({ ...previewMoRequest, isRequest: true })}
                  className="bg-[#2d808e] text-white px-8 py-2 rounded-lg text-xs font-black hover:bg-[#256b78] flex items-center space-x-3 uppercase tracking-widest transition-all"
                >
                  <Printer size={18} />
                  <span>Execute Print</span>
                </button>
                <button 
                  onClick={() => setPreviewMoRequest(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-12 bg-gray-200/20 scrollbar-thin">
              <div className="bg-white shadow-2xl border border-gray-200 rounded-sm printable">
                <IssueSlipPrintTemplate mo={{ ...previewMoRequest, isRequest: true }} />
              </div>
            </div>
          </div>
        </div>
      )}
      {previewMoIssue && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto print-mode-active">
          <div className="bg-[#fcfcfc] w-full max-w-[1100px] rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh] animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 no-print">
              <div className="flex items-center space-x-4">
                <div className="bg-[#2d808e] p-2 rounded-lg text-white shadow-lg shadow-cyan-900/20">
                  <Printer size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#2d808e] uppercase tracking-tight">Issue Slip Print Preview</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TNX.NO: {previewMoIssue.reference || previewMoIssue.mo_no}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => handleDownloadPDF(previewMoIssue)}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg text-xs font-black hover:bg-red-600 flex items-center space-x-3 uppercase tracking-widest transition-all shadow-lg shadow-red-900/20"
                >
                  <FileDown size={18} />
                  <span>Download PDF</span>
                </button>
                <button 
                  onClick={() => handlePrintIssueSlip(previewMoIssue)}
                  className="bg-[#2d808e] text-white px-8 py-2 rounded-lg text-xs font-black hover:bg-[#256b78] flex items-center space-x-3 uppercase tracking-widest transition-all"
                >
                  <Printer size={18} />
                  <span>Execute Print</span>
                </button>
                <button 
                  onClick={() => setPreviewMoIssue(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-12 bg-gray-200/20 scrollbar-thin">
              <div className="bg-white shadow-2xl border border-gray-200 rounded-sm printable">
                <IssueSlipPrintTemplate mo={previewMoIssue} />
              </div>
            </div>
          </div>
        </div>
      )}
      {previewTnx && <TnxDetailsModal tnx={previewTnx} onClose={() => setPreviewTnx(null)} />}
      {previewGrn && (
        <GRNPreviewModal 
          grnId={previewGrn} 
          onClose={() => setPreviewGrn(null)} 
          onPrintLabels={(items) => {
            setPreviewGrn(null);
            navigate('/label', { state: { items } });
          }}
        />
      )}
      <ProfileModal user={user} isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} logout={logout} />
    </div>
  );
};

export default Dashboard;
