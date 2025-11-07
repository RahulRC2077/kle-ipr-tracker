import * as XLSX from 'xlsx';
import { db, Patent, RenewalPayment } from './db';

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

const parseDate = (value: any): string | null => {
  if (!value) return null;
  
  // If it's already a string in ISO format
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
  }
  
  // Excel serial date
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  
  return null;
};

const extractHyperlink = (cell: any): string | null => {
  if (!cell) return null;
  if (cell.l && cell.l.Target) return cell.l.Target;
  return null;
};

export async function importExcelFile(file: File): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellHTML: false, cellFormula: false });

    // Process Sheet 1 (Main Patents)
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    // Get headers from row 1 (index 1 in the parsed data)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    
    if (jsonData.length < 2) {
      return { success: false, imported: 0, errors: ['No data found in Excel file'] };
    }

    // Row 1 has headers
    const headers = jsonData[1] as string[];
    const dataRows = jsonData.slice(2); // Skip first 2 rows

    // Map column names
    const colMap: any = {};
    headers.forEach((header, idx) => {
      const normalized = String(header).trim().toLowerCase();
      colMap[normalized] = idx;
    });

    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
      const row = dataRows[rowIndex];
      
      try {
        // Get application number with hyperlink
        const appNumCol = colMap['application no'] ?? colMap['application number'] ?? 2;
        const appNumCellRef = XLSX.utils.encode_cell({ r: rowIndex + 2, c: appNumCol });
        const appNumCell = worksheet[appNumCellRef];
        const appNumber = String(row[appNumCol] || '').trim();
        const googleDriveLink = extractHyperlink(appNumCell);

        if (!appNumber) continue;

        // Extract all fields
        const patent: Omit<Patent, 'id'> = {
          application_number: appNumber,
          title: String(row[colMap['invention title'] ?? 10] || '').trim(),
          inventors: String(row[colMap['main innovator'] ?? 13] || '').trim() + 
                    (row[colMap['other innovators'] ?? 14] ? ', ' + String(row[colMap['other innovators'] ?? 14]).trim() : ''),
          applicants: String(row[colMap['applicant'] ?? 12] || '').trim(),
          filed_date: parseDate(row[colMap['application date'] ?? 3]),
          published_date: parseDate(row[colMap['publication date'] ?? 5]),
          granted_date: parseDate(row[colMap['grant date'] ?? 8]),
          status: String(row[colMap['status'] ?? 4] || 'Filed').trim(),
          renewal_due_date: parseDate(row[colMap['renewal\ndate'] ?? colMap['renewal date'] ?? 9]),
          renewal_fee: null,
          last_checked: null,
          ipindia_status_url: appNumber ? `https://ipindiaservices.gov.in/publicsearch` : null,
          google_drive_link: googleDriveLink,
          patent_number: String(row[colMap['patent number'] ?? 6] || '').trim() || null,
          patent_certificate: String(row[colMap['patent certificate view/download'] ?? 7] || '').trim() || null,
          raw_metadata: {
            sl_no: row[0],
            provisional: row[1],
            remarks: row[colMap['remarks'] ?? 16],
            ip_agent: row[colMap['ip agent'] ?? 15],
            details: row[colMap['details of ip in brief'] ?? 11],
            full_row: row
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Check if already exists
        const existing = await db.patents
          .where('application_number')
          .equals(appNumber)
          .first();

        if (existing) {
          // Update existing
          await db.patents.update(existing.id!, patent);
        } else {
          // Add new
          await db.patents.add(patent as Patent);
        }

        imported++;
      } catch (error) {
        errors.push(`Row ${rowIndex + 3}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: true,
      imported,
      errors
    };

  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [error instanceof Error ? error.message : 'Failed to parse Excel file']
    };
  }
}

export async function importFromPublicFile(): Promise<ImportResult> {
  try {
    const response = await fetch('/data/KLE-IPR.xlsx');
    const blob = await response.blob();
    const file = new File([blob], 'KLE-IPR.xlsx');
    return await importExcelFile(file);
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [error instanceof Error ? error.message : 'Failed to load Excel file']
    };
  }
}
