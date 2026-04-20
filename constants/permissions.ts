
export interface ModuleConfig {
  id: string;
  label: string;
  category: string;
}

export const PERMISSION_MODULES: ModuleConfig[] = [
  // Dashboard Approvals
  { id: 'pr_approval', label: 'PR Approvals', category: 'Dashboard Approvals' },
  { id: 'po_approval', label: 'PO Approvals', category: 'Dashboard Approvals' },
  { id: 'mo_approval', label: 'MO Approvals', category: 'Dashboard Approvals' },
  
  // Dashboard KPI Cards
  { id: 'dash_kpi_today_orders', label: 'Today Orders', category: 'Dashboard KPI Cards' },
  { id: 'dash_kpi_last_day_orders', label: 'Last Day Orders', category: 'Dashboard KPI Cards' },
  { id: 'dash_kpi_weekly_orders', label: 'Weekly Orders', category: 'Dashboard KPI Cards' },
  { id: 'dash_kpi_monthly_orders', label: 'Monthly Orders', category: 'Dashboard KPI Cards' },
  { id: 'dash_kpi_weekly_pr', label: 'Weekly PR', category: 'Dashboard KPI Cards' },
  { id: 'dash_kpi_monthly_pr', label: 'Monthly PR', category: 'Dashboard KPI Cards' },
  
  // Dashboard Action Buttons
  { id: 'dash_action_print_labels', label: 'Print Labels', category: 'Dashboard Action Buttons' },
  { id: 'dash_action_check_stock', label: 'Check Stock', category: 'Dashboard Action Buttons' },
  { id: 'dash_action_move_order', label: 'Move Order', category: 'Dashboard Action Buttons' },
  { id: 'dash_action_loc_transfer', label: 'Loc. Transfer', category: 'Dashboard Action Buttons' },
  
  // Dashboard Charts & Tables
  { id: 'dash_chart_weekly_movement', label: 'Weekly Movement', category: 'Dashboard Charts & Tables' },
  { id: 'dash_chart_annual_valuation', label: 'Annual Valuation', category: 'Dashboard Charts & Tables' },
  { id: 'dash_chart_stock_segmentation', label: 'Stock Segmentation', category: 'Dashboard Charts & Tables' },
  { id: 'dash_gauge_diesel', label: 'Diesel Gauge', category: 'Dashboard Charts & Tables' },
  { id: 'dash_gauge_octane', label: 'Octane Gauge', category: 'Dashboard Charts & Tables' },
  { id: 'dash_table_latest_mo', label: 'Latest MO Table', category: 'Dashboard Charts & Tables' },
  { id: 'dash_table_latest_pr', label: 'Latest PR Table', category: 'Dashboard Charts & Tables' },
  { id: 'dash_table_latest_grn', label: 'Latest GRN Table', category: 'Dashboard Charts & Tables' },
  { id: 'dash_table_latest_po', label: 'Latest PO Table', category: 'Dashboard Charts & Tables' },
  { id: 'dash_chart_weekly_po', label: 'Weekly PO Chart', category: 'Dashboard Charts & Tables' },
  
  // Purchase Management
  { id: 'requisition', label: 'Requisition', category: 'Purchase Management' },
  { id: 'purchase_order', label: 'Purchase Order', category: 'Purchase Management' },
  { id: 'supplier', label: 'Supplier', category: 'Purchase Management' },
  { id: 'purchase_report', label: 'Report', category: 'Purchase Management' },
  
  // Warehouse & Logistics
  { id: 'inventory', label: 'Inventory', category: 'Warehouse & Logistics' },
  { id: 'receive', label: 'Receive (GRN)', category: 'Warehouse & Logistics' },
  { id: 'issue', label: 'Issue', category: 'Warehouse & Logistics' },
  { id: 'tnx_report', label: 'Tnx-Report', category: 'Warehouse & Logistics' },
  { id: 'mo_report', label: 'MO-Report', category: 'Warehouse & Logistics' },
  { id: 'cycle_counting', label: 'Cycle Counting', category: 'Warehouse & Logistics' },
  
  // Cycle Counting Details
  { id: 'cc_daily_counts', label: 'Daily Counts', category: 'Cycle Counting Details' },
  { id: 'cc_daily_shortage', label: 'Daily Shortage', category: 'Cycle Counting Details' },
  { id: 'cc_daily_overage', label: 'Daily Overage', category: 'Cycle Counting Details' },
  { id: 'cc_daily_variance', label: 'Daily Variance', category: 'Cycle Counting Details' },
  { id: 'cc_form_system_qty', label: 'System Qty (Form)', category: 'Cycle Counting Details' },
  { id: 'cc_form_pend_receive', label: 'Pend. Receive (Form)', category: 'Cycle Counting Details' },
  { id: 'cc_form_pend_issue', label: 'Pend. Issue (Form)', category: 'Cycle Counting Details' },
  { id: 'cc_form_short_over', label: 'Short / Over (Form)', category: 'Cycle Counting Details' },
  
  // Item Master Data
  { id: 'item_list', label: 'Item List', category: 'Item Master Data' },
  { id: 'item_uom', label: 'Item UOM', category: 'Item Master Data' },
  { id: 'item_type', label: 'Item Type', category: 'Item Master Data' },
  { id: 'cost_center', label: 'Cost Center', category: 'Item Master Data' },
  
  // Analysis
  { id: 'low_stock_inventory', label: 'Low Stock Inventory', category: 'Analysis' },
  { id: 'abc_analysis', label: 'ABC Analysis', category: 'Analysis' },
  { id: 'issue_report', label: 'Issue Report', category: 'Analysis' },
  { id: 'receive_report', label: 'Receive Report', category: 'Analysis' },
  
  // System Administration
  { id: 'user_management', label: 'User Management', category: 'System Administration' },
];
