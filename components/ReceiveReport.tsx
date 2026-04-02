
import React, { useState, useEffect, useCallback } from 'react';
import { Home, Download, Loader2, BarChart3, PieChart as PieChartIcon, Edit3, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, Bar, Line
} from 'recharts';
import pptxgen from "pptxgenjs";

const COLORS = ['#2d808e', '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#64748b'];

const ReceiveReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Master Data
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [allItemTypes, setAllItemTypes] = useState<string[]>([]);
  
  // Editable Data
  const [deptWiseData, setDeptWiseData] = useState<Record<string, Record<string, number>>>({
    '1st Week': {}, '2nd Week': {}, '3rd Week': {}, '4th Week': {}
  });
  const [typeWiseData, setTypeWiseData] = useState<Record<string, Record<string, number>>>({
    '1st Week': {}, '2nd Week': {}, '3rd Week': {}, '4th Week': {}
  });
  const [deptSummaryData, setDeptSummaryData] = useState<Record<string, { items: number, prQty: number, qty: number, amt: number }>>({});

  const months = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Master Data
      const [deptRes, typeRes] = await Promise.all([
        supabase.from('cost_centers').select('name').order('name'),
        supabase.from('items').select('type').not('type', 'is', null)
      ]);

      const depts = Array.from(new Set(deptRes.data?.map(d => d.name) || [])).sort();
      const types = Array.from(new Set(typeRes.data?.map(t => t.type) || [])).sort();
      
      const finalDepts = depts.length > 0 ? [...depts] : ['PRODUCTION', 'ADMIN', 'PROJECT', 'MAINT', 'MMT', 'OTHERS'];
      if (depts.length > 0 && !finalDepts.includes('OTHERS')) {
        finalDepts.push('OTHERS');
      }
      const finalTypes = types.length > 0 ? types : ['CONSUMABLE', 'SPARE', 'STATIONARY', 'CIVIL & CONST.'];

      setAllDepartments(finalDepts);
      setAllItemTypes(finalTypes);

      // 2. Fetch Transaction Data and Requisitions for the selected period
      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth + 1, 1).toISOString();

      const [tnxRes, prRes] = await Promise.all([
        supabase.from('transactions')
          .select('*')
          .eq('type', 'Receive')
          .gte('created_at', startDate)
          .lt('created_at', endDate),
        supabase.from('requisitions')
          .select('*')
          .gte('created_at', startDate)
          .lt('created_at', endDate)
      ]);

      if (tnxRes.error) throw tnxRes.error;
      if (prRes.error) throw prRes.error;

      const tnxData = tnxRes.data || [];
      const prData = prRes.data || [];

      // 3. Fetch Item Master Data for prices
      const skus = Array.from(new Set([
        ...tnxData.map(t => t.item_sku),
        ...prData.flatMap(pr => (pr.items || []).map((i: any) => i.sku))
      ]));
      
      let itemMap: Record<string, any> = {};
      if (skus.length > 0) {
        const { data: itemData } = await supabase
          .from('items')
          .select('sku, name, type, avg_price, last_price')
          .in('sku', skus);
        
        itemMap = (itemData || []).reduce((acc: any, item: any) => {
          acc[item.sku] = item;
          return acc;
        }, {});
      }

      // 4. Process Data for Tables
      const newDeptWise: Record<string, Record<string, number>> = {
        '1st Week': {}, '2nd Week': {}, '3rd Week': {}, '4th Week': {}
      };
      const newTypeWise: Record<string, Record<string, number>> = {
        '1st Week': {}, '2nd Week': {}, '3rd Week': {}, '4th Week': {}
      };
      const newDeptSummary: Record<string, { items: Set<string>, prQty: number, qty: number, amt: number }> = {};

      // Initialize summary for all departments
      finalDepts.forEach(dept => {
        newDeptSummary[dept] = { items: new Set(), prQty: 0, qty: 0, amt: 0 };
      });

      // Process Requisitions (PR Data)
      prData.forEach(pr => {
        const dept = pr.reqDpt || 'OTHERS';
        if (!newDeptSummary[dept]) newDeptSummary[dept] = { items: new Set(), prQty: 0, qty: 0, amt: 0 };
        
        (pr.items || []).forEach((item: any) => {
          const reqQty = Number(item.reqQty) || 0;
          newDeptSummary[dept].prQty += reqQty;
          if (item.sku) newDeptSummary[dept].items.add(item.sku);
        });
      });

      // Process Transactions (Actual Received Data)
      tnxData.forEach(tnx => {
        const date = new Date(tnx.created_at).getDate();
        let week = '4th Week';
        if (date <= 7) week = '1st Week';
        else if (date <= 14) week = '2nd Week';
        else if (date <= 21) week = '3rd Week';

        const dept = tnx.department || 'OTHERS';
        const item = itemMap[tnx.item_sku] || {};
        const type = item.type || 'OTHERS';
        const qty = Number(tnx.quantity) || 0;
        const price = Number(tnx.unit_price) || 0; // Direct PO price from transaction
        const amt = qty * price;

        newDeptWise[week][dept] = (newDeptWise[week][dept] || 0) + qty;
        newTypeWise[week][type] = (newTypeWise[week][type] || 0) + qty;

        if (!newDeptSummary[dept]) newDeptSummary[dept] = { items: new Set(), prQty: 0, qty: 0, amt: 0 };
        newDeptSummary[dept].items.add(tnx.item_sku);
        newDeptSummary[dept].qty += qty;
        newDeptSummary[dept].amt += amt;
      });

      setDeptWiseData(newDeptWise);
      setTypeWiseData(newTypeWise);
      
      const summary: Record<string, { items: number, prQty: number, qty: number, amt: number }> = {};
      Object.keys(newDeptSummary).forEach(dept => {
        summary[dept] = {
          items: newDeptSummary[dept].items.size,
          prQty: newDeptSummary[dept].prQty,
          qty: newDeptSummary[dept].qty,
          amt: newDeptSummary[dept].amt
        };
      });
      setDeptSummaryData(summary as any);

    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeptValueChange = (week: string, dept: string, value: string) => {
    const num = parseInt(value) || 0;
    setDeptWiseData(prev => ({
      ...prev,
      [week]: { ...prev[week], [dept]: num }
    }));
  };

  const handleTypeValueChange = (week: string, type: string, value: string) => {
    const num = parseInt(value) || 0;
    setTypeWiseData(prev => ({
      ...prev,
      [week]: { ...prev[week], [type]: num }
    }));
  };

  const handleSummaryValueChange = (dept: string, field: 'items' | 'prQty' | 'qty' | 'amt', value: string) => {
    const num = parseFloat(value) || 0;
    setDeptSummaryData(prev => ({
      ...prev,
      [dept]: { ...prev[dept], [field]: num }
    }));
  };

  const handleDownloadPPT = async () => {
    const pres = new pptxgen();
    pres.layout = 'LAYOUT_WIDE';

    const monthName = months[selectedMonth];
    const yearStr = selectedYear.toString();

    // Slide 1: Item Received Summary
    const slide1 = pres.addSlide();
    slide1.addText(`ITEM RECEIVED SUMMARY OF ${monthName}'${yearStr}`, { 
      x: 0.5, y: 0.3, w: 12, fontSize: 18, bold: true, color: '003366', fontFace: 'Arial' 
    });

    // Table 1: Dept Wise
    slide1.addText('DEPARTMENT WISE ITEM RECEIVED HISTORY', { 
      x: 0.5, y: 0.8, w: 12.3, h: 0.4, fontSize: 12, bold: true, align: 'center', fill: { color: 'B9CFED' }, color: '000000' 
    });

    const deptHeader = ['DEPARTMENT', ...allDepartments, 'TOTAL'];
    const deptRows = ['1st Week', '2nd Week', '3rd Week', '4th Week'].map(week => {
      const row = [week];
      let rowTotal = 0;
      allDepartments.forEach(dept => {
        const val = deptWiseData[week][dept] || 0;
        row.push(val === 0 ? '-' : val.toString());
        rowTotal += val;
      });
      row.push(rowTotal.toString());
      return row;
    });

    // Total Row for Dept Wise
    const deptTotalRow = ['Total'];
    let grandTotal = 0;
    allDepartments.forEach(dept => {
      const colTotal = ['1st Week', '2nd Week', '3rd Week', '4th Week'].reduce((acc, week) => acc + (deptWiseData[week][dept] || 0), 0);
      deptTotalRow.push(colTotal.toString());
      grandTotal += colTotal;
    });
    deptTotalRow.push(grandTotal.toString());
    deptRows.push(deptTotalRow);

    slide1.addTable([deptHeader.map(h => ({ text: h, options: { bold: true, align: 'center' as const, border: { pt: 1, color: '000000' } } })), 
      ...deptRows.map(r => r.map(c => ({ text: c, options: { align: 'center' as const, border: { pt: 1, color: '000000' } } })))], 
      { x: 0.5, y: 1.2, w: 12.3, fontSize: 10, border: { pt: 1, color: '000000' } }
    );

    // Table 2: Type Wise
    slide1.addText('ITEM TYPE WISE RECEIVED HISTORY', { 
      x: 0.5, y: 4.5, w: 12.3, h: 0.4, fontSize: 12, bold: true, align: 'center', fill: { color: 'B9CFED' }, color: '000000' 
    });

    const typeHeader = ['ITEM TYPE', ...allItemTypes, 'SUB-TOTAL'];
    const typeRows = ['1st Week', '2nd Week', '3rd Week', '4th Week'].map(week => {
      const row = [week];
      let rowTotal = 0;
      allItemTypes.forEach(type => {
        const val = typeWiseData[week][type] || 0;
        row.push(val === 0 ? '-' : val.toString());
        rowTotal += val;
      });
      row.push(rowTotal.toString());
      return row;
    });

    // Total Row for Type Wise
    const typeTotalRow = ['Total'];
    let typeGrandTotal = 0;
    allItemTypes.forEach(type => {
      const colTotal = ['1st Week', '2nd Week', '3rd Week', '4th Week'].reduce((acc, week) => acc + (typeWiseData[week][type] || 0), 0);
      typeTotalRow.push(colTotal.toString());
      typeGrandTotal += colTotal;
    });
    typeTotalRow.push(typeGrandTotal.toString());
    typeRows.push(typeTotalRow);

    slide1.addTable([typeHeader.map(h => ({ text: h, options: { bold: true, align: 'center' as const, border: { pt: 1, color: '000000' } } })), 
      ...typeRows.map(r => r.map(c => ({ text: c, options: { align: 'center' as const, border: { pt: 1, color: '000000' } } })))], 
      { x: 0.5, y: 4.9, w: 12.3, fontSize: 10, border: { pt: 1, color: '000000' } }
    );

    // Slide 2: Charts & Summary
    const slide2 = pres.addSlide();
    slide2.addText(`DEPT WISE ITEM RECEIVED - ${monthName}'${yearStr}`, { 
      x: 0.5, y: 0.3, w: 10, fontSize: 18, bold: true, color: '000000' 
    });
    slide2.addText('FAIR GROUP', { x: 11.5, y: 0.3, w: 1.5, fontSize: 14, bold: true, color: '2d808e', align: 'right' });

    // Summary Table (Top Right)
    const summaryHeader = ['Department', 'Received_Items', 'PR_Qty', 'Received_Qty', 'Received_Amt'];
    const summaryRows = allDepartments.map(dept => [
      dept,
      (deptSummaryData[dept]?.items || 0).toString(),
      (deptSummaryData[dept]?.prQty || 0).toString(),
      (deptSummaryData[dept]?.qty || 0).toString(),
      (deptSummaryData[dept]?.amt || 0).toFixed(2)
    ]);
    
    // Grand Total for Summary
    const summaryTotal = ['Grand Total', 
      allDepartments.reduce((acc, d) => acc + (deptSummaryData[d]?.items || 0), 0).toString(),
      allDepartments.reduce((acc, d) => acc + (deptSummaryData[d]?.prQty || 0), 0).toString(),
      allDepartments.reduce((acc, d) => acc + (deptSummaryData[d]?.qty || 0), 0).toString(),
      allDepartments.reduce((acc, d) => acc + (deptSummaryData[d]?.amt || 0), 0).toFixed(2)
    ];
    summaryRows.push(summaryTotal);

    slide2.addTable([summaryHeader.map(h => ({ text: h, options: { fill: { color: '4472C4' }, color: 'FFFFFF', bold: true, align: 'center' as const } })), 
      ...summaryRows.map((r, i) => r.map(c => ({ text: c, options: { align: (i === summaryRows.length - 1 ? 'center' : 'left') as any, fill: i === summaryRows.length - 1 ? { color: '4472C4' } : undefined, color: i === summaryRows.length - 1 ? 'FFFFFF' : undefined } })))], 
      { x: 8.5, y: 0.8, w: 4.5, fontSize: 9 }
    );

    // Charts
    // Bar Chart
    slide2.addChart(pres.ChartType.bar, [
      {
        name: 'Received Qty',
        labels: allDepartments,
        values: allDepartments.map(d => deptSummaryData[d]?.qty || 0)
      }
    ], { 
      x: 0.5, y: 1.0, w: 7.5, h: 3.0, 
      showLegend: true, legendPos: 't', 
      title: 'Received Quantity by Department',
      showValue: true,
      catGridLine: { style: 'none' },
      valGridLine: { style: 'none' }
    });

    // Line Chart
    slide2.addChart(pres.ChartType.line, [
      {
        name: 'Received Amt',
        labels: allDepartments,
        values: allDepartments.map(d => deptSummaryData[d]?.amt || 0)
      }
    ], { 
      x: 0.5, y: 4.0, w: 7.5, h: 2.5, 
      showLegend: true, legendPos: 't', 
      title: 'Received Amount by Department',
      showValue: true,
      catGridLine: { style: 'none' },
      valGridLine: { style: 'none' }
    });

    // Pie Chart
    const pieDataForPpt = allDepartments
      .filter(d => (deptSummaryData[d]?.qty || 0) > 0);

    if (pieDataForPpt.length > 0) {
      slide2.addChart(pres.ChartType.pie, [
        {
          name: 'Distribution',
          labels: pieDataForPpt,
          values: pieDataForPpt.map(d => deptSummaryData[d]?.qty || 0)
        }
      ], { 
        x: 8.5, y: 4.5, w: 4.5, h: 2.5, 
        showLegend: true, 
        legendPos: 'r',
        showValue: true,
        showPercent: true,
        dataLabelPosition: 'outEnd',
        dataLabelFontSize: 9,
        dataLabelFormatCode: '#,##0'
      });
    }

    pres.writeFile({ fileName: `Receive_Report_${monthName}_${yearStr}.pptx` });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-[#2d808e]" size={48} />
        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Generating Report Data...</p>
      </div>
    );
  }

  const chartData = allDepartments.map(dept => ({
    name: dept,
    prQty: deptSummaryData[dept]?.prQty || 0,
    qty: deptSummaryData[dept]?.qty || 0,
    amt: deptSummaryData[dept]?.amt || 0
  }));

  const pieData = allDepartments.map(dept => ({
    name: dept,
    value: deptSummaryData[dept]?.qty || 0
  })).filter(d => d.value > 0);

  return (
    <div className="flex flex-col space-y-6 font-sans antialiased text-gray-800 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">
          <Home size={14} className="text-gray-400" />
          <span className="text-gray-300">/</span>
          <span className="text-gray-400">ANALYSIS</span>
          <span className="text-gray-300">/</span>
          <span className="border border-[#2d808e] px-2 py-0.5 rounded text-[#2d808e] font-black">RECEIVE REPORT</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-white rounded-lg border border-gray-100 p-1 shadow-sm">
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
          </div>
          
          <button 
            onClick={fetchData}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
            title="Refresh from Database"
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

      {/* Summary Section 1 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-[#f8fafc] px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#2d808e]/10 flex items-center justify-center text-[#2d808e]">
              <BarChart3 size={18} />
            </div>
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-tight">
              ITEM RECEIVED SUMMARY OF {months[selectedMonth]}'{selectedYear}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
            <Edit3 size={12} />
            <span>Manual Edit Enabled</span>
          </div>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Department Wise Table */}
          <div className="space-y-3">
            <div className="bg-[#2d808e]/5 px-4 py-2 rounded-lg text-center">
              <span className="text-[11px] font-black text-[#2d808e] uppercase tracking-widest">DEPARTMENT WISE ITEM RECEIVED HISTORY</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px] border border-gray-200">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="px-4 py-3 border-r border-gray-200">DEPARTMENT</th>
                    {allDepartments.map(dept => (
                      <th key={dept} className="px-4 py-3 text-center border-r border-gray-200">{dept}</th>
                    ))}
                    <th className="px-4 py-3 text-center">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-bold text-gray-600">
                  {['1st Week', '2nd Week', '3rd Week', '4th Week'].map(week => {
                    let rowTotal = 0;
                    return (
                      <tr key={week} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 border-r border-gray-200 bg-gray-50/30">{week}</td>
                        {allDepartments.map(dept => {
                          const val = deptWiseData[week][dept] || 0;
                          rowTotal += val;
                          return (
                            <td key={dept} className="px-1 py-1 text-center border-r border-gray-200">
                              <input 
                                type="text"
                                value={val === 0 ? '-' : val}
                                onChange={(e) => handleDeptValueChange(week, dept, e.target.value)}
                                className="w-full bg-transparent text-center outline-none focus:bg-blue-50 py-2"
                              />
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center font-black text-[#2d808e]">{rowTotal || '-'}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-50 font-black text-gray-800">
                    <td className="px-4 py-3 border-r border-gray-200">TOTAL</td>
                    {allDepartments.map(dept => {
                      const colTotal = ['1st Week', '2nd Week', '3rd Week', '4th Week'].reduce((acc, week) => acc + (deptWiseData[week][dept] || 0), 0);
                      return <td key={dept} className="px-4 py-3 text-center border-r border-gray-200">{colTotal || '-'}</td>;
                    })}
                    <td className="px-4 py-3 text-center text-[#2d808e]">
                      {allDepartments.reduce((acc, dept) => acc + ['1st Week', '2nd Week', '3rd Week', '4th Week'].reduce((a, w) => a + (deptWiseData[w][dept] || 0), 0), 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Item Type Wise Table */}
          <div className="space-y-3">
            <div className="bg-[#f97316]/5 px-4 py-2 rounded-lg text-center">
              <span className="text-[11px] font-black text-[#f97316] uppercase tracking-widest">ITEM TYPE WISE RECEIVED HISTORY</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px] border border-gray-200">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="px-4 py-3 border-r border-gray-200">ITEM TYPE</th>
                    {allItemTypes.map(type => (
                      <th key={type} className="px-4 py-3 text-center border-r border-gray-200">{type}</th>
                    ))}
                    <th className="px-4 py-3 text-center">SUB-TOTAL</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-bold text-gray-600">
                  {['1st Week', '2nd Week', '3rd Week', '4th Week'].map(week => {
                    let rowTotal = 0;
                    return (
                      <tr key={week} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 border-r border-gray-200 bg-gray-50/30">{week}</td>
                        {allItemTypes.map(type => {
                          const val = typeWiseData[week][type] || 0;
                          rowTotal += val;
                          return (
                            <td key={type} className="px-1 py-1 text-center border-r border-gray-200">
                              <input 
                                type="text"
                                value={val === 0 ? '-' : val}
                                onChange={(e) => handleTypeValueChange(week, type, e.target.value)}
                                className="w-full bg-transparent text-center outline-none focus:bg-orange-50 py-2"
                              />
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center font-black text-[#f97316]">{rowTotal || '-'}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-50 font-black text-gray-800">
                    <td className="px-4 py-3 border-r border-gray-200">TOTAL</td>
                    {allItemTypes.map(type => {
                      const colTotal = ['1st Week', '2nd Week', '3rd Week', '4th Week'].reduce((acc, week) => acc + (typeWiseData[week][type] || 0), 0);
                      return <td key={type} className="px-4 py-3 text-center border-r border-gray-200">{colTotal || '-'}</td>;
                    })}
                    <td className="px-4 py-3 text-center text-[#f97316]">
                      {allItemTypes.reduce((acc, type) => acc + ['1st Week', '2nd Week', '3rd Week', '4th Week'].reduce((a, w) => a + (typeWiseData[w][type] || 0), 0), 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Section 2 - Charts */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-[#f8fafc] px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6]">
              <PieChartIcon size={18} />
            </div>
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-tight">
              DEPT WISE ITEM RECEIVED - {months[selectedMonth]}'{selectedYear}
            </h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bar & Line Chart */}
            <div className="h-[400px] bg-gray-50/50 rounded-xl p-4 border border-gray-100">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                  <Bar yAxisId="left" dataKey="prQty" name="PR Qty" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar yAxisId="left" dataKey="qty" name="Received Qty" fill="#2d808e" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line yAxisId="right" type="monotone" dataKey="amt" name="Received Amt" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart & Table */}
            <div className="flex flex-col space-y-6">
              <div className="h-[250px] bg-gray-50/50 rounded-xl p-4 border border-gray-100 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-gray-100">
                  <thead>
                    <tr className="bg-[#4472C4] text-[10px] font-black text-white uppercase tracking-wider border-b border-gray-200">
                      <th className="px-4 py-2 border-r border-white/20">Department</th>
                      <th className="px-4 py-2 text-center border-r border-white/20">Received_Items</th>
                      <th className="px-4 py-2 text-center border-r border-white/20">PR_Qty</th>
                      <th className="px-4 py-2 text-center border-r border-white/20">Received_Qty</th>
                      <th className="px-4 py-2 text-right">Received_Amt</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] font-bold text-gray-600">
                    {allDepartments.map(dept => (
                      <tr key={dept} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-1 uppercase border-r border-gray-100 bg-gray-50/30">{dept}</td>
                        <td className="px-1 py-1 text-center border-r border-gray-100">
                          <input 
                            type="text"
                            value={deptSummaryData[dept]?.items || 0}
                            onChange={(e) => handleSummaryValueChange(dept, 'items', e.target.value)}
                            className="w-full bg-transparent text-center outline-none focus:bg-blue-50 py-1"
                          />
                        </td>
                        <td className="px-1 py-1 text-center border-r border-gray-100">
                          <input 
                            type="text"
                            value={deptSummaryData[dept]?.prQty || 0}
                            onChange={(e) => handleSummaryValueChange(dept, 'prQty', e.target.value)}
                            className="w-full bg-transparent text-center outline-none focus:bg-blue-50 py-1"
                          />
                        </td>
                        <td className="px-1 py-1 text-center border-r border-gray-100">
                          <input 
                            type="text"
                            value={deptSummaryData[dept]?.qty || 0}
                            onChange={(e) => handleSummaryValueChange(dept, 'qty', e.target.value)}
                            className="w-full bg-transparent text-center outline-none focus:bg-blue-50 py-1"
                          />
                        </td>
                        <td className="px-1 py-1 text-right border-gray-100">
                          <input 
                            type="text"
                            value={deptSummaryData[dept]?.amt || 0}
                            onChange={(e) => handleSummaryValueChange(dept, 'amt', e.target.value)}
                            className="w-full bg-transparent text-right outline-none focus:bg-blue-50 py-1 font-black"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#4472C4] font-black text-white">
                      <td className="px-4 py-2 uppercase border-r border-white/20">Grand Total</td>
                      <td className="px-4 py-2 text-center border-r border-white/20">
                        {allDepartments.reduce((acc, d) => acc + (deptSummaryData[d]?.items || 0), 0)}
                      </td>
                      <td className="px-4 py-2 text-center border-r border-white/20">
                        {allDepartments.reduce((acc, d) => acc + (deptSummaryData[d]?.prQty || 0), 0)}
                      </td>
                      <td className="px-4 py-2 text-center border-r border-white/20">
                        {allDepartments.reduce((acc, d) => acc + (deptSummaryData[d]?.qty || 0), 0)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {allDepartments.reduce((acc, d) => acc + (deptSummaryData[d]?.amt || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveReport;
