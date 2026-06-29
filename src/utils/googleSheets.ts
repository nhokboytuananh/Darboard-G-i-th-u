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
    
    // Check if contractor, approval date or contract date is filled to set Completed status
    const contractorVal = getValue(colIndexMap.contractor);
    const hasContractor = contractorVal !== '';
    
    const approvalDate = getValue(colIndexMap.approvalDate) || undefined;
    const contractDate = getValue(colIndexMap.contractDate) || undefined;
    const actualStatus = getValue(colIndexMap.actualStatus) || undefined;

    const hasApprovalDate = approvalDate !== undefined && approvalDate !== '';
    const hasContractDate = contractDate !== undefined && contractDate !== '';
    const isCompleted = hasContractor || hasApprovalDate || hasContractDate;

    let status: PackageStatus = isCompleted ? 'Hoàn thành' : 'Đang thực hiện';

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
    const progress = parsePercent(getValue(colIndexMap.progress)) || (isCompleted ? 100 : 0);
    const startDate = getValue(colIndexMap.startDate) || new Date().toISOString().split('T')[0];
    const endDate = getValue(colIndexMap.endDate) || new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const manager = getValue(colIndexMap.manager) || 'Chưa phân công';
    const department = getValue(colIndexMap.department) || 'Ban QLDA';
    const disbursement = parseNum(getValue(colIndexMap.disbursement)) || 0;
    const notes = getValue(colIndexMap.notes) || undefined;
    
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
 * Parses raw CSV text into a 2D array of cells, handling quotes and line breaks safely.
 */
export const parseCSV = (text: string): string[][] => {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\n' || char === '\r') {
        row.push(cell);
        if (row.length > 1 || row[0] !== '') {
          lines.push(row);
        }
        row = [];
        cell = '';
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
      } else {
        cell += char;
      }
    }
  }
  
  if (cell || row.length > 0) {
    row.push(cell);
    lines.push(row);
  }
  
  return lines;
};

/**
 * Definitions for CORS Proxies to use sequentially
 */
