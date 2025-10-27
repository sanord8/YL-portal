import * as XLSX from 'xlsx';
import { parse, isValid, parseISO } from 'date-fns';
import { prisma } from '../db/prisma';

// Import validation result types
export interface ImportValidationError {
  row: number;
  column: string;
  message: string;
  severity: 'error' | 'warning';
  value?: any;
}

export interface ImportRow {
  rowNumber: number;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: Date;
  sourceBankAccountId: string; // Bank account being imported
  areaId: string;
  departmentId?: string;
  category?: string;
  reference?: string;
  needsCategorization: boolean; // True if department is missing or invalid
  errors: ImportValidationError[];
  warnings: ImportValidationError[];
}

export interface ImportValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  errorCount: number;
  warningCount: number;
  rows: ImportRow[];
  errors: ImportValidationError[];
  warnings: ImportValidationError[];
}

// Column mapping (supports multiple languages and bank export variations)
const COLUMN_MAPPINGS = {
  description: [
    'description',
    'descripcion',
    'descripció',
    'desc',
    'concepto',
    'concept',
    'descripción',
    'detalle',
    'observaciones',
    'remarks',
    'details',
  ],
  amount: [
    'amount',
    'cantidad',
    'quantitat',
    'importe',
    'monto',
    'valor',
    'total',
    'sum',
  ],
  // Amount credit/debit columns (for bank exports with separate columns)
  amountDebit: ['debe', 'debit', 'débito', 'cargo', 'salida', 'gasto'],
  amountCredit: ['haber', 'credit', 'crédito', 'abono', 'entrada', 'ingreso'],
  type: ['type', 'tipo', 'tipus', 'kind', 'movimiento'],
  date: [
    'date',
    'fecha',
    'data',
    'fecha de transacción',
    'transaction date',
    'fecha operación',
    'fecha operacion',
    'fecha valor',
    'f. operacion',
    'f. valor',
    'operation date',
    'value date',
  ],
  area: ['area', 'área', 'àrea', 'zone', 'zona'],
  department: [
    'department',
    'departamento',
    'departament',
    'dept',
    'dpto',
    'depto',
  ],
  category: ['category', 'categoria', 'categoría', 'cat', 'clase'],
  reference: [
    'reference',
    'referencia',
    'referència',
    'ref',
    'numero',
    'número',
    'nº',
    'num',
    'transaction id',
  ],
};

// Type mappings (supports translations)
const TYPE_MAPPINGS: Record<string, 'INCOME' | 'EXPENSE'> = {
  income: 'INCOME',
  ingreso: 'INCOME',
  ingrés: 'INCOME',
  entrada: 'INCOME',
  expense: 'EXPENSE',
  gasto: 'EXPENSE',
  despesa: 'EXPENSE',
  salida: 'EXPENSE',
  egreso: 'EXPENSE',
};

/**
 * Parse Excel or CSV file to JSON
 */
export function parseFile(buffer: Buffer, filename: string): any[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('No sheets found in file');
  }

  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, {
    raw: false, // Get formatted values
    defval: '', // Default value for empty cells
  });

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No data found in file');
  }

  return data;
}

/**
 * Find column name from variations
 */
function findColumn(
  row: any,
  variations: string[]
): { key: string; value: any } | null {
  const keys = Object.keys(row);

  for (const variation of variations) {
    const matchingKey = keys.find(
      (k) => k.toLowerCase().trim() === variation.toLowerCase()
    );

    if (matchingKey) {
      return { key: matchingKey, value: row[matchingKey] };
    }
  }

  return null;
}

/**
 * Parse date from various formats (enhanced for bank exports)
 */
