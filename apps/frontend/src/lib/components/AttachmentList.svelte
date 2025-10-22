<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import Button from './Button.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import { toastStore } from '$lib/stores/toastStore';
  import { loadingStore } from '$lib/stores/loadingStore';

  export let movementId: string;

  const dispatch = createEventDispatcher<{
    refresh: void;
  }>();

  interface Attachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    createdAt: string;
  }

  let attachments: Attachment[] = [];
  let isLoading = false;
  let deletingId: string | null = null;
  let showDeleteConfirm = false;
  let attachmentToDelete: Attachment | null = null;
  let isDownloading: { [key: string]: boolean } = {};

  onMount(async () => {
    await loadAttachments();
  });

  async function loadAttachments() {
    isLoading = true;
    loadingStore.start();

    try {
      const response = await fetch(
        `/api/trpc/attachment.list?input=${encodeURIComponent(JSON.stringify({ movementId }))}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load attachments');
      }

      const data = await response.json();
      attachments = data.result.data || [];
    } catch (error) {
      console.error('Load attachments error:', error);
      toastStore.error('Failed to load attachments');
    } finally {
      isLoading = false;
      loadingStore.stop();
    }
  }

  async function downloadAttachment(attachment: Attachment) {
    isDownloading[attachment.id] = true;
    isDownloading = { ...isDownloading };
    loadingStore.start();

    try {
      const response = await fetch(
        `/api/trpc/attachment.download?input=${encodeURIComponent(JSON.stringify({ id: attachment.id }))}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const data = await response.json();
      const fileData = data.result.data;

      // Convert base64 to blob
      const byteCharacters = atob(fileData.fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileData.mimeType });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toastStore.success('File downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toastStore.error('Failed to download file');
    } finally {
      isDownloading[attachment.id] = false;
      isDownloading = { ...isDownloading };
      loadingStore.stop();
    }
  }

  function confirmDelete(attachment: Attachment) {
    attachmentToDelete = attachment;
    showDeleteConfirm = true;
  }

  async function deleteAttachment() {
    if (!attachmentToDelete) return;

    deletingId = attachmentToDelete.id;
    loadingStore.start();

    try {
      const response = await fetch('/api/trpc/attachment.delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id: attachmentToDelete.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete attachment');
      }

      toastStore.success('File deleted successfully');
      await loadAttachments();
      dispatch('refresh');
    } catch (error) {
      console.error('Delete error:', error);
      toastStore.error('Failed to delete file');
    } finally {
      deletingId = null;
      showDeleteConfirm = false;
      attachmentToDelete = null;
      loadingStore.stop();
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('csv')) return '📊';
    return '📎';
  }

  function isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  // Public method to refresh the list
  export function refresh() {
    loadAttachments();
  }
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold text-yl-black">
      Attachments {#if attachments.length > 0}<span class="text-yl-gray-500">({attachments.length})</span>{/if}
    </h3>
    {#if attachments.length > 0}
      <button
        type="button"
        on:click={loadAttachments}
        class="text-sm text-yl-green-accent hover:text-yl-green-accent/80"
        disabled={isLoading}
      >
        {#if isLoading}
          Refreshing...
        {:else}
          Refresh
        {/if}
      </button>
    {/if}
  </div>

  <!-- Loading State -->
  {#if isLoading && attachments.length === 0}
    <div class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-yl-green-accent"></div>
    </div>

  <!-- Empty State -->
  {:else if attachments.length === 0}
    <div class="text-center py-8 bg-yl-gray-50 rounded-lg border border-yl-gray-200">
      <svg
        class="mx-auto h-12 w-12 text-yl-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p class="mt-2 text-sm text-yl-gray-600">No attachments yet</p>
      <p class="text-xs text-yl-gray-500 mt-1">Upload files to attach them to this movement</p>
    </div>

  <!-- Attachments List -->
  {:else}
    <div class="space-y-2">
      {#each attachments as attachment}
        <div
          class="flex items-center gap-3 p-3 bg-white border border-yl-gray-200 rounded-lg hover:border-yl-gray-300 transition-colors"
        >
          <!-- File Icon -->
          <div
            class="w-12 h-12 flex items-center justify-center bg-yl-gray-100 rounded flex-shrink-0 text-2xl"
          >
            {getFileIcon(attachment.mimeType)}
          </div>

          <!-- File Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-yl-black truncate" title={attachment.filename}>
              {attachment.filename}
            </p>
            <p class="text-xs text-yl-gray-500">
              {formatFileSize(attachment.size)} • {formatDate(attachment.createdAt)}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <!-- Download Button -->
            <button
              type="button"
              on:click={() => downloadAttachment(attachment)}
              class="p-2 text-yl-green-accent hover:bg-yl-green-50 rounded-lg transition-colors"
              disabled={isDownloading[attachment.id]}
              aria-label="Download file"
              title="Download"
            >
              {#if isDownloading[attachment.id]}
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-yl-green-accent"></div>
              {:else}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              {/if}
            </button>

            <!-- Delete Button -->
            <button
              type="button"
              on:click={() => confirmDelete(attachment)}
              class="p-2 text-yl-red hover:bg-red-50 rounded-lg transition-colors"
              disabled={deletingId === attachment.id}
              aria-label="Delete file"
              title="Delete"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
  isOpen={showDeleteConfirm}
  title="Delete Attachment"
  message="Are you sure you want to delete {attachmentToDelete?.filename}? This action cannot be undone."
  confirmText="Delete"
  confirmVariant="danger"
  isLoading={deletingId !== null}
  onConfirm={deleteAttachment}
  onCancel={() => {
    showDeleteConfirm = false;
    attachmentToDelete = null;
  }}
/>
