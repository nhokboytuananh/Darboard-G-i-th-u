import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Edit,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  Briefcase,
  User,
  ExternalLink,
  ChevronDown,
  X,
  FileText,
  Save,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { BidPackage, UserRole, PackageType, PackageStatus } from '../types';
import { formatVN } from './ExecutiveKpis';

interface PackageListTableProps {
  packages: BidPackage[];
  role: UserRole;
  userEmail: string;
  onUpdatePackage: (updated: BidPackage, changeDetails: string) => void;
  onAddPackage?: (newPkg: BidPackage) => void;
}

export default function PackageListTable({
  packages,
  role,
  userEmail,
  onUpdatePackage,
  onAddPackage,
}: PackageListTableProps) {
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'budget-desc' | 'budget-asc' | 'progress-desc' | 'name-asc'>('budget-desc');

  // Drawer / Modal Editor State
  const [selectedPackage, setSelectedPackage] = useState<BidPackage | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProgress, setEditedProgress] = useState(0);
  const [editedStatus, setEditedStatus] = useState<PackageStatus>('Đang thực hiện');
  const [editedEndDate, setEditedEndDate] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [editedContractor, setEditedContractor] = useState('');
  const [editedContractValue, setEditedContractValue] = useState(0);
  const [editedApprovalDate, setEditedApprovalDate] = useState('');
  const [editedContractDate, setEditedContractDate] = useState('');
  const [editedActualStatus, setEditedActualStatus] = useState('');
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // New package modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPkgId, setNewPkgId] = useState('');
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgType, setNewPkgType] = useState<PackageType>('Xây lắp');
  const [newPkgBudget, setNewPkgBudget] = useState(0);
  const [newPkgMethod, setNewPkgMethod] = useState('Đấu thầu rộng rãi');
  const [newPkgManager, setNewPkgManager] = useState('');
  const [newPkgDept, setNewPkgDept] = useState('');

  // Handle Edit Action
  const handleOpenEditor = (pkg: BidPackage) => {
    setSelectedPackage(pkg);
    setEditedProgress(pkg.progress);
    setEditedStatus(pkg.status);
    setEditedEndDate(pkg.endDate);
    setEditedNotes(pkg.notes || '');
    setEditedContractor(pkg.contractor || '');
    setEditedContractValue(pkg.contractValue || 0);
    setEditedApprovalDate(pkg.approvalDate || '');
    setEditedContractDate(pkg.contractDate || '');
    setEditedActualStatus(pkg.actualStatus || '');
    setPermissionError(null);

    // Check Phân quyền (Access Rights)
    if (role === 'Lãnh đạo') {
      setIsEditMode(false); // Leaders only read
    } else if (role === 'Chuyên viên' && pkg.manager !== 'Nguyễn Văn Hùng' && pkg.manager !== 'Nguyễn Tiến Dũng' && pkg.id !== 'GT-01/XL-2026' && pkg.id !== 'GT-04/XL-2026') {
      // Simulate that staff can only edit specific assigned packages
      setIsEditMode(false);
      setPermissionError('Tài khoản Chuyên viên của bạn không được phân công phụ trách gói thầu này. Bạn chỉ có quyền Xem chi tiết.');
    } else {
      setIsEditMode(true); // Project Managers can edit everything
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;

    // Additional safeguard for Lãnh đạo role
    if (role === 'Lãnh đạo') {
      setPermissionError('Quyền Lãnh đạo của bạn chỉ được phép đọc dữ liệu. Không thể thực hiện lưu.');
      return;
    }

    const updatedPackage: BidPackage = {
      ...selectedPackage,
      progress: editedProgress,
      status: editedStatus,
      endDate: editedEndDate,
      notes: editedNotes,
      contractor: editedContractor || undefined,
      contractValue: editedContractValue || undefined,
      approvalDate: editedApprovalDate || undefined,
      contractDate: editedContractDate || undefined,
      actualStatus: editedActualStatus || undefined,
    };

    // Calculate audit details
    let changes: string[] = [];
    if (selectedPackage.progress !== editedProgress) {
      changes.push(`Tiến độ thay đổi từ ${selectedPackage.progress}% thành ${editedProgress}%`);
    }
    if (selectedPackage.status !== editedStatus) {
      changes.push(`Trạng thái chuyển từ "${selectedPackage.status}" thành "${editedStatus}"`);
    }
    if (selectedPackage.endDate !== editedEndDate) {
      changes.push(`Hạn hoàn thành đổi từ ${selectedPackage.endDate} thành ${editedEndDate}`);
    }
    if ((selectedPackage.notes || '') !== editedNotes) {
      changes.push(`Cập nhật nhật ký ghi chú mới`);
    }

    const changeDetails = changes.join(', ') || 'Cập nhật thông tin chi tiết gói thầu';

    // Show native confirm dialog for safe data mutation (Workspace Guidelines Mandate!)
    const confirmSave = window.confirm(
      `Xác nhận cập nhật dữ liệu gói thầu: "${selectedPackage.name}"?\nHành động này sẽ thay đổi tiến độ trực quan trên hệ thống báo cáo.`
    );

    if (confirmSave) {
      onUpdatePackage(updatedPackage, changeDetails);
      setSelectedPackage(null);
    }
  };

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkgId || !newPkgName || !newPkgBudget) {
      alert('Vui lòng nhập đầy đủ các trường thông tin bắt buộc.');
      return;
    }

    if (role === 'Lãnh đạo') {
      alert('Tài khoản Lãnh đạo không có quyền khởi tạo gói thầu mới.');
      return;
    }

    const newPkg: BidPackage = {
      id: newPkgId,
      name: newPkgName,
      type: newPkgType,
      selectionMethod: newPkgMethod,
      budget: newPkgBudget,
      progress: 0,
      status: 'Lập kế hoạch',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      manager: newPkgManager || 'Chưa phân công',
      department: newPkgDept || 'Ban Quản lý Dự án',
      disbursement: 0,
      notes: 'Gói thầu mới được khởi tạo từ hệ thống quản lý.',
    };

    if (onAddPackage) {
      onAddPackage(newPkg);
      setIsAddModalOpen(false);
      // Reset form
      setNewPkgId('');
      setNewPkgName('');
      setNewPkgBudget(0);
      setNewPkgManager('');
      setNewPkgDept('');
    }
  };

  // Filter & Sort Logic
  const filteredPackages = packages
    .filter((pkg) => {
      const matchesSearch =
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pkg.contractor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.manager.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedType === 'All' || pkg.type === selectedType;
      const matchesStatus = selectedStatus === 'All' || pkg.status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });

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

  // Group filtered packages by Quarter first, then by Type
  const quarterGrouped: { [quarter: string]: { [type in PackageType]?: BidPackage[] } } = {};

  filteredPackages.forEach((pkg) => {
    const quarterKey = getQuarterGroup(pkg);
    const typeKey = pkg.type || 'Xây lắp';
    
    if (!quarterGrouped[quarterKey]) {
      quarterGrouped[quarterKey] = {};
    }
    
    if (!quarterGrouped[quarterKey][typeKey]) {
      quarterGrouped[quarterKey][typeKey] = [];
    }
    
    quarterGrouped[quarterKey][typeKey]!.push(pkg);
  });

  // Sort quarter groups: Oldest quarters first, then "Đang thực hiện" at the bottom
  const quarterKeys = Object.keys(quarterGrouped).sort((a, b) => {
    if (a === 'Đang thực hiện') return 1;
    if (b === 'Đang thực hiện') return -1;

    const parseKey = (k: string) => {
      const match = k.match(/Quý\s+(\d+)\/(\d+)/);
      if (!match) return { q: 0, y: 0 };
      return { q: parseInt(match[1], 10), y: parseInt(match[2], 10) };
    };

    const pa = parseKey(a);
    const pb = parseKey(b);

    if (pa.y !== pb.y) {
      return pa.y - pb.y; // Year ascending
    }
    return pa.q - pb.q; // Quarter ascending
  });

  // Pre-defined sorting order and labels for package types
  const typeOrder: PackageType[] = ['Xây lắp', 'Thiết bị', 'Tư vấn', 'Phi tư vấn'];

  const typeLabels: { [key in PackageType]: string } = {
    'Xây lắp': 'Gói thầu Xây lắp (XL, PC, EPC...)',
    'Thiết bị': 'Gói thầu Thiết bị',
    'Tư vấn': 'Gói thầu Tư vấn',
    'Phi tư vấn': 'Gói thầu Phi tư vấn (PTV)',
  };

  // Helper to sort packages within sub-groups
  const sortPackages = (pkgs: BidPackage[]) => {
    return [...pkgs].sort((a, b) => {
      if (sortBy === 'budget-desc') return (b.contractValue || b.budget) - (a.contractValue || a.budget);
      if (sortBy === 'budget-asc') return (a.contractValue || a.budget) - (b.contractValue || b.budget);
      if (sortBy === 'progress-desc') return b.progress - a.progress;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      return 0;
    });
  };

  const getStatusColor = (status: PackageStatus) => {
    switch (status) {
      case 'Hoàn thành':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Đang thực hiện':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Chậm tiến độ':
        return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
      case 'Đang đấu thầu':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Lập kế hoạch':
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: PackageStatus) => {
    switch (status) {
      case 'Hoàn thành':
        return <CheckCircle className="w-3.5 h-3.5 mr-1" />;
      case 'Chậm tiến độ':
        return <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
      case 'Đang thực hiện':
      case 'Đang đấu thầu':
        return <Clock className="w-3.5 h-3.5 mr-1" />;
      case 'Lập kế hoạch':
      default:
        return <Briefcase className="w-3.5 h-3.5 mr-1" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* 1. Header & Controls Panel */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-slate-800 text-base md:text-lg">
            Danh mục tiến độ các gói thầu
          </h3>
          <p className="text-xs text-slate-500">
            Hiển thị {filteredPackages.length} trên tổng số {packages.length} gói thầu hiện hữu
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Create New Bid Package (Authorized for non-Leaders) */}
          {role !== 'Lãnh đạo' && onAddPackage && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-xs transition duration-150"
            >
              + Tạo gói thầu mới
            </button>
          )}
        </div>
      </div>

      {/* 2. Filters Grid */}
      <div className="p-5 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-white">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm mã, tên, nhà thầu, phụ trách..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
          />
        </div>

        {/* Filter by Type */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 cursor-pointer"
          >
            <option value="All">Tất cả loại gói thầu</option>
            <option value="Xây lắp">Xây lắp</option>
            <option value="Thiết bị">Thiết bị</option>
            <option value="Tư vấn">Tư vấn</option>
            <option value="Phi tư vấn">Phi tư vấn</option>
          </select>
        </div>

        {/* Filter by Status */}
        <div className="flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 cursor-pointer"
          >
            <option value="All">Tất cả trạng thái</option>
            <option value="Lập kế hoạch">Lập kế hoạch</option>
            <option value="Đang đấu thầu">Đang đấu thầu</option>
            <option value="Đang thực hiện">Đang thực hiện</option>
            <option value="Hoàn thành">Hoàn thành</option>
            <option value="Chậm tiến độ">Chậm tiến độ</option>
          </select>
        </div>

        {/* Sorter */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 cursor-pointer"
          >
            <option value="budget-desc">Giá HĐ (Giảm dần)</option>
            <option value="budget-asc">Giá HĐ (Tăng dần)</option>
            <option value="progress-desc">Tiến độ (Cao nhất)</option>
            <option value="name-asc">Tên gói thầu (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 3. Main Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4 w-28">Mã gói</th>
              <th className="py-3.5 px-4">Tên gói thầu / Loại</th>
              <th className="py-3.5 px-4">Nhà thầu trúng thầu</th>
              <th className="py-3.5 px-4 text-right">Giá HĐ (đồng)</th>
              <th className="py-3.5 px-4">Phê duyệt KQLCNT</th>
              <th className="py-3.5 px-4">Ngày ký hợp đồng</th>
              <th className="py-3.5 px-4 max-w-xs">Thực trạng / Ghi chú</th>
              <th className="py-3.5 px-4 w-24">Tác vụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {quarterKeys.length > 0 ? (
              quarterKeys.map((quarterName) => {
                const typesInQuarter = quarterGrouped[quarterName];
                const totalPackagesInQuarter = Object.values(typesInQuarter).reduce(
                  (sum, list) => sum + (list?.length || 0),
                  0
                );

                return (
                  <React.Fragment key={quarterName}>
                    {/* Quarter header row */}
                    <tr className="bg-slate-100/75 border-y border-slate-200">
                      <td colSpan={8} className="py-2.5 px-4 font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                        {quarterName} ({totalPackagesInQuarter} gói thầu)
                      </td>
                    </tr>

                    {/* Loop through pre-defined type order */}
                    {typeOrder.map((typeKey) => {
                      const packagesOfType = typesInQuarter[typeKey];
                      if (!packagesOfType || packagesOfType.length === 0) return null;

                      // Sort packages of this type
                      const sortedPkgs = sortPackages(packagesOfType);

                      return (
                        <React.Fragment key={typeKey}>
                          {/* Sub-group type header row */}
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <td colSpan={8} className="py-1.5 px-6 font-bold text-blue-800 text-[10px] uppercase tracking-wider bg-slate-50/30">
                              <span className="text-blue-400 mr-1.5">↳</span>
                              {typeLabels[typeKey]} ({packagesOfType.length} gói thầu)
                            </td>
                          </tr>

                          {sortedPkgs.map((pkg) => (
                            <tr key={pkg.id} className="hover:bg-slate-50/70 transition-colors group border-b border-slate-100">
                              <td className="py-4 px-4 font-mono font-bold text-slate-600">{pkg.id}</td>
                              <td className="py-4 px-4">
                                {/* 1. Wrapped Package Name */}
                                <span className="font-semibold text-slate-900 block leading-relaxed max-w-sm sm:max-w-md break-words whitespace-normal group-hover:text-blue-600 transition-colors">
                                  {pkg.name}
                                </span>
                                
                                {/* 2. Metadata Badges (Type, Status, Manager, LCNT Duration) */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    {pkg.type}
                                  </span>
                                  
                                  {/* Trạng thái gói thầu */}
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(pkg.status)}`}>
                                    {getStatusIcon(pkg.status)}
                                    {pkg.status}
                                  </span>

                                  {/* Người phụ trách (Người thực hiện) */}
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                    <User className="w-3 h-3 mr-1 text-blue-500" />
                                    Phụ trách: {pkg.manager}
                                  </span>

                                  {/* Thời gian LCNT */}
                                  {pkg.lcntDuration !== undefined && (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                      pkg.lcntDuration > 40
                                        ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-bold'
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}>
                                      <Clock className="w-3 h-3 mr-1 text-slate-400" />
                                      LCNT: {pkg.lcntDuration} ngày
                                    </span>
                                  )}
                                </div>

                                {/* 3. Pulsing Red Warning Box for delay */}
                                {pkg.lcntDuration !== undefined && pkg.lcntDuration > 40 && (
                                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2 max-w-xs animate-pulse">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span>Cảnh báo: Chậm tiến độ ({pkg.lcntDuration} ngày &gt; 40 ngày)!</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                {pkg.contractor ? (
                                  <div>
                                    <span className="font-medium text-slate-800 block break-words whitespace-normal max-w-xs">{pkg.contractor}</span>
                                    <span className="text-[10px] text-slate-400">Hình thức: {pkg.selectionMethod}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Chưa xác định</span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-right font-mono font-semibold text-slate-700">
                                {pkg.contractValue ? formatVN(pkg.contractValue) : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="py-4 px-4 text-slate-600 font-medium">
                                {pkg.approvalDate ? pkg.approvalDate : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="py-4 px-4 text-slate-600 font-medium">
                                {pkg.contractDate ? pkg.contractDate : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="py-4 px-4 text-slate-600">
                                {!pkg.approvalDate ? (
                                  <div className="bg-amber-50 text-amber-800 p-2 rounded border border-amber-100 text-[11px] font-medium leading-relaxed">
                                    <span className="font-bold text-[10px] block text-amber-600 uppercase mb-0.5">Thực trạng:</span>
                                    {pkg.actualStatus || 'Chưa cập nhật thực trạng'}
                                  </div>
                                ) : (
                                  <span className="text-slate-500 italic text-[11px]">{pkg.notes || '—'}</span>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <button
                                  onClick={() => handleOpenEditor(pkg)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-md text-slate-600 font-medium transition cursor-pointer"
                                >
                                  {role === 'Lãnh đạo' ? <Eye className="w-3.5 h-3.5" /> : <Edit className="w-3.5 h-3.5" />}
                                  <span>{role === 'Lãnh đạo' ? 'Xem' : 'Sửa'}</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 italic bg-slate-50/30">
                  Không tìm thấy gói thầu nào khớp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Slide-over / Modal Detail & Editor Drawer */}
      {selectedPackage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50 transition-opacity">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between animate-slide-in">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 block">{selectedPackage.id}</span>
                  <h4 className="font-display font-bold text-slate-800 text-sm md:text-base">
                    {role === 'Lãnh đạo' ? 'Chi tiết gói thầu' : 'Cập nhật tiến độ gói thầu'}
                  </h4>
                </div>
              </div>
              <button
                onClick={() => setSelectedPackage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleSaveEdit} className="p-6 flex-1 overflow-y-auto space-y-5">
              {/* Access Banner (Secure Phân quyền) */}
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                  role === 'Lãnh đạo'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : permissionError
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {role === 'Lãnh đạo' ? (
                  <>
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold">Chưa đăng nhập (Chỉ xem)</p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Bạn có quyền xem toàn bộ số liệu báo cáo, giải ngân và thông số thầu. Đăng nhập Gmail để mở khoá quyền chỉnh sửa.
                      </p>
                    </div>
                  </>
                ) : permissionError ? (
                  <>
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold">Hạn chế quyền hạn</p>
                      <p className="text-[11px] opacity-90 mt-0.5">{permissionError}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold">Đã đăng nhập (Toàn quyền chỉnh sửa)</p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Tài khoản của bạn đã được xác thực qua Google. Bạn có quyền cập nhật tiến độ, trạng thái và chỉnh sửa thông tin gói thầu.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Read Only Details */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-2.5 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Tên gói thầu</span>
                  <span className="text-slate-800 font-bold leading-relaxed">{selectedPackage.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 font-medium block">Phân loại</span>
                    <span className="text-slate-800 font-semibold">{selectedPackage.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Hình thức</span>
                    <span className="text-slate-800 font-semibold">{selectedPackage.selectionMethod}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Người phụ trách</span>
                    <span className="text-slate-800 font-semibold flex items-center gap-1 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {selectedPackage.manager}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Bộ phận quản lý</span>
                    <span className="text-slate-800 font-semibold truncate block">{selectedPackage.department}</span>
                  </div>
                </div>
              </div>

              {/* Editable Fields (Active when isEditMode is true) */}
              <div className="space-y-4 pt-1">
                {/* 1. Progress Slider */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2 flex justify-between">
                    <span>Tiến độ thực hiện thực tế (%)</span>
                    <span className="text-blue-600 font-mono font-black text-sm">{editedProgress}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={editedProgress}
                    disabled={!isEditMode}
                    onChange={(e) => setEditedProgress(parseInt(e.target.value))}
                    className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5 mt-1">
                    <span>0% (Khởi động)</span>
                    <span>50% (Bán thành phẩm)</span>
                    <span>100% (Hoàn thành)</span>
                  </div>
                </div>

                {/* 2. Status Select */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Trạng thái vận hành</label>
                  <select
                    value={editedStatus}
                    disabled={!isEditMode}
                    onChange={(e) => setEditedStatus(e.target.value as PackageStatus)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 cursor-pointer"
                  >
                    <option value="Lập kế hoạch">Lập kế hoạch</option>
                    <option value="Đang đấu thầu">Đang đấu thầu</option>
                    <option value="Đang thực hiện">Đang thực hiện</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                    <option value="Chậm tiến độ">Chậm tiến độ</option>
                  </select>
                </div>

                {/* 3. Contractor Information & Value */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Nhà thầu xây dựng/cung cấp</label>
                    <input
                      type="text"
                      value={editedContractor}
                      disabled={!isEditMode}
                      onChange={(e) => setEditedContractor(e.target.value)}
                      placeholder="Nhập tên nhà thầu"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Giá trị hợp đồng (VND)</label>
                    <input
                      type="number"
                      value={editedContractValue || ''}
                      disabled={!isEditMode}
                      onChange={(e) => setEditedContractValue(parseInt(e.target.value) || 0)}
                      placeholder="Số tiền ký hợp đồng"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {/* 4. Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Ngày phê duyệt KQLCNT</label>
                    <input
                      type="text"
                      value={editedApprovalDate}
                      disabled={!isEditMode}
                      onChange={(e) => setEditedApprovalDate(e.target.value)}
                      placeholder="VD: 28/06/2026"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Ngày ký hợp đồng</label>
                    <input
                      type="text"
                      value={editedContractDate}
                      disabled={!isEditMode}
                      onChange={(e) => setEditedContractDate(e.target.value)}
                      placeholder="VD: 30/06/2026"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {/* 5. End Date */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Ngày hoàn thành dự kiến</label>
                  <input
                    type="date"
                    value={editedEndDate}
                    disabled={!isEditMode}
                    onChange={(e) => setEditedEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 cursor-pointer"
                  />
                </div>

                {/* 6. Actual Status (Only visible/editable if approvalDate is empty) */}
                {!editedApprovalDate ? (
                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
                    <label className="text-xs font-bold text-amber-900 block mb-1.5">Thực trạng (Đến ngày nay) *</label>
                    <textarea
                      rows={2}
                      value={editedActualStatus}
                      disabled={!isEditMode}
                      onChange={(e) => setEditedActualStatus(e.target.value)}
                      placeholder="Nhập tình trạng thực tế của gói thầu..."
                      className="w-full px-3 py-2 text-xs border border-amber-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-slate-50 text-amber-950 text-[11px]"
                    />
                    <p className="text-[10px] text-amber-600 mt-1">Cột thực trạng chỉ áp dụng đối với gói thầu chưa có Ngày phê duyệt KQLCNT.</p>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                    Gói thầu đã được phê duyệt KQLCNT ({editedApprovalDate}) nên thông tin thực trạng sẽ không hiển thị.
                  </div>
                )}

                {/* 7. Ghi chú thi công / Nhật ký thầu */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Nhật ký thầu / Lý do chậm trễ</label>
                  <textarea
                    rows={3}
                    value={editedNotes}
                    disabled={!isEditMode}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Bổ sung ghi chú tiến độ thực địa, vướng mắc, giải pháp..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 leading-relaxed"
                  />
                </div>
              </div>
            </form>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedPackage(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
              >
                Đóng
              </button>

              {isEditMode && (
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Cập nhật tiến độ</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Create New Bid Package Modal (for authorized role) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-5 animate-scale-up m-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-slate-800 text-base md:text-lg">
                Khởi tạo gói thầu mới
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePackage} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mã gói thầu (Bắt buộc) *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: GT-11/XL-2026"
                    value={newPkgId}
                    onChange={(e) => setNewPkgId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phân loại</label>
                  <select
                    value={newPkgType}
                    onChange={(e) => setNewPkgType(e.target.value as PackageType)}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    <option value="Xây lắp">Xây lắp</option>
                    <option value="Thiết bị">Thiết bị</option>
                    <option value="Tư vấn">Tư vấn</option>
                    <option value="Phi tư vấn">Phi tư vấn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên gói thầu dự án (Bắt buộc) *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên chi tiết gói thầu..."
                  value={newPkgName}
                  onChange={(e) => setNewPkgName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Dự toán ngân sách (VND) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Số tiền dự toán thầu"
                    value={newPkgBudget || ''}
                    onChange={(e) => setNewPkgBudget(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hình thức thầu</label>
                  <input
                    type="text"
                    value={newPkgMethod}
                    onChange={(e) => setNewPkgMethod(e.target.value)}
                    placeholder="Đấu thầu rộng rãi"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Người phụ trách</label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn Hùng"
                    value={newPkgManager}
                    onChange={(e) => setNewPkgManager(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bộ phận quản lý</label>
                  <input
                    type="text"
                    placeholder="VD: Ban QLDA số 1"
                    value={newPkgDept}
                    onChange={(e) => setNewPkgDept(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold text-slate-600 rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 font-bold text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Khởi tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