function parseDate(dateString: string | number): Date | null {
  // Handle Excel serial dates (numbers)
  if (typeof dateString === 'number') {
    // Excel date serial: days since 1900-01-01 (with bug: treats 1900 as leap year)
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    const date = new Date(excelEpoch.getTime() + dateString * 86400000);
    if (isValid(date)) {
      return date;
    }
    return null;
  }

  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const trimmed = dateString.trim();

  // Extended date formats (including Spanish bank formats)
  const dateFormats = [
    'dd/MM/yyyy',
    'dd/MM/yy',
    'dd-MM-yyyy',
    'dd-MM-yy',
    'dd.MM.yyyy',
    'dd.MM.yy',
    'MM/dd/yyyy',
    'MM/dd/yy',
    'yyyy-MM-dd',
    'yyyy/MM/dd',
    'MM-dd-yyyy',
    'd/M/yyyy',
    'd/M/yy',
    'd-M-yyyy',
    'd-M-yy',
  ];

  // Try parsing with each format
  for (const format of dateFormats) {
    try {
      const parsed = parse(trimmed, format, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  // Try ISO format
  try {
    const parsed = parseISO(trimmed);
    if (isValid(parsed)) {
      return parsed;
    }
  } catch {
    // continue
  }

  return null;
}

/**
 * Parse amount (handles different decimal separators and negative values)
 */
function parseAmount(amountString: string | number, allowNegative = false): { amount: number; isNegative: boolean } | null {
  let isNegative = false;

  if (typeof amountString === 'number') {
    isNegative = amountString < 0;
    const absAmount = Math.abs(amountString);
    return absAmount > 0 ? { amount: absAmount, isNegative } : null;
  }

  if (!amountString || typeof amountString !== 'string') {
    return null;
  }

  // Check for negative sign or parentheses (accounting format)
  const originalString = amountString.trim();
  isNegative = originalString.startsWith('-') ||
               originalString.startsWith('(') && originalString.endsWith(')');

  // Remove currency symbols, spaces, and negative indicators
  let cleaned = originalString
    .replace(/[€$£¥₹]/g, '')
    .replace(/[\s()]/g, '')
    .replace(/^-/, '')
    .trim();

  // Handle European format (1.000,50) vs US format (1,000.50)
  // If has both comma and dot, determine which is decimal separator
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    if (lastComma > lastDot) {
      // European format: 1.000,50
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,000.50
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Only comma: could be decimal separator (European) or thousands (US)
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely decimal separator: 100,50
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely thousands separator: 1,000
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const amount = parseFloat(cleaned);
  if (isNaN(amount) || amount === 0) {
    return null;
  }

  return { amount: Math.abs(amount), isNegative };
}

/**
 * Normalize type string to INCOME or EXPENSE
 */
function normalizeType(typeString: string): 'INCOME' | 'EXPENSE' | null {
  if (!typeString || typeof typeString !== 'string') {
    return null;
  }

  const normalized = typeString.toLowerCase().trim();
  return TYPE_MAPPINGS[normalized] || null;
}

/**
 * Validate and parse import file
 */
export async function validateImportFile(
  buffer: Buffer,
  filename: string,
  userId: string,
  sourceBankAccountId: string
): Promise<ImportValidationResult> {
  // Parse file
  let rawData: any[];
  try {
    rawData = parseFile(buffer, filename);
  } catch (error: any) {
    return {
      valid: false,
      totalRows: 0,
      validRows: 0,
      errorCount: 1,
      warningCount: 0,
      rows: [],
      errors: [
        {
          row: 0,
          column: 'file',
          message: error.message || 'Failed to parse file',
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }

  // Get user's accessible areas and departments (for validation)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userAreas: {
        include: {
          area: {
            include: {
              departments: true,
            },
          },
        },
      },
    },
  });

  const accessibleAreaIds = user?.isAdmin
    ? (await prisma.area.findMany({ where: { deletedAt: null } })).map(
        (a) => a.id
      )
    : user?.userAreas.map((ua) => ua.areaId) || [];

  const accessibleAreas = await prisma.area.findMany({
    where: { id: { in: accessibleAreaIds }, deletedAt: null },
    include: { departments: true },
  });

  const areaMap = new Map(accessibleAreas.map((a) => [a.code.toLowerCase(), a]));
  const areaNameMap = new Map(
    accessibleAreas.map((a) => [a.name.toLowerCase(), a])
  );

  const departmentMap = new Map();
  const departmentNameMap = new Map();

  for (const area of accessibleAreas) {
    for (const dept of area.departments) {
      if (!dept.deletedAt) {
        departmentMap.set(
          `${area.code.toLowerCase()}-${dept.code.toLowerCase()}`,
          dept
        );
        departmentNameMap.set(
          `${area.code.toLowerCase()}-${dept.name.toLowerCase()}`,
          dept
        );
      }
    }
  }

  // Validate rows
  const result: ImportValidationResult = {
    valid: true,
    totalRows: rawData.length,
    validRows: 0,
    errorCount: 0,
    warningCount: 0,
    rows: [],
    errors: [],
    warnings: [],
  };

  for (let i = 0; i < rawData.length; i++) {
    const rawRow = rawData[i];
    const rowNumber = i + 2; // +2 because Excel rows start at 1 and we skip header

    const rowErrors: ImportValidationError[] = [];
    const rowWarnings: ImportValidationError[] = [];

    // Extract fields
    const descCol = findColumn(rawRow, COLUMN_MAPPINGS.description);
    const amountCol = findColumn(rawRow, COLUMN_MAPPINGS.amount);
    const amountDebitCol = findColumn(rawRow, COLUMN_MAPPINGS.amountDebit);
    const amountCreditCol = findColumn(rawRow, COLUMN_MAPPINGS.amountCredit);
    const typeCol = findColumn(rawRow, COLUMN_MAPPINGS.type);
    const dateCol = findColumn(rawRow, COLUMN_MAPPINGS.date);
    const areaCol = findColumn(rawRow, COLUMN_MAPPINGS.area);
    const departmentCol = findColumn(rawRow, COLUMN_MAPPINGS.department);
    const categoryCol = findColumn(rawRow, COLUMN_MAPPINGS.category);
    const referenceCol = findColumn(rawRow, COLUMN_MAPPINGS.reference);

    // Validate required fields
    const description = descCol?.value?.toString().trim() || '';
    if (!description) {
      rowErrors.push({
        row: rowNumber,
        column: 'Description',
        message: 'Description is required',
        severity: 'error',
      });
    } else if (description.length > 500) {
      rowErrors.push({
        row: rowNumber,
        column: 'Description',
        message: 'Description cannot exceed 500 characters',
        severity: 'error',
        value: description.substring(0, 50) + '...',
      });
    }

    // Validate amount - handle single column or debit/credit columns
    let amount: number | null = null;
    let type: 'INCOME' | 'EXPENSE' | null = null;
    let amountIsNegative = false;

    // Try debit/credit columns first (bank export format)
    if (amountDebitCol?.value || amountCreditCol?.value) {
      const debitParsed = amountDebitCol?.value ? parseAmount(amountDebitCol.value, true) : null;
      const creditParsed = amountCreditCol?.value ? parseAmount(amountCreditCol.value, true) : null;

      if (debitParsed && debitParsed.amount > 0) {
        amount = debitParsed.amount;
        type = 'EXPENSE';
      } else if (creditParsed && creditParsed.amount > 0) {
        amount = creditParsed.amount;
        type = 'INCOME';
      }
    }

    // Fall back to single amount column
    if (amount === null && amountCol?.value) {
      const parsed = parseAmount(amountCol.value, true);
      if (parsed) {
        amount = parsed.amount;
        amountIsNegative = parsed.isNegative;
      }
    }

    if (amount === null || amount === 0) {
      rowErrors.push({
        row: rowNumber,
        column: 'Amount',
        message: 'Invalid or missing amount',
        severity: 'error',
        value: amountCol?.value,
      });
    } else if (amount > 1000000) {
      // Warning for large amounts (> 1M)
      rowWarnings.push({
        row: rowNumber,
        column: 'Amount',
        message: 'Unusually large amount - please verify',
        severity: 'warning',
        value: amount,
      });
    }

    // Validate type - auto-detect from negative amounts if not specified
    if (!type) {
      const typeValue = normalizeType(typeCol?.value);

      if (typeValue) {
        type = typeValue;
      } else if (amountIsNegative) {
        // Auto-detect: negative amount = expense
        type = 'EXPENSE';
        rowWarnings.push({
          row: rowNumber,
          column: 'Type',
          message: 'Type auto-detected as EXPENSE from negative amount',
          severity: 'warning',
        });
      } else if (!typeCol?.value) {
        // No type column and positive amount - default to EXPENSE with warning
        type = 'EXPENSE';
        rowWarnings.push({
          row: rowNumber,
          column: 'Type',
          message: 'Type not specified - defaulting to EXPENSE',
          severity: 'warning',
        });
      } else {
        rowErrors.push({
          row: rowNumber,
          column: 'Type',
          message: 'Invalid type (must be INCOME or EXPENSE)',
          severity: 'error',
          value: typeCol?.value,
        });
      }
    }

    // Validate date
    const date = parseDate(dateCol?.value);
    if (!date) {
      rowErrors.push({
        row: rowNumber,
        column: 'Date',
        message: 'Invalid or missing date',
        severity: 'error',
        value: dateCol?.value,
      });
    } else if (date > new Date()) {
      rowWarnings.push({
        row: rowNumber,
        column: 'Date',
        message: 'Future date - please verify',
        severity: 'warning',
        value: dateCol?.value,
      });
    }

    // Validate area
    const areaCode = areaCol?.value?.toString().trim() || '';
    let area = areaMap.get(areaCode.toLowerCase());

    if (!area) {
      // Try to find by name
      area = areaNameMap.get(areaCode.toLowerCase());
    }

    if (!areaCode) {
      rowErrors.push({
        row: rowNumber,
        column: 'Area',
        message: 'Area is required',
        severity: 'error',
      });
    } else if (!area) {
      rowErrors.push({
        row: rowNumber,
        column: 'Area',
        message: `Area '${areaCode}' not found or you don't have access`,
        severity: 'error',
        value: areaCode,
      });
    }

    // Validate department (optional - warning if missing or invalid)
    let department = null;
    let needsCategorization = false;
    const departmentCode = departmentCol?.value?.toString().trim() || '';

    if (departmentCode && area) {
      department = departmentMap.get(
        `${area.code.toLowerCase()}-${departmentCode.toLowerCase()}`
      );

      if (!department) {
        department = departmentNameMap.get(
          `${area.code.toLowerCase()}-${departmentCode.toLowerCase()}`
        );
      }

      if (!department) {
        rowWarnings.push({
          row: rowNumber,
          column: 'Department',
          message: `Department '${departmentCode}' not found - will need categorization after import`,
          severity: 'warning',
          value: departmentCode,
        });
        needsCategorization = true;
      }
    } else if (!departmentCode) {
      // No department specified - needs categorization
      rowWarnings.push({
        row: rowNumber,
        column: 'Department',
        message: 'Department not specified - will need categorization after import',
        severity: 'warning',
      });
      needsCategorization = true;
    }

    // Optional fields
    const category = categoryCol?.value?.toString().trim() || undefined;
    const reference = referenceCol?.value?.toString().trim() || undefined;

    // Check for potential duplicates (warning only)
    if (amount && date && description) {
      const existingMovement = await prisma.movement.findFirst({
        where: {
          description: description,
          amount: Math.round(amount * 100), // Convert to cents
          transactionDate: date,
          deletedAt: null,
        },
      });

      if (existingMovement) {
        rowWarnings.push({
          row: rowNumber,
          column: 'All',
          message: 'Potential duplicate found with same description, amount, and date',
          severity: 'warning',
        });
      }
    }

    // Create row result
    const importRow: ImportRow = {
      rowNumber,
      description,
      amount: amount || 0,
      type: type || 'EXPENSE',
      date: date || new Date(),
      sourceBankAccountId,
      areaId: area?.id || '',
      departmentId: department?.id,
      category,
      reference,
      needsCategorization,
      errors: rowErrors,
      warnings: rowWarnings,
    };

    result.rows.push(importRow);
    result.errors.push(...rowErrors);
    result.warnings.push(...rowWarnings);

    if (rowErrors.length === 0) {
      result.validRows++;
    }
  }

  result.errorCount = result.errors.length;
  result.warningCount = result.warnings.length;
  result.valid = result.errorCount === 0;

  return result;
}

/**
 * Execute import of validated rows
 */
export async function executeImport(
  rows: ImportRow[],
  userId: string,
  skipInvalid = true
): Promise<{
  success: number;
  failed: number;
  drafts: number;
  needsCategorization: number;
  errors: ImportValidationError[]
}> {
  let success = 0;
  let failed = 0;
  let drafts = 0;
  let needsCategorization = 0;
  const errors: ImportValidationError[] = [];

  for (const row of rows) {
    // Skip rows with errors if skipInvalid is true
    if (skipInvalid && row.errors.length > 0) {
      failed++;
      errors.push(...row.errors);
      continue;
    }

    try {
      await prisma.movement.create({
        data: {
          description: row.description,
          amount: Math.round(row.amount * 100), // Convert to cents
          type: row.type,
          transactionDate: row.date,
          sourceBankAccountId: row.sourceBankAccountId,
          destinationBankAccountId: null, // Bank imports don't have destination (single-sided entries)
          isInternalTransfer: false, // Bank imports are external transactions
          areaId: row.areaId,
          departmentId: row.departmentId,
          category: row.category,
          reference: row.reference,
          status: 'DRAFT', // All imported movements start as DRAFT
          userId: userId,
        },
      });

      success++;
      drafts++;

      if (row.needsCategorization) {
        needsCategorization++;
      }
    } catch (error: any) {
      failed++;
      errors.push({
        row: row.rowNumber,
        column: 'All',
        message: error.message || 'Failed to create movement',
        severity: 'error',
      });
    }
  }

  return { success, failed, drafts, needsCategorization, errors };
}
