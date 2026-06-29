import { BidPackage, PackageType, PackageStatus } from '../types';

/**
 * Normalizes Vietnamese string to standard lowercase, accentless, trimmed form
 */
export const normalizeHeader = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s/%]/g, '')
    .trim();
};

/**
 * Checks if a normalized header contains a keyword as a complete word/phrase,
 * avoiding accidental partial matches on single words (e.g. "ma" matching "mac").
 */
export const hasKeyword = (header: string, kw: string): boolean => {
  if (!header) return false;
  if (kw.includes(' ')) {
    return header.includes(kw);
  }
  // If kw is not purely alphanumeric (like '%'), use a simple includes check
  if (!/^[a-z0-9]+$/i.test(kw)) {
    return header.includes(kw);
  }
  const regex = new RegExp(`\\b${kw}\\b`);
  return regex.test(header);
};

/**
 * Maps Spreadsheet Row (array of cells) to a structured BidPackage object
 */
export const parseSheetData = (rows: string[][]): BidPackage[] => {
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map(h => normalizeHeader(h || ''));
  const dataRows = rows.slice(1);

  // Find column indexes based on normalized headers using word-boundary-aware matches
  const colIndexMap = {
    id: headers.findIndex(h => hasKeyword(h, 'ma') || hasKeyword(h, 'id') || hasKeyword(h, 'code')),
    name: headers.findIndex(h => hasKeyword(h, 'ten') || hasKeyword(h, 'goi thau') || hasKeyword(h, 'name')),
    type: headers.findIndex(h => hasKeyword(h, 'loai') || hasKeyword(h, 'phan loai') || hasKeyword(h, 'type')),
    selectionMethod: headers.findIndex(h => hasKeyword(h, 'hinh thuc') || hasKeyword(h, 'lua chon') || hasKeyword(h, 'method')),
    budget: headers.findIndex(h => {
      if (hasKeyword(h, 'nha thau') || hasKeyword(h, 'contractor')) return false;
      return (
        hasKeyword(h, 'gia goi thau') || 
        hasKeyword(h, 'du toan') || 
        hasKeyword(h, 'budget') || 
        hasKeyword(h, 'uoc tinh') || 
        (hasKeyword(h, 'gia') && !hasKeyword(h, 'trung') && !hasKeyword(h, 'hd') && !hasKeyword(h, 'hop dong'))
      );
    }),
    contractValue: headers.findIndex(h => {
      if (hasKeyword(h, 'nha thau') || hasKeyword(h, 'contractor')) return false;
      return (
        hasKeyword(h, 'gia hd') || 
        hasKeyword(h, 'gia tri hop dong') || 
        hasKeyword(h, 'hop dong dong') || 
        hasKeyword(h, 'gia hop dong') || 
        hasKeyword(h, 'so tien hd') || 
        hasKeyword(h, 'gia trung') || 
        hasKeyword(h, 'trung thau') || 
        hasKeyword(h, 'contract') || 
        (hasKeyword(h, 'gia') && hasKeyword(h, 'hd')) || 
        (hasKeyword(h, 'gia') && hasKeyword(h, 'hop dong')) || 
        hasKeyword(h, 'gia tri hd')
      );
    }),
    contractor: headers.findIndex(h => hasKeyword(h, 'nha thau') || hasKeyword(h, 'contractor')),
    progress: headers.findIndex(h => hasKeyword(h, 'tien do') || hasKeyword(h, 'phan tram') || hasKeyword(h, 'progress') || hasKeyword(h, '%')),
    status: headers.findIndex(h => hasKeyword(h, 'trang thai') || hasKeyword(h, 'status')),
    startDate: headers.findIndex(h => hasKeyword(h, 'bat dau') || hasKeyword(h, 'start')),
    endDate: headers.findIndex(h => hasKeyword(h, 'hoan thanh') || hasKeyword(h, 'ket thuc') || hasKeyword(h, 'end')),
    manager: headers.findIndex(h => hasKeyword(h, 'phu trach') || hasKeyword(h, 'nguoi') || hasKeyword(h, 'manager') || hasKeyword(h, 'owner') || hasKeyword(h, 'phan cong') || h.includes('th/h') || h.includes('th h')),
    department: headers.findIndex(h => hasKeyword(h, 'don vi') || hasKeyword(h, 'phong') || hasKeyword(h, 'ban') || hasKeyword(h, 'dept') || hasKeyword(h, 'department')),
    disbursement: headers.findIndex(h => hasKeyword(h, 'giai ngan') || hasKeyword(h, 'disburse')),
    notes: headers.findIndex(h => hasKeyword(h, 'ghi chu') || hasKeyword(h, 'note')),
    approvalDate: headers.findIndex(h => hasKeyword(h, 'phe duyet kqlcnt') || hasKeyword(h, 'ngay kqlcnt') || hasKeyword(h, 'ngay pd') || hasKeyword(h, 'phe duyet') || hasKeyword(h, 'kqlcnt')),
    contractDate: headers.findIndex(h => hasKeyword(h, 'ngay ky hop dong') || hasKeyword(h, 'ngay ky hd') || hasKeyword(h, 'ky hop dong') || hasKeyword(h, 'ngay ky contract') || hasKeyword(h, 'ngay ky') || hasKeyword(h, 'ky hd')),
    actualStatus: headers.findIndex(h => hasKeyword(h, 'thuc trang') || hasKeyword(h, 'den ngay nay') || hasKeyword(h, 'tinh hinh') || hasKeyword(h, 'hien tai') || hasKeyword(h, 'tinh trang')),
    lcntDuration: headers.findIndex(h => {
      const norm = h.toLowerCase();
      // Exclude irrelevant columns that happen to contain the word 'lcnt'
      if (
        norm.includes('hinh thuc') || 
        norm.includes('phuong thuc') || 
        norm.includes('ke hoach') || 
        norm.includes('khlcnt') || 
        norm.includes('lan')
      ) {
        return false;
      }
      return (
        norm.includes('thoi gian lcnt') ||
        norm.includes('so ngay lcnt') ||
        norm.includes('tg lcnt') ||
        norm.includes('thoi gian lua chon nha thau') ||
        norm.includes('thoi gian lua chon') ||
        norm === 'lcnt'
      );
    }),
  };

  const parsedPackages: BidPackage[] = [];

  dataRows.forEach((row, index) => {
    // If the row is empty, skip
    if (!row || row.length === 0 || !row[colIndexMap.name > -1 ? colIndexMap.name : 0]) {
      return;
    }

    const getValue = (idx: number): string => (idx > -1 && idx < row.length ? (row[idx] || '').trim() : '');

    const parseNum = (val: string): number => {
      if (!val) return 0;
      let cleaned = val.trim();
      const hasComma = cleaned.includes(',');
      const hasDot = cleaned.includes('.');
      
      if (hasComma && hasDot) {
        if (cleaned.indexOf(',') > cleaned.indexOf('.')) {
          // Vietnamese style: 1.234.567,89
          cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
        } else {
          // US style: 1,234,567.89
          cleaned = cleaned.replace(/,/g, '');
        }
      } else if (hasComma) {
        const parts = cleaned.split(',');
        if (parts.length === 2 && parts[1].length <= 2) {
          cleaned = cleaned.replace(/,/g, '.');
        } else {
          cleaned = cleaned.replace(/,/g, '');
        }
      } else if (hasDot) {
        const parts = cleaned.split('.');
        if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
          cleaned = cleaned.replace(/\./g, '');
        }
      }
      
      const stripped = cleaned.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(stripped);
      return isNaN(parsed) ? 0 : parsed;
    };

    const parsePercent = (val: string): number => {
      if (!val) return 0;
      let cleaned = val.replace('%', '').trim();
      const num = parseFloat(cleaned);
      if (isNaN(num)) return 0;
      // If user typed 0.75 for 75%, handle both:
      if (num > 0 && num < 1 && val.includes('.')) return Math.round(num * 100);
      return Math.round(num);
    };

    const id = getValue(colIndexMap.id) || `GT-${String(index + 1).padStart(2, '0')}`;
    const name = getValue(colIndexMap.name);
    
    // Check if contractor is filled to set Completed/Unfinished status
    const contractorVal = getValue(colIndexMap.contractor);
    const hasContractor = contractorVal !== '';
    let status: PackageStatus = hasContractor ? 'Hoàn thành' : 'Đang thực hiện';

    const rawType = getValue(colIndexMap.type).trim().toUpperCase();
    let type: PackageType = 'Xây lắp';
    
    // Normalize and match Vietnamese bidding standard abbreviations
    if (
      rawType === 'PTV' || 
      rawType.includes('PHI') || 
      rawType.includes('NON-CONSULT')
    ) {
      type = 'Phi tư vấn';
    } else if (
      rawType === 'MS' || 
      rawType === 'HH' || 
      rawType.includes('BỊ') || 
      rawType.includes('THIET BI') || 
      rawType.includes('EQUIPMENT') || 
      rawType.includes('HANG HOA') || 
      rawType.includes('MUA SAM')
    ) {
      type = 'Thiết bị';
    } else if (
      rawType === 'TV' || 
      (rawType.includes('TƯ VẤN') || rawType.includes('TU VAN'))
    ) {
      type = 'Tư vấn';
    } else if (
      rawType === 'XL' || 
      rawType.includes('XÂY LẮP') || 
      rawType.includes('XAY LAP') || 
      rawType.includes('CONSTRUCTION') || 
      rawType.includes('WORKS')
    ) {
      type = 'Xây lắp';
    }

    const selectionMethod = getValue(colIndexMap.selectionMethod) || 'Đấu thầu rộng rãi';
    const budget = parseNum(getValue(colIndexMap.budget)) || 0;
    const contractValue = parseNum(getValue(colIndexMap.contractValue)) || undefined;
    const contractor = contractorVal || undefined;
    const progress = parsePercent(getValue(colIndexMap.progress)) || (hasContractor ? 100 : 0);
    const startDate = getValue(colIndexMap.startDate) || new Date().toISOString().split('T')[0];
    const endDate = getValue(colIndexMap.endDate) || new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const manager = getValue(colIndexMap.manager) || 'Chưa phân công';
    const department = getValue(colIndexMap.department) || 'Ban QLDA';
    const disbursement = parseNum(getValue(colIndexMap.disbursement)) || 0;
    const notes = getValue(colIndexMap.notes) || undefined;
    
    const approvalDate = getValue(colIndexMap.approvalDate) || undefined;
    const contractDate = getValue(colIndexMap.contractDate) || undefined;
    const actualStatus = getValue(colIndexMap.actualStatus) || undefined;

    const lcntDurationVal = getValue(colIndexMap.lcntDuration).trim();
    let lcntDuration: number | undefined = undefined;

    // Only calculate LCNT duration for packages that have an approval date (results)
    if (approvalDate && lcntDurationVal) {
      const isDateStr = lcntDurationVal.includes('/') || lcntDurationVal.includes('-') || lcntDurationVal.includes('.');
      const isLargeNumber = /^\d+$/.test(lcntDurationVal) && parseInt(lcntDurationVal, 10) > 365;

      if (!isDateStr && !isLargeNumber) {
        const parsed = parseNum(lcntDurationVal);
        if (parsed > 0 && parsed <= 365) {
          lcntDuration = parsed;
        }
      }
    }

    if (status === 'Đang thực hiện' && lcntDuration !== undefined && lcntDuration > 40) {
      status = 'Chậm tiến độ';
    }

    parsedPackages.push({
      id,
      name,
      type,
      selectionMethod,
      budget,
      contractValue,
      contractor,
      progress,
      status,
      startDate,
      endDate,
      manager,
      department,
      disbursement,
      notes,
      approvalDate,
      contractDate,
      actualStatus,
      lcntDuration,
    });
  });

  return parsedPackages;
};

