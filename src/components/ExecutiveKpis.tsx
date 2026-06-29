import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  FileCheck, 
  CheckCircle2, 
  Clock, 
  X, 
  AlertTriangle, 
  Calendar, 
  User, 
  ChevronRight,
  TrendingUp,
  Landmark,
  FileText
} from 'lucide-react';
import { BidPackage } from '../types';

interface ExecutiveKpisProps {
  packages: BidPackage[];
}

export const formatVN = (val: number): string => {
  if (val >= 1e9) {
    return (val / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tỷ';
  }
  if (val >= 1e6) {
    return (val / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' triệu';
  }
  return val.toLocaleString('vi-VN') + ' đ';
};

export default function ExecutiveKpis({ packages }: ExecutiveKpisProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalPackagesCount = packages.length;
  const completedPackages = packages.filter(p => p.status === 'Hoàn thành');
  const completedPackagesCount = completedPackages.length;
  const unfinishedPackages = packages.filter(p => p.status !== 'Hoàn thành');
  const unfinishedPackagesCount = unfinishedPackages.length;
  
  // Breakdown of completed packages by type
  const completedXayLap = completedPackages.filter(p => p.type === 'Xây lắp').length;
  const completedThietBi = completedPackages.filter(p => p.type === 'Thiết bị').length;
  const completedPhiTuVan = completedPackages.filter(p => p.type === 'Phi tư vấn').length;
  const completedTuVan = completedPackages.filter(p => p.type === 'Tư vấn').length;
  
  // Delayed unfinished packages (> 39 days)
  const delayedUnfinishedPackages = unfinishedPackages.filter(
    p => p.lcntDuration !== undefined && p.lcntDuration > 39
  );
  const delayedUnfinishedCount = delayedUnfinishedPackages.length;
  
  // Calculate total signed contract value based strictly on contractValue (Giá HĐ)
  const totalContractValue = packages.reduce((sum, pkg) => sum + (pkg.contractValue || 0), 0);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Packages */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng số gói thầu</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-bold text-slate-900">{totalPackagesCount} <span className="text-sm font-medium text-slate-500">gói thầu</span></h3>
            <p className="text-xs text-slate-400 mt-1">
              Được thống kê theo danh sách cột Tên gói thầu
            </p>
          </div>
        </div>

        {/* 2. Completed Packages */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã hoàn thành</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-bold text-emerald-600">{completedPackagesCount} <span className="text-sm font-medium text-emerald-500">gói thầu</span></h3>
            <p className="text-xs text-slate-400 mt-1">
              Các gói thầu đã có Nhà thầu trúng thầu
            </p>
            {/* Package types breakdown */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-slate-500 font-medium">
              <span>Xây lắp: <strong className="text-slate-700 font-bold">{completedXayLap}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Thiết bị: <strong className="text-slate-700 font-bold">{completedThietBi}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Phi tư vấn: <strong className="text-slate-700 font-bold">{completedPhiTuVan}</strong></span>
              {completedTuVan > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>Tư vấn: <strong className="text-slate-700 font-bold">{completedTuVan}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 3. Unfinished Packages */}
        <div 
          onClick={() => unfinishedPackagesCount > 0 && setIsModalOpen(true)}
          className={`bg-white p-5 rounded-2xl border transition duration-200 ${
            unfinishedPackagesCount > 0 
              ? 'cursor-pointer border-amber-200 bg-amber-50/5 hover:border-amber-400 hover:shadow-md hover:bg-amber-50/20 active:scale-[0.99]' 
              : 'border-slate-200 hover:shadow-md'
          }`}
          title={unfinishedPackagesCount > 0 ? "Nhấn để xem chi tiết các gói thầu chưa hoàn thành" : undefined}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chưa hoàn thành</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-bold text-amber-600">{unfinishedPackagesCount} <span className="text-sm font-medium text-amber-500">gói thầu</span></h3>
            {delayedUnfinishedCount > 0 ? (
              <div className="flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold w-fit animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                <span>Chậm tiến độ (&gt; 39 ngày): <strong className="text-rose-700 font-extrabold">{delayedUnfinishedCount}</strong></span>
                <ChevronRight className="w-3 h-3 text-rose-600 ml-0.5 shrink-0" />
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-semibold">
                Không có gói thầu nào chậm tiến độ (&gt; 39 ngày)
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1.5">
              Các gói thầu chưa điền Nhà thầu trúng thầu
            </p>
          </div>
        </div>

        {/* 4. Total Signed Contract Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Giá trị ký kết hợp đồng</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-bold text-indigo-900">{formatVN(totalContractValue)}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Tổng cộng tích lũy cột Giá HĐ (đồng)
            </p>
          </div>
        </div>
      </div>

      {/* Unfinished & Overdue Packages Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
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
              <div className="p-5 border-b border-slate-150 bg-amber-50/20 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-800 text-base md:text-lg">
                      Danh sách gói thầu chưa hoàn thành
                    </h3>
                    <p className="text-xs text-slate-500">
                      Hiện có <span className="font-semibold text-slate-700">{unfinishedPackagesCount} gói thầu</span> chưa hoàn thành. Phát hiện <span className="font-semibold text-rose-600">{delayedUnfinishedCount} gói thầu</span> chậm tiến độ LCNT (&gt; 39 ngày).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-150">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold text-slate-600">Mã gói thầu</th>
                        <th className="py-3 px-4 font-semibold text-slate-600">Tên gói thầu / Thực trạng</th>
                        <th className="py-3 px-4 font-semibold text-slate-600 text-center">Thời gian LCNT</th>
                        <th className="py-3 px-4 font-semibold text-slate-600">Phân loại</th>
                        <th className="py-3 px-4 font-semibold text-slate-600">Phân công thực hiện</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {[...unfinishedPackages]
                        .sort((a, b) => {
                          // Sort delayed packages to the top, then by duration descending
                          const aDel = (a.lcntDuration !== undefined && a.lcntDuration > 39) ? 1 : 0;
                          const bDel = (b.lcntDuration !== undefined && b.lcntDuration > 39) ? 1 : 0;
                          if (bDel !== aDel) return bDel - aDel;
                          return (b.lcntDuration ?? 0) - (a.lcntDuration ?? 0);
                        })
                        .map((pkg) => {
                          const isPkgDelayed = pkg.lcntDuration !== undefined && pkg.lcntDuration > 39;
                          return (
                            <tr key={pkg.id} className={`hover:bg-slate-50/50 transition-colors ${isPkgDelayed ? 'bg-rose-50/10' : ''}`}>
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
                                  <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    {pkg.status}
                                  </span>
                                </div>
                              </td>

                              {/* LCNT Duration */}
                              <td className="py-3.5 px-4 text-center align-top">
                                {pkg.lcntDuration !== undefined ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded-full border ${
                                      isPkgDelayed 
                                        ? 'bg-rose-50 text-rose-700 border-rose-150 animate-pulse' 
                                        : 'bg-slate-50 text-slate-700 border-slate-200'
                                    }`}>
                                      {pkg.lcntDuration} ngày
                                    </span>
                                    {isPkgDelayed && (
                                      <span className="text-[9px] text-rose-500 font-bold mt-1 uppercase tracking-wider bg-rose-100/50 px-1 py-0.5 rounded">
                                        Chậm tiến độ
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Chưa tính được</span>
                                )}
                              </td>

                              {/* Classification */}
                              <td className="py-3.5 px-4 align-top">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-700 text-xs">{pkg.type}</span>
                                  {pkg.selectionMethod && (
                                    <span className="text-[10px] text-slate-400 mt-0.5">
                                      Hình thức: {pkg.selectionMethod}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Department */}
                              <td className="py-3.5 px-4 align-top">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-700 text-xs">
                                    {pkg.department || 'Chưa phân công'}
                                  </span>
                                  {pkg.manager && (
                                    <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5">
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
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

