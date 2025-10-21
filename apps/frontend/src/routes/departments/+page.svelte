<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  let departments: any[] = [];
  let areas: any[] = [];
  let isLoading = true;
  let isLoadingAreas = true;
  let error = '';

  // Filters
  let selectedAreaId = '';

  // Delete confirmation
  let showDeleteDialog = false;
  let isDeleting = false;
  let departmentToDelete: { id: string; name: string } | null = null;

  onMount(async () => {
    await loadAreas();
    await loadDepartments();
  });

  async function loadAreas() {
    try {
      isLoadingAreas = true;
      areas = await trpc.area.list.query();
    } catch (err: any) {
      console.error('Failed to load areas:', err);
    } finally {
      isLoadingAreas = false;
    }
  }

  async function loadDepartments() {
    try {
      isLoading = true;
      error = '';

      const query: any = {};
      if (selectedAreaId) {
        query.areaId = selectedAreaId;
      }

      departments = await trpc.department.list.query(query);
    } catch (err: any) {
      error = err.message || 'Failed to load departments';
    } finally {
      isLoading = false;
    }
  }

  async function handleFilterChange() {
    await loadDepartments();
  }

  function handleDeleteClick(id: string, name: string) {
    departmentToDelete = { id, name };
    showDeleteDialog = true;
  }

  async function confirmDelete() {
    if (!departmentToDelete) return;

    try {
      isDeleting = true;
      await trpc.department.delete.mutate({ id: departmentToDelete.id });
      await loadDepartments();
      showDeleteDialog = false;
      departmentToDelete = null;
    } catch (err: any) {
      alert(`Failed to delete department: ${err.message}`);
    } finally {
      isDeleting = false;
    }
  }

  function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  }

  // Group departments by area
  $: departmentsByArea = departments.reduce((acc, dept) => {
    const areaId = dept.area?.id || 'unknown';
    if (!acc[areaId]) {
      acc[areaId] = {
        area: dept.area,
        departments: [],
      };
    }
    acc[areaId].departments.push(dept);
    return acc;
  }, {} as Record<string, { area: any; departments: any[] }>);

  // Filter out invalid entries and ensure all groups have valid structure
  $: areaGroups = Object.values(departmentsByArea).filter(
    (group) => group && Array.isArray(group.departments) && group.departments.length > 0
  );
</script>

