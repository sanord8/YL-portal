import * as XLSX from 'xlsx';

/**
 * Excel Export Service
 * Generate Excel workbooks with multiple sheets and formatting
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

interface BalanceData {
  areaId: string;
  areaName: string;
  areaCode: string;
  currency: string;
  income: number;
  expenses: number;
  balance: number;
}

interface MonthlySummaryData {
  month: string;
  income: number;
  expenses: number;
  net: number;
  currency: string;
}

interface CategoryBreakdownData {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  currency: string;
}

/**
 * Export movements to Excel
 */
export function exportMovementsToExcel(
  movements: MovementExportData[],
  options: { filename?: string } = {}
): Buffer {
  const workbook = XLSX.utils.book_new();

  // Create movements sheet
  const movementsData = movements.map((m) => ({
    Date: m.date,
    Type: m.type,
    Status: m.status,
    Amount: m.amount,
    Currency: m.currency,
    Description: m.description,
    Category: m.category,
    Reference: m.reference,
    Area: `${m.area} (${m.areaCode})`,
    Department: m.department ? `${m.department} (${m.departmentCode})` : '',
    'Created By': m.createdBy,
    'Created At': m.createdAt,
  }));

  const movementsSheet = XLSX.utils.json_to_sheet(movementsData);

  // Set column widths
  movementsSheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 12 }, // Type
    { wch: 10 }, // Status
    { wch: 12 }, // Amount
    { wch: 8 }, // Currency
    { wch: 40 }, // Description
    { wch: 15 }, // Category
    { wch: 15 }, // Reference
    { wch: 20 }, // Area
    { wch: 20 }, // Department
    { wch: 20 }, // Created By
    { wch: 12 }, // Created At
  ];

  XLSX.utils.book_append_sheet(workbook, movementsSheet, 'Movements');

  // Calculate totals by type
  const totals = movements.reduce(
    (acc, m) => {
      if (m.type === 'INCOME') acc.income += m.amount;
      else if (m.type === 'EXPENSE') acc.expenses += m.amount;
      return acc;
    },
    { income: 0, expenses: 0 }
  );

  // Create summary sheet
  const summaryData = [
    { Metric: 'Total Income', Value: totals.income },
    { Metric: 'Total Expenses', Value: totals.expenses },
    { Metric: 'Net', Value: totals.income - totals.expenses },
    { Metric: '', Value: '' },
    { Metric: 'Total Movements', Value: movements.length },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Generate buffer
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Export balances to Excel
 */
export function exportBalancesToExcel(balances: BalanceData[]): Buffer {
  const workbook = XLSX.utils.book_new();

  // Create balances sheet
  const balancesData = balances.map((b) => ({
    Area: `${b.areaName} (${b.areaCode})`,
    Currency: b.currency,
    Income: b.income,
    Expenses: b.expenses,
    Balance: b.balance,
  }));

  const balancesSheet = XLSX.utils.json_to_sheet(balancesData);
  balancesSheet['!cols'] = [
    { wch: 25 }, // Area
    { wch: 10 }, // Currency
    { wch: 15 }, // Income
    { wch: 15 }, // Expenses
    { wch: 15 }, // Balance
  ];

  XLSX.utils.book_append_sheet(workbook, balancesSheet, 'Balances');

  // Calculate grand totals (assuming all same currency for simplicity)
  const grandTotals = balances.reduce(
    (acc, b) => {
      acc.income += b.income;
      acc.expenses += b.expenses;
      acc.balance += b.balance;
      return acc;
    },
    { income: 0, expenses: 0, balance: 0 }
  );

  // Create totals sheet
  const totalsData = [
    { Metric: 'Total Income (All Areas)', Value: grandTotals.income },
    { Metric: 'Total Expenses (All Areas)', Value: grandTotals.expenses },
    { Metric: 'Net Balance (All Areas)', Value: grandTotals.balance },
  ];

  const totalsSheet = XLSX.utils.json_to_sheet(totalsData);
  totalsSheet['!cols'] = [{ wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, totalsSheet, 'Grand Totals');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Export monthly summary to Excel
 */
export function exportMonthlySummaryToExcel(summary: MonthlySummaryData[]): Buffer {
  const workbook = XLSX.utils.book_new();

  // Create monthly data sheet
  const monthlyData = summary.map((s) => ({
    Month: s.month,
    Income: s.income,
    Expenses: s.expenses,
    Net: s.net,
    Currency: s.currency,
  }));

  const monthlySheet = XLSX.utils.json_to_sheet(monthlyData);
  monthlySheet['!cols'] = [
    { wch: 10 }, // Month
    { wch: 15 }, // Income
    { wch: 15 }, // Expenses
    { wch: 15 }, // Net
    { wch: 8 }, // Currency
  ];

  XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Monthly Summary');

  // Calculate period totals
  const periodTotals = summary.reduce(
    (acc, s) => {
      acc.income += s.income;
      acc.expenses += s.expenses;
      acc.net += s.net;
      return acc;
    },
    { income: 0, expenses: 0, net: 0 }
  );

  // Create totals sheet
  const totalsData = [
    { Metric: 'Period Start', Value: summary[0]?.month || 'N/A' },
    { Metric: 'Period End', Value: summary[summary.length - 1]?.month || 'N/A' },
    { Metric: '', Value: '' },
    { Metric: 'Total Income', Value: periodTotals.income },
    { Metric: 'Total Expenses', Value: periodTotals.expenses },
    { Metric: 'Net', Value: periodTotals.net },
    { Metric: '', Value: '' },
    { Metric: 'Average Monthly Income', Value: periodTotals.income / (summary.length || 1) },
    { Metric: 'Average Monthly Expenses', Value: periodTotals.expenses / (summary.length || 1) },
  ];

  const totalsSheet = XLSX.utils.json_to_sheet(totalsData);
  totalsSheet['!cols'] = [{ wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, totalsSheet, 'Period Totals');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Export category breakdown to Excel
 */
export function exportCategoryBreakdownToExcel(categories: CategoryBreakdownData[]): Buffer {
  const workbook = XLSX.utils.book_new();

  // Create categories sheet
  const categoriesData = categories.map((c) => ({
    Category: c.category,
    Amount: c.amount,
    'Transaction Count': c.count,
    'Percentage of Total': `${c.percentage.toFixed(2)}%`,
    Currency: c.currency,
  }));

  const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData);
  categoriesSheet['!cols'] = [
    { wch: 20 }, // Category
    { wch: 15 }, // Amount
    { wch: 18 }, // Transaction Count
    { wch: 18 }, // Percentage
    { wch: 8 }, // Currency
  ];

  XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Category Breakdown');

  // Calculate totals
  const totals = categories.reduce(
    (acc, c) => {
      acc.amount += c.amount;
      acc.count += c.count;
      return acc;
    },
    { amount: 0, count: 0 }
  );

  // Create totals sheet
  const totalsData = [
    { Metric: 'Total Categories', Value: categories.length },
    { Metric: 'Total Amount', Value: totals.amount },
    { Metric: 'Total Transactions', Value: totals.count },
    { Metric: '', Value: '' },
    { Metric: 'Average per Category', Value: totals.amount / (categories.length || 1) },
    { Metric: 'Average per Transaction', Value: totals.amount / (totals.count || 1) },
  ];

  const totalsSheet = XLSX.utils.json_to_sheet(totalsData);
  totalsSheet['!cols'] = [{ wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, totalsSheet, 'Totals');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
