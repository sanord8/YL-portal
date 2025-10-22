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
  areaId: string;
  departmentId?: string;
  category?: string;
  reference?: string;
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

// Column mapping (supports multiple languages and variations)
const COLUMN_MAPPINGS = {
  description: [
    'description',
    'descripcion',
    'descripció',
    'desc',
    'concepto',
    'concept',
  ],
  amount: ['amount', 'cantidad', 'quantitat', 'importe', 'monto', 'valor'],
  type: ['type', 'tipo', 'tipus', 'kind'],
  date: ['date', 'fecha', 'data', 'fecha de transacción', 'transaction date'],
  area: ['area', 'área', 'àrea', 'zone', 'zona'],
  department: [
    'department',
    'departamento',
    'departament',
    'dept',
    'dpto',
    'depto',
  ],
  category: ['category', 'categoria', 'categoría', 'cat'],
  reference: ['reference', 'referencia', 'referència', 'ref', 'numero'],
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
 * Parse date from various formats
 */
function parseDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const dateFormats = [
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'yyyy-MM-dd',
    'dd-MM-yyyy',
    'MM-dd-yyyy',
    'yyyy/MM/dd',
    'dd.MM.yyyy',
  ];

  // Try parsing with each format
  for (const format of dateFormats) {
    try {
      const parsed = parse(dateString.trim(), format, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  // Try ISO format
  try {
    const parsed = parseISO(dateString.trim());
    if (isValid(parsed)) {
      return parsed;
    }
  } catch {
    // continue
  }

  return null;
}

/**
 * Parse amount (handles different decimal separators)
 */
function parseAmount(amountString: string | number): number | null {
  if (typeof amountString === 'number') {
    return amountString > 0 ? amountString : null;
  }

  if (!amountString || typeof amountString !== 'string') {
    return null;
  }

  // Remove currency symbols and spaces
  let cleaned = amountString
    .replace(/[€$£¥₹]/g, '')
    .replace(/\s/g, '')
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
  return !isNaN(amount) && amount > 0 ? amount : null;
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
  userId: string
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

    // Validate amount
    const amount = parseAmount(amountCol?.value);
    if (amount === null) {
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

    // Validate type
    const type = normalizeType(typeCol?.value);
    if (!type) {
      rowErrors.push({
        row: rowNumber,
        column: 'Type',
        message: 'Invalid or missing type (must be INCOME or EXPENSE)',
        severity: 'error',
        value: typeCol?.value,
      });
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

    // Validate department (optional)
    let department = null;
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
        rowErrors.push({
          row: rowNumber,
          column: 'Department',
          message: `Department '${departmentCode}' not found in area '${area.code}'`,
          severity: 'error',
          value: departmentCode,
        });
      }
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
      areaId: area?.id || '',
      departmentId: department?.id,
      category,
      reference,
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
): Promise<{ success: number; failed: number; errors: ImportValidationError[] }> {
  let success = 0;
  let failed = 0;
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
          areaId: row.areaId,
          departmentId: row.departmentId,
          category: row.category,
          reference: row.reference,
          status: 'PENDING', // All imported movements start as pending
          createdById: userId,
        },
      });

      success++;
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

  return { success, failed, errors };
}
