import { z } from 'zod';
import { router, protectedProcedure, verifiedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Attachment Router
 * Type-safe API for file attachments on movements
 */

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/csv',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

/**
 * Validate file extension matches MIME type
 */
function validateMimeType(filename: string, mimeType: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();

  const mimeMap: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/jpg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'application/vnd.ms-excel': ['xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
    'text/csv': ['csv'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  };

  const allowedExts = mimeMap[mimeType];
  return allowedExts ? allowedExts.includes(ext || '') : false;
}

export const attachmentRouter = router({
  /**
   * Upload a file attachment to a movement
   */
  upload: verifiedProcedure
    .input(
      z.object({
        movementId: z.string().uuid(),
        filename: z.string().min(1).max(255),
        mimeType: z.string(),
        size: z.number().int().positive().max(MAX_FILE_SIZE),
        fileData: z.string(), // Base64 encoded file data
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `File type ${input.mimeType} is not allowed`,
        });
      }

      // Validate file extension matches MIME type
      if (!validateMimeType(input.filename, input.mimeType)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File extension does not match file type',
        });
      }

      // Check if movement exists and user has access
      const movement = await ctx.prisma.movement.findUnique({
        where: { id: input.movementId },
      });

      if (!movement || movement.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Movement not found',
        });
      }

      if (movement.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this movement',
        });
      }

      // Decode base64 to binary
      const buffer = Buffer.from(input.fileData, 'base64');

      // Verify size matches
      if (buffer.length !== input.size) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File size mismatch',
        });
      }

      // Create attachment
      const attachment = await ctx.prisma.attachment.create({
        data: {
          movementId: input.movementId,
          filename: input.filename,
          mimeType: input.mimeType,
          size: input.size,
          fileData: buffer,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      });

      return attachment;
    }),

  /**
   * List attachments for a movement (without file data for efficiency)
   */
  list: protectedProcedure
    .input(
      z.object({
        movementId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check if movement exists and user has access
      const movement = await ctx.prisma.movement.findUnique({
        where: { id: input.movementId },
      });

      if (!movement || movement.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Movement not found',
        });
      }

      if (movement.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this movement',
        });
      }

      // Get attachments (exclude file data for efficiency)
      const attachments = await ctx.prisma.attachment.findMany({
        where: {
          movementId: input.movementId,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return attachments;
    }),

  /**
   * Download a file attachment
   */
  download: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get attachment with file data
      const attachment = await ctx.prisma.attachment.findUnique({
        where: { id: input.id },
        include: {
          movement: true,
        },
      });

      if (!attachment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Attachment not found',
        });
      }

      // Check user has access to the movement
      if (attachment.movement.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this attachment',
        });
      }

      // Return file data as base64
      return {
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        fileData: attachment.fileData.toString('base64'),
      };
    }),

  /**
   * Delete an attachment
   */
  delete: verifiedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get attachment
      const attachment = await ctx.prisma.attachment.findUnique({
        where: { id: input.id },
        include: {
          movement: true,
        },
      });

      if (!attachment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Attachment not found',
        });
      }

      // Check user has access to the movement
      if (attachment.movement.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this attachment',
        });
      }

      // Delete attachment
      await ctx.prisma.attachment.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
