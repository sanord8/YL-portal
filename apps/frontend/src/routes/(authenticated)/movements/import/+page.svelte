<script lang="ts">
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc';
  import { toastStore } from '$lib/stores/toastStore';
  import { authStore } from '$lib/stores/authStore';
  import { onMount } from 'svelte';
  import ImportDataTable from '$lib/components/ImportDataTable.svelte';
  import Select from 'svelte-select';

  // Check admin access
  $: if ($authStore.user && !$authStore.user.isAdmin) {
    toastStore.error('Only administrators can access bulk import');
    goto('/movements');
  }

  // State
  let selectedFile: File | null = null;
  let selectedBankAccountId: string | null = null;
  let isDragging = false;
  let isValidating = false;
  let isImporting = false;
  let validationResult: any = null;
  let importResult: any = null;
  let bankAccounts: any[] = [];
  let isLoadingBankAccounts = true;

  // File input reference
  let fileInput: HTMLInputElement;

  // Format bank accounts for svelte-select
  $: bankAccountItems = bankAccounts.map((account) => ({
    value: account.id,
    label: `${account.name}${account.accountNumber ? ` (${account.accountNumber})` : ''} - ${account.currency}`,
  }));

  // Get selected bank account item
  $: selectedBankAccount = bankAccountItems.find(
    (item) => item.value === selectedBankAccountId
  );

  // Load bank accounts on mount
  onMount(async () => {
    try {
      bankAccounts = await trpc.bankAccount.list.query();
      isLoadingBankAccounts = false;

      // Auto-select if only one bank account exists
      if (bankAccounts.length === 1) {
        selectedBankAccountId = bankAccounts[0].id;
      }
    } catch (error: any) {
      toastStore.error('Failed to load bank accounts');
      isLoadingBankAccounts = false;
    }
  });

  // Handle file selection
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      handleFile(target.files[0]);
    }
  }

  // Handle drag and drop
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      handleFile(event.dataTransfer.files[0]);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  // Process file
  async function handleFile(file: File) {
    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toastStore.error('Invalid file type. Please upload .xlsx or .csv file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toastStore.error('File size exceeds 10MB limit');
      return;
    }

    selectedFile = file;
    validationResult = null;
    importResult = null;

    // Auto-validate
    await validateFile();
  }

  // Validate file
  async function validateFile() {
    if (!selectedFile) return;

    if (!selectedBankAccountId) {
      toastStore.error('Please select a bank account before validating');
      return;
    }

    try {
      isValidating = true;

      // Read file as base64
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile!);
      });

      // Validate via tRPC
      validationResult = await trpc.import.validateImport.mutate({
        sourceBankAccountId: selectedBankAccountId,
        fileData,
        fileName: selectedFile.name,
      });

      if (validationResult.errorCount === 0) {
        toastStore.success(
          `Validation successful! ${validationResult.validRows} rows ready to import`
        );
      } else {
        toastStore.warning(
          `Found ${validationResult.errorCount} errors in ${validationResult.totalRows} rows`
        );
      }
    } catch (error: any) {
      // Better error messages
      const message = error.message || 'Validation failed';
      const userFriendlyMessage = message
        .replace(/sourceBankAccountId/gi, 'bank account')
        .replace(/required/gi, 'is required')
        .replace(/invalid type/gi, 'invalid format');

      toastStore.error(`Validation failed: ${userFriendlyMessage}`);
      validationResult = null;
    } finally {
      isValidating = false;
    }
  }

  // Handle row updates from table
  function handleRowsUpdate(updatedRows: any[]) {
    if (validationResult) {
      validationResult.rows = updatedRows;
      validationResult.validRows = updatedRows.filter((r) => r.errors.length === 0).length;
      validationResult.errorCount = updatedRows.reduce((sum, r) => sum + r.errors.length, 0);
      validationResult.warningCount = updatedRows.reduce((sum, r) => sum + r.warnings.length, 0);
      validationResult = validationResult; // Trigger reactivity
    }
  }

  // Execute import
  async function executeImport(skipInvalid = true) {
    if (!validationResult || !validationResult.rows) return;

    try {
      isImporting = true;

      const result = await trpc.import.executeImport.mutate({
        rows: validationResult.rows.map((row: any) => ({
          ...row,
          date: row.date.toISOString ? row.date.toISOString() : new Date(row.date).toISOString(),
        })),
        skipInvalid,
      });

      importResult = result;

      if (result.success > 0) {
        if (result.needsCategorization > 0) {
          toastStore.success(
            `Imported ${result.drafts} movements as drafts. ${result.needsCategorization} need categorization.`
          );
        } else {
          toastStore.success(
            `Successfully imported ${result.drafts} movements as drafts!`
          );
        }

        // Clear state after 3 seconds and redirect to drafts page
        setTimeout(() => {
          goto('/movements/drafts');
        }, 3000);
      }

      if (result.failed > 0) {
        toastStore.warning(
          `${result.failed} rows failed to import`
        );
      }
    } catch (error: any) {
      toastStore.error(`Import failed: ${error.message}`);
    } finally {
      isImporting = false;
    }
  }

  // Download template
  async function downloadTemplate() {
    try {
      const template = await trpc.import.downloadTemplate.query();

      // Convert base64 to blob
      const blob = base64ToBlob(template.data, template.mimeType);

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = template.fileName;
      a.click();
      URL.revokeObjectURL(url);

      toastStore.success('Template downloaded successfully');
    } catch (error: any) {
      toastStore.error(`Failed to download template: ${error.message}`);
    }
  }

  // Helper: Convert base64 to Blob
  function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // Clear selection
  function clearSelection() {
    selectedFile = null;
    validationResult = null;
    importResult = null;
    // Don't clear bank account selection (user might upload multiple files)
    if (fileInput) {
      fileInput.value = '';
    }
  }
