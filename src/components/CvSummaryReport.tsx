import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  ChevronRight, 
  X, 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle,
  FileCheck,
  Award,
  Calendar,
  User,
  Filter
} from 'lucide-react';
import { BidPackage, isPackageCancelled } from '../types';
import { formatVN } from './ExecutiveKpis';

interface CvSummaryReportProps {
  packages: BidPackage[];
}

export interface CvCategoryBreakdown {
  total: number;
  cancelled: number;
  signedContract: number;
  finishingContract: number;
  unclassified: number;
  
  // Preparation stage
  prepStageTotal: number;
  tongHopNhuCau: number;
  baoGiaLapDT: number;
  bocTachLapThamTra: number;
  thamDinhKHLCNT: number;
  lapEHSMT: number;
  thamDinhHSMT: number;

  // Bidding stage
  biddingStageTotal: number;
  moiThauChuaMo: number;
  xetThau: number;
  doiChieuTaiLieu: number;
  thamDinhKQ: number;
}

export type SubCategoryKey = 
  | 'all'
  | 'cancelled'
  | 'signedContract'
  | 'finishingContract'
  | 'unclassified'
  | 'prepStage'
  | 'tongHopNhuCau'
  | 'baoGiaLapDT'
  | 'bocTachLapThamTra'
  | 'thamDinhKHLCNT'
  | 'lapEHSMT'
  | 'thamDinhHSMT'
  | 'biddingStage'
  | 'moiThauChuaMo'
  | 'xetThau'
  | 'doiChieuTaiLieu'
  | 'thamDinhKQ';

