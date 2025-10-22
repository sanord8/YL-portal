import { z } from 'zod';
import { router, protectedProcedure, createPermissionProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  validateImportFile,
  executeImport,
  type ImportRow,
  type ImportValidationResult,
} from '../../services/importService';
import { generateImportTemplate } from '../../services/templateService';

/**
 * Import Router
 * Handles bulk movement import via Excel/CSV
 */
export const importRouter = router({
  /**
   * Validate import file
   * Accepts base64-encoded file and returns validation results
   */
  validateImport: protectedProcedure
    .input(
      z.object({
        fileData: z.string(), // Base64-encoded file
        fileName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }): Promise<ImportValidationResult> => {
      try {
        // Decode base64 to buffer
        const buffer = Buffer.from(input.fileData, 'base64');

        // Validate file
        const result = await validateImportFile(
          buffer,
          input.fileName,
          ctx.user.id
        );

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to validate import file',
        });
      }
    }),

  /**
   * Execute import
   * Creates movements from validated rows
   * Admin-only endpoint
   */
  executeImport: protectedProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            rowNumber: z.number(),
            description: z.string(),
            amount: z.number(),
            type: z.enum(['INCOME', 'EXPENSE']),
            date: z.string().transform((val) => new Date(val)),
            areaId: z.string().uuid(),
            departmentId: z.string().uuid().optional(),
            category: z.string().optional(),
            reference: z.string().optional(),
            errors: z.array(z.any()),
            warnings: z.array(z.any()),
          })
        ),
        skipInvalid: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin (only admins can bulk import)
      if (!ctx.user.isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only administrators can perform bulk imports',
        });
      }

      // Convert input rows to ImportRow format
      const rows: ImportRow[] = input.rows.map((row) => ({
        ...row,
        date: new Date(row.date),
      }));

      // Execute import
      const result = await executeImport(rows, ctx.user.id, input.skipInvalid);

      // Emit WebSocket event for real-time update
      if (result.success > 0 && ctx.emit) {
        // Get areas affected by this import
        const areaIds = [...new Set(rows.map((r) => r.areaId))];

        for (const areaId of areaIds) {
          ctx.emit('movement:bulk_created', {
            count: result.success,
            areaId,
          });
        }
      }

      return result;
    }),

  /**
   * Download import template
   * Returns base64-encoded Excel template
   */
  downloadTemplate: protectedProcedure.query(async ({ ctx }) => {
    try {
      const buffer = generateImportTemplate();

      // Convert buffer to base64
      const base64 = buffer.toString('base64');

      return {
        data: base64,
        fileName: 'YL_Movement_Import_Template.xlsx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to generate template',
      });
    }
  }),
});
