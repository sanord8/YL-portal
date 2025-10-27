/**
 * PDF Export Utilities
 * Generate branded PDFs for all report types
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TableCell } from 'pdfmake/interfaces';
import {
  YL_COLORS,
  createBasePDF,
  createBasePDFLandscape,
  formatCurrency,
  formatDate,
  getStatusColor,
  getTypeColor,
  getRowColor,
} from './pdfBranding';

// Set up fonts
pdfMake.vfs = pdfFonts.pdfMake.vfs;

// ==================== INTERFACES ====================

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

interface UserMonthlyExpenseData {
  userId: string;
  userName: string;
  userEmail: string;
  monthlyExpenses: Array<{
    month: string;
    totalExpenses: number;
    count: number;
    currency: string;
  }>;
  grandTotal: number;
  transactionCount: number;
  currency: string;
}

interface AdminRundownData {
  period: {
    start: string;
    end: string;
  };
  topSpenders: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    totalSpent: number;
    transactionCount: number;
    currency: string;
  }>;
  budgetUtilization: Array<{
    areaId: string;
    areaName: string;
    areaCode: string;
    budget: number;
    spent: number;
    utilization: number;
    currency: string;
  }>;
  spendingTrends: {
    totalIncome: number;
    totalExpenses: number;
    netPosition: number;
    monthOverMonth: Array<{
      month: string;
      income: number;
      expenses: number;
      net: number;
      changePercentage: number;
    }>;
    averageMonthlyExpense: number;
    projectedMonthEnd: number;
  };
  stats: {
    totalUsers: number;
    totalMovements: number;
    pendingApprovals: number;
  };
}

// ==================== EXPORT FUNCTIONS ====================

/**
 * Export movements to PDF
 */