/**
 * Fetches Sheet metadata and data dynamically using Sheets API
 */
export const fetchGoogleSheetData = async (
  spreadsheetId: string,
  gid: string,
  accessToken: string
): Promise<{ sheetName: string; packages: BidPackage[] }> => {
  try {
    // 1. Fetch spreadsheet metadata to map GID to Sheet Name
    const metaResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!metaResponse.ok) {
      throw new Error(`Lỗi kết nối API Google Sheets (${metaResponse.status}). Vui lòng kiểm tra quyền truy cập.`);
    }

    const metaData = await metaResponse.json();
    const sheets = metaData.sheets || [];
    
    // Find sheet with the given GID
    const targetSheet = sheets.find(
      (s: any) => String(s.properties?.sheetId) === String(gid)
    );

    const sheetName = targetSheet ? targetSheet.properties.title : sheets[0]?.properties?.title || 'Sheet1';

    // 2. Fetch the values of the sheet
    // We use a large range (A1:AZ500) to get all data
    const valuesResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:AZ500`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!valuesResponse.ok) {
      throw new Error(`Lỗi tải dữ liệu bảng tính ${sheetName} (${valuesResponse.status})`);
    }

    const valuesData = await valuesResponse.json();
    const rows = valuesData.values || [];

    if (rows.length === 0) {
      throw new Error('Tệp bảng tính trống hoặc không có dòng dữ liệu nào.');
    }

    const packages = parseSheetData(rows);
    return { sheetName, packages };
  } catch (error: any) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
};

export interface GoogleSheetTab {
  sheetId: string;
  title: string;
}

/**
 * Fetches the list of sheets/tabs inside a Spreadsheet
 */
export const fetchSpreadsheetSheets = async (
  spreadsheetId: string,
  accessToken: string
): Promise<GoogleSheetTab[]> => {
  try {
    const metaResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!metaResponse.ok) {
      throw new Error(`Không thể tải thông tin danh sách sheet (${metaResponse.status}).`);
    }

    const metaData = await metaResponse.json();
    const sheets = metaData.sheets || [];
    return sheets.map((s: any) => ({
      sheetId: String(s.properties?.sheetId || '0'),
      title: s.properties?.title || 'Sheet1',
    }));
  } catch (error: any) {
    console.error('Error fetching sheets list:', error);
    throw error;
  }
};

