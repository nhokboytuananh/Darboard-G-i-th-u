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
  XCircle,
  Search,
  Award,
  FileText
} from 'lucide-react';
import { BidPackage, isPackageCancelled } from '../types';

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

export type ModalTabType = 'unfinished' | 'completed' | 'cancelled' | 'all';

export default function ExecutiveKpis({ packages }: ExecutiveKpisProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTabType>('unfinished');
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  const totalPackagesCount = packages.length;
  
  // Categorization
  const cancelledPackages = packages.filter(isPackageCancelled);
  const cancelledCount = cancelledPackages.length;

  const completedPackages = packages.filter(p => p.status === 'Hoàn thành' && !isPackageCancelled(p));
  const completedPackagesCount = completedPackages.length;

  const unfinishedPackages = packages.filter(p => p.status !== 'Hoàn thành' && !isPackageCancelled(p));
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

  const openModalWithTab = (tab: ModalTabType) => {
    setModalTab(tab);
    setModalSearchQuery('');
    setIsModalOpen(true);
  };

  // Determine current active list for modal
  const getActiveList = () => {
    switch (modalTab) {
      case 'completed':
        return completedPackages;
      case 'cancelled':
        return cancelledPackages;
      case 'unfinished':
        return unfinishedPackages;
      case 'all':
      default:
        return packages;
    }
  };

  const rawActiveList = getActiveList();
  
  // Filter inside modal by search query
  const filteredModalList = rawActiveList.filter(pkg => {
    if (!modalSearchQuery.trim()) return true;
    const q = modalSearchQuery.toLowerCase().trim();
    return (
      pkg.id.toLowerCase().includes(q) ||
      pkg.name.toLowerCase().includes(q) ||
      (pkg.contractor || '').toLowerCase().includes(q) ||
      pkg.manager.toLowerCase().includes(q) ||
      (pkg.actualStatus || '').toLowerCase().includes(q) ||
      (pkg.notes || '').toLowerCase().includes(q)
    );
  });

  // Sort inside modal list: calculated LCNT duration descending (largest on top), uncalculated at bottom
  const sortedModalList = [...filteredModalList].sort((a, b) => {
    const aHas = a.lcntDuration !== undefined && a.lcntDuration !== null && !isNaN(a.lcntDuration);
    const bHas = b.lcntDuration !== undefined && b.lcntDuration !== null && !isNaN(b.lcntDuration);
    if (aHas && bHas) return (b.lcntDuration!) - (a.lcntDuration!);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return 0;
  });

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Packages */}
        <div 
          onClick={() => openModalWithTab('all')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition duration-200 cursor-pointer group"
          title="Nhấn để xem toàn bộ danh sách gói thầu"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng số gói thầu</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
              <Layers className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-display font-bold text-slate-900">{totalPackagesCount} <span className="text-sm font-medium text-slate-500">gói thầu</span></h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Tất cả danh mục gói thầu</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </p>
          </div>
        </div>

        {/* 2. Completed Packages */}
        <div 
          onClick={() => openModalWithTab('completed')}
          className="bg-white p-4.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/5 hover:border-emerald-400 hover:shadow-md transition duration-200 cursor-pointer group"
          title="Nhấn để xem chi tiết các gói thầu đã hoàn thành"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã hoàn thành</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-display font-bold text-emerald-600">{completedPackagesCount} <span className="text-sm font-medium text-emerald-500">gói thầu</span></h3>
            <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[10px] text-slate-500 font-medium">
              <span>XL: <strong className="text-slate-700 font-bold">{completedXayLap}</strong></span>
              <span className="text-slate-300">|</span>
              <span>TB: <strong className="text-slate-700 font-bold">{completedThietBi}</strong></span>
              <span className="text-slate-300">|</span>
              <span>PTV: <strong className="text-slate-700 font-bold">{completedPhiTuVan}</strong></span>
              {completedTuVan > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>TV: <strong className="text-slate-700 font-bold">{completedTuVan}</strong></span>
                </>
              )}
            </div>
            <p className="text-[10px] text-emerald-600/80 font-medium mt-1 flex items-center justify-between">
              <span>Nhấn xem chi tiết danh sách</span>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </div>

        {/* 3. Unfinished Packages */}
        <div 
          onClick={() => openModalWithTab('unfinished')}
          className="bg-white p-4.5 rounded-2xl border border-amber-200/80 bg-amber-50/5 hover:border-amber-400 hover:shadow-md hover:bg-amber-50/20 transition duration-200 cursor-pointer group"
          title="Nhấn để xem chi tiết các gói thầu chưa hoàn thành"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chưa hoàn thành</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center transition-colors">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-display font-bold text-amber-600">{unfinishedPackagesCount} <span className="text-sm font-medium text-amber-500">gói thầu</span></h3>
            {delayedUnfinishedCount > 0 ? (
              <div className="flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-[9px] font-bold w-fit animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                <span>Chậm tiến độ (&gt; 39 ngày): <strong className="text-rose-700 font-extrabold">{delayedUnfinishedCount}</strong></span>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 mt-1 font-medium">
                Đang tiến hành LCNT
              </div>
            )}
            <p className="text-[10px] text-amber-600/80 font-medium mt-1.5 flex items-center justify-between">
              <span>Nhấn xem chi tiết danh sách</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </div>

        {/* 4. Cancelled Packages */}
        <div 
          onClick={() => openModalWithTab('cancelled')}
          className="bg-white p-4.5 rounded-2xl border border-rose-200/80 bg-rose-50/5 hover:border-rose-400 hover:shadow-md transition duration-200 cursor-pointer group"
          title="Nhấn để xem các gói thầu đã hủy thầu"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã hủy thầu</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center transition-colors">
              <XCircle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-display font-bold text-rose-600">{cancelledCount} <span className="text-sm font-medium text-rose-500">gói thầu</span></h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Gói thầu hủy/dừng thực hiện
            </p>
            <p className="text-[10px] text-rose-600/80 font-medium mt-1.5 flex items-center justify-between">
              <span>Nhấn xem danh sách chi tiết</span>
              <ChevronRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </div>

        {/* 5. Total Signed Contract Value */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Giá trị ký kết HĐ</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-display font-bold text-indigo-900 leading-tight">{formatVN(totalContractValue)}</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Tích lũy tổng cột Giá HĐ
            </p>
          </div>
        </div>
      </div>

      {/* Package List Detail Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden z-10"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    modalTab === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                    modalTab === 'cancelled' ? 'bg-rose-50 text-rose-600' :
                    modalTab === 'unfinished' ? 'bg-amber-50 text-amber-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {modalTab === 'completed' && <CheckCircle2 className="w-5 h-5" />}
                    {modalTab === 'cancelled' && <XCircle className="w-5 h-5" />}
                    {modalTab === 'unfinished' && <Clock className="w-5 h-5" />}
                    {modalTab === 'all' && <Layers className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-800 text-base sm:text-lg">
                      {modalTab === 'completed' && 'Danh sách gói thầu đã hoàn thành'}
                      {modalTab === 'cancelled' && 'Danh sách gói thầu đã hủy thầu'}
                      {modalTab === 'unfinished' && 'Danh sách gói thầu chưa hoàn thành'}
                      {modalTab === 'all' && 'Toàn bộ danh sách gói thầu'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hiển thị <span className="font-bold text-slate-700">{filteredModalList.length}</span> / {rawActiveList.length} gói thầu trong mục này
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="self-end sm:self-center p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs & Search Subheader */}
              <div className="px-4 py-3 bg-white border-b border-slate-150 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Category Filter Tabs */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto text-xs font-semibold text-slate-600">
                  <button
                    onClick={() => setModalTab('unfinished')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      modalTab === 'unfinished' 
                        ? 'bg-amber-500 text-white shadow-xs font-bold' 
                        : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span>⏳ Chưa hoàn thành</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${modalTab === 'unfinished' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {unfinishedPackagesCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setModalTab('completed')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      modalTab === 'completed' 
                        ? 'bg-emerald-600 text-white shadow-xs font-bold' 
                        : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span>✅ Đã hoàn thành</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${modalTab === 'completed' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {completedPackagesCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setModalTab('cancelled')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      modalTab === 'cancelled' 
                        ? 'bg-rose-600 text-white shadow-xs font-bold' 
                        : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span>🚫 Đã hủy thầu</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${modalTab === 'cancelled' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {cancelledCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setModalTab('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      modalTab === 'all' 
                        ? 'bg-slate-800 text-white shadow-xs font-bold' 
                        : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span>📋 Tất cả</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${modalTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {totalPackagesCount}
                    </span>
                  </button>
                </div>

                {/* Instant Search Input */}
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã, tên, nhà thầu..."
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                  {modalSearchQuery && (
                    <button 
                      onClick={() => setModalSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Table Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {filteredModalList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm font-semibold text-slate-600">Không tìm thấy gói thầu phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold text-slate-700">Mã gói thầu</th>
                          <th className="py-3 px-4 font-semibold text-slate-700">Tên gói thầu / Trạng thái</th>
                          {modalTab === 'completed' && <th className="py-3 px-4 font-semibold text-slate-700">Nhà thầu trúng thầu / Giá HĐ</th>}
                          {modalTab === 'cancelled' && <th className="py-3 px-4 font-semibold text-slate-700">Lý do / Dự toán</th>}
                          {modalTab === 'unfinished' && <th className="py-3 px-4 font-semibold text-slate-700 text-center">Thời gian LCNT</th>}
                          {modalTab === 'all' && <th className="py-3 px-4 font-semibold text-slate-700">Thông tin trúng thầu / Giá HĐ</th>}
                          <th className="py-3 px-4 font-semibold text-slate-700">Phân loại</th>
                          <th className="py-3 px-4 font-semibold text-slate-700">Phân công thực hiện</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 bg-white">
                        {sortedModalList.map((pkg) => {
                          const isCancelled = isPackageCancelled(pkg);
                          const isDelayed = pkg.lcntDuration !== undefined && pkg.lcntDuration > 39 && !isCancelled;

                          return (
                            <tr 
                              key={pkg.id} 
                              className={`hover:bg-slate-50/80 transition-colors ${
                                isCancelled ? 'bg-rose-50/20' : isDelayed ? 'bg-rose-50/10' : ''
                              }`}
                            >
                              {/* ID */}
                              <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 align-top whitespace-nowrap">
                                {pkg.id}
                              </td>

                              {/* Name & Badges */}
                              <td className="py-3.5 px-4 align-top space-y-1 max-w-sm sm:max-w-md">
                                <div className="font-medium text-slate-800 text-xs sm:text-sm leading-relaxed">
                                  {pkg.name}
                                </div>
                                <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                                  {/* Status badge */}
                                  {isCancelled ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                      <XCircle className="w-3 h-3" /> Hủy thầu
                                    </span>
                                  ) : pkg.status === 'Hoàn thành' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3" /> Hoàn thành
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      {pkg.status}
                                    </span>
                                  )}

                                  {pkg.approvalDate && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                      <Calendar className="w-3 h-3 text-slate-400" /> QĐ: {pkg.approvalDate}
                                    </span>
                                  )}

                                  {pkg.contractDate && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                      <FileText className="w-3 h-3 text-slate-400" /> HĐ: {pkg.contractDate}
                                    </span>
                                  )}

                                  {pkg.actualStatus && !isCancelled && (
                                    <span className="inline-flex items-center text-[10px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded italic">
                                      {pkg.actualStatus}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Tab Specific Column */}
                              {modalTab === 'completed' && (
                                <td className="py-3.5 px-4 align-top">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-emerald-700 text-xs flex items-center gap-1">
                                      <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      {pkg.contractor || 'Đã phê duyệt KQ'}
                                    </span>
                                    {pkg.contractValue ? (
                                      <span className="text-xs font-bold text-slate-800 font-mono">
                                        Giá HĐ: {formatVN(pkg.contractValue)}
                                      </span>
                                    ) : pkg.budget ? (
                                      <span className="text-[10px] text-slate-400">
                                        Dự toán: {formatVN(pkg.budget)}
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                              )}

                              {modalTab === 'cancelled' && (
                                <td className="py-3.5 px-4 align-top">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-rose-700 text-xs">
                                      {pkg.actualStatus || 'Hủy thầu'}
                                    </span>
                                    {pkg.notes && (
                                      <span className="text-[10px] text-slate-500 italic max-w-xs">
                                        {pkg.notes}
                                      </span>
                                    )}
                                    {pkg.budget > 0 && (
                                      <span className="text-[10px] text-slate-400 mt-0.5">
                                        Dự toán: {formatVN(pkg.budget)}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}

                              {modalTab === 'unfinished' && (
                                <td className="py-3.5 px-4 text-center align-top whitespace-nowrap">
                                  {pkg.lcntDuration !== undefined ? (
                                    <div className="inline-flex flex-col items-center">
                                      <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full border ${
                                        isDelayed 
                                          ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse' 
                                          : 'bg-slate-100 text-slate-700 border-slate-200'
                                      }`}>
                                        {pkg.lcntDuration} ngày
                                      </span>
                                      {isDelayed && (
                                        <span className="text-[9px] text-rose-600 font-bold mt-1 uppercase tracking-wider bg-rose-100/80 px-1 py-0.2 rounded">
                                          Chậm tiến độ
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">Chưa tính được</span>
                                  )}
                                </td>
                              )}

                              {modalTab === 'all' && (
                                <td className="py-3.5 px-4 align-top">
                                  <div className="flex flex-col gap-0.5">
                                    {pkg.contractor ? (
                                      <span className="font-semibold text-emerald-700 text-xs">
                                        {pkg.contractor}
                                      </span>
                                    ) : isCancelled ? (
                                      <span className="font-semibold text-rose-600 text-xs">
                                        {pkg.actualStatus || 'Đã hủy thầu'}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">Chưa có nhà thầu</span>
                                    )}
                                    <span className="text-[11px] font-mono text-slate-600 font-semibold">
                                      {pkg.contractValue ? `HĐ: ${formatVN(pkg.contractValue)}` : `Dự toán: ${formatVN(pkg.budget)}`}
                                    </span>
                                  </div>
                                </td>
                              )}

                              {/* Classification */}
                              <td className="py-3.5 px-4 align-top whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-700 text-xs">{pkg.type}</span>
                                  {pkg.selectionMethod && (
                                    <span className="text-[10px] text-slate-400 mt-0.5">
                                      {pkg.selectionMethod}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Manager */}
                              <td className="py-3.5 px-4 align-top whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-700 text-xs">
                                    {pkg.department || 'Chưa phân công'}
                                  </span>
                                  {pkg.manager && (
                                    <span className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-0.5">
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

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <p className="text-xs text-slate-500">
                  Mẹo: Bạn có thể chọn các thẻ danh mục ở trên để chuyển đổi nhanh giữa các nhóm gói thầu.
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
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
