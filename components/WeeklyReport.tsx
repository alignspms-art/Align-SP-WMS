
import React, { useState } from 'react';
import { Download, Loader2, BarChart3, RefreshCw, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import pptxgen from "pptxgenjs";

const WeeklyReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const months = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const handleDownloadPPT = async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth + 1, 1).toISOString();

      // Fetch all necessary data for the report
      const [issueRes, receiveRes, itemsRes] = await Promise.all([
        supabase.from('transactions')
          .select('*')
          .eq('type', 'Issue')
          .gte('created_at', startDate)
          .lt('created_at', endDate),
        supabase.from('transactions')
          .select('*')
          .eq('type', 'Receive')
          .gte('created_at', startDate)
          .lt('created_at', endDate),
        supabase.from('items').select('sku, name, type, last_price, avg_price')
      ]);

      if (issueRes.error) throw issueRes.error;
      if (receiveRes.error) throw receiveRes.error;

      const issueData = issueRes.data || [];
      const receiveData = receiveRes.data || [];
      const itemMap = (itemsRes.data || []).reduce((acc: any, item: any) => {
        acc[item.sku] = item;
        return acc;
      }, {});

      const pres = new pptxgen();
      pres.layout = 'LAYOUT_WIDE';
      const monthName = months[selectedMonth];
      const yearStr = selectedYear.toString();

      // --- Slide 1: Executive Dashboard (The "1 Page" Report) ---
      const slide1 = pres.addSlide();
      slide1.addText(`WEEKLY ISSUE & RECEIVE ANALYSIS - ${monthName} ${yearStr}`, {
        x: 0.5, y: 0.2, w: 12, fontSize: 24, bold: true, color: '2D808E', align: 'center'
      });
      slide1.addText('MAHEEN LABEL TEX LTD.', { x: 10.5, y: 0.2, w: 2.5, fontSize: 10, bold: true, color: '5E718D', align: 'right' });

      // Prepare Consolidated Data
      const deptStats: Record<string, { issueQty: number, issueAmt: number, receiveQty: number, receiveAmt: number }> = {};
      
      issueData.forEach(tnx => {
        const dept = tnx.department || 'OTHERS';
        if (!deptStats[dept]) deptStats[dept] = { issueQty: 0, issueAmt: 0, receiveQty: 0, receiveAmt: 0 };
        const item = itemMap[tnx.item_sku] || {};
        const qty = Number(tnx.quantity) || 0;
        const price = Number(item.last_price) || 0;
        deptStats[dept].issueQty += qty;
        deptStats[dept].issueAmt += (qty * price);
      });

      receiveData.forEach(tnx => {
        const dept = tnx.department || 'OTHERS';
        if (!deptStats[dept]) deptStats[dept] = { issueQty: 0, issueAmt: 0, receiveQty: 0, receiveAmt: 0 };
        const item = itemMap[tnx.item_sku] || {};
        const qty = Number(tnx.quantity) || 0;
        const price = Number(item.last_price) || 0;
        deptStats[dept].receiveQty += qty;
        deptStats[dept].receiveAmt += (qty * price);
      });

      const activeDepts = Object.keys(deptStats).filter(d => 
        deptStats[d].issueQty > 0 || deptStats[d].receiveQty > 0
      ).sort();

      // 1. Bar Chart: Issue vs Receive Quantity
      slide1.addChart(pres.ChartType.bar, [
        {
          name: 'Issue Qty',
          labels: activeDepts,
          values: activeDepts.map(d => deptStats[d].issueQty)
        },
        {
          name: 'Receive Qty',
          labels: activeDepts,
          values: activeDepts.map(d => deptStats[d].receiveQty)
        }
      ], { 
        x: 0.5, y: 0.8, w: 6.2, h: 3.2, 
        showLegend: true, legendPos: 't', 
        title: 'Issue vs Receive Quantity',
        showValue: true,
        barGapWidthPct: 20,
        chartColors: ['2D808E', 'F97316'],
        valAxisMaxVal: Math.max(...activeDepts.map(d => Math.max(deptStats[d].issueQty, deptStats[d].receiveQty))) * 1.2
      });

      // 2. Pie Chart: Issue Amount Distribution
      const pieData = activeDepts.filter(d => deptStats[d].issueAmt > 0);
      if (pieData.length > 0) {
        slide1.addChart(pres.ChartType.pie, [
          {
            name: 'Issue Amount',
            labels: pieData,
            values: pieData.map(d => deptStats[d].issueAmt)
          }
        ], { 
          x: 7.0, y: 0.8, w: 5.8, h: 3.2, 
          showLegend: true, legendPos: 'r',
          showPercent: true,
          holeSize: 45,
          title: 'Issue Amount Distribution (%)',
          chartColors: ['2D808E', 'F97316', '3B82F6', '10B981', '8B5CF6', 'EC4899', 'F59E0B', '64748B']
        });
      }

      // 3. Summary Table
      const tableHeader = ['Department', 'Issue Qty', 'Issue Amt (BDT)', 'Receive Qty', 'Receive Amt (BDT)'];
      const tableRows = activeDepts.map(d => [
        d,
        deptStats[d].issueQty.toLocaleString(),
        deptStats[d].issueAmt.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        deptStats[d].receiveQty.toLocaleString(),
        deptStats[d].receiveAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })
      ]);

      // Grand Total Row
      const totals = activeDepts.reduce((acc, d) => ({
        iq: acc.iq + deptStats[d].issueQty,
        ia: acc.ia + deptStats[d].issueAmt,
        rq: acc.rq + deptStats[d].receiveQty,
        ra: acc.ra + deptStats[d].receiveAmt
      }), { iq: 0, ia: 0, rq: 0, ra: 0 });

      tableRows.push([
        'GRAND TOTAL',
        totals.iq.toLocaleString(),
        totals.ia.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        totals.rq.toLocaleString(),
        totals.ra.toLocaleString(undefined, { minimumFractionDigits: 2 })
      ]);

      slide1.addTable([
        tableHeader.map(h => ({ text: h, options: { fill: '2D808E', color: 'FFFFFF', bold: true, align: 'center' as const, fontSize: 11 } })),
        ...tableRows.map((r, i) => r.map(c => ({ 
          text: c, 
          options: { 
            fill: i === tableRows.length - 1 ? 'F1F5F9' : undefined,
            bold: i === tableRows.length - 1,
            align: (i === tableRows.length - 1 || r.indexOf(c) > 0 ? 'center' : 'left') as any,
            color: i === tableRows.length - 1 ? '2D808E' : '334155',
            fontSize: i === tableRows.length - 1 ? 11 : 10
          } 
        })))
      ], { x: 0.5, y: 4.2, w: 12.3, border: { pt: 0.5, color: 'E2E8F0' } });

      pres.writeFile({ fileName: `Weekly_GM_Report_${monthName}_${yearStr}.pptx` });
    } catch (err) {
      console.error('Error generating PPT:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#2d808e]/10 rounded-lg">
            <BarChart3 className="text-[#2d808e]" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Weekly Issue & Receive Report</h1>
            <p className="text-sm text-gray-500">Generate executive PPT reports for General Manager</p>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="p-2 text-gray-400 hover:text-[#2d808e] transition-colors"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <div className="max-w-md mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 bg-[#2d808e]/5 rounded-full mb-4">
              <Calendar className="text-[#2d808e]" size={48} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Select Reporting Period</h2>
            <p className="text-sm text-gray-500">Choose the month and year for the weekly analysis</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Month</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#2d808e] outline-none font-medium text-gray-700"
              >
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Year</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#2d808e] outline-none font-medium text-gray-700"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleDownloadPPT}
            disabled={loading}
            className="w-full py-4 bg-[#2d808e] text-white rounded-xl font-bold shadow-lg shadow-[#2d808e]/20 hover:bg-[#256b78] transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Preparing Report...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>Download GM PPT Report</span>
              </>
            )}
          </button>

          <div className="pt-6 border-t border-gray-50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Report Contents</h3>
            <ul className="space-y-3">
              {[
                "Executive Summary of Issues & Receipts",
                "Department-wise Valuation Analysis",
                "Detailed Transaction Log with Item Pricing",
                "Professional GM-ready Presentation Layout"
              ].map((item, i) => (
                <li key={i} className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2d808e]"></div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReport;