const PROXIES = [
  {
    name: 'corsproxy.io',
    getUrl: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    parse: (text: string) => text
  },
  {
    name: 'allorigins.win',
    getUrl: (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    parse: (text: string) => {
      try {
        const json = JSON.parse(text);
        return json.contents || '';
      } catch (e) {
        return text;
      }
    }
  },
  {
    name: 'codetabs.com',
    getUrl: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    parse: (text: string) => text
  },
  {
    name: 'allorigins (raw)',
    getUrl: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    parse: (text: string) => text
  }
];

/**
 * Parallel proxy fetch helper for HTML pages (htmlview/pubhtml)
 */
const fetchPublicHtmlWithProxies = async (spreadsheetId: string): Promise<string> => {
  const htmlViewUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`;
  const pubHtmlUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/pubhtml`;
  const urlsToTry = [htmlViewUrl, pubHtmlUrl];
  
  const tasks: { targetUrl: string; proxy: typeof PROXIES[0] }[] = [];
  for (const targetUrl of urlsToTry) {
    for (const proxy of PROXIES) {
      tasks.push({ targetUrl, proxy });
    }
  }

  return new Promise<string>((resolve, reject) => {
    let completedCount = 0;
    const errors: Error[] = [];
    let resolved = false;
    let isPrivate = false;
    const controllers: AbortController[] = [];

    tasks.forEach(({ targetUrl, proxy }) => {
      const controller = new AbortController();
      controllers.push(controller);

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5000); // 5 seconds timeout per proxy request (highly responsive parallel races)

      const proxyUrl = proxy.getUrl(targetUrl);

      fetch(proxyUrl, { signal: controller.signal })
        .then(async (response) => {
          clearTimeout(timeoutId);
          if (resolved) return;

          if (response.ok) {
            const rawText = await response.text();
            const parsedHtml = proxy.parse(rawText);

            if (parsedHtml && parsedHtml.trim()) {
              if (
                parsedHtml.includes('ServiceLogin') || 
                parsedHtml.includes('accounts.google.com') || 
                parsedHtml.includes('Sign in - Google Accounts') ||
                parsedHtml.includes('DocSignIn')
              ) {
                isPrivate = true;
                throw new Error(
                  'Bảng tính này đang ở chế độ riêng tư (Private). Vui lòng mở Google Sheets, nhấn nút "Chia sẻ" (Share) ở góc trên bên phải, chuyển quyền truy cập thành "Bất kỳ ai có liên kết đều có thể xem" (Anyone with link can view) rồi thử lại.'
                );
              }
              
              const lowerHtml = parsedHtml.toLowerCase();
              const isGoogleSheet = 
                lowerHtml.includes('class="ritz"') || 
                lowerHtml.includes("class='ritz'") ||
                lowerHtml.includes('sheet-button') || 
                lowerHtml.includes('sheets-viewport') || 
                lowerHtml.includes('grid-container') || 
                lowerHtml.includes('id="sheet-menu"') ||
                lowerHtml.includes("id='sheet-menu'") ||
                lowerHtml.includes('id="sheets-viewport"') ||
                lowerHtml.includes('sheetid') ||
                (lowerHtml.includes('gid=') && (lowerHtml.includes('<table') || lowerHtml.includes('class="grid-container"')));

              if (isGoogleSheet) {
                resolved = true;
                // Cancel all other pending fetch requests
                controllers.forEach(c => {
                  try { c.abort(); } catch (e) {}
                });
                resolve(parsedHtml);
                return;
              }
            }
          }
          throw new Error(`Proxy ${proxy.name} không trả về HTML hợp lệ cho ${targetUrl}`);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          if (resolved) return;

          if (err.message && err.message.includes('chế độ riêng tư')) {
            isPrivate = true;
            resolved = true;
            controllers.forEach(c => {
              try { c.abort(); } catch (e) {}
            });
            reject(err);
            return;
          }

          errors.push(err);
          completedCount++;

          if (completedCount === tasks.length) {
            if (isPrivate) {
              reject(new Error('Bảng tính này đang ở chế độ riêng tư (Private). Vui lòng mở Google Sheets và cấu hình chia sẻ "Bất kỳ ai có liên kết đều có thể xem".'));
            } else {
              reject(new Error('Tất cả các dịch vụ proxy đều không thể tải danh sách trang tính.'));
            }
          }
        });
    });
  });
};

/**
 * Fetches Sheet metadata and data dynamically using Sheets API
 */