export function exportMovementsToPDF(movements: MovementExportData[]): void {
  const tableBody: TableCell[][] = [
    // Header row
    [
      { text: 'Date', style: 'tableHeader' },
      { text: 'Type', style: 'tableHeader' },
      { text: 'Status', style: 'tableHeader' },
      { text: 'Amount', style: 'tableHeader', alignment: 'right' },
      { text: 'Description', style: 'tableHeader' },
      { text: 'Area', style: 'tableHeader' },
      { text: 'Department', style: 'tableHeader' },
    ],
  ];

  // Data rows
  movements.forEach((movement, index) => {
    tableBody.push([
      { text: formatDate(movement.date), style: 'tableCell', fillColor: getRowColor(index) },
      {
        text: movement.type,
        style: 'tableCell',
        color: getTypeColor(movement.type),
        fillColor: getRowColor(index),
      },
      {
        text: movement.status,
        style: 'tableCell',
        color: getStatusColor(movement.status),
        fillColor: getRowColor(index),
      },
      {
        text: formatCurrency(movement.amount, movement.currency),
        style: 'tableCellRight',
        fillColor: getRowColor(index),
      },
      {
        text: movement.description || '-',
        style: 'tableCell',
        fillColor: getRowColor(index),
      },
      {
        text: `${movement.area} (${movement.areaCode})`,
        style: 'tableCell',
        fillColor: getRowColor(index),
      },
      {
        text: movement.department ? `${movement.department} (${movement.departmentCode})` : '-',
        style: 'tableCell',
        fillColor: getRowColor(index),
      },
    ]);
  });

  const content: Content = [
    {
      text: `Total Movements: ${movements.length}`,
      style: 'infoText',
      marginBottom: 10,
    },
    {
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', 'auto', 'auto', '*', 'auto', 'auto'],
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => YL_COLORS.gray[200],
        vLineColor: () => YL_COLORS.gray[200],
      },
    },
  ];

  const docDefinition = createBasePDFLandscape(content, 'Movements Report');

  pdfMake.createPdf(docDefinition).download(`movements_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export balances to PDF
 */
export function exportBalancesToPDF(balances: BalanceData[]): void {
  const tableBody: TableCell[][] = [
    // Header row
    [
      { text: 'Area', style: 'tableHeader' },
      { text: 'Code', style: 'tableHeader' },
      { text: 'Income', style: 'tableHeader', alignment: 'right' },
      { text: 'Expenses', style: 'tableHeader', alignment: 'right' },
      { text: 'Balance', style: 'tableHeader', alignment: 'right' },
    ],
  ];

  // Data rows
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalBalance = 0;

  balances.forEach((balance, index) => {
    totalIncome += balance.income;
    totalExpenses += balance.expenses;
    totalBalance += balance.balance;

    tableBody.push([
      { text: balance.areaName, style: 'tableCell', fillColor: getRowColor(index) },
      { text: balance.areaCode, style: 'tableCell', fillColor: getRowColor(index) },
      {
        text: formatCurrency(balance.income, balance.currency),
        style: 'tableCellRight',
        color: YL_COLORS.income,
        fillColor: getRowColor(index),
      },
      {
        text: formatCurrency(balance.expenses, balance.currency),
        style: 'tableCellRight',
        color: YL_COLORS.expense,
        fillColor: getRowColor(index),
      },
      {
        text: formatCurrency(balance.balance, balance.currency),
        style: 'tableCellRight',
        color: balance.balance >= 0 ? YL_COLORS.income : YL_COLORS.expense,
        bold: true,
        fillColor: getRowColor(index),
      },
    ]);
  });

  // Total row
  tableBody.push([
    { text: 'TOTAL', style: 'totalRow', colSpan: 2 },
    {},
    {
      text: formatCurrency(totalIncome, balances[0]?.currency || 'EUR'),
      style: 'totalRow',
      alignment: 'right',
      color: YL_COLORS.income,
    },
    {
      text: formatCurrency(totalExpenses, balances[0]?.currency || 'EUR'),
      style: 'totalRow',
      alignment: 'right',
      color: YL_COLORS.expense,
    },
    {
      text: formatCurrency(totalBalance, balances[0]?.currency || 'EUR'),
      style: 'totalRow',
      alignment: 'right',
      color: totalBalance >= 0 ? YL_COLORS.income : YL_COLORS.expense,
    },
  ]);

  const content: Content = [
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => YL_COLORS.gray[200],
        vLineColor: () => YL_COLORS.gray[200],
      },
    },
  ];

  const docDefinition = createBasePDF(content, 'Area Balances Report');

  pdfMake.createPdf(docDefinition).download(`balances_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export monthly summary to PDF
 */
export function exportMonthlySummaryToPDF(summary: MonthlySummaryData[]): void {
  const tableBody: TableCell[][] = [
    // Header row
    [
      { text: 'Month', style: 'tableHeader' },
      { text: 'Income', style: 'tableHeader', alignment: 'right' },
      { text: 'Expenses', style: 'tableHeader', alignment: 'right' },
      { text: 'Net', style: 'tableHeader', alignment: 'right' },
    ],
  ];

  // Data rows
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalNet = 0;

  summary.forEach((month, index) => {
    totalIncome += month.income;
    totalExpenses += month.expenses;
    totalNet += month.net;

    tableBody.push([
      { text: month.month, style: 'tableCell', fillColor: getRowColor(index) },
      {
        text: formatCurrency(month.income, month.currency),
        style: 'tableCellRight',
        color: YL_COLORS.income,
        fillColor: getRowColor(index),
      },
      {
        text: formatCurrency(month.expenses, month.currency),
        style: 'tableCellRight',
        color: YL_COLORS.expense,
        fillColor: getRowColor(index),
      },
      {
        text: formatCurrency(month.net, month.currency),
        style: 'tableCellRight',
        color: month.net >= 0 ? YL_COLORS.income : YL_COLORS.expense,
        bold: true,
        fillColor: getRowColor(index),
      },
    ]);
  });

  // Total row
  tableBody.push([
    { text: 'TOTAL', style: 'totalRow' },
    {
      text: formatCurrency(totalIncome, summary[0]?.currency || 'EUR'),
      style: 'totalRow',
      alignment: 'right',
      color: YL_COLORS.income,
    },
    {
      text: formatCurrency(totalExpenses, summary[0]?.currency || 'EUR'),
      style: 'totalRow',
      alignment: 'right',
      color: YL_COLORS.expense,
    },
    {
      text: formatCurrency(totalNet, summary[0]?.currency || 'EUR'),
      style: 'totalRow',
      alignment: 'right',
      color: totalNet >= 0 ? YL_COLORS.income : YL_COLORS.expense,
    },
  ]);

  const content: Content = [
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => YL_COLORS.gray[200],
        vLineColor: () => YL_COLORS.gray[200],
      },
    },
  ];

  const docDefinition = createBasePDF(content, 'Monthly Summary Report');

  pdfMake.createPdf(docDefinition).download(`monthly_summary_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export category breakdown to PDF
 */
export function exportCategoryBreakdownToPDF(categories: CategoryBreakdownData[]): void {
  const tableBody: TableCell[][] = [
    // Header row
    [
      { text: 'Category', style: 'tableHeader' },
      { text: 'Amount', style: 'tableHeader', alignment: 'right' },
      { text: 'Transactions', style: 'tableHeader', alignment: 'center' },
      { text: 'Percentage', style: 'tableHeader', alignment: 'center' },
    ],
  ];

  // Data rows
  let totalAmount = 0;
  let totalCount = 0;

  categories.forEach((category, index) => {
    totalAmount += category.amount;
    totalCount += category.count;

    tableBody.push([
      { text: category.category, style: 'tableCell', fillColor: getRowColor(index) },
      {
        text: formatCurrency(category.amount, category.currency),
        style: 'tableCellRight',
        fillColor: getRowColor(index),
      },
      {
        text: category.count.toString(),
        style: 'tableCellCenter',
        fillColor: getRowColor(index),
      },
      {
        text: `${category.percentage.toFixed(2)}%`,
        style: 'tableCellCenter',
        fillColor: getRowColor(index),
      },
    ]);
  });

  // Total row
  tableBody.push([
    { text: 'TOTAL', style: 'totalRow' },
    {
      text: formatCurrency(totalAmount, categories[0]?.currency || 'EUR'),
      style: 'totalRow',
      alignment: 'right',
    },
    {
      text: totalCount.toString(),
      style: 'totalRow',
      alignment: 'center',
    },
    {
      text: '100.00%',
      style: 'totalRow',
      alignment: 'center',
    },
  ]);

  const content: Content = [
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => YL_COLORS.gray[200],
        vLineColor: () => YL_COLORS.gray[200],
      },
    },
  ];

  const docDefinition = createBasePDF(content, 'Category Breakdown Report');

  pdfMake.createPdf(docDefinition).download(`category_breakdown_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export user monthly expenses to PDF
 */
export function exportUserMonthlyExpensesToPDF(users: UserMonthlyExpenseData[]): void {
  if (users.length === 0) {
    return;
  }

  // Collect all unique months
  const allMonths = new Set<string>();
  users.forEach((user) => {
    user.monthlyExpenses.forEach((m) => allMonths.add(m.month));
  });
  const sortedMonths = Array.from(allMonths).sort();

  // Build table header
  const headerRow: TableCell[] = [
    { text: 'User', style: 'tableHeader' },
    { text: 'Email', style: 'tableHeader' },
    { text: 'Total', style: 'tableHeader', alignment: 'right' },
    { text: 'Transactions', style: 'tableHeader', alignment: 'center' },
  ];

  // Add month columns
  sortedMonths.forEach((month) => {
    headerRow.push({ text: month, style: 'tableHeader', alignment: 'right' });
  });

  const tableBody: TableCell[][] = [headerRow];

  // Data rows
  let grandTotal = 0;
  let grandTransactionCount = 0;
  const monthTotals: number[] = new Array(sortedMonths.length).fill(0);

  users.forEach((user, index) => {
    grandTotal += user.grandTotal;
    grandTransactionCount += user.transactionCount;

    const row: TableCell[] = [
      { text: user.userName, style: 'tableCell', fillColor: getRowColor(index) },
      { text: user.userEmail, style: 'tableCell', fillColor: getRowColor(index) },
      {
        text: formatCurrency(user.grandTotal, user.currency),
        style: 'tableCellRight',
        bold: true,
        fillColor: getRowColor(index),
      },
      {
        text: user.transactionCount.toString(),
        style: 'tableCellCenter',
        fillColor: getRowColor(index),
      },
    ];

    // Add month data
    sortedMonths.forEach((month, monthIndex) => {
      const monthData = user.monthlyExpenses.find((m) => m.month === month);
      const amount = monthData ? monthData.totalExpenses : 0;
      monthTotals[monthIndex] += amount;

      row.push({
        text: amount > 0 ? formatCurrency(amount, user.currency) : '-',
        style: 'tableCellRight',
        fillColor: getRowColor(index),
      });
    });

    tableBody.push(row);
  });

  // Total row
  const totalRow: TableCell[] = [
    { text: 'TOTAL', style: 'totalRow', colSpan: 2 },
    {},
    {
      text: formatCurrency(grandTotal, users[0].currency),
      style: 'totalRow',
      alignment: 'right',
    },
    {
      text: grandTransactionCount.toString(),
      style: 'totalRow',
      alignment: 'center',
    },
  ];

  monthTotals.forEach((total) => {
    totalRow.push({
      text: formatCurrency(total, users[0].currency),
      style: 'totalRow',
      alignment: 'right',
    });
  });

  tableBody.push(totalRow);

  // Build column widths dynamically
  const widths: any[] = ['auto', '*', 'auto', 'auto'];
  sortedMonths.forEach(() => widths.push('auto'));

  const content: Content = [
    {
      text: `Total Users: ${users.length}`,
      style: 'infoText',
      marginBottom: 10,
    },
    {
      table: {
        headerRows: 1,
        widths,
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => YL_COLORS.gray[200],
        vLineColor: () => YL_COLORS.gray[200],
      },
    },
  ];

  const docDefinition = createBasePDFLandscape(content, 'User Monthly Expenses Report');

  pdfMake.createPdf(docDefinition).download(`user_monthly_expenses_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export admin rundown to PDF
 */
export function exportAdminRundownToPDF(data: AdminRundownData): void {
  const content: Content = [];

  // Section 1: Overview Stats
  content.push({ text: 'Overview', style: 'sectionTitle' });

  const statsTable: TableCell[][] = [
    [
      { text: 'Metric', style: 'tableHeader' },
      { text: 'Value', style: 'tableHeader', alignment: 'right' },
    ],
    [
      { text: 'Total Income', style: 'tableCell' },
      {
        text: formatCurrency(data.spendingTrends.totalIncome),
        style: 'tableCellRight',
        color: YL_COLORS.income,
        bold: true,
      },
    ],
    [
      { text: 'Total Expenses', style: 'tableCell', fillColor: getRowColor(1) },
      {
        text: formatCurrency(data.spendingTrends.totalExpenses),
        style: 'tableCellRight',
        color: YL_COLORS.expense,
        bold: true,
        fillColor: getRowColor(1),
      },
    ],
    [
      { text: 'Net Position', style: 'tableCell' },
      {
        text: formatCurrency(data.spendingTrends.netPosition),
        style: 'tableCellRight',
        color: data.spendingTrends.netPosition >= 0 ? YL_COLORS.income : YL_COLORS.expense,
        bold: true,
      },
    ],
    [
      { text: 'Average Monthly Expense', style: 'tableCell', fillColor: getRowColor(1) },
      {
        text: formatCurrency(data.spendingTrends.averageMonthlyExpense),
        style: 'tableCellRight',
        fillColor: getRowColor(1),
      },
    ],
    [
      { text: 'Total Users', style: 'tableCell' },
      { text: data.stats.totalUsers.toString(), style: 'tableCellRight' },
    ],
    [
      { text: 'Total Movements', style: 'tableCell', fillColor: getRowColor(1) },
      { text: data.stats.totalMovements.toString(), style: 'tableCellRight', fillColor: getRowColor(1) },
    ],
    [
      { text: 'Pending Approvals', style: 'tableCell' },
      {
        text: data.stats.pendingApprovals.toString(),
        style: 'tableCellRight',
        color: data.stats.pendingApprovals > 0 ? YL_COLORS.warning : YL_COLORS.success,
      },
    ],
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: ['*', 'auto'],
      body: statsTable,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => YL_COLORS.gray[200],
      vLineColor: () => YL_COLORS.gray[200],
    },
  });

  // Section 2: Top Spenders
  content.push({ text: 'Top 10 Spenders', style: 'sectionTitle', pageBreak: 'before' });

  const topSpendersTable: TableCell[][] = [
    [
      { text: 'Rank', style: 'tableHeader', alignment: 'center' },
      { text: 'User', style: 'tableHeader' },
      { text: 'Email', style: 'tableHeader' },
      { text: 'Total Spent', style: 'tableHeader', alignment: 'right' },
      { text: 'Transactions', style: 'tableHeader', alignment: 'center' },
    ],
  ];

  data.topSpenders.forEach((spender, index) => {
    // Add trophy emoji for top 3
    let rankDisplay = (index + 1).toString();
    if (index === 0) rankDisplay = '🥇 1';
    else if (index === 1) rankDisplay = '🥈 2';
    else if (index === 2) rankDisplay = '🥉 3';

    topSpendersTable.push([
      { text: rankDisplay, style: 'tableCellCenter', fillColor: getRowColor(index) },
      { text: spender.userName, style: 'tableCell', fillColor: getRowColor(index) },
      { text: spender.userEmail, style: 'tableCell', fillColor: getRowColor(index) },
      {
        text: formatCurrency(spender.totalSpent, spender.currency),
        style: 'tableCellRight',
        color: YL_COLORS.expense,
        bold: index < 3,
        fillColor: getRowColor(index),
      },
      {
        text: spender.transactionCount.toString(),
        style: 'tableCellCenter',
        fillColor: getRowColor(index),
      },
    ]);
  });

  content.push({
    table: {
      headerRows: 1,
      widths: ['auto', '*', '*', 'auto', 'auto'],
      body: topSpendersTable,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => YL_COLORS.gray[200],
      vLineColor: () => YL_COLORS.gray[200],
    },
  });

  // Section 3: Budget Utilization
  content.push({ text: 'Budget Utilization by Area', style: 'sectionTitle', marginTop: 20 });

  const budgetTable: TableCell[][] = [
    [
      { text: 'Area', style: 'tableHeader' },
      { text: 'Code', style: 'tableHeader' },
      { text: 'Budget', style: 'tableHeader', alignment: 'right' },
      { text: 'Spent', style: 'tableHeader', alignment: 'right' },
      { text: 'Utilization', style: 'tableHeader', alignment: 'center' },
      { text: 'Status', style: 'tableHeader', alignment: 'center' },
    ],
  ];

  data.budgetUtilization.forEach((area, index) => {
    const utilizationPercent = area.utilization * 100;
    let status = 'OK';
    let statusColor = YL_COLORS.success;

    if (utilizationPercent > 100) {
      status = 'OVER BUDGET';
      statusColor = YL_COLORS.expense;
    } else if (utilizationPercent > 90) {
      status = 'WARNING';
      statusColor = YL_COLORS.warning;
    }

    budgetTable.push([
      { text: area.areaName, style: 'tableCell', fillColor: getRowColor(index) },
      { text: area.areaCode, style: 'tableCell', fillColor: getRowColor(index) },
      {
        text: formatCurrency(area.budget, area.currency),
        style: 'tableCellRight',
        fillColor: getRowColor(index),
      },
      {
        text: formatCurrency(area.spent, area.currency),
        style: 'tableCellRight',
        color: YL_COLORS.expense,
        fillColor: getRowColor(index),
      },
      {
        text: `${utilizationPercent.toFixed(1)}%`,
        style: 'tableCellCenter',
        bold: utilizationPercent > 90,
        fillColor: getRowColor(index),
      },
      {
        text: status,
        style: 'tableCellCenter',
        color: statusColor,
        bold: true,
        fillColor: getRowColor(index),
      },
    ]);
  });

  content.push({
    table: {
      headerRows: 1,
      widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
      body: budgetTable,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => YL_COLORS.gray[200],
      vLineColor: () => YL_COLORS.gray[200],
    },
  });

  // Section 4: Monthly Spending Trends
  content.push({ text: 'Monthly Spending Trends', style: 'sectionTitle', pageBreak: 'before' });

  const trendsTable: TableCell[][] = [
    [
      { text: 'Month', style: 'tableHeader' },
      { text: 'Income', style: 'tableHeader', alignment: 'right' },
      { text: 'Expenses', style: 'tableHeader', alignment: 'right' },
      { text: 'Net', style: 'tableHeader', alignment: 'right' },
      { text: 'Change %', style: 'tableHeader', alignment: 'center' },
    ],
  ];

  data.spendingTrends.monthOverMonth.forEach((month, index) => {
    trendsTable.push([
      { text: month.month, style: 'tableCell', fillColor: getRowColor(index) },
      {
        text: formatCurrency(month.income),
        style: 'tableCellRight',
        color: YL_COLORS.income,
        fillColor: getRowColor(index),
      },
      {
        text: formatCurrency(month.expenses),
        style: 'tableCellRight',
        color: YL_COLORS.expense,
        fillColor: getRowColor(index),
      },
      {
        text: formatCurrency(month.net),
        style: 'tableCellRight',
        color: month.net >= 0 ? YL_COLORS.income : YL_COLORS.expense,
        bold: true,
        fillColor: getRowColor(index),
      },
      {
        text: `${month.changePercentage >= 0 ? '+' : ''}${month.changePercentage.toFixed(1)}%`,
        style: 'tableCellCenter',
        color: month.changePercentage >= 0 ? YL_COLORS.income : YL_COLORS.expense,
        fillColor: getRowColor(index),
      },
    ]);
  });

  content.push({
    table: {
      headerRows: 1,
      widths: ['*', 'auto', 'auto', 'auto', 'auto'],
      body: trendsTable,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => YL_COLORS.gray[200],
      vLineColor: () => YL_COLORS.gray[200],
    },
  });

  const docDefinition = createBasePDF(content, 'Admin Rundown Report', data.period);

  pdfMake.createPdf(docDefinition).download(`admin_rundown_${new Date().toISOString().split('T')[0]}.pdf`);
}
