import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  History,
  Info,
  ExternalLink,
  Lock,
  ArrowRight,
  Clipboard,
} from 'lucide-react';
import { GoogleSheetSyncInfo, ActivityLog } from '../types';
import { fetchSpreadsheetSheets, GoogleSheetTab } from '../utils/googleSheets';

interface SyncSettingsProps {
  syncInfo: GoogleSheetSyncInfo;
  activityLogs: ActivityLog[];
  onSpreadsheetConfigChange: (spreadsheetId: string, gid: string) => void;
  onForceSync: () => void;
  userEmail: string | undefined;
  accessToken: string | null;
}

export default function SyncSettings({
  syncInfo,
  activityLogs,
  onSpreadsheetConfigChange,
  onForceSync,
  userEmail,
  accessToken,
}: SyncSettingsProps) {
  const [tempSpreadsheetId, setTempSpreadsheetId] = useState(syncInfo.spreadsheetId);
  const [tempGid, setTempGid] = useState(syncInfo.gid || '1285066285');
  const [isCopied, setIsCopied] = useState(false);

  // States for dynamic sheets/tabs listing
  const [tabs, setTabs] = useState<GoogleSheetTab[]>([]);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);

  const parseGoogleSheetsUrl = (url: string) => {
    const dMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = dMatch ? dMatch[1] : '';

    const gidMatch = url.match(/gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '';

    return { spreadsheetId, gid };
  };

  const handleSpreadsheetIdChange = (val: string) => {
    const trimmed = val.trim();
    if (trimmed.includes('docs.google.com/spreadsheets')) {
      const { spreadsheetId, gid } = parseGoogleSheetsUrl(trimmed);
      if (spreadsheetId) {
        setTempSpreadsheetId(spreadsheetId);
      }
      if (gid) {
        setTempGid(gid);
      }
    } else {
      setTempSpreadsheetId(trimmed);
    }
  };

  useEffect(() => {
    if (!tempSpreadsheetId || tempSpreadsheetId.trim().length < 15) {
      setTabs([]);
      setTabError(null);
      return;
    }

    let isMounted = true;
    const loadTabs = async () => {
      setIsLoadingTabs(true);
      setTabError(null);
      try {
        const fetchedTabs = await fetchSpreadsheetSheets(tempSpreadsheetId.trim(), accessToken, tempGid);
        if (isMounted) {
          setTabs(fetchedTabs);
          // Auto select the first tab ONLY if the current GID is empty.
          // This prevents overwriting user-specified or parsed GID values.
          if (fetchedTabs.length > 0 && !tempGid) {
            setTempGid(fetchedTabs[0].sheetId);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setTabError(err.message || 'Không thể tự động đọc danh sách các Sheet.');
          setTabs([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingTabs(false);
        }
      }
    };

    const timer = setTimeout(() => {
      loadTabs();
    }, 800);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [tempSpreadsheetId, accessToken]);

  const handleApplyConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempSpreadsheetId.trim()) {
      alert('Vui lòng nhập mã bảng tính Google Sheets hợp lệ.');
      return;
    }
    onSpreadsheetConfigChange(tempSpreadsheetId.trim(), tempGid.trim());
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `https://docs.google.com/spreadsheets/d/${syncInfo.spreadsheetId}/edit#gid=${syncInfo.gid || '1285066285'}`
    );
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Box 1: Cấu hình đồng bộ Google Sheets */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <div>
            <h4 className="font-display font-bold text-slate-800 text-sm md:text-base">
              Cấu hình nguồn dữ liệu Google Sheets
            </h4>
            <p className="text-xs text-slate-400">Kết nối thời gian thực bằng Google Sheets API v4</p>
          </div>
        </div>

        {/* Current status display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-xs">
            <span className="text-slate-400 font-medium block">Tệp đang kết nối</span>
            <span className="text-slate-800 font-bold block truncate max-w-[280px]">
              {syncInfo.sheetName ? `Tab: "${syncInfo.sheetName}"` : 'Tải dữ liệu tự động...'}
            </span>
            <span className="text-[10px] text-slate-400 block truncate font-mono">
              ID: {syncInfo.spreadsheetId}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-xs flex flex-col justify-between">
            <div>
              <span className="text-slate-400 font-medium block">Trạng thái đồng bộ</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {syncInfo.syncStatus === 'syncing' && (
                  <span className="text-blue-600 font-bold flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang đồng bộ...
                  </span>
                )}
                {syncInfo.syncStatus === 'success' && (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Kênh thông suốt
                  </span>
                )}
                {syncInfo.syncStatus === 'error' && (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    Lỗi kết nối
                  </span>
                )}
                {syncInfo.syncStatus === 'idle' && (
                  <span className="text-slate-500 font-bold">Chưa kết nối tài khoản</span>
                )}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Cập nhật cuối:{' '}
              <span className="font-mono font-semibold text-slate-600">
                {syncInfo.lastSyncedAt
                  ? new Date(syncInfo.lastSyncedAt).toLocaleTimeString('vi-VN')
                  : 'Chưa khả dụng'}
              </span>
            </span>
          </div>
        </div>

        {/* Change config form */}
        <form onSubmit={handleApplyConfig} className="space-y-4 pt-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Spreadsheet ID hoặc Link liên kết</label>
              <input
                type="text"
                placeholder="Dán toàn bộ link Google Sheet hoặc ID vào đây..."
                value={tempSpreadsheetId}
                onChange={(e) => handleSpreadsheetIdChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Sheet GID (Tab ID)</label>
              <input
                type="text"
                placeholder="VD: 1285066285"
                value={tempGid}
                onChange={(e) => setTempGid(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono text-slate-800"
              />
            </div>
          </div>

          {/* Dynamic Sheet Tabs List Selector */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-800 text-[11px]">
                  Danh sách Sheet phát hiện từ tệp
                </span>
              </div>
              {isLoadingTabs && (
                <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Đang đọc cấu trúc...
                </span>
              )}
            </div>

            {tabs.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500 leading-normal">
                  Tệp của bạn có <strong className="text-slate-700">{tabs.length} sheet</strong>. Nhấn vào một sheet bên dưới để tự động chọn nhanh mã GID:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tabs.map((t) => {
                    const isSelected = String(tempGid) === String(t.sheetId);
                    return (
                      <button
                        key={t.sheetId}
                        type="button"
                        onClick={() => setTempGid(t.sheetId)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <FileSpreadsheet className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                        <span>{t.title}</span>
                        <span className={`text-[9px] font-mono ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                          ({t.sheetId})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 italic py-1 leading-relaxed">
                {tabError ? (
                  <span className="text-rose-600 font-medium">{tabError}</span>
                ) : (
                  <span>Nhập đúng mã Spreadsheet ID ở trên để tự động nhận diện danh sách các Sheet.</span>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-[11px] transition cursor-pointer"
            >
              <Clipboard className="w-3.5 h-3.5" />
              {isCopied ? 'Đã sao chép liên kết!' : 'Sao chép link Google Sheet'}
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-xs cursor-pointer transition"
            >
              Áp dụng nguồn mới
            </button>
          </div>
        </form>

        {/* Detailed error display */}
        {syncInfo.errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Chi tiết lỗi kết nối:</p>
              <p className="opacity-90 mt-0.5 leading-relaxed">{syncInfo.errorMessage}</p>
              <p className="text-[11px] font-medium text-rose-600 mt-1.5 leading-relaxed">
                * Lưu ý: Vui lòng đảm bảo file Sheet đã được chia sẻ ở chế độ công khai ("Bất kỳ ai có liên kết đều có thể xem") để hệ thống có thể kết nối thành công mà không cần mật khẩu hay đăng nhập.
              </p>
            </div>
          </div>
        )}

        {/* Guideline for formatting custom spreadsheets */}
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5 text-xs">
          <h5 className="font-bold text-amber-900 flex items-center gap-1">
            <Info className="w-4 h-4 text-amber-700" />
            Hướng dẫn thiết lập Tiêu đề cột trên Google Sheets để đồng bộ thành công:
          </h5>
          <p className="text-amber-800 leading-relaxed">
            Hệ thống sử dụng cơ chế <strong className="font-semibold text-amber-950">Quét thông minh (Smart Scan)</strong>. Bảng tính của bạn chỉ cần chứa dòng đầu tiên làm tiêu đề cột với các từ khóa nhận diện sau (không phân biệt hoa thường, có dấu hoặc không dấu):
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-amber-900 font-semibold bg-white/60 p-2.5 rounded-lg border border-amber-200">
            <div>• <span className="text-slate-500">Mã gói:</span> "Mã gói thầu", "ID"</div>
            <div>• <span className="text-slate-500">Tên gói:</span> "Tên gói thầu", "Name"</div>
            <div>• <span className="text-slate-500">Tiến độ:</span> "Tiến độ", "%", "Progress"</div>
            <div>• <span className="text-slate-500">Phân loại:</span> "Loại", "Type"</div>
            <div>• <span className="text-slate-500">Dự toán:</span> "Ngân sách", "Dự toán", "Budget"</div>
            <div>• <span className="text-slate-500">Hợp đồng:</span> "Giá trị thầu", "Trúng thầu"</div>
          </div>
        </div>
      </div>

      {/* Box 2: Lịch sử ghi nhận hoạt động (Audit Trail Log) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col h-full space-y-4">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
          <History className="w-5 h-5 text-indigo-600" />
          <div>
            <h4 className="font-display font-bold text-slate-800 text-sm md:text-base">
              Nhật ký vận hành thời gian thực
            </h4>
            <p className="text-xs text-slate-400">Ghi nhận minh bạch lịch sử cập nhật báo cáo</p>
          </div>
        </div>

        {/* Audit stream */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[340px] text-xs">
          {activityLogs.length > 0 ? (
            activityLogs.map((log) => (
              <div key={log.id} className="relative pl-4 border-l-2 border-slate-100 pb-1 last:pb-0">
                {/* Visual bullet */}
                <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-snug font-medium">{log.details}</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Database className="w-3 h-3 text-slate-300" />
                    Bởi: {log.userEmail} • Gói: {log.packageName.substring(0, 30)}
                    {log.packageName.length > 30 ? '...' : ''}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 italic">
              Chưa ghi nhận hoạt động cập nhật nào trong phiên này.
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 leading-relaxed flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            Bảo mật AES-256 mã hóa lưu chuyển đầu ra. Đảm bảo an toàn tài liệu thầu theo Nghị định Chính phủ.
          </p>
        </div>
      </div>
    </div>
  );
}
