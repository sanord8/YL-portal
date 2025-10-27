/**
 * CSV Export Service
 * Generate CSV files with proper escaping and UTF-8 encoding
 */

interface MovementExportData {
  id: string;
  date: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  reference: string;
  area: string;
  areaCode: string;
  department: string;
  departmentCode: string;
  createdBy: string;
  createdAt: string;
}

/**
 * Escape CSV field value
 */
function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(headers: string[], rows: any[][]): string {
  const lines: string[] = [];

  // Add header row
  lines.push(headers.map(escapeCSVField).join(','));

  // Add data rows
  for (const row of rows) {
    lines.push(row.map(escapeCSVField).join(','));
  }

  return lines.join('\n');
}

/**
 * Export movements to CSV
 */
export function exportMovementsToCSV(movements: MovementExportData[]): Buffer {
  const headers = [
    'Date',
    'Type',
    'Status',
    'Amount',
    'Currency',
    'Description',
    'Category',
    'Reference',
    'Area',
    'Area Code',
    'Department',
    'Department Code',
    'Created By',
    'Created At',
  ];

  const rows = movements.map((m) => [
    m.date,
    m.type,
    m.status,
    m.amount,
    m.currency,
    m.description,
    m.category,
    m.reference,
    m.area,
    m.areaCode,
    m.department,
    m.departmentCode,
    m.createdBy,
    m.createdAt,
  ]);

  const csv = arrayToCSV(headers, rows);

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  return Buffer.from(BOM + csv, 'utf8');
}

/**
 * Export balances to CSV
 */
export function exportBalancesToCSV(
  balances: Array<{
    areaName: string;
    areaCode: string;
    currency: string;
    income: number;
    expenses: number;
    balance: number;
  }>
): Buffer {
  const headers = ['Area', 'Area Code', 'Currency', 'Income', 'Expenses', 'Balance'];

  const rows = balances.map((b) => [b.areaName, b.areaCode, b.currency, b.income, b.expenses, b.balance]);

  const csv = arrayToCSV(headers, rows);

  const BOM = '\uFEFF';
  return Buffer.from(BOM + csv, 'utf8');
}

/**
 * Export monthly summary to CSV
 */
export function exportMonthlySummaryToCSV(
  summary: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
    currency: string;
  }>
): Buffer {
  const headers = ['Month', 'Income', 'Expenses', 'Net', 'Currency'];

  const rows = summary.map((s) => [s.month, s.income, s.expenses, s.net, s.currency]);

  const csv = arrayToCSV(headers, rows);

  const BOM = '\uFEFF';
  return Buffer.from(BOM + csv, 'utf8');
}

/**
 * Export category breakdown to CSV
 */
export function exportCategoryBreakdownToCSV(
  categories: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
    currency: string;
  }>
): Buffer {
  const headers = ['Category', 'Amount', 'Transaction Count', 'Percentage', 'Currency'];

  const rows = categories.map((c) => [
    c.category,
    c.amount,
    c.count,
    `${c.percentage.toFixed(2)}%`,
    c.currency,
  ]);

  const csv = arrayToCSV(headers, rows);

  const BOM = '\uFEFF';
  return Buffer.from(BOM + csv, 'utf8');
}