<svelte:head>
  <title>Departments - YL Portal</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <div>
      <h1 class="text-3xl font-bold text-yl-black">Departments</h1>
      <p class="mt-1 text-yl-gray-600">Manage department subdivisions within financial areas</p>
    </div>
    <button
      on:click={() => goto('/departments/new')}
      class="px-4 py-2 text-sm font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green"
    >
      New Department
    </button>
  </div>

  <!-- Filters -->
  <div class="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <label for="area-filter" class="block text-sm font-medium text-yl-gray-700 mb-1">
          Filter by Area
        </label>
        <select
          id="area-filter"
          bind:value={selectedAreaId}
          on:change={handleFilterChange}
          disabled={isLoadingAreas}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-50"
        >
          <option value="">All Areas</option>
          {#each areas as area}
            <option value={area.id}>{area.name} ({area.code})</option>
          {/each}
        </select>
      </div>
      <div class="flex items-end">
        <button
          on:click={() => {
            selectedAreaId = '';
            handleFilterChange();
          }}
          class="px-4 py-2 text-sm font-medium text-yl-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green transition-colors"
        >
          Clear Filters
        </button>
      </div>
    </div>
  </div>

  <!-- Content -->
  {#if isLoading}
    <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div class="animate-pulse space-y-4">
        {#each [1, 2, 3, 4] as _}
          <div class="h-16 bg-gray-200 rounded"></div>
        {/each}
      </div>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-600">{error}</p>
    </div>
  {:else if departments.length === 0}
    <div class="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-yl-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-yl-gray-900">No departments found</h3>
      <p class="mt-1 text-sm text-yl-gray-500">
        {selectedAreaId ? 'No departments in the selected area.' : 'Get started by creating a new department.'}
      </p>
      <div class="mt-6">
        <button
          on:click={() => goto('/departments/new')}
          class="px-4 py-2 text-sm font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green"
        >
          New Department
        </button>
      </div>
    </div>
  {:else}
    <!-- Desktop view: Table -->
    <div class="hidden md:block bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Department
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Code
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Area
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Balance
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Movements
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each departments as dept}
            <tr class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-yl-black">{dept.name}</div>
                {#if dept.description}
                  <div class="text-sm text-yl-gray-500 truncate max-w-xs">{dept.description}</div>
                {/if}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-mono font-medium bg-gray-100 text-yl-gray-700 rounded">
                  {dept.code}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-yl-gray-900">
                <a href="/areas/{dept.area?.id}" class="hover:text-yl-green transition-colors">
                  {dept.area?.name || 'Unknown'}
                </a>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium {
                (dept.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }">
                {formatCurrency(dept.balance || 0, dept.area?.currency || 'EUR')}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-yl-gray-600">
                {dept._count?.movements || 0}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button
                  on:click={() => goto(`/departments/${dept.id}`)}
                  class="text-yl-green hover:text-yl-green-dark transition-colors"
                >
                  View
                </button>
                <button
                  on:click={() => goto(`/departments/${dept.id}/edit`)}
                  class="text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  on:click={() => handleDeleteClick(dept.id, dept.name)}
                  disabled={dept._count?.movements > 0}
                  class="text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  title={dept._count?.movements > 0 ? 'Cannot delete department with movements' : 'Delete department'}
                >
                  Delete
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile view: Cards -->
    <div class="md:hidden space-y-4">
      {#if selectedAreaId}
        <!-- Single area, show departments directly -->
        {#each departments as dept}
          <div class="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-yl-black">{dept.name}</h3>
                <div class="flex items-center gap-2 mt-1">
                  <span class="px-2 py-0.5 text-xs font-mono font-medium bg-gray-100 text-yl-gray-700 rounded">
                    {dept.code}
                  </span>
                </div>
                {#if dept.description}
                  <p class="text-sm text-yl-gray-600 mt-2">{dept.description}</p>
                {/if}
              </div>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-gray-200">
              <div class="text-sm">
                <div class="text-sm text-yl-gray-600">
                  {dept._count?.movements || 0} movements
                </div>
                <div class="text-sm font-medium {
                  (dept.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }">
                  Balance: {formatCurrency(dept.balance || 0, dept.area?.currency || 'EUR')}
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  on:click={() => goto(`/departments/${dept.id}`)}
                  class="px-3 py-1.5 text-xs font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded transition-colors"
                >
                  View
                </button>
                <button
                  on:click={() => goto(`/departments/${dept.id}/edit`)}
                  class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                >
                  Edit
                </button>
                <button
                  on:click={() => handleDeleteClick(dept.id, dept.name)}
                  disabled={dept._count?.movements > 0}
                  class="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded disabled:text-gray-400 disabled:bg-gray-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        {/each}
      {:else}
        <!-- Multiple areas, group by area -->
        {#each areaGroups as group}
          {#if group?.departments?.length > 0}
            <div class="bg-white rounded-lg shadow border border-gray-200 p-4">
              <h3 class="text-lg font-semibold text-yl-black mb-3">
                {group.area?.name || 'Unknown Area'}
              </h3>
              <div class="space-y-3">
                {#each group.departments as dept}
                <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                      <h4 class="font-medium text-yl-black">{dept.name}</h4>
                      <span class="px-2 py-0.5 text-xs font-mono font-medium bg-gray-200 text-yl-gray-700 rounded">
                        {dept.code}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <div class="text-xs">
                      <div class="text-xs text-yl-gray-600">
                        {dept._count?.movements || 0} movements
                      </div>
                      <div class="text-xs font-medium {
                        (dept.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }">
                        {formatCurrency(dept.balance || 0, group.area?.currency || 'EUR')}
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button
                        on:click={() => goto(`/departments/${dept.id}`)}
                        class="px-2 py-1 text-xs font-medium text-yl-green hover:text-yl-green-dark transition-colors"
                      >
                        View
                      </button>
                      <button
                        on:click={() => goto(`/departments/${dept.id}/edit`)}
                        class="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        on:click={() => handleDeleteClick(dept.id, dept.name)}
                        disabled={dept._count?.movements > 0}
                        class="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:text-gray-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      {/if}
    </div>
  {/if}
</div>

<!-- Delete Confirmation -->
<ConfirmDialog
  open={showDeleteDialog}
  title="Delete Department"
  message={`Are you sure you want to delete "${departmentToDelete?.name}"? This action cannot be undone.`}
  confirmText={isDeleting ? 'Deleting...' : 'Delete'}
  cancelText="Cancel"
  variant="danger"
  onConfirm={confirmDelete}
  onCancel={() => {
    showDeleteDialog = false;
    departmentToDelete = null;
  }}
/>