export const classifyPackageByCv = (pkg: BidPackage): SubCategoryKey => {
  if (isPackageCancelled(pkg)) {
    return 'cancelled';
  }

  const norm = (str?: string) => 
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();

  const cv = norm(pkg.cvSymbol);
  const actual = norm(pkg.actualStatus);
  const notes = norm(pkg.notes);
  const combined = `${cv} | ${actual} | ${notes}`;

  // Check 0: Explicit Cancelled
  if (cv.includes('huy') || combined.includes('huy thau')) {
    return 'cancelled';
  }

  // Check 0B: Unclassified (Missing CV Symbol or N/A)
  const rawCv = (pkg.cvSymbol || '').trim();
  if (!rawCv || rawCv.toUpperCase() === 'N/A' || cv === '' || cv === 'n/a') {
    return 'unclassified';
  }

  // Check 1: Finishing / Reviewing Contract (TĐHĐ, HTHĐ, TĐ HĐ, HT HĐ)
  const isFinishingContract = 
    cv === 'tdhd' || 
    cv === 'hthd' || 
    cv.includes('tdhd') || 
    cv.includes('hthd') || 
    actual.includes('hoan thien hd') || 
    actual.includes('hoan thien hop dong') || 
    actual.includes('tham dinh hd') || 
    actual.includes('tham dinh hop dong');

  if (isFinishingContract) {
    return 'finishingContract';
  }

  // Check 2: Signed Contract (HĐ)
  // Strictly packages with CV Symbol = HĐ / HD / Ký HĐ or actual status = đã ký HĐ
  const isSignedContractCv = 
    cv === 'hd' || 
    cv === 'ky hd' || 
    cv === 'da ky hd' || 
    cv === 'hđ' ||
    actual === 'da ky hd' ||
    actual.includes('da ky hd') ||
    actual.includes('da ky hop dong') ||
    notes.includes('da ky hd');

  if (isSignedContractCv) {
    return 'signedContract';
  }

  // Check 2: Bidding Stage (Tổ chức LCNT)
  // - Xét thầu (XT)
  if (cv === 'xt' || cv.includes('xt') || actual.includes('xet thau')) {
    return 'xetThau';
  }

  // - Đối chiếu tài liệu (ĐCTL / DCTL)
  if (cv === 'dctl' || cv.includes('dctl') || actual.includes('doi chieu')) {
    return 'doiChieuTaiLieu';
  }

  // - Thẩm định kết quả (TĐKQ)
  if (cv === 'tdkq' || cv.includes('tdkq') || actual.includes('tham dinh kq') || actual.includes('tham dinh ket qua')) {
    return 'thamDinhKQ';
  }

  // - Mời thầu (MT) - MUST NOT match HSMT (Lập HSMT, E-HSMT, TĐHSMT)
  const isMoiThau = (
    cv === 'mt' || 
    cv === 'moi thau' || 
    actual.includes('moi thau') || 
    actual.includes('chua mo')
  ) && !cv.includes('hsmt') && !actual.includes('hsmt');

  if (isMoiThau) {
    return 'moiThauChuaMo';
  }

  // Check 3: Preparation Stage (Chuẩn bị LCNT)
  // - Tổng hợp nhu cầu (THNC)
  if (cv === 'thnc' || cv.includes('thnc') || cv.includes('nhu cau') || actual.includes('tong hop nhu cau') || actual.includes('nhu cau')) {
    return 'tongHopNhuCau';
  }

  // - Xin báo giá, lập DT (BG, LĐT, Xin BG, Lập DT)
  if (
    cv === 'bg' || 
    cv === 'ldt' || 
    cv.includes('bg') || 
    cv.includes('ldt') || 
    cv.includes('bao gia') ||
    cv.includes('lap dt') ||
    actual.includes('xin bao gia') || 
    actual.includes('bao gia') || 
    actual.includes('lap dt')
  ) {
    return 'baoGiaLapDT';
  }

  // - Bóc tách, thẩm tra dự toán (BT, TTDT)
  if (
    cv === 'bt' || 
    cv === 'ttdt' || 
    cv.includes('boc tach') ||
    cv.includes('tham tra') ||
    actual.includes('boc tach') || 
    actual.includes('tham tra du toan')
  ) {
    return 'bocTachLapThamTra';
  }

  // - Thẩm định KH LCNT (TĐKH)
  if (cv === 'tdkh' || cv.includes('tdkh') || actual.includes('tham dinh kh') || actual.includes('khlcnt')) {
    return 'thamDinhKHLCNT';
  }

  // - Thẩm định HSMT (TĐHSMT)
  if (
    cv === 'tdhsmt' || 
    cv.includes('tdhsmt') || 
    cv.includes('tham dinh hsmt') || 
    actual.includes('tham dinh hsmt')
  ) {
    return 'thamDinhHSMT';
  }

  // - Lập E-HSMT / Lập HSMT (EHSMT, LEHSMT, LHSMT, Lập HSMT, HSMT)
  if (
    cv === 'hsmt' ||
    cv === 'lap hsmt' ||
    cv === 'ehsmt' ||
    cv === 'lhsmt' ||
    cv.includes('hsmt') ||
    cv.includes('ehsmt') || 
    cv.includes('lhsmt') || 
    actual.includes('hsmt') ||
    actual.includes('lap e-hsmt') || 
    actual.includes('lap hsmt')
  ) {
    return 'lapEHSMT';
  }

  // Fallbacks if CV symbol wasn't recognized or present:
  if (cv.includes('hd') && !cv.includes('td') && !cv.includes('ht')) {
    return 'signedContract';
  }

  if (pkg.status === 'Hoàn thành' && !actual.includes('thau') && !actual.includes('hd')) {
    return 'signedContract';
  }

  if (pkg.status === 'Đang đấu thầu') {
    return 'moiThauChuaMo';
  }

  return 'unclassified';
};