export const fetchGoogleSheetData = async (
  spreadsheetId: string,
  gid: string,
  accessToken: string
): Promise<{ sheetName: string; packages: BidPackage[] }> => {
  const publicUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  
  // Attempt 1: Direct public CSV fetch (Fastest, cleanest, uses native Google CORS)
  const urlsToTryDirectly = [
    { url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/pub?output=csv&gid=${gid}`, name: 'Published Web CSV' },
    { url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`, name: 'Export CSV' }
  ];

  for (const item of urlsToTryDirectly) {
    try {
      console.log(`[CSV Sync] Đang thử kết nối trực tiếp tải dữ liệu CSV từ ${item.name}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout to 15 seconds
      const response = await fetch(item.url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const csvText = await response.text();
        
        // Check if we got redirected to a login page (private sheet)
        if (
          csvText.includes('ServiceLogin') || 
          csvText.includes('accounts.google.com') || 
          csvText.includes('Sign in - Google Accounts') ||
          csvText.includes('DocSignIn')
        ) {
          throw new Error(
            'Bảng tính đang ở chế độ riêng tư (Private). Vui lòng mở Google Sheets, nhấn nút "Chia sẻ" (Share), chuyển quyền truy cập thành "Bất kỳ ai có liên kết đều có thể xem" (Anyone with link can view) rồi thử lại.'
          );
        }

        const rows = parseCSV(csvText);
        if (rows.length > 0) {
          const packages = parseSheetData(rows);
          if (packages.length === 0) {
            throw new Error(
              'Không tìm thấy cột tiêu đề thầu hợp lệ (Cần có ít nhất cột: "Mã gói thầu", "Tên gói thầu", "Trạng thái", "Tiến độ"). Vui lòng kiểm tra lại dòng tiêu đề đầu tiên.'
            );
          }
          console.log(`[CSV Sync] Tải trực tiếp thành công ${packages.length} gói thầu từ Google Sheets (${item.name})!`);
          return { 
            sheetName: 'Bảng tính (Kết nối công khai trực tiếp)', 
            packages 
          };
        }
      }
    } catch (directError: any) {
      console.warn(`[CSV Sync] Thử tải trực tiếp từ ${item.name} thất bại:`, directError.message || directError);
      if (directError.message && directError.message.includes('riêng tư')) {
        throw directError;
      }
    }
  }

  // Attempt 2: Fallback to standard authenticated Google Sheets API (if accessToken is valid and API is enabled)
  let apiError: Error | null = null;
  if (accessToken) {
    try {
      console.log('Attempting to fetch via standard authenticated Google Sheets API...');
      // 1. Fetch spreadsheet metadata to map GID to Sheet Name
      const metaResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!metaResponse.ok) {
        let detail = '';
        try {
          const errJson = await metaResponse.json();
          if (errJson?.error?.message) {
            detail = errJson.error.message;
          }
        } catch (e) {}

        let friendlyMessage = `Lỗi kết nối API Google Sheets (${metaResponse.status})`;
        if (metaResponse.status === 403) {
          if (detail.includes('API has not been used in project') || detail.includes('disabled')) {
            friendlyMessage += `: Google Sheets API chưa được bật trong Google Cloud Console của dự án Firebase của bạn. Vui lòng vào Cloud Console và Kích hoạt (Enable) API này.`;
          } else {
            friendlyMessage += `: Chưa được cấp quyền truy cập. Cách khắc phục: Hãy dán liên kết chia sẻ công khai và chọn sheet.`;
          }
        } else if (metaResponse.status === 404) {
          friendlyMessage += `: Không tìm thấy file Google Sheet. Vui lòng kiểm tra lại mã ID bảng tính (Spreadsheet ID) xem đã chính xác chưa.`;
        } else if (detail) {
          friendlyMessage += `: ${detail}`;
        }
        throw new Error(friendlyMessage);
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
        let detail = '';
        try {
          const errJson = await valuesResponse.json();
          if (errJson?.error?.message) {
            detail = errJson.error.message;
          }
        } catch (e) {}

        let friendlyMessage = `Lỗi tải dữ liệu bảng tính ${sheetName} (${valuesResponse.status})`;
        if (detail) {
          friendlyMessage += `: ${detail}`;
        }
        throw new Error(friendlyMessage);
      }

      const valuesData = await valuesResponse.json();
      const rows = valuesData.values || [];

      if (rows.length === 0) {
        throw new Error('Tệp bảng tính trống hoặc không có dòng dữ liệu nào.');
      }

      const packages = parseSheetData(rows);
      return { sheetName, packages };
    } catch (error: any) {
      console.warn('Google Sheets API failed.', error);
      apiError = error;
    }
  }

  let lastProxyError: Error | null = null;

  // Attempt 3: Fetch via Public CORS proxies in parallel
  console.log('[CSV Sync] Đang thử kết nối tải CSV song song qua các Proxy...');
  try {
    const csvContent = await new Promise<string>((resolve, reject) => {
      let completedCount = 0;
      let resolved = false;
      let isPrivate = false;
      const controllers: AbortController[] = [];

      PROXIES.forEach((proxy) => {
        const controller = new AbortController();
        controllers.push(controller);

        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 7000); // 7 seconds timeout per proxy

        const proxyUrl = proxy.getUrl(publicUrl);

        fetch(proxyUrl, { signal: controller.signal })
          .then(async (response) => {
            clearTimeout(timeoutId);
            if (resolved) return;

            if (response.ok) {
              const rawText = await response.text();
              const parsedCsv = proxy.parse(rawText);

              if (parsedCsv && parsedCsv.trim()) {
                if (
                  parsedCsv.includes('ServiceLogin') || 
                  parsedCsv.includes('accounts.google.com') || 
                  parsedCsv.includes('Sign in - Google Accounts') ||
                  parsedCsv.includes('DocSignIn')
                ) {
                  isPrivate = true;
                  throw new Error(
                    'Bảng tính đang ở chế độ riêng tư (Private). Vui lòng mở Google Sheets, nhấn nút "Chia sẻ" (Share), chuyển quyền truy cập thành "Bất kỳ ai có liên kết đều có thể xem" (Anyone with link can view) rồi thử lại.'
                  );
                }

                if (parsedCsv.includes(',') || parsedCsv.includes('\t') || parsedCsv.includes(';') || parsedCsv.includes('\n')) {
                  resolved = true;
                  controllers.forEach(c => {
                    try { c.abort(); } catch (e) {}
                  });
                  resolve(parsedCsv);
                  return;
                }
              }
            }
            throw new Error(`Proxy ${proxy.name} returned invalid content`);
          })
          .catch((err) => {
            clearTimeout(timeoutId);
            if (resolved) return;

            if (err.message && err.message.includes('chế độ riêng tư')) {
              isPrivate = true;
              resolved = true;
              controllers.forEach(c => {
                try { c.abort(); } catch (e) {}
              });
              reject(err);
              return;
            }

            completedCount++;

            if (completedCount === PROXIES.length) {
              if (isPrivate) {
                reject(new Error('Bảng tính này đang ở chế độ riêng tư (Private). Vui lòng mở Google Sheets và cấu hình chia sẻ "Bất kỳ ai có liên kết đều có thể xem".'));
              } else {
                reject(new Error('Tất cả các dịch vụ proxy đồng bộ dữ liệu đều thất bại hoặc hết thời gian (Timeout).'));
              }
            }
          });
      });
    });

    const rows = parseCSV(csvContent);
    if (rows.length > 0) {
      const packages = parseSheetData(rows);
      if (packages.length === 0) {
        throw new Error(
          'Không tìm thấy cột tiêu đề thầu hợp lệ (Cần có ít nhất cột: "Mã gói thầu", "Tên gói thầu", "Trạng thái", "Tiến độ"). Vui lòng kiểm tra lại dòng tiêu đề đầu tiên.'
        );
      }
      console.log(`[CSV Sync] Đồng bộ qua Proxy thành công với ${packages.length} gói thầu!`);
      return { 
        sheetName: 'Bảng tính (Đồng bộ qua Proxy)', 
        packages 
      };
    }
  } catch (proxyError: any) {
    console.warn('[CSV Sync] Tất cả phương thức đồng bộ CSV qua proxy đều thất bại:', proxyError.message || proxyError);
    if (proxyError.message && (proxyError.message.includes('riêng tư') || proxyError.message.includes('tiêu đề thầu'))) {
      throw proxyError;
    }
    lastProxyError = proxyError;
  }

  // Final fallback error handling
  const mainMsg = apiError 
    ? apiError.message 
    : lastProxyError 
      ? lastProxyError.message 
      : 'Lỗi kết nối hoặc không tìm thấy bảng tính.';
  throw new Error(
    `${mainMsg} (Vui lòng đảm bảo file Sheet đã được chia sẻ ở chế độ "Bất kỳ ai có liên kết đều có thể xem").`
  );
};

export interface GoogleSheetTab {
  sheetId: string;
  title: string;
}

/**
 * Public scraper to fetch sheet tabs from a public Google Sheet using multi-proxy loops.
 */
export const fetchPublicSheetsScraper = async (spreadsheetId: string, currentGid?: string): Promise<GoogleSheetTab[]> => {
  try {
    const html = await fetchPublicHtmlWithProxies(spreadsheetId);

    const tabs: GoogleSheetTab[] = [];
    let match;

    // Pattern 1: Match list items <li id="sheet-button-xxxxx"><a>Tab Title</a></li>
    const liRegex = /<li[^>]+id=["']sheet-button-([0-9]+)["'][^>]*>(.*?)<\/li>/gi;
    while ((match = liRegex.exec(html)) !== null) {
      const sheetId = match[1];
      const innerHtml = match[2];
      const title = innerHtml.replace(/<[^>]*>/g, '').trim();
      if (sheetId && title) {
        tabs.push({ sheetId, title });
      }
    }

    // Pattern 2: Match JSON blocks containing {"sheetId":xxxxx,"title":"Tab Title"} or sheetId:xxxxx,title:"Tab Title"
    if (tabs.length === 0) {
      const jsonRegex = /(?:"sheetId"|'sheetId'|sheetId)\s*:\s*([0-9]+)\s*,\s*(?:"title"|'title'|title)\s*:\s*["']([^"']+)["']/gi;
      while ((match = jsonRegex.exec(html)) !== null) {
        const sheetId = match[1];
        const title = match[2];
        if (sheetId && title && !tabs.some(t => t.sheetId === sheetId)) {
          tabs.push({ sheetId, title });
        }
      }
    }

    // Pattern 3: Match general links with gid=xxxxx
    if (tabs.length === 0) {
      const linkRegex = /href=["'][^"']*gid=([0-9]+)[^"']*["'][^>]*>([^<]+)<\/a>/gi;
      while ((match = linkRegex.exec(html)) !== null) {
        const sheetId = match[1];
        const title = match[2].replace(/<[^>]*>/g, '').trim();
        if (sheetId && title && title.length < 50 && !/^(next|previous|click|here|view|link|edit)$/i.test(title)) {
          if (!tabs.some(t => t.sheetId === sheetId)) {
            tabs.push({ sheetId, title });
          }
        }
      }
    }

    // Filter unique sheetIds
    const uniqueTabs: GoogleSheetTab[] = [];
    const seenIds = new Set<string>();
    for (const tab of tabs) {
      if (!seenIds.has(tab.sheetId)) {
        seenIds.add(tab.sheetId);
        uniqueTabs.push(tab);
      }
    }

    if (uniqueTabs.length > 0) {
      console.log(`[Scraper] Tìm thấy ${uniqueTabs.length} sheet từ htmlview!`, uniqueTabs);
      return uniqueTabs;
    }
  } catch (err: any) {
    console.warn('fetchPublicSheetsScraper warning:', err);
    if (err.message && err.message.includes('chế độ riêng tư')) {
      throw err;
    }
  }
  
  // Return the current/parsed GID if available, so user has their correct sheet/tab as an option
  const fallbackGid = currentGid || '0';
  const fallbackTitle = currentGid && currentGid !== '0' 
    ? `Bảng tính công khai (Mã GID: ${currentGid})` 
    : 'Bảng tính công khai (Tự động)';
  return [{ sheetId: fallbackGid, title: fallbackTitle }];
};

/**
 * Fetches the list of sheets/tabs inside a Spreadsheet
 */
export const fetchSpreadsheetSheets = async (
  spreadsheetId: string,
  accessToken: string | null,
  currentGid?: string
): Promise<GoogleSheetTab[]> => {
  // If we don't have an accessToken, use the public scraper
  if (!accessToken) {
    return await fetchPublicSheetsScraper(spreadsheetId, currentGid);
  }

  try {
    const metaResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!metaResponse.ok) {
      let detail = '';
      try {
        const errJson = await metaResponse.json();
        if (errJson?.error?.message) {
          detail = errJson.error.message;
        }
      } catch (e) {}

      let friendlyMessage = `Không thể tải thông tin danh sách sheet (${metaResponse.status})`;
      if (metaResponse.status === 403) {
        if (detail.includes('API has not been used in project') || detail.includes('disabled')) {
          friendlyMessage += `: Google Sheets API chưa được bật trong Google Cloud Console của dự án Firebase.`;
        } else {
          friendlyMessage += `: Chưa được cấp quyền truy cập. Hãy dán liên kết chia sẻ công khai và chọn sheet.`;
        }
      } else if (metaResponse.status === 404) {
        friendlyMessage += `: Không tìm thấy file Google Sheet. Vui lòng kiểm tra lại ID bảng tính.`;
      } else if (detail) {
        friendlyMessage += `: ${detail}`;
      }
      throw new Error(friendlyMessage);
    }

    const metaData = await metaResponse.json();
    const sheets = metaData.sheets || [];
    return sheets.map((s: any) => ({
      sheetId: String(s.properties?.sheetId || '0'),
      title: s.properties?.title || 'Sheet1',
    }));
  } catch (error: any) {
    console.warn('fetchSpreadsheetSheets API failed. Trying public fallback...', error);
    return await fetchPublicSheetsScraper(spreadsheetId, currentGid);
  }
};

