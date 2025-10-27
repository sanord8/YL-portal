/**
 * Frontend CSV Export Utilities
 * Generate CSV files in the browser with proper escaping and UTF-8 encoding
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
export function exportMovementsToCSV(movements: MovementExportData[]): Uint8Array {
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
  const encoder = new TextEncoder();
  return encoder.encode(BOM + csv);
}

/**
 * Export balances to CSV
 */
export function exportBalancesToCSV(balances: BalanceData[]): Uint8Array {
  const headers = ['Area', 'Area Code', 'Currency', 'Income', 'Expenses', 'Balance'];

  const rows = balances.map((b) => [b.areaName, b.areaCode, b.currency, b.income, b.expenses, b.balance]);

  const csv = arrayToCSV(headers, rows);

  const BOM = '\uFEFF';
  const encoder = new TextEncoder();
  return encoder.encode(BOM + csv);
}

/**
 * Export monthly summary to CSV
 */
export function exportMonthlySummaryToCSV(summary: MonthlySummaryData[]): Uint8Array {
  const headers = ['Month', 'Income', 'Expenses', 'Net', 'Currency'];

  const rows = summary.map((s) => [s.month, s.income, s.expenses, s.net, s.currency]);

  const csv = arrayToCSV(headers, rows);

  const BOM = '\uFEFF';
  const encoder = new TextEncoder();
  return encoder.encode(BOM + csv);
}

/**
 * Export category breakdown to CSV
 */
export function exportCategoryBreakdownToCSV(categories: CategoryBreakdownData[]): Uint8Array {
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
  const encoder = new TextEncoder();
  return encoder.encode(BOM + csv);
}

/**
 * Export user monthly expenses to CSV
 */
export function exportUserMonthlyExpensesToCSV(users: UserMonthlyExpenseData[]): Uint8Array {
  if (users.length === 0) {
    const encoder = new TextEncoder();
    return encoder.encode('\uFEFF');
  }

  // Collect all unique months across all users
  const allMonths = new Set<string>();
  users.forEach((user) => {
    user.monthlyExpenses.forEach((m) => allMonths.add(m.month));
  });
  const sortedMonths = Array.from(allMonths).sort();

  // Build headers: User, Email, Total Expenses, Transactions, then each month
  const headers = ['User', 'Email', 'Total Expenses', 'Transactions', ...sortedMonths];

  // Build rows
  const rows = users.map((user) => {
    const row: any[] = [user.userName, user.userEmail, user.grandTotal.toFixed(2), user.transactionCount];

    // Add month columns dynamically
    sortedMonths.forEach((month) => {
      const monthData = user.monthlyExpenses.find((m) => m.month === month);
      row.push(monthData ? monthData.totalExpenses.toFixed(2) : '0.00');
    });

    return row;
  });

  // Add summary row
  const totalExpenses = users.reduce((sum, u) => sum + u.grandTotal, 0);
  const totalTransactions = users.reduce((sum, u) => sum + u.transactionCount, 0);
  const summaryRow = ['TOTAL', '', totalExpenses.toFixed(2), totalTransactions];

  // Calculate totals for each month
  sortedMonths.forEach((month) => {
    const monthTotal = users.reduce((sum, user) => {
      const monthData = user.monthlyExpenses.find((m) => m.month === month);
      return sum + (monthData ? monthData.totalExpenses : 0);
    }, 0);
    summaryRow.push(monthTotal.toFixed(2));
  });

  rows.push(summaryRow);

  const csv = arrayToCSV(headers, rows);

  const BOM = '\uFEFF';
  const encoder = new TextEncoder();
  return encoder.encode(BOM + csv);
}

/**
 * Export admin rundown to CSV
 * Creates a multi-section CSV with overview, top spenders, budget utilization, and trends
 */
export function exportAdminRundownToCSV(data: AdminRundownData): Uint8Array {
  const sections: string[] = [];

  // Section 1: Overview
  sections.push('ADMIN RUNDOWN - OVERVIEW');
  sections.push('');
  sections.push(
    arrayToCSV(
      ['Metric', 'Value'],
      [
        ['Period Start', new Date(data.period.start).toLocaleDateString()],
        ['Period End', new Date(data.period.end).toLocaleDateString()],
        ['Total Income', data.spendingTrends.totalIncome.toFixed(2)],
        ['Total Expenses', data.spendingTrends.totalExpenses.toFixed(2)],
        ['Net Position', data.spendingTrends.netPosition.toFixed(2)],
        ['Average Monthly Expense', data.spendingTrends.averageMonthlyExpense.toFixed(2)],
        ['Projected Month End', data.spendingTrends.projectedMonthEnd.toFixed(2)],
        ['Total Users', data.stats.totalUsers],
        ['Total Movements', data.stats.totalMovements],
        ['Pending Approvals', data.stats.pendingApprovals],
      ]
    )
  );
  sections.push('');
  sections.push('');

  // Section 2: Top Spenders
  sections.push('TOP SPENDERS');
  sections.push('');
  sections.push(
    arrayToCSV(
      ['Rank', 'User', 'Email', 'Total Spent', 'Transactions'],
      data.topSpenders.map((spender, index) => [
        index + 1,
        spender.userName,
        spender.userEmail,
        spender.totalSpent.toFixed(2),
        spender.transactionCount,
      ])
    )
  );
  sections.push('');
  sections.push('');

  // Section 3: Budget Utilization
  sections.push('BUDGET UTILIZATION BY AREA');
  sections.push('');
  sections.push(
    arrayToCSV(
      ['Area', 'Code', 'Budget', 'Spent', 'Utilization %', 'Status'],
      data.budgetUtilization.map((area) => {
        const utilizationPercent = area.utilization * 100;
        let status = 'OK';
        if (utilizationPercent > 100) status = 'OVER BUDGET';
        else if (utilizationPercent > 90) status = 'WARNING';

        return [
          area.areaName,
          area.areaCode,
          area.budget.toFixed(2),
          area.spent.toFixed(2),
          utilizationPercent.toFixed(2),
          status,
        ];
      })
    )
  );
  sections.push('');
  sections.push('');

  // Section 4: Monthly Spending Trends
  sections.push('MONTHLY SPENDING TRENDS');
  sections.push('');
  sections.push(
    arrayToCSV(
      ['Month', 'Income', 'Expenses', 'Net', 'Change %'],
      data.spendingTrends.monthOverMonth.map((month) => [
        month.month,
        month.income.toFixed(2),
        month.expenses.toFixed(2),
        month.net.toFixed(2),
        month.changePercentage.toFixed(2),
      ])
    )
  );

  const fullCSV = sections.join('\n');

  const BOM = '\uFEFF';
  const encoder = new TextEncoder();
  return encoder.encode(BOM + fullCSV);
}
