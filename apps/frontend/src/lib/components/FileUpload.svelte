<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from './Button.svelte';
  import { loadingStore } from '$lib/stores/loadingStore';
  import { toastStore } from '$lib/stores/toastStore';

  export let movementId: string;
  export let maxFiles: number = 5;
  export let maxFileSize: number = 10 * 1024 * 1024; // 10MB

  const dispatch = createEventDispatcher<{
    upload: { success: boolean };
  }>();

  // Allowed file types
  const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'xls', 'xlsx', 'csv', 'doc', 'docx'];

  let isDragging = false;
  let files: File[] = [];
  let previews: { [key: string]: string } = {};
  let isUploading = false;
  let uploadProgress = 0;

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    addFiles(droppedFiles);
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const selectedFiles = Array.from(target.files || []);
    addFiles(selectedFiles);

    // Reset input so same file can be selected again
    target.value = '';
  }

  function addFiles(newFiles: File[]) {
    // Filter and validate files
    const validFiles = newFiles.filter((file) => {
      // Check file count
      if (files.length >= maxFiles) {
        toastStore.warning(`Maximum ${maxFiles} files allowed`);
        return false;
      }

      // Check file size
      if (file.size > maxFileSize) {
        toastStore.error(`${file.name} is too large (max ${maxFileSize / 1024 / 1024}MB)`);
        return false;
      }

      // Check file type
      const ext = file.name.toLowerCase().split('.').pop();
      if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(ext || '')) {
        toastStore.error(`${file.name} is not a supported file type`);
        return false;
      }

      return true;
    });

    // Add valid files
    files = [...files, ...validFiles].slice(0, maxFiles);

    // Generate previews for images
    validFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previews[file.name] = e.target?.result as string;
          previews = { ...previews };
        };
        reader.readAsDataURL(file);
      }
    });
  }

  function removeFile(index: number) {
    const removedFile = files[index];
    files = files.filter((_, i) => i !== index);

    // Remove preview if exists
    if (previews[removedFile.name]) {
      delete previews[removedFile.name];
      previews = { ...previews };
    }
  }

  async function uploadFiles() {
    if (files.length === 0) {
      toastStore.warning('Please select at least one file');
      return;
    }

    isUploading = true;
    loadingStore.start();
    uploadProgress = 0;

    try {
      const totalFiles = files.length;
      let uploaded = 0;

      for (const file of files) {
        // Read file as base64
        const base64 = await fileToBase64(file);

        // Upload file
        await fetch('/api/trpc/attachment.upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            movementId,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            fileData: base64.split(',')[1], // Remove data:... prefix
          }),
        });

        uploaded++;
        uploadProgress = Math.round((uploaded / totalFiles) * 100);
      }

      toastStore.success(`Successfully uploaded ${uploaded} file(s)`);

      // Clear files and previews
      files = [];
      previews = {};

      dispatch('upload', { success: true });
    } catch (error) {
      console.error('Upload error:', error);
      toastStore.error('Failed to upload files');
    } finally {
      isUploading = false;
      uploadProgress = 0;
      loadingStore.stop();
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getFileIcon(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
      case 'csv':
        return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return '🖼️';
      default:
        return '📎';
    }
  }
</script>

<div class="space-y-4">
  <!-- Drop Zone -->
  <div
    class="border-2 border-dashed rounded-lg p-6 transition-colors duration-200"
    class:border-yl-green-accent={isDragging}
    class:bg-yl-green-50={isDragging}
    class:border-yl-gray-300={!isDragging}
    class:bg-yl-gray-50={!isDragging}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
    role="button"
    tabindex="0"
  >
    <div class="text-center">
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
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <div class="mt-4 flex flex-col sm:flex-row text-sm text-yl-gray-600 justify-center items-center gap-2">
        <label
          for="file-upload"
          class="relative cursor-pointer bg-white rounded-md font-medium text-yl-green-accent hover:text-yl-green-accent/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-yl-green-accent px-2 py-1"
        >
          <span>Upload a file</span>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            class="sr-only"
            multiple
            accept={ALLOWED_TYPES.join(',')}
            on:change={handleFileSelect}
          />
        </label>
        <p class="sm:pl-1">or drag and drop</p>
      </div>
      <p class="text-xs text-yl-gray-500 mt-2">
        PDF, Images, Excel, Word up to {maxFileSize / 1024 / 1024}MB (max {maxFiles} files)
      </p>
    </div>
  </div>

  <!-- File List -->
  {#if files.length > 0}
    <div class="space-y-2">
      <h4 class="text-sm font-medium text-yl-black">
        Selected Files ({files.length}/{maxFiles})
      </h4>
      <div class="space-y-2">
        {#each files as file, index}
          <div class="flex items-center gap-3 p-3 bg-white border border-yl-gray-200 rounded-lg">
            <!-- Preview or Icon -->
            {#if previews[file.name]}
              <img
                src={previews[file.name]}
                alt={file.name}
                class="w-12 h-12 object-cover rounded flex-shrink-0"
              />
            {:else}
              <div class="w-12 h-12 flex items-center justify-center bg-yl-gray-100 rounded flex-shrink-0 text-2xl">
                {getFileIcon(file.name)}
              </div>
            {/if}

            <!-- File Info -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-yl-black truncate">{file.name}</p>
              <p class="text-xs text-yl-gray-500">{formatFileSize(file.size)}</p>
            </div>

            <!-- Remove Button -->
            <button
              type="button"
              on:click={() => removeFile(index)}
              class="flex-shrink-0 text-yl-red hover:text-yl-red/80 p-1"
              aria-label="Remove file"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        {/each}
      </div>

      <!-- Upload Progress -->
      {#if isUploading}
        <div class="mt-4">
          <div class="flex justify-between text-sm text-yl-gray-600 mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div class="w-full bg-yl-gray-200 rounded-full h-2">
            <div
              class="bg-yl-green-accent h-2 rounded-full transition-all duration-300"
              style="width: {uploadProgress}%"
            ></div>
          </div>
        </div>
      {/if}

      <!-- Upload Button -->
      <div class="flex justify-end gap-2 pt-2">
        <Button
          variant="secondary"
          size="sm"
          on:click={() => {
            files = [];
            previews = {};
          }}
          disabled={isUploading}
        >
          Clear All
        </Button>
        <Button
          variant="primary"
          size="sm"
          on:click={uploadFiles}
          disabled={isUploading || files.length === 0}
        >
          {#if isUploading}
            Uploading...
          {:else}
            Upload {files.length} file{files.length !== 1 ? 's' : ''}
          {/if}
        </Button>
      </div>
    </div>
  {/if}
</div>