export default function CvSummaryReport({ packages }: CvSummaryReportProps) {
  const [selectedCategory, setSelectedCategory] = useState<{
    key: SubCategoryKey;
    title: string;
  } | null>(null);

  const [modalSearchQuery, setModalSearchQuery] = useState('');

  // Classify all packages
  const classifiedMap = packages.reduce((acc, pkg) => {
    const key = classifyPackageByCv(pkg);
    if (!acc[key]) acc[key] = [];
    acc[key].push(pkg);
    return acc;
  }, {} as Record<SubCategoryKey, BidPackage[]>);

  const cancelledCount = (classifiedMap.cancelled || []).length;
  const signedContractCount = (classifiedMap.signedContract || []).length;
  const finishingContractCount = (classifiedMap.finishingContract || []).length;
  const unclassifiedCount = (classifiedMap.unclassified || []).length;

  const tongHopNhuCau = (classifiedMap.tongHopNhuCau || []).length;
  const baoGiaLapDT = (classifiedMap.baoGiaLapDT || []).length;
  const bocTachLapThamTra = (classifiedMap.bocTachLapThamTra || []).length;
  const thamDinhKHLCNT = (classifiedMap.thamDinhKHLCNT || []).length;
  const lapEHSMT = (classifiedMap.lapEHSMT || []).length;
  const thamDinhHSMT = (classifiedMap.thamDinhHSMT || []).length;

  const prepStagePackages = [
    ...(classifiedMap.tongHopNhuCau || []),
    ...(classifiedMap.baoGiaLapDT || []),
    ...(classifiedMap.bocTachLapThamTra || []),
    ...(classifiedMap.thamDinhKHLCNT || []),
    ...(classifiedMap.lapEHSMT || []),
    ...(classifiedMap.thamDinhHSMT || []),
  ];
  const prepStageTotal = prepStagePackages.length;

  const moiThauChuaMo = (classifiedMap.moiThauChuaMo || []).length;
  const xetThau = (classifiedMap.xetThau || []).length;
  const doiChieuTaiLieu = (classifiedMap.doiChieuTaiLieu || []).length;
  const thamDinhKQ = (classifiedMap.thamDinhKQ || []).length;

  const biddingStagePackages = [
    ...(classifiedMap.moiThauChuaMo || []),
    ...(classifiedMap.xetThau || []),
    ...(classifiedMap.doiChieuTaiLieu || []),
    ...(classifiedMap.thamDinhKQ || []),
  ];
  const biddingStageTotal = biddingStagePackages.length;

  const totalPackages = packages.length;

  const openCategoryModal = (key: SubCategoryKey, title: string) => {
    setSelectedCategory({ key, title });
    setModalSearchQuery('');
  };

  const getActiveList = (): BidPackage[] => {
    if (!selectedCategory) return [];
    switch (selectedCategory.key) {
      case 'all':
        return packages;
      case 'prepStage':
        return prepStagePackages;
      case 'biddingStage':
        return biddingStagePackages;
      default:
        return classifiedMap[selectedCategory.key] || [];
    }
  };

  const activeList = getActiveList();
  const filteredList = activeList.filter(pkg => {
    if (!modalSearchQuery.trim()) return true;
    const q = modalSearchQuery.toLowerCase().trim();
    return (
      pkg.id.toLowerCase().includes(q) ||
      pkg.name.toLowerCase().includes(q) ||
      (pkg.cvSymbol || '').toLowerCase().includes(q) ||
      (pkg.actualStatus || '').toLowerCase().includes(q) ||
      (pkg.contractor || '').toLowerCase().includes(q) ||
      pkg.manager.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs hover:shadow-md transition">
      {/* Header Banner matching Slide Presentation Aesthetics */}
      <div className="border-b border-slate-200 pb-4 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700 tracking-wider">
              Theo Cột Ký Hiệu CV
            </span>
            <span className="text-xs text-slate-400 font-medium">Đồng bộ tự động từ Google Sheet</span>
          </div>
          <h2 className="text-lg md:text-xl font-display font-extrabold text-red-600 mt-1 flex items-center gap-2">
            <span>❖ Tổng số gói thầu thực hiện:</span>
            <span className="text-red-600 underline font-black">{totalPackages} gói</span>
            <span className="text-red-500 font-bold text-sm md:text-base">
              (bao gồm <strong className="font-extrabold">{cancelledCount} lượt hủy thầu</strong>)
            </span>
          </h2>
        </div>

        <button
          onClick={() => openCategoryModal('all', 'Toàn bộ danh mục gói thầu')}
          className="self-start md:self-auto px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Xem tất cả ({totalPackages})</span>
        </button>
      </div>

      {/* Main Two-Column Slide Representation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 relative">
        {/* Vertical Divider for Desktop */}
        <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-blue-500/40 -translate-x-1/2" />

        {/* LEFT COLUMN */}
        <div className="space-y-3 font-sans text-sm md:text-base font-semibold text-blue-900 leading-relaxed">
          {/* 1. Đã ký hợp đồng */}
          <div 
            onClick={() => openCategoryModal('signedContract', 'Đã ký hợp đồng')}
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/80 transition cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-black">➢</span>
              <span>Đã ký hợp đồng:</span>
            </div>
            <span className="text-red-600 font-extrabold text-base md:text-lg group-hover:scale-105 transition-transform">
              {signedContractCount.toString().padStart(2, '0')} gói
            </span>
          </div>

          {/* 2. Đang hoàn thiện hợp đồng */}
          <div 
            onClick={() => openCategoryModal('finishingContract', 'Đang hoàn thiện hợp đồng')}
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/80 transition cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-black">➢</span>
              <span>Đang hoàn thiện hợp đồng:</span>
            </div>
            <span className="text-red-600 font-extrabold text-base md:text-lg group-hover:scale-105 transition-transform">
              {finishingContractCount.toString().padStart(2, '0')} gói
            </span>
          </div>

          {/* 3. Đang giai đoạn chuẩn bị LCNT */}
          <div className="pt-1">
            <div 
              onClick={() => openCategoryModal('prepStage', 'Đang giai đoạn chuẩn bị LCNT')}
              className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 hover:bg-blue-100/80 transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="text-blue-700 font-black">➢</span>
                <span className="font-extrabold text-blue-950">Đang giai đoạn chuẩn bị LCNT:</span>
              </div>
              <span className="text-red-600 font-black text-base md:text-lg group-hover:scale-105 transition-transform">
                {prepStageTotal.toString().padStart(2, '0')} gói
              </span>
            </div>

            {/* Sub-items */}
            <div className="ml-5 sm:ml-7 mt-2 space-y-2 text-xs sm:text-sm font-semibold text-blue-800">
              <div 
                onClick={() => openCategoryModal('tongHopNhuCau', 'Đang tổng hợp nhu cầu')}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <span>+ Đang tổng hợp nhu cầu:</span>
                <span className="text-red-600 font-bold">{tongHopNhuCau.toString().padStart(2, '0')} gói</span>
              </div>

              <div 
                onClick={() => openCategoryModal('baoGiaLapDT', 'Đang xin báo giá, lập DT gói thầu')}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <span>+ Đang xin báo giá, lập DT gói thầu:</span>
                <span className="text-red-600 font-bold">{baoGiaLapDT.toString().padStart(2, '0')} gói</span>
              </div>

              <div 
                onClick={() => openCategoryModal('bocTachLapThamTra', 'Đang bóc tách/ lập/ thẩm tra dự toán gói thầu')}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <span>+ Đang bóc tách/ lập/ thẩm tra dự toán gói thầu:</span>
                <span className="text-red-600 font-bold">{bocTachLapThamTra.toString().padStart(2, '0')} gói</span>
              </div>

              <div 
                onClick={() => openCategoryModal('thamDinhKHLCNT', 'Đang thẩm định KH LCNT')}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <span>+ Đang thẩm định KH LCNT:</span>
                <span className="text-red-600 font-bold">{thamDinhKHLCNT.toString().padStart(2, '0')} gói</span>
              </div>

              <div 
                onClick={() => openCategoryModal('lapEHSMT', 'Đang lập E-HSMT')}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <span>+ Đang lập E-HSMT:</span>
                <span className="text-red-600 font-bold">{lapEHSMT.toString().padStart(2, '0')} gói</span>
              </div>

              <div 
                onClick={() => openCategoryModal('thamDinhHSMT', 'Đang thẩm định HSMT')}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <span>+ Đang thẩm định HSMT:</span>
                <span className="text-red-600 font-bold">{thamDinhHSMT.toString().padStart(2, '0')} gói</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-3 font-sans text-sm md:text-base font-semibold text-blue-900 leading-relaxed">
          {/* 4. Đang giai đoạn tổ chức LCNT */}
          <div>
            <div 
              onClick={() => openCategoryModal('biddingStage', 'Đang giai đoạn tổ chức LCNT')}
              className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 hover:bg-blue-100/80 transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="text-blue-700 font-black">➢</span>
                <span className="font-extrabold text-blue-950">Đang giai đoạn tổ chức LCNT:</span>
              </div>
              <span className="text-red-600 font-black text-base md:text-lg group-hover:scale-105 transition-transform">
                {biddingStageTotal.toString().padStart(2, '0')} gói
              </span>
            </div>

            {/* Sub-items */}
            <div className="ml-5 sm:ml-7 mt-2 space-y-2 text-xs sm:text-sm font-semibold text-blue-800">
              <div 
                onClick={() => openCategoryModal('moiThauChuaMo', 'Đang mời thầu (chưa mở)')}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <span>+ Đang mời thầu (chưa mở):</span>
                <span className="text-red-600 font-bold">{moiThauChuaMo.toString().padStart(2, '0')} gói</span>
              </div>

              <div 
                onClick={() => openCategoryModal('xetThau', 'Đang xét thầu')}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <span>+ Đang xét thầu:</span>
                <span className="text-red-600 font-bold">{xetThau.toString().padStart(2, '0')} gói</span>
              </div>

              <div 
                onClick={() => openCategoryModal('doiChieuTaiLieu', 'Đang đối chiếu tài liệu')}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <span>+ Đang đối chiếu tài liệu:</span>
                <span className="text-red-600 font-bold">{doiChieuTaiLieu.toString().padStart(2, '0')} gói</span>
              </div>

              <div 
                onClick={() => openCategoryModal('thamDinhKQ', 'Đang thẩm định KQ')}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <span>+ Đang thẩm định KQ:</span>
                <span className="text-red-600 font-bold">{thamDinhKQ.toString().padStart(2, '0')} gói</span>
              </div>
            </div>
          </div>

          {/* 5. Đã hủy thầu */}
          <div 
            onClick={() => openCategoryModal('cancelled', 'Đã hủy thầu')}
            className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/60 hover:bg-rose-100/80 transition cursor-pointer border border-rose-200/60 group mt-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-rose-700 font-black">➢</span>
              <span className="font-extrabold text-rose-950">Đã hủy thầu:</span>
            </div>
            <span className="text-red-600 font-black text-base md:text-lg group-hover:scale-105 transition-transform">
              {cancelledCount.toString().padStart(2, '0')} lần
            </span>
          </div>

          {/* 6. Các gói chưa phân loại */}
          <div 
            onClick={() => openCategoryModal('unclassified', 'Các gói chưa phân loại (N/A hoặc chưa có ký hiệu CV)')}
            className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 hover:bg-amber-100/80 transition cursor-pointer border border-amber-200/60 group mt-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-amber-700 font-black">➢</span>
              <span className="font-extrabold text-amber-950">Các gói chưa phân loại (N/A / chưa có ký hiệu CV):</span>
            </div>
            <span className="text-red-600 font-black text-base md:text-lg group-hover:scale-105 transition-transform">
              {unclassifiedCount.toString().padStart(2, '0')} gói
            </span>
          </div>
        </div>
      </div>

      {/* Modal View for Clicking Any Sub-category */}
      <AnimatePresence>
        {selectedCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCategory(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden z-10"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-800 text-base sm:text-lg">
                      {selectedCategory.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tìm thấy <span className="font-bold text-slate-800">{filteredList.length}</span> gói thầu phù hợp
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCategory(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search input */}
              <div className="px-4 py-3 bg-white border-b border-slate-150 flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã, tên gói, ký hiệu CV, người phụ trách..."
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* Table */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {filteredList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm font-semibold text-slate-600">Không có gói thầu nào trong mục này</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4">Mã gói</th>
                          <th className="py-3 px-4">Tên gói thầu</th>
                          <th className="py-3 px-4">Ký hiệu CV</th>
                          <th className="py-3 px-4">Thực trạng (Đến nay)</th>
                          <th className="py-3 px-4">Kinh phí / Giá HĐ</th>
                          <th className="py-3 px-4">Người phụ trách</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 bg-white">
                        {filteredList.map((pkg) => {
                          const isCancelled = isPackageCancelled(pkg);
                          return (
                            <tr key={pkg.id} className="hover:bg-slate-50 transition">
                              <td className="py-3 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap align-top">
                                {pkg.id}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-800 align-top max-w-sm">
                                {pkg.name}
                              </td>
                              <td className="py-3 px-4 align-top whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                  isCancelled ? 'bg-rose-100 text-rose-800' : 'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}>
                                  {pkg.cvSymbol || 'N/A'}
                                </span>
                              </td>
                              <td className="py-3 px-4 align-top max-w-xs text-slate-600 italic">
                                {pkg.actualStatus || (isCancelled ? 'Đã hủy thầu' : pkg.status)}
                              </td>
                              <td className="py-3 px-4 align-top font-mono font-semibold whitespace-nowrap">
                                {pkg.contractValue ? (
                                  <span className="text-emerald-700 font-bold">{formatVN(pkg.contractValue)}</span>
                                ) : (
                                  <span className="text-slate-600">{formatVN(pkg.budget)}</span>
                                )}
                              </td>
                              <td className="py-3 px-4 align-top whitespace-nowrap text-slate-600 font-medium">
                                {pkg.manager}
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
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
