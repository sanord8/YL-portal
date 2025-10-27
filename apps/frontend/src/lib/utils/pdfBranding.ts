/**
 * Young Life PDF Branding Configuration
 * Centralized branding for all PDF exports
 * Configure colors, fonts, styles, and templates here
 */

import type { Content, StyleDictionary, TDocumentDefinitions } from 'pdfmake/interfaces';

/**
 * Young Life Brand Colors
 */
export const YL_COLORS = {
  green: '#90c83c',
  greenLight: '#a8d965',
  greenDark: '#7ab32d',
  black: '#000000',
  gray: {
    50: '#f5f5f5',
    100: '#e5e5e5',
    200: '#cccccc',
    300: '#999999',
    400: '#666666',
    500: '#555555',
    600: '#515151',
    700: '#333333',
    800: '#1a1a1a',
  },
  white: '#ffffff',
  // Semantic colors
  income: '#22c55e', // green-500
  expense: '#ef4444', // red-500
  warning: '#f59e0b', // amber-500
  success: '#10b981', // emerald-500
};

/**
 * Standard PDF Styles
 * Used across all PDF exports for consistency
 */
export const PDF_STYLES: StyleDictionary = {
  header: {
    fontSize: 18,
    bold: true,
    color: YL_COLORS.green,
    marginBottom: 10,
  },
  subheader: {
    fontSize: 14,
    bold: true,
    color: YL_COLORS.black,
    marginBottom: 8,
  },
  tableHeader: {
    bold: true,
    fontSize: 11,
    color: YL_COLORS.white,
    fillColor: YL_COLORS.green,
    alignment: 'left',
  },
  tableCell: {
    fontSize: 9,
    color: YL_COLORS.black,
  },
  tableCellRight: {
    fontSize: 9,
    color: YL_COLORS.black,
    alignment: 'right',
  },
  tableCellCenter: {
    fontSize: 9,
    color: YL_COLORS.black,
    alignment: 'center',
  },
  totalRow: {
    fontSize: 10,
    bold: true,
    fillColor: YL_COLORS.gray[50],
  },
  sectionTitle: {
    fontSize: 14,
    bold: true,
    color: YL_COLORS.green,
    marginTop: 15,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 10,
    color: YL_COLORS.gray[600],
    marginBottom: 5,
  },
  footerText: {
    fontSize: 8,
    color: YL_COLORS.gray[500],
    alignment: 'center',
  },
  statCard: {
    fontSize: 10,
    color: YL_COLORS.gray[700],
  },
  statValue: {
    fontSize: 16,
    bold: true,
    color: YL_COLORS.black,
  },
};

/**
 * Page margins for all PDFs
 */
export const PAGE_MARGINS: [number, number, number, number] = [40, 80, 40, 60];

/**
 * Generate header content for PDF
 */
export function generateHeader(
  reportTitle: string,
  dateRange?: { start: string; end: string }
): Content {
  const headerContent: Content = [
    {
      columns: [
        {
          // Logo section - using text as placeholder
          // In production, replace with actual base64 image
          text: 'YoungLife',
          style: 'header',
          width: 'auto',
        },
        {
          // Report title and date range
          stack: [
            {
              text: reportTitle,
              style: 'header',
              alignment: 'right',
            },
            dateRange
              ? {
                  text: `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`,
                  style: 'infoText',
                  alignment: 'right',
                }
              : {},
          ],
          width: '*',
        },
      ],
      marginBottom: 20,
    },
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 2,
          lineColor: YL_COLORS.green,
        },
      ],
      marginBottom: 10,
    },
  ];

  return headerContent;
}

/**
 * Generate footer function for PDF
 */
export function generateFooter(currentPage: number, pageCount: number): Content {
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    columns: [
      {
        text: `Generated on ${formattedDate} at ${formattedTime}`,
        style: 'footerText',
        alignment: 'left',
        width: '*',
      },
      {
        text: `Page ${currentPage} of ${pageCount}`,
        style: 'footerText',
        alignment: 'right',
        width: 'auto',
      },
    ],
    margin: [40, 20, 40, 20],
  };
}

/**
 * Create base document definition with YL branding
 */
export function createBasePDF(
  content: Content,
  reportTitle: string,
  dateRange?: { start: string; end: string }
): TDocumentDefinitions {
  return {
    content: [generateHeader(reportTitle, dateRange), content],
    styles: PDF_STYLES,
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: PAGE_MARGINS,
    footer: generateFooter,
    defaultStyle: {
      font: 'Roboto', // pdfmake includes Roboto by default
    },
  };
}

/**
 * Create base document definition with landscape orientation
 */
export function createBasePDFLandscape(
  content: Content,
  reportTitle: string,
  dateRange?: { start: string; end: string }
): TDocumentDefinitions {
  return {
    content: [generateHeader(reportTitle, dateRange), content],
    styles: PDF_STYLES,
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: PAGE_MARGINS,
    footer: generateFooter,
    defaultStyle: {
      font: 'Roboto',
    },
  };
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Get color for status
 */
export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'APPROVED':
    case 'COMPLETED':
      return YL_COLORS.success;
    case 'PENDING':
      return YL_COLORS.warning;
    case 'REJECTED':
    case 'CANCELLED':
      return YL_COLORS.expense;
    default:
      return YL_COLORS.gray[600];
  }
}

/**
 * Get color for movement type
 */
export function getTypeColor(type: string): string {
  return type === 'INCOME' ? YL_COLORS.income : YL_COLORS.expense;
}

/**
 * Create alternating row colors for tables
 */
export function getRowColor(index: number): string {
  return index % 2 === 0 ? YL_COLORS.white : YL_COLORS.gray[50];
}
