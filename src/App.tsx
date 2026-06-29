import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Settings,
  Database,
  ExternalLink,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Info,
  LogOut,
  LogIn,
  User as UserIcon,
  Menu,
} from 'lucide-react';
import ExecutiveKpis from './components/ExecutiveKpis';
import ExecutiveCharts from './components/ExecutiveCharts';
import PackageListTable from './components/PackageListTable';
import SyncSettings from './components/SyncSettings';

import { BidPackage, UserRole, ActivityLog, GoogleSheetSyncInfo } from './types';
import { INITIAL_BID_PACKAGES, INITIAL_ACTIVITY_LOGS } from './sampleData';
import { fetchGoogleSheetData } from './utils/googleSheets';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Constant state values after removing Google login
  const user = null;
  const accessToken = null;
  const isLoggingIn = false;
  const needsAuth = false;

  // Role is 'Quản lý dự án' (write permissions) so users have full administrative controls
  const role: UserRole = 'Quản lý dự án';

  // Core Data States
  const [packages, setPackages] = useState<BidPackage[]>(INITIAL_BID_PACKAGES);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS);

  // Sync State
  const [syncInfo, setSyncInfo] = useState<GoogleSheetSyncInfo>(() => {
    const savedSpreadsheetId = localStorage.getItem('pro_track_spreadsheet_id');
    const savedGid = localStorage.getItem('pro_track_gid');
    return {
      spreadsheetId: savedSpreadsheetId || '1lrq4Brn1O3OdQzUeO7OrNoQEynBuGSt6RteNKqpQTCs', // User's custom sheet or default
      gid: savedGid || '1285066285',
      sheetName: '',
      lastSyncedAt: null,
      syncStatus: 'idle',
    };
  });

  // UI Navigation Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'directory' | 'sync'>('overview');
  const [isSyncing, setIsSyncing] = useState(false);
  const [alertNotification, setAlertNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Handle Notifications helper
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setAlertNotification({ type, message });
    // Auto clear after 6 seconds
    setTimeout(() => {
      setAlertNotification(null);
    }, 6000);
  }, []);

  // Sync Google Sheets Data Trigger
  const handleSyncData = useCallback(async (
    spreadsheetId: string,
    gid: string,
    token: string,
    userEmailStr: string
  ) => {
    setIsSyncing(true);
    setSyncInfo(prev => ({ ...prev, syncStatus: 'syncing', errorMessage: undefined }));

    try {
      const result = await fetchGoogleSheetData(spreadsheetId, gid, token);
      
      setPackages(result.packages);
      setSyncInfo(prev => ({
        ...prev,
        sheetName: result.sheetName,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'success',
        errorMessage: undefined,
      }));

      // Add audit log for success sync
      const newLog: ActivityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userEmail: userEmailStr,
        action: 'Đồng bộ Google Sheets',
        packageName: 'Toàn bộ danh mục',
        details: `Đồng bộ thành công ${result.packages.length} gói thầu từ Google Sheets (Tab: "${result.sheetName}")`,
      };
      setActivityLogs(prev => [newLog, ...prev]);
      showNotification('success', `Đồng bộ hoàn tất! Tải thành công ${result.packages.length} gói thầu từ Google Sheets.`);
    } catch (error: any) {
      console.error('Error in sync data trigger:', error);
      setSyncInfo(prev => ({
        ...prev,
        syncStatus: 'error',
        errorMessage: error.message || 'Lỗi không xác định khi kết nối Google Sheets API.',
      }));

      const newLog: ActivityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userEmail: userEmailStr,
        action: 'Lỗi đồng bộ',
        packageName: 'N/A',
        details: `Đồng bộ thất bại: ${error.message || 'Lỗi kết nối API'}`,
      };
      setActivityLogs(prev => [newLog, ...prev]);
      showNotification('error', `Đồng bộ thất bại: ${error.message || 'Vui lòng kiểm tra cấu hình hoặc quyền truy cập tài khoản.'}`);
    } finally {
      setIsSyncing(false);
    }
  }, [showNotification]);

  // Initial public sync on mount
  useEffect(() => {
    handleSyncData(
      syncInfo.spreadsheetId,
      syncInfo.gid || '1285066285',
      '',
      'guest@company.com.vn'
    );
  }, [syncInfo.spreadsheetId, syncInfo.gid, handleSyncData]);

  // Manual trigger force sync
  const handleManualSync = () => {
    handleSyncData(
      syncInfo.spreadsheetId,
      syncInfo.gid || '1285066285',
      '',
      'guest@company.com.vn'
    );
  };

  // Callback: Update Single Bid Package (Authorized PM/Staff edits)
  const handleUpdatePackage = (updatedPkg: BidPackage, changeDetails: string) => {
    // 1. Update list state
    setPackages(prev => prev.map(p => (p.id === updatedPkg.id ? updatedPkg : p)));

    // 2. Append audit log
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userEmail: user?.email || 'admin@company.com.vn',
      action: 'Cập nhật tiến độ',
      packageName: updatedPkg.name,
      details: changeDetails,
    };
    setActivityLogs(prev => [newLog, ...prev]);
    showNotification('success', `Đã lưu cập nhật gói thầu ${updatedPkg.id} thành công!`);
  };

  // Callback: Add Brand New Package (Authorized PM/Staff creation)
  const handleAddPackage = (newPkg: BidPackage) => {
    setPackages(prev => [newPkg, ...prev]);

    // Append audit log
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userEmail: user?.email || 'admin@company.com.vn',
      action: 'Khởi tạo gói thầu',
      packageName: newPkg.name,
      details: `Khởi tạo gói thầu mới ${newPkg.id}, Ngân sách: ${newPkg.budget.toLocaleString('vi-VN')} đ`,
    };
    setActivityLogs(prev => [newLog, ...prev]);
    showNotification('success', `Đã khởi tạo gói thầu mới ${newPkg.id} thành công!`);
  };

  // Callback: Change target SpreadsheetId / Gid config
  const handleSpreadsheetConfigChange = (newSpreadsheetId: string, newGid: string) => {
    localStorage.setItem('pro_track_spreadsheet_id', newSpreadsheetId);
    localStorage.setItem('pro_track_gid', newGid);

    setSyncInfo(prev => ({
      ...prev,
      spreadsheetId: newSpreadsheetId,
      gid: newGid,
    }));

    handleSyncData(newSpreadsheetId, newGid, '', 'guest@company.com.vn');
  };

  // Simulated automatic live background update tracker (satisfies "cập nhật thời gian thực")
  useEffect(() => {
    // If successfully synced once, keep syncing from sheets every 60 seconds automatically
    if (syncInfo.spreadsheetId && syncInfo.syncStatus === 'success') {
      const interval = setInterval(() => {
        handleSyncData(
          syncInfo.spreadsheetId,
          syncInfo.gid || '1285066285',
          '',
          'guest@company.com.vn'
        );
      }, 60000); // 1 minute auto refresh

      return () => clearInterval(interval);
    }
  }, [syncInfo.spreadsheetId, syncInfo.gid, syncInfo.syncStatus, handleSyncData]);

  return (
    <div className="flex h-screen w-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      {/* Sidebar Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 z-30 lg:hidden"
        />
      )}

      {/* Sidebar - Sleek Interface Dark Theme */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 flex flex-col shrink-0 h-full text-slate-300 border-r border-slate-800 z-40 lg:static lg:translate-x-0 transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold font-display text-white shadow-md">
              P
            </div>
            <div>
              <span className="font-bold tracking-tight text-md text-white font-display block">PRO-TRACK AI</span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Hệ thống Thầu</span>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation Options */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => {
              setActiveTab('overview');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold transition-all border ${
              activeTab === 'overview'
                ? 'bg-indigo-600/15 text-indigo-400 border-indigo-500/30 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border-transparent'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Tổng quan Lãnh đạo</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('directory');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold transition-all border ${
              activeTab === 'directory'
                ? 'bg-indigo-600/15 text-indigo-400 border-indigo-500/30 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border-transparent'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>Chi tiết Gói thầu</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('sync');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold transition-all border ${
              activeTab === 'sync'
                ? 'bg-indigo-600/15 text-indigo-400 border-indigo-500/30 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border-transparent'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Nguồn & Bảo mật</span>
          </button>
        </nav>

        {/* Bottom Connection Status Panel */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center">
          <div className="flex items-center justify-center gap-2 text-emerald-400 mb-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Đồng bộ trực tiếp</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Hệ thống đang quét dữ liệu thời gian thực từ liên kết Google Sheets công khai.
          </p>
        </div>
      </aside>

      {/* Main Area (Right Content Frame) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header - Sleek Interface Height 16 Frame */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg lg:hidden transition shrink-0"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-md font-bold text-slate-800 tracking-tight font-display truncate">
              Báo Cáo Tiến Độ Gói Thầu
            </h1>
            {syncInfo.syncStatus === 'success' ? (
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] sm:text-[9px] font-bold rounded-md uppercase tracking-wider border border-emerald-200 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="hidden xs:inline">Đồng bộ trực tiếp</span>
              </span>
            ) : (
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[8px] sm:text-[9px] font-bold rounded-md uppercase tracking-wider border border-blue-200 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span className="hidden xs:inline">Dữ liệu mẫu</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Cập nhật lần cuối</p>
              <p className="text-xs font-mono font-bold text-slate-600">
                {syncInfo.lastSyncedAt
                  ? new Date(syncInfo.lastSyncedAt).toLocaleTimeString('vi-VN')
                  : 'Dữ liệu nội bộ'}
              </p>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-2.5 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-xs border border-slate-800 flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-white' : 'text-slate-400'}`} />
              <span>
                <span className="hidden md:inline">{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ Google Sheets'}</span>
                <span className="md:hidden">{isSyncing ? 'Đang đồng bộ' : 'Đồng bộ'}</span>
              </span>
            </button>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50">
          {/* Banner: Sync Success */}
          <AnimatePresence>
            {syncInfo.syncStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-medium"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    Đang kết nối <strong className="font-bold">Đồng bộ Thời Gian Thực (Cập nhật tự động mỗi 60s)</strong> với trang tính: 
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${syncInfo.spreadsheetId}/edit#gid=${syncInfo.gid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-emerald-900 font-semibold ml-1 inline-flex items-center gap-0.5"
                    >
                      "{syncInfo.sheetName || 'Bảng tính Tiến độ'}" <ExternalLink className="w-3 h-3" />
                    </a>
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-md">
                  HOẠT ĐỘNG
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Content Panel with motion animations */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              {/* TAB 1: EXECUTIVE OVERVIEW */}
              {activeTab === 'overview' && (
                <>
                  {/* Metrics Row */}
                  <ExecutiveKpis packages={packages} />

                  {/* Recharts Row */}
                  <ExecutiveCharts packages={packages} />

                  {/* Highlight Delayed / Warning Alert Box */}
                  {packages.some((p) => p.status === 'Chậm tiến độ') && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5 text-rose-800">
                        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Phát hiện gói thầu chậm tiến độ so với mốc bàn giao</span>
                          <span className="opacity-95 leading-relaxed block mt-0.5">
                            Hệ thống phân tích phát hiện{' '}
                            <strong>
                              {packages.filter((p) => p.status === 'Chậm tiến độ').length} gói thầu
                            </strong>{' '}
                            đang bị vướng mắc thực địa (VD: {packages.find((p) => p.status === 'Chậm tiến độ')?.name}). Ban Giám đốc cần đôn đốc và chỉ đạo xử lý kịp thời.
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('directory')}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shrink-0 transition"
                      >
                        Đến danh mục rà soát →
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: DETAILED RECORD LIST */}
              {activeTab === 'directory' && (
                <PackageListTable
                  packages={packages}
                  role={role}
                  userEmail="nhokboytuananh@gmail.com"
                  onUpdatePackage={handleUpdatePackage}
                  onAddPackage={handleAddPackage}
                />
              )}

              {/* TAB 3: CONNECTIONS & SOURCE SETTINGS */}
              {activeTab === 'sync' && (
                <SyncSettings
                  syncInfo={syncInfo}
                  activityLogs={activityLogs}
                  onSpreadsheetConfigChange={handleSpreadsheetConfigChange}
                  onForceSync={handleManualSync}
                  userEmail="nhokboytuananh@gmail.com"
                  accessToken={accessToken}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Premium Minimal Footer */}
          <footer className="pt-6 border-t border-slate-200 text-center text-[11px] text-slate-400">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p>© 2026 Hệ thống Báo cáo Tiến độ Gói thầu Tự động • Thiết kế bảo mật cao cho Lãnh đạo</p>
              <div className="flex justify-center gap-4">
                <span className="flex items-center gap-1 font-semibold text-slate-500">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  Đồng bộ không mật khẩu (Public)
                </span>
                <span className="text-slate-300">|</span>
                <span className="font-mono font-medium text-slate-500">Version 2.4.0 (Vite React 19)</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Global Notification Floating Toasts */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2">
        <AnimatePresence>
          {alertNotification && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className={`p-4 rounded-xl shadow-xl flex items-center gap-3 border text-xs font-medium max-w-sm ${
                alertNotification.type === 'success'
                  ? 'bg-slate-900 border-emerald-500/25 text-white'
                  : alertNotification.type === 'error'
                  ? 'bg-rose-900 border-rose-500/25 text-white'
                  : 'bg-slate-900 border-slate-700 text-white'
              }`}
            >
              <div className="shrink-0">
                {alertNotification.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : alertNotification.type === 'error' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
                ) : (
                  <Info className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="leading-relaxed">{alertNotification.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
