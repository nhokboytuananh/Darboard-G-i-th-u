export type PackageType = 'Xây lắp' | 'Thiết bị' | 'Tư vấn' | 'Phi tư vấn';

export type PackageStatus = 'Lập kế hoạch' | 'Đang đấu thầu' | 'Đang thực hiện' | 'Hoàn thành' | 'Chậm tiến độ';

export interface BidPackage {
  id: string; // ID or Code (Mã gói thầu)
  name: string; // Tên gói thầu
  type: PackageType; // Loại gói thầu
  selectionMethod: string; // Hình thức lựa chọn nhà thầu
  budget: number; // Giá gói thầu (VND)
  contractValue?: number; // Giá trị hợp đồng / Giá trúng thầu (VND)
  contractor?: string; // Nhà thầu trúng thầu
  progress: number; // Tiến độ (%)
  status: PackageStatus; // Trạng thái
  startDate: string; // Ngày bắt đầu
  endDate: string; // Ngày hoàn thành (dự kiến)
  manager: string; // Người phụ trách
  department: string; // Ban/Phòng phụ trách
  disbursement: number; // Giá trị giải ngân (VND)
  notes?: string; // Ghi chú
  approvalDate?: string; // Ngày phê duyệt KQLCNT
  contractDate?: string; // Ngày ký hợp đồng
  actualStatus?: string; // Thực trạng (đến ngày nay)
  lcntDuration?: number; // Thời gian LCNT (ngày)
}

export type UserRole = 'Lãnh đạo' | 'Quản lý dự án' | 'Chuyên viên';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: string;
  packageName: string;
  details: string;
}

export interface GoogleSheetSyncInfo {
  spreadsheetId: string;
  sheetName: string;
  gid?: string;
  lastSyncedAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}
