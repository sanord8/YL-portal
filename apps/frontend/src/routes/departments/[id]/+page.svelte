<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import StatsGrid from '$lib/components/StatsGrid.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  let department: any = null;
  let movements: any[] = [];

  let isLoading = true;
  let isLoadingMovements = true;
  let error = '';

  // Delete confirmation
  let showDeleteDialog = false;
  let isDeleting = false;

  // Reactive department ID from route params
  $: departmentId = $page.params.id;

  // Reload data when department ID changes
  $: if (departmentId) {
    loadDepartment();
    loadRecentMovements();
  }

  onMount(async () => {
    // Initial load handled by reactive statement
  });

  async function loadDepartment() {
    try {
      isLoading = true;
      error = '';
      department = await trpc.department.getById.query({ id: departmentId });
    } catch (err: any) {
      error = err.message || 'Failed to load department';
    } finally {
      isLoading = false;
    }
  }

  async function loadRecentMovements() {
    try {
      isLoadingMovements = true;
      const result = await trpc.movement.list.query({
        departmentId,
        limit: 5
      });
      movements = result.movements;
    } catch (err: any) {
      console.error('Failed to load movements:', err);
    } finally {
      isLoadingMovements = false;
    }
  }

  async function handleDelete() {
    try {
      isDeleting = true;
      await trpc.department.delete.mutate({ id: departmentId });
      goto('/departments');
    } catch (err: any) {
      alert(`Failed to delete department: ${err.message}`);
      isDeleting = false;
      showDeleteDialog = false;
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

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  $: stats = department ? [
    {
      label: 'Income',
      value: formatCurrency(department.income || 0, department.area?.currency || 'EUR'),
      icon: 'income' as const,
      color: 'green' as const,
    },
    {
      label: 'Expenses',
      value: formatCurrency(department.expenses || 0, department.area?.currency || 'EUR'),
      icon: 'expense' as const,
      color: 'red' as const,
    },
    {
      label: 'Balance',
      value: formatCurrency(department.balance || 0, department.area?.currency || 'EUR'),
      icon: 'balance' as const,
      color: department.balance >= 0 ? 'green' : 'red',
    },
    {
      label: 'Total Movements',
      value: department._count?.movements || 0,
      icon: 'movement' as const,
      color: 'orange' as const,
    },
  ] : [];
</script>

<svelte:head>
  <title>{department ? department.name : 'Department Details'} - YL Portal</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <!-- Header -->
  <div class="mb-6">
    <div class="flex items-center gap-2 text-sm text-yl-gray-600 mb-2">
      <a href="/departments" class="hover:text-yl-green transition-colors">Departments</a>
      <span>/</span>
      <span class="text-yl-black">{department?.name || 'Loading...'}</span>
    </div>

    {#if isLoading}
      <div class="animate-pulse">
        <div class="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-600">{error}</p>
        <button
          on:click={() => goto('/departments')}
          class="mt-2 text-sm text-red-600 hover:text-red-700 underline"
        >
          Back to departments
        </button>
      </div>
    {:else if department}
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <h1 class="text-3xl font-bold text-yl-black">{department.name}</h1>
            <span class="px-3 py-1 text-sm font-mono font-medium bg-gray-100 text-yl-gray-700 rounded">
              {department.code}
            </span>
          </div>
          {#if department.description}
            <p class="text-yl-gray-600 mb-2">{department.description}</p>
          {/if}
          <div class="flex items-center gap-4 text-sm text-yl-gray-600">
            <span>
              Area: <a href="/areas/{department.area?.id}" class="font-medium text-yl-green hover:text-yl-green-dark transition-colors">
                {department.area?.name || 'Unknown'}
              </a>
            </span>
            <span>Created: {formatDate(department.createdAt)}</span>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            on:click={() => goto(`/departments/${departmentId}/edit`)}
            class="px-4 py-2 text-sm font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green"
          >
            Edit
          </button>
          <button
            on:click={() => showDeleteDialog = true}
            class="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    {/if}
  </div>

  {#if department && !error}
    <!-- Statistics -->
    <div class="mb-8">
      <StatsGrid {stats} />
    </div>

    <!-- Recent Movements -->
    <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-yl-black">Recent Movements</h2>
        <a
          href="/movements?departmentId={departmentId}"
          class="text-sm text-yl-green hover:text-yl-green-dark font-medium"
        >
          View all →
        </a>
      </div>

      {#if isLoadingMovements}
        <div class="space-y-2">
          {#each [1, 2, 3] as _}
            <div class="animate-pulse h-16 bg-gray-200 rounded-lg"></div>
          {/each}
        </div>
      {:else if movements.length > 0}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">Type</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">Description</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">Amount</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each movements as movement}
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded {
                      movement.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }">
                      {movement.type}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-yl-gray-900">{movement.description}</td>
                  <td class="px-4 py-3 text-sm font-medium {
                    movement.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                  }">
                    {formatCurrency(movement.amount, department.area?.currency || 'EUR')}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded {
                      movement.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      movement.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }">
                      {movement.status}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-yl-gray-600 whitespace-nowrap">
                    {formatDate(movement.transactionDate)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="text-sm text-yl-gray-500 text-center py-4">
          No movements in this department yet.
        </p>
      {/if}
    </div>
  {/if}
</div>

<!-- Delete Department Confirmation -->
<ConfirmDialog
  open={showDeleteDialog}
  title="Delete Department"
  message={`Are you sure you want to delete "${department?.name}"? This action cannot be undone. ${department?._count?.movements > 0 ? 'This department has movements and cannot be deleted.' : ''}`}
  confirmText={isDeleting ? 'Deleting...' : 'Delete'}
  cancelText="Cancel"
  variant="danger"
  onConfirm={handleDelete}
  onCancel={() => showDeleteDialog = false}
/>
