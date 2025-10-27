# File Attachments Feature Guide

## Overview

File attachments are **fully implemented** and use **database storage (PostgreSQL BYTEA)** - no S3 or external services required!

## Features

### Supported File Types
- **Documents:** PDF, Word (.doc, .docx)
- **Spreadsheets:** Excel (.xls, .xlsx), CSV
- **Images:** JPEG, PNG, GIF, WebP

### Limits
- **Max File Size:** 10MB per file
- **Max Files:** 5 files per movement (configurable)
- **Storage:** PostgreSQL database (BYTEA column)

## How to Use

### 1. Upload Files to a Movement

**Step 1:** Create or navigate to a movement detail page
```
/movements/{movement-id}
```

**Step 2:** Scroll to "Upload Attachments" section

**Step 3:** Upload files via:
- **Drag & Drop** - Drag files into the upload zone
- **Click to Browse** - Click "Upload a file" to select from computer

**Step 4:** Click "Upload X file(s)" button

**Step 5:** Wait for success message

### 2. View Attachments

All uploaded files appear in the "Attachments" section below the upload area.

Each attachment shows:
- File icon (based on type)
- Filename
- File size (KB/MB)
- Upload date
- Download button
- Delete button

### 3. Download Files

Click the **download icon** (⬇️) next to any attachment to download it.

The file is:
1. Fetched from database (base64 encoded)
2. Converted to blob
3. Downloaded to your computer

### 4. Delete Attachments

Click the **delete icon** (🗑️) next to any attachment.

A confirmation dialog appears. Click "Delete" to confirm.

**Note:** Deleting an attachment is permanent and cannot be undone.

## Technical Details

### Database Schema

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,  -- bytes
  file_data BYTEA NOT NULL,  -- ⭐ Files stored in database
  thumbnail_data BYTEA,  -- Optional image thumbnail
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints (tRPC)

**Upload File**
```typescript
trpc.attachment.upload.mutate({
  movementId: string,
  filename: string,
  mimeType: string,
  size: number,
  fileData: string (base64)
})
```

**List Attachments**
```typescript
trpc.attachment.list.query({
  movementId: string
})
```

**Download File**
```typescript
trpc.attachment.download.query({
  id: string
})
```

**Delete Attachment**
```typescript
trpc.attachment.delete.mutate({
  id: string
})
```

### Frontend Components

**FileUpload.svelte**
- Drag-and-drop zone
- File type/size validation
- Image preview generation
- Upload progress indicator
- Multi-file upload support

**AttachmentList.svelte**
- List all attachments with metadata
- Download functionality (converts base64 → blob)
- Delete with confirmation
- Empty state handling

## Access Control

- Users can only upload files to **their own movements**
- Users can only view/download attachments from **movements they have access to**
- Deleting a movement automatically deletes all attachments (CASCADE)

## Performance Considerations

### Database Storage (Current Implementation)

**Pros:**
- ✅ Simple deployment (no external dependencies)
- ✅ Transactional consistency
- ✅ Automatic backups with database
- ✅ No file path management
- ✅ Works great for small files (<5MB)

**Cons:**
- ⚠️ Can bloat database size
- ⚠️ Slower for very large files (>10MB)
- ⚠️ Increased backup size

**Recommendation:**
For receipts, invoices, and typical financial documents, database storage is perfect!

If you later need to handle large files (>10MB) or thousands of attachments, consider:
- Increasing `max_file_size` limit (backend)
- Using filesystem storage instead of database
- Adding file compression

## File Size Recommendations

| File Type | Typical Size | Status |
|-----------|--------------|--------|
| PDF Receipt | 100-500 KB | ✅ Ideal |
| Scanned Invoice | 1-3 MB | ✅ Good |
| High-res Photo | 3-8 MB | ✅ OK |
| Large PDF Report | 10-20 MB | ⚠️ At limit |
| Video/Audio | >20 MB | ❌ Not supported |

## Security Features

1. **File Type Validation** - Only allowed MIME types
2. **Extension Validation** - Prevents malicious files with fake extensions
3. **Size Limit** - 10MB enforced on backend
4. **Access Control** - User can only access their own movement attachments
5. **Base64 Encoding** - Safe transmission over HTTP

## Future Enhancements (Optional)

- [ ] Add image thumbnail generation for preview
- [ ] Add virus scanning integration
- [ ] Add bulk download (ZIP all attachments)
- [ ] Add attachment versioning
- [ ] Add OCR for receipt text extraction
- [ ] Add attachment categories/tags

## Testing Checklist

### Basic Upload/Download
- [ ] Upload a PDF file
- [ ] Upload multiple images at once
- [ ] Download each file and verify integrity
- [ ] Delete an attachment
- [ ] Verify deleted file no longer appears

### Validation
- [ ] Try uploading a file >10MB (should fail)
- [ ] Try uploading unsupported type (.exe, .zip) (should fail)
- [ ] Upload 5 files, then try 6th (should warn)
- [ ] Try uploading file with mismatched extension/MIME (should fail)

### Edge Cases
- [ ] Upload file with special characters in name
- [ ] Upload file with very long filename (255 char limit)
- [ ] Upload same file twice (should work, creates 2 copies)
- [ ] Delete movement, verify attachments deleted (CASCADE)

### Access Control
- [ ] Try accessing another user's attachment (should fail 403)
- [ ] Verify manager can't see regular user's personal fund attachments

## Troubleshooting

### "Failed to upload file"
- Check file size (<10MB)
- Verify file type is supported
- Check browser console for errors
- Verify database connection

### "Failed to download file"
- Check if attachment still exists
- Verify user has access to movement
- Check network connection
- Try refreshing page

### Database Size Growing
Monitor `attachments` table size:
```sql
SELECT
  pg_size_pretty(pg_total_relation_size('attachments')) as total_size,
  COUNT(*) as file_count,
  AVG(size) as avg_file_size
FROM attachments;
```

If database grows too large, consider:
1. Archiving old attachments
2. Compressing files before upload
3. Moving to filesystem storage

## Deployment Notes

### Environment Variables
No additional configuration needed! Everything uses existing database connection.

### Database Migrations
The `attachments` table is already created in the schema. If not, run:
```bash
pnpm --filter backend db:push
```

### Backup Strategy
Attachments are automatically included in PostgreSQL backups.

For large databases, consider:
- Point-in-time recovery (PITR)
- Incremental backups
- Separate attachment table backup schedule

---

**Status:** ✅ Production Ready
**Last Updated:** October 24, 2025
**Feature Owner:** Backend & Frontend (Fully Integrated)
