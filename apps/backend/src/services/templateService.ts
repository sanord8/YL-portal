import * as XLSX from 'xlsx';

/**
 * Generate Excel template for movement import
 */
export function generateImportTemplate(): Buffer {
  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Instructions sheet
  const instructionsData = [
    ['YL Portal - Movement Import Template'],
    [''],
    ['Instructions:'],
    ['1. Fill data in the "Data" sheet'],
    ['2. Required columns are marked with *'],
    ['3. Use the Type column dropdown (INCOME or EXPENSE)'],
    ['4. Dates should be in DD/MM/YYYY format'],
    ['5. Amounts should be positive numbers (no currency symbols)'],
    ['6. Area: Use the area code (e.g., MAD-CTR) or full name'],
    ['7. Department: Optional - use department code if needed'],
    [''],
    ['Tips:'],
    ['- Keep descriptions clear and concise (max 500 characters)'],
    ['- All imported movements will start as PENDING status'],
    ['- You can include up to 500 movements per file'],
    ['- Supported formats: .xlsx, .csv'],
    [''],
    ['Column Descriptions:'],
    [''],
    ['Description*', 'Brief description of the movement (required)'],
    ['Amount*', 'Positive number without currency symbol (required)'],
    ['Type*', 'INCOME or EXPENSE (required)'],
    ['Date*', 'Transaction date in DD/MM/YYYY format (required)'],
    ['Area*', 'Area code or name (required)'],
    ['Department', 'Department code or name (optional)'],
    ['Category', 'Category for classification (optional)'],
    ['Reference', 'Reference number or code (optional)'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);

  // Style the instructions sheet
  wsInstructions['!cols'] = [{ wch: 20 }, { wch: 60 }];

  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  // Data sheet with examples
  const dataHeaders = [
    'Description*',
    'Amount*',
    'Type*',
    'Date*',
    'Area*',
    'Department',
    'Category',
    'Reference',
  ];

  const exampleRows = [
    [
      'Office supplies purchase',
      '150.50',
      'EXPENSE',
      '15/01/2025',
      'MAD-CTR',
      'FIN',
      'Office',
      'INV-2025-001',
    ],
    [
      'Monthly donation received',
      '500.00',
      'INCOME',
      '20/01/2025',
      'MAD-CTR',
      'YOUTH',
      'Donations',
      'DON-2025-045',
    ],
    [
      'Team building event',
      '320.75',
      'EXPENSE',
      '22/01/2025',
      'MAD-CTR',
      'EVENTS',
      'Events',
      '',
    ],
  ];

  const dataSheetData = [dataHeaders, ...exampleRows];

  const wsData = XLSX.utils.aoa_to_sheet(dataSheetData);

  // Set column widths
  wsData['!cols'] = [
    { wch: 40 }, // Description
    { wch: 12 }, // Amount
    { wch: 12 }, // Type
    { wch: 15 }, // Date
    { wch: 15 }, // Area
    { wch: 15 }, // Department
    { wch: 15 }, // Category
    { wch: 20 }, // Reference
  ];

  // Add data validation for Type column (B2:B1000)
  if (!wsData['!dataValidation']) {
    wsData['!dataValidation'] = {};
  }

  // Note: XLSX library has limited support for data validation
  // In a production environment, you might want to use a library like exceljs
  // which has better support for Excel features

  XLSX.utils.book_append_sheet(wb, wsData, 'Data');

  // Write to buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return buffer;
}
