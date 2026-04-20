
import React, { useState, useEffect, useCallback } from 'react';
import { Home, Download, Loader2, BarChart3, PieChart as PieChartIcon, Edit3, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, Bar, Line
} from 'recharts';
import pptxgen from "pptxgenjs";

const COLORS = ['#2d808e', '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#64748b'];

const ReportingIssueReceive: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reportMode, setReportMode] = useState<'Monthly' | 'Weekly'>('Weekly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Master Data
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  
  // Table Data (Top Table)
  // Record<label, Record<dept, { issuedQty, issuedAmt, receivedQty, receivedAmt }>>
  const [combinedData, setCombinedData] = useState<Record<string, Record<string, { iQty: number, iAmt: number, rQty: number, rAmt: number }>>>({});
  const [timeLabels, setTimeLabels] = useState<string[]>([]);

  // Summary Data (Bottom Table)
  const [deptSummaryData, setDeptSummaryData] = useState<Record<string, { items: number, qty: number, amt: number, rQty: number, rAmt: number }>>({});

  const months = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Departments
      const { data: deptRes } = await supabase.from('cost_centers').select('name').order('name');
      const depts = Array.from(new Set(deptRes?.map(d => d.name) || []))
        .sort();
      
      setAllDepartments(depts);
      if (!selectedDept && depts.length > 0) {
        setSelectedDept('ALL');
      }

      // 2. Determine Date Range
      let startDate: string;
      let endDate: string;
      let labels: string[] = [];

      if (reportMode === 'Monthly') {
        startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
        endDate = new Date(selectedYear, selectedMonth + 1, 1).toISOString();
        labels = ['1st Week', '2nd Week', '3rd Week', '4th Week'];
      } else {
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);
        const start = new Date(selectedDate);
        start.setDate(start.getDate() - 5);
        start.setHours(0, 0, 0, 0);
        
        startDate = start.toISOString();
        endDate = end.toISOString();

        for (let i = 0; i < 6; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          labels.push(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
        }
      }
      setTimeLabels(labels);

      // 3. Fetch Transaction Data
      const { data: tnxData, error: tnxError } = await supabase
        .from('transactions')
        .select('*')
        .in('type', ['Issue', 'Receive'])
        .gte('created_at', startDate)
        .lt('created_at', endDate);

      if (tnxError) throw tnxError;

      // 5. Fetch Item Master for prices
      const skus = Array.from(new Set([
        ...(tnxData || []).map(t => t.item_sku)
      ]));
      let itemMap: Record<string, any> = {};
      if (skus.length > 0) {
        const { data: itemData } = await supabase.from('items').select('sku, type, last_price, avg_price').in('sku', skus);
        itemMap = (itemData || []).reduce((acc: any, item: any) => {
          acc[item.sku] = item;
          return acc;
        }, {});
      }

      // 6. Process Top Table Data
      const newCombined: Record<string, Record<string, { iQty: number, iAmt: number, rQty: number, rAmt: number }>> = {};
      labels.forEach(l => {
        newCombined[l] = {};
      });

      (tnxData || []).forEach(tnx => {
        const dept = tnx.department || 'OTHERS';
        if (selectedDept !== 'ALL' && dept !== selectedDept) return;

        const tnxDate = new Date(tnx.created_at);
        let label = '';
        if (reportMode === 'Monthly') {
          const date = tnxDate.getDate();
          if (date <= 7) label = '1st Week';
          else if (date <= 14) label = '2nd Week';
          else if (date <= 21) label = '3rd Week';
          else label = '4th Week';
        } else {
          label = tnxDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        }

        if (newCombined[label]) {
          if (!newCombined[label][dept]) {
            newCombined[label][dept] = { iQty: 0, iAmt: 0, rQty: 0, rAmt: 0 };
          }
          const qty = Number(tnx.quantity) || 0;
          const item = itemMap[tnx.item_sku] || {};
          const price = Number(tnx.unit_price) || Number(item.last_price) || Number(item.avg_price) || 0;
          const amt = qty * price;
          
          if (tnx.type === 'Issue') {
            newCombined[label][dept].iQty += qty;
            newCombined[label][dept].iAmt += amt;
          } else {
            newCombined[label][dept].rQty += qty;
            newCombined[label][dept].rAmt += amt;
          }
        }
      });
      setCombinedData(newCombined);

      // 7. Process Summary Data (Bottom Table - All Departments)
      const newDeptSummary: Record<string, { items: Set<string>, qty: number, amt: number, rQty: number, rAmt: number }> = {};
      
      // Ensure all departments from cost_centers are initialized
      depts.forEach(d => {
        newDeptSummary[d] = { items: new Set(), qty: 0, amt: 0, rQty: 0, rAmt: 0 };
      });

      // Add Transaction Data
      (tnxData || []).forEach(tnx => {
        const dept = tnx.department || 'OTHERS';
        if (!newDeptSummary[dept]) {
          newDeptSummary[dept] = { items: new Set(), qty: 0, amt: 0, rQty: 0, rAmt: 0 };
        }
        
        const qty = Number(tnx.quantity) || 0;
        const item = itemMap[tnx.item_sku] || {};
        const price = Number(tnx.unit_price) || Number(item.last_price) || Number(item.avg_price) || 0;
        const amt = qty * price;
        
        if (tnx.type === 'Issue') {
          newDeptSummary[dept].qty += qty;
          newDeptSummary[dept].amt += amt;
          newDeptSummary[dept].items.add(tnx.item_sku);
        } else if (tnx.type === 'Receive') {
          newDeptSummary[dept].rQty += qty;
          newDeptSummary[dept].rAmt += amt;
          newDeptSummary[dept].items.add(tnx.item_sku);
        }
      });

      const summary: Record<string, { items: number, qty: number, amt: number, rQty: number, rAmt: number }> = {};
      Object.keys(newDeptSummary).forEach(d => {
        summary[d] = {
          items: newDeptSummary[d].items.size,
          qty: newDeptSummary[d].qty,
          amt: newDeptSummary[d].amt,
          rQty: newDeptSummary[d].rQty,
          rAmt: newDeptSummary[d].rAmt
        };
      });
      setDeptSummaryData(summary);

    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, reportMode, selectedDate, selectedDept]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownloadPPT = async () => {
    const pres = new pptxgen();
    pres.layout = 'LAYOUT_WIDE';

    const monthName = months[selectedMonth];
    const yearStr = selectedYear.toString();
    const title = `${reportMode.toUpperCase()} ITEM ISSUED & RECEIVED SUMMARY OF ${monthName}'${yearStr}`;

    const slide = pres.addSlide();
    
    // Header
    slide.addText(`\u274F ${title}`, { 
      x: 0.5, y: 0.2, w: 12, fontSize: 18, bold: true, color: '003366', fontFace: 'Arial' 
    });
    slide.addShape(pres.ShapeType.line, { x: 0.5, y: 0.6, w: 12.3, h: 0, line: { color: '003366', width: 2 } });

    // Top Table Sub-header
    slide.addText('ITEM ISSUED HISTORY', { 
      x: 0.5, y: 0.8, w: 12.3, h: 0.4, fontSize: 12, bold: true, align: 'center', fill: { color: '335C99' }, color: 'FFFFFF' 
    });

    // Bottom Section: Chart, Summary Table, Pie Chart
    const activeDepts = Object.keys(deptSummaryData)
      .filter(d => 
        deptSummaryData[d].qty > 0 || 
        deptSummaryData[d].rQty > 0 ||
        deptSummaryData[d].items > 0
      )
      .sort((a, b) => (deptSummaryData[b].qty + deptSummaryData[b].rQty) - (deptSummaryData[a].qty + deptSummaryData[a].rQty));

    // Top Table
    const tableHeader: any[][] = [
      [{ text: reportMode === 'Weekly' ? 'Days' : 'Week', options: { rowspan: 3, align: 'center' as const, valign: 'middle' as const, bold: true, border: { pt: 1, color: '000000' } } }],
      [],
      []
    ];

    activeDepts.forEach(dept => {
      tableHeader[0].push({ text: dept, options: { colspan: 4, align: 'center' as const, bold: true, border: { pt: 1, color: '000000' } } });
      tableHeader[1].push({ text: 'ISSUED', options: { colspan: 2, align: 'center' as const, bold: true, border: { pt: 1, color: '000000' } } });
      tableHeader[1].push({ text: 'RECEIVED', options: { colspan: 2, align: 'center' as const, bold: true, border: { pt: 1, color: '000000' } } });
      tableHeader[2].push({ text: 'QTY', options: { align: 'center' as const, bold: true, border: { pt: 1, color: '000000' } } });
      tableHeader[2].push({ text: 'Amount', options: { align: 'center' as const, bold: true, border: { pt: 1, color: '000000' } } });
      tableHeader[2].push({ text: 'QTY', options: { align: 'center' as const, bold: true, border: { pt: 1, color: '000000' } } });
      tableHeader[2].push({ text: 'Amount', options: { align: 'center' as const, bold: true, border: { pt: 1, color: '000000' } } });
    });

    const tableRows: any[] = timeLabels.map(label => {
      const row = [label];
      activeDepts.forEach(dept => {
        const d = combinedData[label]?.[dept] || { iQty: 0, iAmt: 0, rQty: 0, rAmt: 0 };
        row.push(d.iQty === 0 ? '-' : d.iQty.toString());
        row.push(d.iAmt === 0 ? '-' : Number(d.iAmt).toFixed(0));
        row.push(d.rQty === 0 ? '-' : d.rQty.toString());
        row.push(d.rAmt === 0 ? '-' : Number(d.rAmt).toFixed(0));
      });
      return row;
    });

    const totalRow = ['Total'];
    activeDepts.forEach(dept => {
      const totalIQty = timeLabels.reduce((acc, l) => acc + (combinedData[l]?.[dept]?.iQty || 0), 0);
      const totalIAmt = timeLabels.reduce((acc, l) => acc + (combinedData[l]?.[dept]?.iAmt || 0), 0);
      const totalRQty = timeLabels.reduce((acc, l) => acc + (combinedData[l]?.[dept]?.rQty || 0), 0);
      const totalRAmt = timeLabels.reduce((acc, l) => acc + (combinedData[l]?.[dept]?.rAmt || 0), 0);
      totalRow.push(totalIQty.toString());
      totalRow.push(Number(totalIAmt).toFixed(0));
      totalRow.push(totalRQty.toString());
      totalRow.push(Number(totalRAmt).toFixed(0));
    });
    tableRows.push(totalRow);

    slide.addTable([...tableHeader, ...tableRows.map((r: string[]) => r.map((c: string) => ({ text: c, options: { align: 'center' as const, border: { pt: 1, color: '000000' } } })))], 
      { x: 0.5, y: 1.2, w: 12.3, fontSize: 8, border: { pt: 1, color: '000000' } }
    );

    // Bar Chart
    slide.addChart(pres.ChartType.bar, [
      {
        name: 'Issued Qty',
        labels: activeDepts,
        values: activeDepts.map(d => deptSummaryData[d].qty)
      },
      {
        name: 'Received Qty',
        labels: activeDepts,
        values: activeDepts.map(d => deptSummaryData[d].rQty)
      }
    ], { 
      x: 0.5, y: 5.5, w: 6.5, h: 3.5, 
      showLegend: true, legendPos: 't', 
      barGapWidthPct: 20,
      showValue: true,
      chartColors: ['ED7D31', '10b981']
    });

    // Line Chart (Issued Amt & Received Amt)
    slide.addChart(pres.ChartType.line, [
      {
        name: 'Issued Amt',
        labels: activeDepts,
        values: activeDepts.map(d => deptSummaryData[d].amt)
      },
      {
        name: 'Received Amt',
        labels: activeDepts,
        values: activeDepts.map(d => deptSummaryData[d].rAmt)
      }
    ], { 
      x: 0.5, y: 5.5, w: 6.5, h: 3.5, 
      showLegend: true, legendPos: 't',
      lineDataSymbol: 'circle',
      lineDataSymbolSize: 8,
      chartColors: ['2E75B6', '8b5cf6'],
      valAxisHidden: true
    });

    // Summary Table
    const summaryHeader = ['Department', 'Items', 'Issued Qty', 'Issued Amt', 'Received Qty', 'Received Amt'];
    const summaryRows = activeDepts.map(d => [
      d,
      deptSummaryData[d].items.toString(),
      deptSummaryData[d].qty.toString(),
      Number(deptSummaryData[d].amt).toFixed(2),
      deptSummaryData[d].rQty.toString(),
      Number(deptSummaryData[d].rAmt).toFixed(2)
    ]);
    const summaryTotal = [
      'Grand Total',
      activeDepts.reduce((acc, d) => acc + deptSummaryData[d].items, 0).toString(),
      activeDepts.reduce((acc, d) => acc + deptSummaryData[d].qty, 0).toString(),
      Number(activeDepts.reduce((acc, d) => acc + deptSummaryData[d].amt, 0)).toFixed(2),
      activeDepts.reduce((acc, d) => acc + deptSummaryData[d].rQty, 0).toString(),
      Number(activeDepts.reduce((acc, d) => acc + deptSummaryData[d].rAmt, 0)).toFixed(2)
    ];
    summaryRows.push(summaryTotal);

    slide.addTable([
      summaryHeader.map(h => ({ text: h, options: { fill: { color: '4472C4' }, color: 'FFFFFF', bold: true, align: 'center' as const } })), 
      ...summaryRows.map((r, i) => r.map(c => ({ text: c, options: { align: 'center' as const, fill: i === summaryRows.length - 1 ? { color: '4472C4' } : undefined, color: i === summaryRows.length - 1 ? 'FFFFFF' : undefined, border: { pt: 1, color: '000000' } } })))
    ], { x: 7.2, y: 5.5, w: 5.6, fontSize: 9 });

    // Pie Chart
    if (activeDepts.length > 0) {
      slide.addChart(pres.ChartType.pie, [
        {
          name: 'Issued Distribution',
          labels: activeDepts,
          values: activeDepts.map(d => deptSummaryData[d].qty)
        }
      ], { 
        x: 7.2, y: 7.2, w: 2.8, h: 2.5, 
        showLegend: true, legendPos: 'b',
        showPercent: true,
        showValue: true,
        dataLabelPosition: 'bestFit'
      });

      slide.addChart(pres.ChartType.pie, [
        {
          name: 'Received Distribution',
          labels: activeDepts,
          values: activeDepts.map(d => deptSummaryData[d].rQty)
        }
      ], { 
        x: 10.0, y: 7.2, w: 2.8, h: 2.5, 
        showLegend: true, legendPos: 'b',
        showPercent: true,
        showValue: true,
        dataLabelPosition: 'bestFit'
      });
    }

    pres.writeFile({ fileName: `Reporting_Issue_Receive_${monthName}_${yearStr}.pptx` });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-[#2d808e]" size={48} />
        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Generating Report Data...</p>
      </div>
    );
  }

  const activeDepts = Object.keys(deptSummaryData)
    .filter(d => 
      deptSummaryData[d].qty > 0 || 
      deptSummaryData[d].rQty > 0 ||
      deptSummaryData[d].items > 0
    )
    .sort((a, b) => (deptSummaryData[b].qty + deptSummaryData[b].rQty) - (deptSummaryData[a].qty + deptSummaryData[a].rQty));
  const chartData = activeDepts.map(d => ({
    name: d,
    qty: deptSummaryData[d].qty,
    amt: deptSummaryData[d].amt,
    rQty: deptSummaryData[d].rQty,
    rAmt: deptSummaryData[d].rAmt
  }));

  const pieDataIssued = activeDepts.map(d => ({
    name: d,
    value: deptSummaryData[d].qty
  }));

  const pieDataReceived = activeDepts.map(d => ({
    name: d,
    value: deptSummaryData[d].rQty
  }));

  return (
    <div className="flex flex-col space-y-6 font-sans antialiased text-gray-800 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">
          <Home size={14} className="text-gray-400" />
          <span className="text-gray-300">/</span>
          <span className="text-gray-400">ANALYSIS</span>
          <span className="text-gray-300">/</span>
          <span className="border border-[#2d808e] px-2 py-0.5 rounded text-[#2d808e] font-black">REPORTING ISSUE & RECEIVE</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-white rounded-lg border border-gray-100 p-1 shadow-sm">
            <button 
              onClick={() => setReportMode('Monthly')}
              className={`px-3 py-1 text-[10px] font-black rounded ${reportMode === 'Monthly' ? 'bg-[#2d808e] text-white' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              MONTHLY
            </button>
            <button 
              onClick={() => setReportMode('Weekly')}
              className={`px-3 py-1 text-[10px] font-black rounded ${reportMode === 'Weekly' ? 'bg-[#2d808e] text-white' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              WEEKLY
            </button>
          </div>

          <div className="flex items-center bg-white rounded-lg border border-gray-100 p-1 shadow-sm">
            {reportMode === 'Monthly' ? (
              <>
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent text-[11px] font-black uppercase px-3 py-1 outline-none border-r border-gray-100"
                >
                  {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-[11px] font-black uppercase px-3 py-1 outline-none"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            ) : (
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-[11px] font-black px-3 py-1 outline-none"
              />
            )}
          </div>

          <select 
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-[11px] font-black uppercase outline-none shadow-sm"
          >
            <option value="ALL">ALL DEPARTMENTS</option>
            {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          
          <button 
            onClick={fetchData}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          <button 
            onClick={handleDownloadPPT}
            className="flex items-center space-x-2 bg-[#2d808e] text-white px-6 py-2 rounded-lg text-[11px] font-black shadow-lg shadow-[#2d808e]/20 hover:bg-[#256b78] transition-all uppercase tracking-widest active:scale-95"
          >
            <Download size={14} />
            <span>Download PPT</span>
          </button>
        </div>
      </div>

      {/* Main Report Container */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-8 space-y-8">
        {/* Title */}
        <div className="border-b-2 border-[#003366] pb-2 flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-[#003366] flex items-center justify-center">
            <div className="w-2 h-2 bg-[#003366]"></div>
          </div>
          <h1 className="text-xl font-black text-[#003366] uppercase tracking-tight">
            {reportMode} ITEM ISSUED & RECEIVED SUMMARY OF {months[selectedMonth]}'{selectedYear}
          </h1>
        </div>

        {/* Top Table */}
        <div className="space-y-0">
          <div className="bg-[#335C99] text-white text-center py-2 font-black text-sm uppercase tracking-widest border border-[#335C99]">
            ITEM ISSUED HISTORY
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-[10px]">
              <thead>
                <tr>
                  <th rowSpan={3} className="border border-gray-300 bg-gray-50 px-4 py-2 w-24">{reportMode === 'Weekly' ? 'Days' : 'Week'}</th>
                  {activeDepts.map(dept => (
                    <th key={dept} colSpan={4} className="border border-gray-300 bg-white px-4 py-2 text-sm font-black uppercase">
                      {dept}
                    </th>
                  ))}
                </tr>
                <tr>
                  {activeDepts.map(dept => (
                    <React.Fragment key={`${dept}-header`}>
                      <th colSpan={2} className="border border-gray-300 bg-gray-50 px-4 py-1 font-black">ISSUED</th>
                      <th colSpan={2} className="border border-gray-300 bg-gray-50 px-4 py-1 font-black">RECEIVED</th>
                    </React.Fragment>
                  ))}
                </tr>
                <tr>
                  {activeDepts.map(dept => (
                    <React.Fragment key={`${dept}-sub-header`}>
                      <th className="border border-gray-300 bg-gray-50 px-2 py-1 font-black">QTY</th>
                      <th className="border border-gray-300 bg-gray-50 px-2 py-1 font-black">Amount</th>
                      <th className="border border-gray-300 bg-gray-50 px-2 py-1 font-black">QTY</th>
                      <th className="border border-gray-300 bg-gray-50 px-2 py-1 font-black">Amount</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="text-center font-bold text-gray-700">
                {timeLabels.map(label => (
                  <tr key={label} className="hover:bg-gray-50">
                    <td className="border border-gray-300 py-2 bg-gray-50/30">{label}</td>
                    {activeDepts.map(dept => {
                      const d = combinedData[label]?.[dept] || { iQty: 0, iAmt: 0, rQty: 0, rAmt: 0 };
                      return (
                        <React.Fragment key={`${label}-${dept}`}>
                          <td className="border border-gray-300 py-2">{d.iQty || '-'}</td>
                          <td className="border border-gray-300 py-2">{d.iAmt ? Number(d.iAmt).toFixed(0) : '-'}</td>
                          <td className="border border-gray-300 py-2">{d.rQty || '-'}</td>
                          <td className="border border-gray-300 py-2">{d.rAmt ? Number(d.rAmt).toFixed(0) : '-'}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-gray-100 font-black text-gray-900">
                  <td className="border border-gray-300 py-2 uppercase">Total</td>
                  {activeDepts.map(dept => {
                    const totalIQty = timeLabels.reduce((acc, l) => acc + (combinedData[l]?.[dept]?.iQty || 0), 0);
                    const totalIAmt = timeLabels.reduce((acc, l) => acc + (combinedData[l]?.[dept]?.iAmt || 0), 0);
                    const totalRQty = timeLabels.reduce((acc, l) => acc + (combinedData[l]?.[dept]?.rQty || 0), 0);
                    const totalRAmt = timeLabels.reduce((acc, l) => acc + (combinedData[l]?.[dept]?.rAmt || 0), 0);
                    return (
                      <React.Fragment key={`${dept}-total`}>
                        <td className="border border-gray-300 py-2">{totalIQty || '-'}</td>
                        <td className="border border-gray-300 py-2">{totalIAmt ? Number(totalIAmt).toFixed(0) : '-'}</td>
                        <td className="border border-gray-300 py-2">{totalRQty || '-'}</td>
                        <td className="border border-gray-300 py-2">{totalRAmt ? Number(totalRAmt).toFixed(0) : '-'}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Chart */}
          <div className="lg:col-span-7 h-[400px] bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                <Bar yAxisId="left" dataKey="qty" name="Issued Qty" fill="#ED7D31" barSize={30} />
                <Bar yAxisId="left" dataKey="rQty" name="Received Qty" fill="#10b981" barSize={30} />
                <Line yAxisId="right" type="monotone" dataKey="amt" name="Issued Amt" stroke="#2E75B6" strokeWidth={3} dot={{ fill: '#FF0000', r: 6, strokeWidth: 2, stroke: '#FFFFFF' }} />
                <Line yAxisId="right" type="monotone" dataKey="rAmt" name="Received Amt" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 6, strokeWidth: 2, stroke: '#FFFFFF' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Table & Pie Chart */}
          <div className="lg:col-span-5 space-y-6">
            <div className="overflow-x-auto shadow-sm rounded-lg border border-gray-200">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-[#4472C4] text-white font-black uppercase tracking-wider">
                    <th className="px-3 py-2 border-r border-white/20">Department</th>
                    <th className="px-3 py-2 text-center border-r border-white/20">Items</th>
                    <th className="px-3 py-2 text-center border-r border-white/20">Issued Qty</th>
                    <th className="px-3 py-2 text-center border-r border-white/20">Issued Amt</th>
                    <th className="px-3 py-2 text-center border-r border-white/20">Received Qty</th>
                    <th className="px-3 py-2 text-right">Received Amt</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 font-bold">
                  {activeDepts.map(d => (
                    <tr key={d} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 uppercase border-r border-gray-100">{d}</td>
                      <td className="px-3 py-2 text-center border-r border-gray-100">{deptSummaryData[d].items}</td>
                      <td className="px-3 py-2 text-center border-r border-gray-100">{deptSummaryData[d].qty}</td>
                      <td className="px-3 py-2 text-center border-r border-gray-100">{Number(deptSummaryData[d].amt).toFixed(2)}</td>
                      <td className="px-3 py-2 text-center border-r border-gray-100">{deptSummaryData[d].rQty}</td>
                      <td className="px-3 py-2 text-right">{Number(deptSummaryData[d].rAmt).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#4472C4] text-white font-black">
                    <td className="px-3 py-2 uppercase border-r border-white/20">Grand Total</td>
                    <td className="px-3 py-2 text-center border-r border-white/20">{activeDepts.reduce((acc, d) => acc + deptSummaryData[d].items, 0)}</td>
                    <td className="px-3 py-2 text-center border-r border-white/20">{activeDepts.reduce((acc, d) => acc + deptSummaryData[d].qty, 0)}</td>
                    <td className="px-3 py-2 text-center border-r border-white/20">{Number(activeDepts.reduce((acc, d) => acc + deptSummaryData[d].amt, 0)).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center border-r border-white/20">{activeDepts.reduce((acc, d) => acc + deptSummaryData[d].rQty, 0)}</td>
                    <td className="px-3 py-2 text-right">{Number(activeDepts.reduce((acc, d) => acc + deptSummaryData[d].rAmt, 0)).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="h-[280px] bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between gap-4">
              <div className="w-1/2 h-full flex flex-col">
                <h4 className="text-[10px] font-black text-center uppercase mb-2 text-[#2d808e]">Issued Distribution</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieDataIssued}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${Number(percent * 100).toFixed(0)}%`}
                    >
                      {pieDataIssued.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 h-full flex flex-col">
                <h4 className="text-[10px] font-black text-center uppercase mb-2 text-[#10b981]">Received Distribution</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieDataReceived}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${Number(percent * 100).toFixed(0)}%`}
                    >
                      {pieDataReceived.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportingIssueReceive;
