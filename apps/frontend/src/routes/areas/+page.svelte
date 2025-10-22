<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc';
  import Button from '$lib/components/Button.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import { toastStore } from '$lib/stores/toastStore';

  let areas: any[] = [];
  let isLoading = true;
  let error = '';

  // Delete confirmation
  let showDeleteDialog = false;
  let areaToDelete: { id: string; name: string } | null = null;

  onMount(async () => {
    await loadAreas();
  });

  async function loadAreas() {
    isLoading = true;
    error = '';

    try {
      areas = await trpc.area.listAll.query();
    } catch (err: any) {
      console.error('Failed to load areas:', err);
      error = err.message || 'Failed to load areas';
    } finally {
      isLoading = false;
    }
  }

  function handleDeleteClick(id: string, name: string) {
    areaToDelete = { id, name };
    showDeleteDialog = true;
  }

  async function confirmDelete() {
    if (!areaToDelete) return;

    try {
      await trpc.area.delete.mutate({ id: areaToDelete.id });
      await loadAreas();
      showDeleteDialog = false;
      areaToDelete = null;
    } catch (err: any) {
      toastStore.add(err.message || 'Failed to delete area', 'error');
    }
  }

  function formatCurrency(amount: number | null, currency: string) {
    if (amount === null) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  }
</script>

<svelte:head>
  <title>Areas - YoungLife Portal</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div>
      <h1 class="text-3xl font-bold text-yl-black">Areas</h1>
      <p class="text-sm text-yl-gray-600 mt-1">Manage financial areas and departments</p>
    </div>
    <Button variant="primary" size="md" on:click={() => goto('/areas/new')}>
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      New Area
    </Button>
  </div>

  <!-- Areas List -->
  {#if isLoading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yl-green"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-red-800 font-semibold mb-2">Error Loading Areas</p>
      <p class="text-red-600 text-sm">{error}</p>
      <Button variant="secondary" size="sm" class="mt-4" on:click={loadAreas}>
        Try Again
      </Button>
    </div>
  {:else if areas.length === 0}
    <div class="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
      <svg class="w-16 h-16 text-yl-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <h3 class="text-lg font-semibold text-yl-black mb-2">No Areas Found</h3>
      <p class="text-sm text-yl-gray-600 mb-6">
        Get started by creating your first financial area.
      </p>
      <Button variant="primary" size="md" on:click={() => goto('/areas/new')}>
        Create First Area
      </Button>
    </div>
  {:else}
    <!-- Desktop Table View -->
    <div class="hidden md:block bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Area
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Code
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Currency
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Budget
            </th>
            <th class="px-6 py-3 text-center text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Users
            </th>
            <th class="px-6 py-3 text-center text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Departments
            </th>
            <th class="px-6 py-3 text-center text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Movements
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each areas as area}
            <tr class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4">
                <div>
                  <p class="text-sm font-medium text-yl-black">{area.name}</p>
                  {#if area.description}
                    <p class="text-xs text-yl-gray-600 mt-1">{area.description}</p>
                  {/if}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {area.code}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-yl-gray-600">
                {area.currency}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-yl-gray-600">
                {formatCurrency(area.budget, area.currency)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-yl-gray-600">
                {area._count.users}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-yl-gray-600">
                {area._count.departments}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-yl-gray-600">
                {area._count.movements}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                <button
                  on:click={() => goto(`/areas/${area.id}`)}
                  class="text-yl-green hover:text-yl-green-accent font-medium"
                >
                  View
                </button>
                <button
                  on:click={() => goto(`/areas/${area.id}/edit`)}
                  class="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit
                </button>
                <button
                  on:click={() => handleDeleteClick(area.id, area.name)}
                  class="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={area._count.movements > 0}
                  title={area._count.movements > 0 ? 'Cannot delete area with movements' : ''}
                >
                  Delete
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View -->
    <div class="md:hidden space-y-4">
      {#each areas as area}
        <div class="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-yl-black">{area.name}</h3>
              <span class="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mt-1">
                {area.code}
              </span>
            </div>
          </div>

          {#if area.description}
            <p class="text-sm text-yl-gray-600 mb-3">{area.description}</p>
          {/if}

          <div class="grid grid-cols-2 gap-3 mb-3 text-sm">
            <div>
              <p class="text-yl-gray-600">Currency</p>
              <p class="font-medium text-yl-black">{area.currency}</p>
            </div>
            <div>
              <p class="text-yl-gray-600">Budget</p>
              <p class="font-medium text-yl-black">{formatCurrency(area.budget, area.currency)}</p>
            </div>
          </div>

          <div class="flex justify-between items-center text-xs text-yl-gray-600 mb-3 pb-3 border-b border-gray-200">
            <span>{area._count.users} users</span>
            <span>{area._count.departments} departments</span>
            <span>{area._count.movements} movements</span>
          </div>

          <div class="flex gap-2">
            <Button variant="secondary" size="sm" class="flex-1" on:click={() => goto(`/areas/${area.id}`)}>
              View
            </Button>
            <Button variant="secondary" size="sm" class="flex-1" on:click={() => goto(`/areas/${area.id}/edit`)}>
              Edit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              class="!text-red-600 !border-red-600 hover:!bg-red-50"
              on:click={() => handleDeleteClick(area.id, area.name)}
              disabled={area._count.movements > 0}
            >
              Delete
            </Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
  open={showDeleteDialog}
  title="Delete Area"
  message={areaToDelete ? `Are you sure you want to delete "${areaToDelete.name}"? This action cannot be undone.` : ''}
  confirmText="Delete"
  cancelText="Cancel"
  variant="danger"
  onConfirm={confirmDelete}
  onCancel={() => {
    showDeleteDialog = false;
    areaToDelete = null;
  }}
/>
