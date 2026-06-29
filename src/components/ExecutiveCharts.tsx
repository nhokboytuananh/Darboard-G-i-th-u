import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from 'recharts';
import { BidPackage, PackageType } from '../types';
import { Clock, AlertTriangle, Calendar, TrendingUp, X, ExternalLink, Award, FileText, Landmark, User } from 'lucide-react';

interface ExecutiveChartsProps {
  packages: BidPackage[];
}

export default function ExecutiveCharts({ packages }: ExecutiveChartsProps) {
  const [selectedCell, setSelectedCell] = useState<{
    quarter: string;
    type: PackageType;
    packages: BidPackage[];
    median: number;
  } | null>(null);

  // Helper to format currency
  const formatVND = (value?: number) => {
    if (value === undefined || value === null) return '—';
    if (value >= 1e9) {
      return `${(value / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
    }
    if (value >= 1e6) {
      return `${(value / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`;
    }
    return `${value.toLocaleString('vi-VN')} đ`;
  };

  // 1. Data for Package Count by Type
  const types = ['Xây lắp', 'Thiết bị', 'Tư vấn', 'Phi tư vấn'];
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']; // Emerald, Blue, Amber, Purple

  const typeData = types.map((type) => {
    const matched = packages.filter((p) => p.type === type);
    return {
      name: type,
      'Số lượng': matched.length,
    };
  }).filter((d) => d['Số lượng'] > 0);

  // 2. Data for Completion Status
  const completedCount = packages.filter((p) => p.status === 'Hoàn thành').length;
  const unfinishedCount = packages.length - completedCount;

  const completionData = [
    { name: 'Đã hoàn thành', value: completedCount, color: '#10b981' }, // Emerald
    { name: 'Chưa hoàn thành', value: unfinishedCount, color: '#f59e0b' }, // Amber
  ].filter(d => d.value > 0);

  // 3. Data for Contract Value (Giá HĐ) of top packages
  const topPackages = [...packages]
    .filter(p => p.contractValue && p.contractValue > 0)
    .sort((a, b) => (b.contractValue || 0) - (a.contractValue || 0))
    .slice(0, 6)
    .map((p) => {
      return {
        id: p.id,
        name: p.name.length > 25 ? p.name.substring(0, 22) + '...' : p.name,
        'Giá trị hợp đồng': Math.round((p.contractValue || 0) / 1e9 * 10) / 10, // Convert to billions
      };
    });

  // --- BEGIN LCNT MEDIAN CALCULATION ---
  const typeOrderList: PackageType[] = ['Xây lắp', 'Thiết bị', 'Tư vấn', 'Phi tư vấn'];
  
  // Helper to resolve quarter group label based on approvalDate
  const getQuarterGroup = (pkg: BidPackage): string => {
    if (!pkg.approvalDate || pkg.approvalDate.trim() === '') {
      return 'Đang thực hiện';
    }

    const dateStr = pkg.approvalDate.trim();
    let month = -1;
    let year = -1;

    // Check if it is a pure numeric Excel serial date
    const numericVal = parseInt(dateStr, 10);
    if (!isNaN(numericVal) && !dateStr.includes('/') && !dateStr.includes('-') && !dateStr.includes('.')) {
      if (numericVal >= 35000 && numericVal <= 60000) {
        const jsDate = new Date((numericVal - 25569) * 86400 * 1000);
        month = jsDate.getMonth() + 1;
        year = jsDate.getFullYear();
      }
    } else {
      let separator = '';
      if (dateStr.includes('/')) separator = '/';
      else if (dateStr.includes('-')) separator = '-';
      else if (dateStr.includes('.')) separator = '.';

      if (separator) {
        const parts = dateStr.split(separator).map(p => p.trim());
        if (parts.length >= 3) {
          if (parts[0].length === 4) { // YYYY-MM-DD
            month = parseInt(parts[1], 10);
            year = parseInt(parts[0], 10);
          } else { // DD-MM-YYYY or MM-DD-YYYY
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
          }
        }
      }
    }

    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return 'Đang thực hiện';
    }

    if (year < 100 && year >= 0) {
      year += 2000;
    }

    if (year < 1000) {
      return 'Đang thực hiện';
    }

    const quarter = Math.ceil(month / 3);
    return `Quý ${quarter}/${year}`;
  };

  // Get unique quarters with actual packages (excluding 'Đang thực hiện' which are packages without LCNT results yet)
  const uniqueQuarters = Array.from(new Set(packages.map(p => getQuarterGroup(p)))).filter(q => q !== 'Đang thực hiện');
  
  // Sort quarters
  const quartersSorted = uniqueQuarters.sort((a, b) => {
    const parseKey = (k: string) => {
      const match = k.match(/Quý\s+(\d+)\/(\d+)/);
      if (!match) return { q: 0, y: 0 };
      return { q: parseInt(match[1], 10), y: parseInt(match[2], 10) };
    };

    const pa = parseKey(a);
    const pb = parseKey(b);

    if (pa.y !== pb.y) {
      return pa.y - pb.y;
    }
    return pa.q - pb.q;
  });

  // Calculate statistics: median LCNT per quarter per type
  const quarterTypeValues: {
    [quarter: string]: {
      [type in PackageType]: number[]
    }
  } = {};

  quartersSorted.forEach((q) => {
    quarterTypeValues[q] = {
      'Xây lắp': [],
      'Thiết bị': [],
      'Tư vấn': [],
      'Phi tư vấn': [],
    };
  });

  packages.forEach((pkg) => {
    const q = getQuarterGroup(pkg);
    const t = pkg.type || 'Xây lắp';
    if (pkg.lcntDuration !== undefined && typeof pkg.lcntDuration === 'number' && !isNaN(pkg.lcntDuration) && pkg.lcntDuration > 0 && pkg.lcntDuration < 1000) {
      if (quarterTypeValues[q] && quarterTypeValues[q][t]) {
        quarterTypeValues[q][t].push(pkg.lcntDuration);
      }
    }
  });

  // Helper to compute median
  const calculateMedian = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[mid];
    }
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  };

  const quarterTypeStats: {
    [quarter: string]: {
      [type in PackageType]: { median: number; count: number }
    }
  } = {};

  quartersSorted.forEach((q) => {
    quarterTypeStats[q] = {
      'Xây lắp': { median: 0, count: 0 },
      'Thiết bị': { median: 0, count: 0 },
      'Tư vấn': { median: 0, count: 0 },
      'Phi tư vấn': { median: 0, count: 0 },
    };
    
    typeOrderList.forEach((t) => {
      const vals = quarterTypeValues[q][t];
      if (vals.length > 0) {
        quarterTypeStats[q][t] = {
          median: calculateMedian(vals),
          count: vals.length,
        };
      }
    });
  });

  // Prepare Recharts data for LCNT median comparison chart
  const lcntChartData = quartersSorted.map((q) => {
    const item: any = { name: q };
    typeOrderList.forEach((t) => {
      const stat = quarterTypeStats[q][t];
      if (stat.count > 0) {
        item[t] = stat.median;
      }
    });
    return item;
  }).filter((item) => {
    return typeOrderList.some(t => item[t] !== undefined);
  });
  // --- END LCNT MEDIAN CALCULATION ---

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart 1: Số lượng gói thầu theo loại công trình */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-display font-bold text-slate-800 text-sm md:text-base">
              Số lượng gói thầu theo loại công trình
            </h4>
            <p className="text-xs text-slate-400">Phân bố số lượng gói thầu chi tiết theo từng loại công trình</p>
          </div>
        </div>
        <div className="h-64 sm:h-72 w-full">
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                  contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none', zIndex: 50 }}
                  formatter={(val) => [`${val} gói thầu`, 'Số lượng']}
                />
                <Bar dataKey="Số lượng" radius={[4, 4, 0, 0]} barSize={24}>
                  {typeData.map((entry, index) => {
                    const tIdx = types.indexOf(entry.name);
                    return <Cell key={`cell-${index}`} fill={colors[tIdx > -1 ? tIdx : 0]} />;
                  })}
                  <LabelList 
                    dataKey="Số lượng" 
                    position="top" 
                    style={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} 
                    offset={8} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
              Không có dữ liệu loại công trình
            </div>
          )}
        </div>
      </div>

      {/* Chart 2: Cơ cấu hoàn thành */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <h4 className="font-display font-bold text-slate-800 text-sm md:text-base mb-1">
            Tỷ lệ hoàn thành gói thầu
          </h4>
          <p className="text-xs text-slate-400">Dựa trên việc xác định nhà thầu trúng tuyển</p>
        </div>
        <div className="h-44 sm:h-48 my-2 flex items-center justify-center">
          {completionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {completionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none' }}
                  formatter={(val) => [`${val} gói thầu`, 'Số lượng']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-slate-400 italic">Không có dữ liệu gói thầu</div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {completionData.map((data) => (
            <div key={data.name} className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-100 rounded-lg">
              <span 
                className="w-2.5 h-2.5 rounded-full shrink-0" 
                style={{ backgroundColor: data.color }}
              ></span>
              <div className="truncate">
                <span className="font-medium text-slate-700 block truncate">{data.name}</span>
                <span className="text-[10px] text-slate-500 font-bold block">{data.value} gói thầu</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NEW: LCNT MEDIAN DURATION BY QUARTER & TYPE */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-3 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display font-bold text-slate-800 text-sm md:text-base">
                Thời gian lựa chọn nhà thầu (LCNT) trung vị theo Quý
              </h4>
              <p className="text-xs text-slate-400">
                Phân tích số ngày LCNT trung vị của từng loại gói thầu qua các quý (Cảnh báo khi vượt quá mốc 40 ngày)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column: Data Grid Matrix */}
          <div className="xl:col-span-2 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 px-3 font-semibold text-slate-700">Mốc thời gian / Quý</th>
                  <th className="py-2.5 px-3 font-semibold text-emerald-700">Xây lắp</th>
                  <th className="py-2.5 px-3 font-semibold text-blue-700">Thiết bị</th>
                  <th className="py-2.5 px-3 font-semibold text-amber-700">Tư vấn</th>
                  <th className="py-2.5 px-3 font-semibold text-purple-700">Phi tư vấn (PTV)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quartersSorted.map((q) => {
                  const hasValues = typeOrderList.some(t => quarterTypeStats[q]?.[t]?.count > 0);
                  if (!hasValues) return null;

                  return (
                    <tr key={q} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {q}
                      </td>
                      {typeOrderList.map((t) => {
                        const stat = quarterTypeStats[q]?.[t];
                        const isDelayed = stat && stat.count > 0 && stat.median > 40;

                        return (
                          <td 
                            key={t} 
                            className={`py-3 px-3 transition-all relative ${
                              stat && stat.count > 0 
                                ? 'cursor-pointer group hover:bg-slate-100/80 active:bg-slate-200/50' 
                                : ''
                            }`}
                            onClick={() => {
                              if (stat && stat.count > 0) {
                                const matching = packages.filter((pkg) => {
                                  const pq = getQuarterGroup(pkg);
                                  const pt = pkg.type || 'Xây lắp';
                                  const hasLcnt = pkg.lcntDuration !== undefined && typeof pkg.lcntDuration === 'number' && !isNaN(pkg.lcntDuration) && pkg.lcntDuration > 0 && pkg.lcntDuration < 1000;
                                  return pq === q && pt === t && hasLcnt;
                                });
                                setSelectedCell({
                                  quarter: q,
                                  type: t,
                                  packages: matching,
                                  median: stat.median
                                });
                              }
                            }}
                            title={stat && stat.count > 0 ? `Nhấp để xem chi tiết ${stat.count} gói thầu` : ''}
                          >
                            {stat && stat.count > 0 ? (
                              <div className="flex flex-col">
                                <span className={`font-mono text-sm font-bold flex items-center gap-1 group-hover:underline group-hover:text-indigo-600 ${
                                  isDelayed ? 'text-rose-600' : 'text-slate-800'
                                }`}>
                                  {stat.median} ngày
                                  {isDelayed && (
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium group-hover:text-indigo-500 transition-colors">
                                  {stat.count} gói thầu
                                </span>
                                {isDelayed && (
                                  <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100 w-fit animate-pulse">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Chậm
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 italic">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right Column: Mini Bar Chart Visualizer */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between h-64 xl:h-auto">
            <div>
              <h5 className="font-semibold text-xs text-slate-700 mb-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                Biểu đồ So sánh Tiến độ LCNT (Trung vị)
              </h5>
              <p className="text-[10px] text-slate-400 mb-3">Số ngày trung vị LCNT (Thấp hơn là nhanh hơn)</p>
            </div>
            <div className="h-44 w-full">
              {lcntChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lcntChartData} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 9 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                      contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '10px', zIndex: 50 }}
                      formatter={(val) => [`${val} ngày`, 'Thời gian LCNT (Trung vị)']}
                    />
                    <Bar dataKey="Xây lắp" fill="#10b981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Thiết bị" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Tư vấn" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Phi tư vấn" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic">
                  Không đủ dữ liệu thời gian LCNT để vẽ biểu đồ
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCell(null)}
              className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden z-10"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-150 bg-slate-50/50 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-800 text-base md:text-lg">
                      Danh sách gói thầu: {selectedCell.type}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Thời gian phê duyệt kết quả lựa chọn nhà thầu thuộc <span className="font-semibold text-slate-700">{selectedCell.quarter}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Summary Panel */}
              <div className="px-5 py-3.5 bg-indigo-50/30 border-b border-indigo-50/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tổng số gói thầu</span>
                  <span className="text-lg font-bold text-indigo-700">{selectedCell.packages.length} gói thầu</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Thời gian LCNT trung vị</span>
                  <span className={`text-lg font-bold ${selectedCell.median > 40 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {selectedCell.median} ngày
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end">
                  {selectedCell.median > 40 ? (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl text-rose-700 text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 animate-pulse" />
                      <div>
                        <span className="font-bold block">Thời gian vượt hạn định (&gt;40 ngày)</span>
                        <span className="text-[10px] text-rose-600">Trung vị lựa chọn nhà thầu của nhóm này đang bị kéo dài.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl text-emerald-700 text-xs">
                      <Award className="w-4 h-4 shrink-0 text-emerald-500" />
                      <div>
                        <span className="font-bold block">Đạt hạn định tiến độ</span>
                        <span className="text-[10px] text-emerald-600">Thời gian trung vị đáp ứng tốt mục tiêu chung.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Package Table Area */}
              <div className="flex-1 overflow-y-auto p-5">
                {selectedCell.packages.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 italic text-sm">
                    Không tìm thấy dữ liệu gói thầu nào thuộc nhóm này.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-150 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-semibold">
                          <th className="py-3 px-4 w-32">Mã gói thầu</th>
                          <th className="py-3 px-4">Tên gói thầu / Thực trạng</th>
                          <th className="py-3 px-4 w-28 text-center">Thời gian LCNT</th>
                          <th className="py-3 px-4 w-40">Nhà thầu / Giá trị</th>
                          <th className="py-3 px-4 w-36 text-center">Phân công th/h</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {[...selectedCell.packages]
                          .sort((a, b) => {
                            const aVal = a.lcntDuration ?? 0;
                            const bVal = b.lcntDuration ?? 0;
                            return aVal - bVal;
                          })
                          .map((pkg) => {
                          const isPkgDelayed = pkg.lcntDuration !== undefined && pkg.lcntDuration > 40;
                          return (
                            <tr key={pkg.id} className="hover:bg-slate-50/50 transition-colors">
                              {/* ID */}
                              <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 align-top">
                                {pkg.id}
                              </td>

                              {/* Name / Actual Status */}
                              <td className="py-3.5 px-4 align-top space-y-1">
                                <div className="font-medium text-slate-800 text-xs md:text-sm leading-relaxed max-w-md">
                                  {pkg.name}
                                </div>
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  {pkg.approvalDate && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                      <Calendar className="w-3 h-3" /> QĐ ngày: {pkg.approvalDate}
                                    </span>
                                  )}
                                  {pkg.actualStatus && (
                                    <span className="inline-flex items-center text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded italic">
                                      {pkg.actualStatus}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* LCNT Duration */}
                              <td className="py-3.5 px-4 text-center align-top">
                                {pkg.lcntDuration !== undefined ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded-full ${
                                      isPkgDelayed 
                                        ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse' 
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    }`}>
                                      {pkg.lcntDuration} ngày
                                    </span>
                                    {isPkgDelayed && (
                                      <div className="flex flex-col items-center mt-1 gap-0.5">
                                        <span className="px-1 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-bold rounded uppercase tracking-wider">
                                          Chậm tiến độ
                                        </span>
                                        <span className="text-[9px] text-rose-500 font-semibold">
                                          Trễ hạn (+{pkg.lcntDuration - 40}n)
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 italic">—</span>
                                )}
                              </td>

                              {/* Contractor & Value */}
                              <td className="py-3.5 px-4 align-top space-y-1">
                                <div className="text-slate-700 flex items-start gap-1">
                                  <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                  <span className="break-words whitespace-normal max-w-[180px] font-medium" title={pkg.contractor || 'Chưa có nhà thầu'}>
                                    {pkg.contractor || 'Chưa có'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  <span>Hợp đồng: <strong className="text-slate-600">{formatVND(pkg.contractValue)}</strong></span>
                                </div>
                              </td>

                              {/* Department (Phân công thực hiện) */}
                              <td className="py-3.5 px-4 text-center align-top">
                                <div className="flex flex-col items-center justify-center">
                                  <span className="font-semibold text-slate-700 text-xs">
                                    {pkg.department || 'Chưa phân công'}
                                  </span>
                                  {pkg.manager && (
                                    <span className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-center gap-0.5">
                                      <User className="w-3 h-3 text-slate-400" /> {pkg.manager}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end">
                <button
                  onClick={() => setSelectedCell(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-800 border border-slate-200 rounded-xl font-medium text-xs shadow-xs transition-colors"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

