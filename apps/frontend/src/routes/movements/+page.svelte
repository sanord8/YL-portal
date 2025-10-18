<script lang="ts">
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import Button from '$lib/components/Button.svelte';
  import { goto } from '$app/navigation';

  // Movement data
  let movements: any[] = [];
  let nextCursor: string | undefined = undefined;
  let isLoading = true;
  let isLoadingMore = false;
  let error = '';

  // Filters
  let selectedArea = '';
  let selectedType = '';
  let selectedStatus = '';

  // Areas for filter dropdown (will be loaded from API in future)
  let areas: any[] = [];

  // Type options
  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'INCOME', label: 'Income' },
    { value: 'EXPENSE', label: 'Expense' },
    { value: 'TRANSFER', label: 'Transfer' },
    { value: 'DISTRIBUTION', label: 'Distribution' },
  ];

  // Status options
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  onMount(async () => {
    await loadMovements();
  });

  async function loadMovements(append = false) {
    if (!append) {
      isLoading = true;
      movements = [];
      nextCursor = undefined;
    } else {
      isLoadingMore = true;
    }

    error = '';

    try {
      const result = await trpc.movement.list.query({
        limit: 20,
        cursor: append ? nextCursor : undefined,
        areaId: selectedArea || undefined,
        type: selectedType || undefined,
        status: selectedStatus || undefined,
      });

      if (append) {
        movements = [...movements, ...result.movements];
      } else {
        movements = result.movements;
      }

      nextCursor = result.nextCursor;
    } catch (err: any) {
      console.error('Failed to load movements:', err);
      error = err.message || 'Failed to load movements. Please try again.';
    } finally {
      isLoading = false;
      isLoadingMore = false;
    }
  }

  function handleFilterChange() {
    loadMovements();
  }

  function formatCurrency(amount: number, currency: string = 'EUR') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100); // Convert cents to currency
  }

  function formatDate(date: string | Date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  }

  function getTypeColor(type: string) {
    switch (type) {
      case 'INCOME':
        return 'bg-green-100 text-green-800';
      case 'EXPENSE':
        return 'bg-red-100 text-red-800';
      case 'TRANSFER':
        return 'bg-blue-100 text-blue-800';
      case 'DISTRIBUTION':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'APPROVED':
        return 'bg-yl-green/10 text-yl-green';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function handleCreateMovement() {
    goto('/movements/new');
  }

  function handleViewMovement(id: string) {
    goto(`/movements/${id}`);
  }
</script>

<svelte:head>
  <title>Movements - YoungLife Portal</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div>
      <h1 class="text-3xl font-bold text-yl-black">Financial Movements</h1>
      <p class="text-sm text-yl-gray-600 mt-1">Track and manage all financial transactions</p>
    </div>
    <Button variant="primary" size="md" on:click={handleCreateMovement}>
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      New Movement
    </Button>
  </div>

  <!-- Filters -->
  <div class="bg-white rounded-lg shadow border border-gray-200 p-4">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <!-- Type Filter -->
      <div>
        <label for="type-filter" class="block text-sm font-medium text-yl-black mb-2">
          Type
        </label>
        <select
          id="type-filter"
          bind:value={selectedType}
          on:change={handleFilterChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        >
          {#each typeOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <!-- Status Filter -->
      <div>
        <label for="status-filter" class="block text-sm font-medium text-yl-black mb-2">
          Status
        </label>
        <select
          id="status-filter"
          bind:value={selectedStatus}
          on:change={handleFilterChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        >
          {#each statusOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <!-- Clear Filters -->
      <div class="flex items-end">
        <button
          on:click={() => {
            selectedType = '';
            selectedStatus = '';
            selectedArea = '';
            handleFilterChange();
          }}
          class="w-full px-4 py-2 text-sm font-medium text-yl-gray-600 hover:text-yl-black border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Clear Filters
        </button>
      </div>
    </div>
  </div>

  <!-- Movements List -->
  {#if isLoading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yl-green"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-red-800 font-semibold mb-2">Error Loading Movements</p>
      <p class="text-red-600 text-sm">{error}</p>
      <Button variant="secondary" size="sm" class="mt-4" on:click={() => loadMovements()}>
        Try Again
      </Button>
    </div>
  {:else if movements.length === 0}
    <div class="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
      <svg class="w-16 h-16 text-yl-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="text-lg font-semibold text-yl-black mb-2">No Movements Found</h3>
      <p class="text-sm text-yl-gray-600 mb-6">
        {#if selectedType || selectedStatus || selectedArea}
          No movements match your current filters. Try adjusting your search criteria.
        {:else}
          Get started by creating your first financial movement.
        {/if}
      </p>
      <Button variant="primary" size="md" on:click={handleCreateMovement}>
        Create First Movement
      </Button>
    </div>
  {:else}
    <!-- Desktop Table View -->
    <div class="hidden md:block bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Date
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Description
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Type
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Area
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Amount
            </th>
            <th class="px-6 py-3 text-center text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each movements as movement}
            <tr class="hover:bg-gray-50 cursor-pointer transition-colors" on:click={() => handleViewMovement(movement.id)}>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-yl-black">
                {formatDate(movement.transactionDate)}
              </td>
              <td class="px-6 py-4 text-sm text-yl-black">
                <div class="max-w-xs truncate">{movement.description}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-medium rounded-full {getTypeColor(movement.type)}">
                  {movement.type}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-yl-gray-600">
                {movement.area?.name || 'N/A'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-right {movement.type === 'INCOME' ? 'text-green-600' : 'text-yl-black'}">
                {movement.type === 'INCOME' ? '+' : '-'}{formatCurrency(movement.amount, movement.currency)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(movement.status)}">
                  {movement.status}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  on:click|stopPropagation={() => handleViewMovement(movement.id)}
                  class="text-yl-green hover:text-yl-green-accent font-medium"
                >
                  View
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View -->
    <div class="md:hidden space-y-4">
      {#each movements as movement}
        <div
          class="bg-white rounded-lg shadow border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          on:click={() => handleViewMovement(movement.id)}
          on:keydown={(e) => e.key === 'Enter' && handleViewMovement(movement.id)}
          role="button"
          tabindex="0"
        >
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1">
              <p class="text-sm font-medium text-yl-black">{movement.description}</p>
              <p class="text-xs text-yl-gray-600 mt-1">{formatDate(movement.transactionDate)}</p>
            </div>
            <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(movement.status)} ml-2">
              {movement.status}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2">
              <span class="px-2 py-1 text-xs font-medium rounded-full {getTypeColor(movement.type)}">
                {movement.type}
              </span>
              <span class="text-xs text-yl-gray-600">{movement.area?.name || 'N/A'}</span>
            </div>
            <p class="text-sm font-bold {movement.type === 'INCOME' ? 'text-green-600' : 'text-yl-black'}">
              {movement.type === 'INCOME' ? '+' : '-'}{formatCurrency(movement.amount, movement.currency)}
            </p>
          </div>
        </div>
      {/each}
    </div>

    <!-- Load More Button -->
    {#if nextCursor}
      <div class="flex justify-center pt-4">
        <Button
          variant="secondary"
          size="md"
          on:click={() => loadMovements(true)}
          disabled={isLoadingMore}
        >
          {#if isLoadingMore}
            <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          {:else}
            Load More
          {/if}
        </Button>
      </div>
    {/if}
  {/if}
</div>
