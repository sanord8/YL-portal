<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { toastStore } from '$lib/stores/toastStore';
  import Select from 'svelte-select';

  export let rows: any[] = [];
  export let onRowsChange: (updatedRows: any[]) => void;

  // Data
  let areas: any[] = [];
  let departments: Map<string, any[]> = new Map();
  let editedRows: any[] = [];
  let currentPage = 1;
  let rowsPerPage = 25;

  // Computed
  $: totalPages = Math.ceil(editedRows.length / rowsPerPage);
  $: paginatedRows = editedRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  $: validRowCount = editedRows.filter((r) => r.errors.length === 0).length;
  $: errorRowCount = editedRows.filter((r) => r.errors.length > 0).length;

  // Format areas for svelte-select
  $: areaItems = areas.map((area) => ({
    value: area.id,
    label: `${area.name} (${area.code})`,
  }));

  // Type options for svelte-select
  const typeItems = [
    { value: 'INCOME', label: 'Income' },
    { value: 'EXPENSE', label: 'Expense' },
  ];

  // Initialize edited rows
  onMount(async () => {
    editedRows = JSON.parse(JSON.stringify(rows)); // Deep clone
    await loadAreas();
  });

  // Load areas
  async function loadAreas() {
    try {
      areas = await trpc.area.list.query();

      // Load departments for each area
      for (const area of areas) {
        const depts = await trpc.department.list.query({ areaId: area.id });
        departments.set(area.id, depts);
      }
      departments = departments; // Trigger reactivity
    } catch (error: any) {
      toastStore.error('Failed to load areas and departments');
    }
  }

  // Handle field change
  function handleFieldChange(rowIndex: number, field: string, value: any) {
    const globalIndex = (currentPage - 1) * rowsPerPage + rowIndex;
    const row = editedRows[globalIndex];

    // Update field
    row[field] = value;

    // If area changed, clear department and reload departments
    if (field === 'areaId') {
      row.departmentId = undefined;
      row.needsCategorization = true;
    }

    // If department changed, mark as categorized
    if (field === 'departmentId' && value) {
      row.needsCategorization = false;
    }

    // Clear row-level errors for this field
    row.errors = row.errors.filter((e: any) => e.column !== field);

    // Validate field
    validateField(row, field);

    // Trigger reactivity
    editedRows = editedRows;
    onRowsChange(editedRows);
  }

  // Validate single field
  function validateField(row: any, field: string) {
    switch (field) {
      case 'description':
        if (!row.description || row.description.trim().length === 0) {
          row.errors.push({
            row: row.rowNumber,
            column: 'description',
            message: 'Description is required',
            severity: 'error',
          });
        } else if (row.description.length > 500) {
          row.errors.push({
            row: row.rowNumber,
            column: 'description',
            message: 'Description too long (max 500 chars)',
            severity: 'error',
          });
        }
        break;

      case 'amount':
        if (!row.amount || row.amount <= 0) {
          row.errors.push({
            row: row.rowNumber,
            column: 'amount',
            message: 'Amount must be greater than 0',
            severity: 'error',
          });
        }
        break;

      case 'date':
        if (!row.date) {
          row.errors.push({
            row: row.rowNumber,
            column: 'date',
            message: 'Date is required',
            severity: 'error',
          });
        } else if (new Date(row.date) > new Date()) {
          row.warnings.push({
            row: row.rowNumber,
            column: 'date',
            message: 'Future date - please verify',
            severity: 'warning',
          });
        }
        break;

      case 'areaId':
        if (!row.areaId) {
          row.errors.push({
            row: row.rowNumber,
            column: 'areaId',
            message: 'Area is required',
            severity: 'error',
          });
        }
        break;
    }
  }

  // Format date for input
  function formatDateForInput(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  // Get department items for a specific area
  function getDepartmentItems(areaId: string) {
    if (!areaId || !departments.has(areaId)) return [];
    const depts = departments.get(areaId) || [];
    return depts.map((dept) => ({
      value: dept.id,
      label: `${dept.name} (${dept.code})`,
    }));
  }

  // Get selected item for svelte-select
  function getSelectedItem(items: any[], value: any) {
    return items.find((item) => item.value === value);
  }

  // Get row status
  function getRowStatus(row: any): 'valid' | 'warning' | 'error' {
    if (row.errors.length > 0) return 'error';
    if (row.warnings.length > 0) return 'warning';
    return 'valid';
  }

  // Get row status icon
  function getStatusIcon(status: string): string {
    switch (status) {
      case 'valid':
        return '';
      case 'warning':
        return '�';
      case 'error':
        return '';
      default:
        return '';
    }
  }

  // Pagination
  function nextPage() {
    if (currentPage < totalPages) currentPage++;
  }

  function prevPage() {
    if (currentPage > 1) currentPage--;
  }

  function goToPage(page: number) {
    currentPage = Math.max(1, Math.min(page, totalPages));
  }
</script>

<div class="bg-white rounded-lg border border-gray-200">
  <!-- Header Stats -->
  <div class="border-b border-gray-200 p-4 bg-gray-50">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-6">
        <div class="text-sm">
          <span class="font-medium text-yl-black">Total Rows:</span>
          <span class="ml-2 text-yl-gray-700">{editedRows.length}</span>
        </div>
        <div class="text-sm">
          <span class="font-medium text-green-700">Valid:</span>
          <span class="ml-2 text-green-600">{validRowCount}</span>
        </div>
        <div class="text-sm">
          <span class="font-medium text-red-700">Errors:</span>
          <span class="ml-2 text-red-600">{errorRowCount}</span>
        </div>
      </div>
      <div class="text-sm text-yl-gray-600">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  </div>

  <!-- Table -->
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-3 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider w-12">
            #
          </th>
          <th class="px-3 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider w-24">
            Status
          </th>
          <th class="px-3 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider w-32">
            Date
          </th>
          <th class="px-3 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider min-w-[200px]">
            Description
          </th>
          <th class="px-3 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider w-28">
            Amount
          </th>
          <th class="px-3 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider w-28">
            Type
          </th>
          <th class="px-3 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider w-40">
            Area
          </th>
          <th class="px-3 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider w-40">
            Department
          </th>
          <th class="px-3 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider w-32">
            Category
          </th>
          <th class="px-3 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider w-32">
            Reference
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        {#each paginatedRows as row, index}
          {@const globalIndex = (currentPage - 1) * rowsPerPage + index}
          {@const status = getRowStatus(row)}
          {@const statusClass = status === 'valid' ? 'bg-green-50' : status === 'warning' ? 'bg-yellow-50' : 'bg-red-50'}

          <tr class="{statusClass} hover:bg-opacity-80 transition-colors">
            <!-- Row Number -->
            <td class="px-3 py-2 whitespace-nowrap text-sm text-yl-gray-700 font-medium">
              {row.rowNumber}
            </td>

            <!-- Status -->
            <td class="px-3 py-2 whitespace-nowrap">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {status === 'valid' ? 'bg-green-100 text-green-800' : status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                {getStatusIcon(status)} {status}
              </span>
            </td>

            <!-- Date -->
            <td class="px-3 py-2 whitespace-nowrap">
              <input
                type="date"
                value={formatDateForInput(row.date)}
                on:change={(e) => handleFieldChange(index, 'date', new Date(e.currentTarget.value))}
                class="w-full px-2 py-1 text-sm border rounded {row.errors.some((e) => e.column === 'date') ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-yl-green focus:border-transparent"
              />
            </td>

            <!-- Description -->
            <td class="px-3 py-2">
              <input
                type="text"
                value={row.description}
                on:input={(e) => handleFieldChange(index, 'description', e.currentTarget.value)}
                placeholder="Description..."
                class="w-full px-2 py-1 text-sm border rounded {row.errors.some((e) => e.column === 'description') ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-yl-green focus:border-transparent"
              />
            </td>

            <!-- Amount -->
            <td class="px-3 py-2 whitespace-nowrap">
              <input
                type="number"
                step="0.01"
                value={row.amount}
                on:input={(e) => handleFieldChange(index, 'amount', parseFloat(e.currentTarget.value))}
                class="w-full px-2 py-1 text-sm border rounded {row.errors.some((e) => e.column === 'amount') ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-yl-green focus:border-transparent"
              />
            </td>

            <!-- Type -->
            <td class="px-3 py-2 whitespace-nowrap">
              <Select
                items={typeItems}
                value={getSelectedItem(typeItems, row.type)}
                on:change={(e) => handleFieldChange(index, 'type', e.detail?.value)}
                placeholder="Select type..."
                clearable={false}
                searchable={false}
                --border="1px solid #d1d5db"
                --border-radius="0.375rem"
                --border-focused="2px solid #00A859"
                --height="38px"
                --font-size="0.875rem"
              />
            </td>

            <!-- Area -->
            <td class="px-3 py-2 whitespace-nowrap">
              <Select
                items={areaItems}
                value={getSelectedItem(areaItems, row.areaId)}
                on:change={(e) => handleFieldChange(index, 'areaId', e.detail?.value)}
                placeholder="Select area..."
                clearable={false}
                --border={row.errors.some((e) => e.column === 'areaId') ? '1px solid #ef4444' : '1px solid #d1d5db'}
                --border-radius="0.375rem"
                --border-focused="2px solid #00A859"
                --height="38px"
                --font-size="0.875rem"
              />
            </td>

            <!-- Department -->
            <td class="px-3 py-2 whitespace-nowrap">
              <Select
                items={getDepartmentItems(row.areaId)}
                value={getSelectedItem(getDepartmentItems(row.areaId), row.departmentId)}
                on:change={(e) => handleFieldChange(index, 'departmentId', e.detail?.value)}
                placeholder="Select department..."
                disabled={!row.areaId}
                clearable={true}
                --border="1px solid #d1d5db"
                --border-radius="0.375rem"
                --border-focused="2px solid #00A859"
                --height="38px"
                --font-size="0.875rem"
                --disabled-background="#f3f4f6"
              />
            </td>

            <!-- Category -->
            <td class="px-3 py-2 whitespace-nowrap">
              <input
                type="text"
                value={row.category || ''}
                on:input={(e) => handleFieldChange(index, 'category', e.currentTarget.value)}
                placeholder="Category..."
                class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-yl-green focus:border-transparent"
              />
            </td>

            <!-- Reference -->
            <td class="px-3 py-2 whitespace-nowrap">
              <input
                type="text"
                value={row.reference || ''}
                on:input={(e) => handleFieldChange(index, 'reference', e.currentTarget.value)}
                placeholder="Reference..."
                class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-yl-green focus:border-transparent"
              />
            </td>
          </tr>

          <!-- Error/Warning Messages Row -->
          {#if row.errors.length > 0 || row.warnings.length > 0}
            <tr class="{statusClass}">
              <td colspan="10" class="px-3 py-2">
                <div class="text-xs space-y-1">
                  {#each row.errors as error}
                    <div class="text-red-700 flex items-start space-x-2">
                      <span class="font-medium"></span>
                      <span><strong>{error.column}:</strong> {error.message}</span>
                    </div>
                  {/each}
                  {#each row.warnings as warning}
                    <div class="text-yellow-700 flex items-start space-x-2">
                      <span class="font-medium">�</span>
                      <span><strong>{warning.column}:</strong> {warning.message}</span>
                    </div>
                  {/each}
                </div>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="border-t border-gray-200 px-4 py-3 flex items-center justify-between bg-gray-50">
      <div class="text-sm text-yl-gray-600">
        Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, editedRows.length)} of {editedRows.length} rows
      </div>
      <div class="flex items-center space-x-2">
        <button
          on:click={prevPage}
          disabled={currentPage === 1}
          class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div class="flex items-center space-x-1">
          {#each Array(Math.min(totalPages, 5)) as _, i}
            {@const page = i + 1}
            <button
              on:click={() => goToPage(page)}
              class="px-3 py-1 text-sm border rounded {currentPage === page ? 'bg-yl-green text-white border-yl-green' : 'border-gray-300 hover:bg-gray-100'}"
            >
              {page}
            </button>
          {/each}
          {#if totalPages > 5}
            <span class="text-yl-gray-600">...</span>
            <button
              on:click={() => goToPage(totalPages)}
              class="px-3 py-1 text-sm border rounded {currentPage === totalPages ? 'bg-yl-green text-white border-yl-green' : 'border-gray-300 hover:bg-gray-100'}"
            >
              {totalPages}
            </button>
          {/if}
        </div>
        <button
          on:click={nextPage}
          disabled={currentPage === totalPages}
          class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  {/if}
</div>