</script>

<svelte:head>
  <title>Bulk Import - YL Portal</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <!-- Header -->
  <div class="mb-6">
    <div class="flex items-center gap-2 text-sm text-yl-gray-600 mb-2">
      <a href="/movements" class="hover:text-yl-green transition-colors">Movements</a>
      <span>/</span>
      <span class="text-yl-black">Bulk Import</span>
    </div>
    <h1 class="text-3xl font-bold text-yl-black">Bulk Import Movements</h1>
    <p class="mt-2 text-yl-gray-600">Import multiple movements from Excel or CSV file</p>
  </div>

  <!-- Download Template -->
  <div class="mb-6">
    <button
      on:click={downloadTemplate}
      class="px-4 py-2 text-sm font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded-lg transition-colors flex items-center gap-2"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Download Template
    </button>
  </div>

  <!-- Bank Account Selection -->
  <div class="mb-6 bg-white rounded-lg shadow border border-gray-200 p-6">
    <label class="block text-sm font-medium text-yl-black mb-3">
      Select Bank Account <span class="text-red-500">*</span>
    </label>
    {#if isLoadingBankAccounts}
      <div class="flex items-center space-x-2 text-yl-gray-600">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-yl-green"></div>
        <span class="text-sm">Loading bank accounts...</span>
      </div>
    {:else if bankAccounts.length === 0}
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p class="text-sm text-yellow-800">
          No bank accounts found. Please contact your administrator to set up bank accounts before importing movements.
        </p>
      </div>
    {:else}
      <Select
        items={bankAccountItems}
        value={selectedBankAccount}
        on:change={(e) => (selectedBankAccountId = e.detail?.value)}
        placeholder="Select a bank account..."
        clearable={false}
        --border="1px solid #d1d5db"
        --border-radius="0.5rem"
        --border-focused="2px solid #00A859"
        --height="42px"
        --padding="0 1rem"
      />
      <p class="mt-2 text-xs text-yl-gray-600">
        Imported movements will be associated with this bank account
      </p>
    {/if}
  </div>

  <!-- File Upload Area -->
  {#if !selectedFile}
    <div
      class="border-2 border-dashed rounded-lg p-8 text-center transition-colors {isDragging
        ? 'border-yl-green bg-yl-green-light'
        : 'border-gray-300 bg-white'}"
      on:drop={handleDrop}
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
    >
      <svg class="mx-auto h-12 w-12 text-yl-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <p class="mt-4 text-lg font-medium text-yl-black">
        Drag and drop your file here
      </p>
      <p class="mt-2 text-sm text-yl-gray-600">or click to browse</p>
      <p class="mt-1 text-xs text-yl-gray-500">Supports: .xlsx, .csv (max 10MB)</p>

      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        on:change={handleFileSelect}
        bind:this={fileInput}
        class="hidden"
      />

      <button
        on:click={() => fileInput?.click()}
        class="mt-4 px-6 py-3 text-sm font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded-lg transition-colors"
      >
        Select File
      </button>
    </div>
  {:else}
    <!-- File Selected -->
    <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <svg class="w-8 h-8 text-yl-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <p class="font-medium text-yl-black">{selectedFile.name}</p>
            <p class="text-sm text-yl-gray-600">
              {(selectedFile.size / 1024).toFixed(2)} KB
            </p>
          </div>
        </div>
        <button
          on:click={clearSelection}
          class="p-2 text-yl-gray-600 hover:text-red-600 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {#if isValidating}
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yl-green"></div>
          <p class="ml-4 text-yl-gray-600">Validating file...</p>
        </div>
      {:else if validationResult}
        <!-- Inline Editable Data Table -->
        <div class="mt-6 space-y-4">
          <!-- Info Banner -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              <div class="flex-1">
                <h3 class="text-sm font-semibold text-blue-800 mb-1">Review and Edit Import Data</h3>
                <p class="text-sm text-blue-700">
                  You can edit any field directly in the table below. Rows with errors are highlighted in red and must be fixed before importing.
                </p>
              </div>
            </div>
          </div>

          <!-- Editable Table Component -->
          <ImportDataTable
            rows={validationResult.rows}
            onRowsChange={handleRowsUpdate}
          />

          <!-- Actions -->
          <div class="flex items-center justify-between pt-4">
            <button
              on:click={clearSelection}
              disabled={isImporting}
              class="px-4 py-2 text-sm font-medium text-yl-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <div class="flex items-center gap-3">
              {#if validationResult.errorCount > 0}
                <div class="text-sm text-red-600 font-medium">
                  {validationResult.errorCount} error(s) must be fixed
                </div>
              {/if}

              {#if validationResult.validRows > 0}
                <button
                  on:click={() => executeImport(true)}
                  disabled={isImporting}
                  class="px-6 py-3 text-sm font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                  {#if isImporting}
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Importing...
                  {:else}
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {#if validationResult.errorCount > 0}
                      Import {validationResult.validRows} Valid Row(s)
                    {:else}
                      Import All {validationResult.validRows} Row(s)
                    {/if}
                  {/if}
                </button>
              {:else}
                <div class="text-sm text-yl-gray-600 font-medium">
                  No valid rows to import
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <!-- Import Result -->
      {#if importResult}
        <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="text-sm font-semibold text-blue-800 mb-2">Import Complete!</h3>
          <p class="text-sm text-blue-700">
            Successfully imported: <span class="font-bold">{importResult.drafts}</span> movements as drafts
          </p>
          {#if importResult.needsCategorization > 0}
            <p class="text-sm text-yellow-700 mt-1">
              ⚠️ <span class="font-bold">{importResult.needsCategorization}</span> movements need categorization (no department assigned)
            </p>
          {/if}
          {#if importResult.failed > 0}
            <p class="text-sm text-red-700 mt-1">
              Failed: <span class="font-bold">{importResult.failed}</span> rows
            </p>
          {/if}
          <p class="text-xs text-blue-600 mt-2">Redirecting to draft management...</p>
        </div>
      {/if}
    </div>
  {/if}
</div>
