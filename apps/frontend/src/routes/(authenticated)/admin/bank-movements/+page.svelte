<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc/client';
  import Button from '$lib/components/Button.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import { toastStore } from '$lib/stores/toastStore';

  // Data
  let movements: any[] = [];
  let bankAccounts: any[] = [];
  let areas: any[] = [];
  let departments: any[] = [];
  let isLoading = false;
  let error = '';

  // Filters
  let selectedBankAccountId: string | undefined = undefined;
  let showOnlyUnsplit = true;

  // Split Modal
  let splitModalOpen = false;
  let selectedMovement: any = null;
  let splitAllocations: Array<{
    areaId: string;
    departmentId?: string;
    amount: number;
    description: string;
  }> = [];
  let isSplitting = false;

  // Unsplit Modal
  let unsplitDialogOpen = false;
  let isUnsplitting = false;

  onMount(() => {
    loadData();
  });

  $: {
    // Reload when filters change
    loadMovements();
    selectedBankAccountId;
    showOnlyUnsplit;
  }

  async function loadData() {
    try {
      // Load bank accounts
      bankAccounts = await trpc.bankAccount.list.query();

      // Load areas
      areas = await trpc.area.list.query();

      // Load departments
      const allDepts = await trpc.department.list.query();
      departments = allDepts.departments || [];

      // Load movements
      await loadMovements();
    } catch (err: any) {
      console.error('Failed to load data:', err);
      error = err?.message || 'Failed to load data';
    }
  }

  async function loadMovements() {
    isLoading = true;
    error = '';

    try {
      const result = await trpc.movement.list.query({
        limit: 100,
        status: 'DRAFT', // Show draft movements that need categorization
      });

      movements = result.movements;

      // Apply filters
      if (selectedBankAccountId) {
        movements = movements.filter(
          (m: any) => m.sourceBankAccount?.id === selectedBankAccountId
        );
      }

      if (showOnlyUnsplit) {
        movements = movements.filter((m: any) => !m.isSplitParent);
      }
    } catch (err: any) {
      console.error('Failed to load movements:', err);
      error = err?.message || 'Failed to load movements';
    } finally {
      isLoading = false;
    }
  }

  function openSplitModal(movement: any) {
    selectedMovement = movement;

    // Initialize with 2 empty allocations
    splitAllocations = [
      { areaId: '', departmentId: undefined, amount: 0, description: '' },
      { areaId: '', departmentId: undefined, amount: 0, description: '' },
    ];

    splitModalOpen = true;
  }

  function addAllocation() {
    splitAllocations = [
      ...splitAllocations,
      { areaId: '', departmentId: undefined, amount: 0, description: '' },
    ];
  }

  function removeAllocation(index: number) {
    if (splitAllocations.length <= 2) {
      toastStore.add('Must have at least 2 allocations', 'error');
      return;
    }
    splitAllocations = splitAllocations.filter((_, i) => i !== index);
  }

  function getTotalAllocated(): number {
    return splitAllocations.reduce((sum, a) => sum + (a.amount || 0), 0);
  }

  function getRemainingAmount(): number {
    if (!selectedMovement) return 0;
    return selectedMovement.amount - getTotalAllocated();
  }

  function autoDistributeRemaining() {
    if (!selectedMovement) return;

    const remaining = getRemainingAmount();
    if (remaining <= 0) return;

    // Find first allocation with an area selected but amount = 0
    const emptyAllocation = splitAllocations.find(a => a.areaId && a.amount === 0);
    if (emptyAllocation) {
      emptyAllocation.amount = remaining;
      splitAllocations = [...splitAllocations];
    }
  }

  async function handleSplit() {
    if (!selectedMovement) return;

    // Validation
    if (splitAllocations.length < 2) {
      toastStore.add('Must have at least 2 allocations', 'error');
      return;
    }

    if (splitAllocations.some(a => !a.areaId)) {
      toastStore.add('All allocations must have an area selected', 'error');
      return;
    }

    if (splitAllocations.some(a => a.amount <= 0)) {
      toastStore.add('All allocations must have a positive amount', 'error');
      return;
    }

    const total = getTotalAllocated();
    if (total !== selectedMovement.amount) {
      toastStore.add(`Total allocated (${formatAmount(total)}) must equal movement amount (${formatAmount(selectedMovement.amount)})`, 'error');
      return;
    }

    isSplitting = true;

    try {
      await trpc.movement.split.mutate({
        movementId: selectedMovement.id,
        allocations: splitAllocations.map(a => ({
          areaId: a.areaId,
          departmentId: a.departmentId || undefined,
          amount: a.amount,
          description: a.description || undefined,
        })),
      });

      toastStore.add('Movement split successfully', 'success');
      splitModalOpen = false;
      selectedMovement = null;
      await loadMovements();
    } catch (err: any) {
      console.error('Failed to split movement:', err);
      toastStore.add(err?.message || 'Failed to split movement', 'error');
    } finally {
      isSplitting = false;
    }
  }

  function openUnsplitDialog(movement: any) {
    selectedMovement = movement;
    unsplitDialogOpen = true;
  }

  async function handleUnsplit() {
    if (!selectedMovement) return;

    isUnsplitting = true;

    try {
      await trpc.movement.unsplit.mutate({
        movementId: selectedMovement.id,
      });

      toastStore.add('Movement unsplit successfully', 'success');
      unsplitDialogOpen = false;
      selectedMovement = null;
      await loadMovements();
    } catch (err: any) {
      console.error('Failed to unsplit movement:', err);
      toastStore.add(err?.message || 'Failed to unsplit movement', 'error');
    } finally {
      isUnsplitting = false;
    }
  }

  function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  }

  function formatAmount(amount: number): string {
    return (amount / 100).toFixed(2);
  }

  function getMovementTypeBadge(type: string): { color: string; label: string } {
    switch (type) {
      case 'INCOME':
        return { color: 'bg-green-100 text-green-800', label: 'Income' };
      case 'EXPENSE':
        return { color: 'bg-red-100 text-red-800', label: 'Expense' };
      case 'TRANSFER':
        return { color: 'bg-blue-100 text-blue-800', label: 'Transfer' };
      case 'DISTRIBUTION':
        return { color: 'bg-purple-100 text-purple-800', label: 'Distribution' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: type };
    }
  }

  function getFilteredDepartments(areaId: string) {
    return departments.filter((d: any) => d.areaId === areaId);
  }
</script>

<svelte:head>
  <title>Bank Movements - Admin - YL Portal</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h1 class="text-2xl font-bold text-yl-black">Bank Movements</h1>
    <p class="text-sm text-yl-gray-600 mt-1">View and categorize raw bank transactions</p>
  </div>

  <!-- Filters -->
  <div class="bg-white rounded-lg shadow border border-gray-200 p-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Bank Account Filter -->
      <div>
        <label for="bank-account" class="block text-sm font-medium text-yl-gray-700 mb-1">
          Bank Account
        </label>
        <select
          id="bank-account"
          bind:value={selectedBankAccountId}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        >
          <option value={undefined}>All Bank Accounts</option>
          {#each bankAccounts as account}
            <option value={account.id}>{account.name}</option>
          {/each}
        </select>
      </div>

      <!-- Show Only Unsplit -->
      <div class="flex items-end">
        <label class="flex items-center cursor-pointer">
          <input
            type="checkbox"
            bind:checked={showOnlyUnsplit}
            class="w-4 h-4 text-yl-green border-gray-300 rounded focus:ring-yl-green"
          />
          <span class="ml-2 text-sm text-yl-gray-700">Show only unsplit movements</span>
        </label>
      </div>
    </div>
  </div>

  <!-- Movements List -->
  <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
    {#if isLoading}
      <div class="flex items-center justify-center p-12">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-yl-green border-t-transparent mb-2" />
          <p class="text-sm text-yl-gray-600">Loading movements...</p>
        </div>
      </div>
    {:else if error}
      <div class="p-12 text-center">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p class="text-sm text-red-800">{error}</p>
          <Button variant="outline" size="sm" class="mt-4" on:click={loadMovements}>
            Retry
          </Button>
        </div>
      </div>
    {:else if movements.length === 0}
      <div class="p-12 text-center">
        <svg class="w-12 h-12 text-yl-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p class="text-yl-gray-600">No movements found</p>
      </div>
    {:else}
      <div class="divide-y divide-gray-200">
        {#each movements as movement}
          <div class="p-6 hover:bg-gray-50 transition-colors">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <!-- Badges -->
                <div class="flex flex-wrap items-center gap-2 mb-2">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {getMovementTypeBadge(movement.type).color}">
                    {getMovementTypeBadge(movement.type).label}
                  </span>
                  {#if movement.isInternalTransfer}
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      Internal Transfer
                    </span>
                  {/if}
                  {#if movement.isSplitParent}
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Split ({movement.children?.length || 0} parts)
                    </span>
                  {/if}
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {movement.sourceBankAccount?.name || 'Unknown'}
                  </span>
                </div>

                <!-- Description -->
                <p class="text-base font-medium text-yl-black mb-1">{movement.description}</p>

                <!-- Meta -->
                <div class="flex flex-wrap items-center gap-3 text-xs text-yl-gray-600">
                  <span>{movement.area?.name || 'No Area'}</span>
                  {#if movement.department}
                    <span>· {movement.department.name}</span>
                  {/if}
                  <span>· {formatDate(movement.transactionDate)}</span>
                  {#if movement.reference}
                    <span>· Ref: {movement.reference}</span>
                  {/if}
                </div>
              </div>

              <div class="flex flex-col items-end gap-2">
                <p class="text-lg font-bold {movement.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}">
                  {movement.type === 'INCOME' ? '+' : '-'}{formatCurrency(movement.amount, movement.currency || 'EUR')}
                </p>

                <div class="flex gap-2">
                  {#if movement.isSplitParent}
                    <Button variant="outline" size="sm" on:click={() => openUnsplitDialog(movement)}>
                      Unsplit
                    </Button>
                  {:else}
                    <Button variant="primary" size="sm" on:click={() => openSplitModal(movement)}>
                      Split
                    </Button>
                  {/if}
                  <Button variant="outline" size="sm" on:click={() => goto(`/movements/${movement.id}`)}>
                    View
                  </Button>
                </div>
              </div>
            </div>

            <!-- Show children if split -->
            {#if movement.isSplitParent && movement.children && movement.children.length > 0}
              <div class="mt-4 pl-4 border-l-2 border-purple-300 space-y-2">
                <p class="text-xs font-medium text-yl-gray-700 mb-2">Split allocations:</p>
                {#each movement.children as child}
                  <div class="flex items-center justify-between text-sm">
                    <div>
                      <span class="font-medium text-yl-black">{child.area?.name || 'Unknown Area'}</span>
                      {#if child.description && child.description !== movement.description}
                        <span class="text-yl-gray-600 ml-2">- {child.description}</span>
                      {/if}
                    </div>
                    <span class="font-medium text-yl-gray-800">{formatCurrency(child.amount, movement.currency || 'EUR')}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Split Modal -->
{#if splitModalOpen && selectedMovement}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-xl font-bold text-yl-black">Split Movement</h2>
        <p class="text-sm text-yl-gray-600 mt-1">
          Total amount: <span class="font-medium">{formatCurrency(selectedMovement.amount, selectedMovement.currency || 'EUR')}</span>
        </p>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <!-- Allocation Summary -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm text-blue-900">
                Allocated: <span class="font-bold">{formatCurrency(getTotalAllocated(), selectedMovement.currency || 'EUR')}</span>
              </p>
              <p class="text-sm text-blue-900">
                Remaining: <span class="font-bold">{formatCurrency(getRemainingAmount(), selectedMovement.currency || 'EUR')}</span>
              </p>
            </div>
            {#if getRemainingAmount() > 0}
              <Button variant="outline" size="sm" on:click={autoDistributeRemaining}>
                Auto-distribute
              </Button>
            {/if}
          </div>
        </div>

        <!-- Allocations -->
        {#each splitAllocations as allocation, index}
          <div class="border border-gray-300 rounded-lg p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-medium text-yl-gray-900">Allocation {index + 1}</h3>
              {#if splitAllocations.length > 2}
                <button
                  on:click={() => removeAllocation(index)}
                  class="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              {/if}
            </div>

            <!-- Area -->
            <div>
              <label class="block text-xs font-medium text-yl-gray-700 mb-1">
                Area <span class="text-red-600">*</span>
              </label>
              <select
                bind:value={allocation.areaId}
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
              >
                <option value="">Select area...</option>
                {#each areas as area}
                  <option value={area.id}>{area.name} ({area.code})</option>
                {/each}
              </select>
            </div>

            <!-- Department -->
            <div>
              <label class="block text-xs font-medium text-yl-gray-700 mb-1">
                Department (Optional)
              </label>
              <select
                bind:value={allocation.departmentId}
                disabled={!allocation.areaId}
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-100"
              >
                <option value={undefined}>No department</option>
                {#each getFilteredDepartments(allocation.areaId) as dept}
                  <option value={dept.id}>{dept.name}</option>
                {/each}
              </select>
            </div>

            <!-- Amount -->
            <div>
              <label class="block text-xs font-medium text-yl-gray-700 mb-1">
                Amount (in cents) <span class="text-red-600">*</span>
              </label>
              <input
                type="number"
                bind:value={allocation.amount}
                min="1"
                step="1"
                placeholder="Amount in cents"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
              />
              <p class="text-xs text-yl-gray-500 mt-1">
                = {formatCurrency(allocation.amount || 0, selectedMovement.currency || 'EUR')}
              </p>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs font-medium text-yl-gray-700 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                bind:value={allocation.description}
                placeholder="Optional description for this allocation"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
              />
            </div>
          </div>
        {/each}

        <!-- Add Allocation Button -->
        {#if splitAllocations.length < 10}
          <Button variant="outline" size="sm" on:click={addAllocation} class="w-full">
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Allocation
          </Button>
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row gap-3">
        <Button
          variant="outline"
          size="md"
          on:click={() => { splitModalOpen = false; selectedMovement = null; }}
          disabled={isSplitting}
          class="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          on:click={handleSplit}
          disabled={isSplitting || getTotalAllocated() !== selectedMovement.amount}
          class="w-full sm:w-auto"
        >
          {isSplitting ? 'Splitting...' : 'Split Movement'}
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- Unsplit Confirmation Dialog -->
<ConfirmDialog
  open={unsplitDialogOpen}
  title="Unsplit Movement"
  message="Are you sure you want to unsplit this movement? This will delete all child allocations."
  confirmText={isUnsplitting ? 'Unsplitting...' : 'Unsplit'}
  variant="warning"
  onConfirm={handleUnsplit}
  onCancel={() => { unsplitDialogOpen = false; selectedMovement = null; }}
/>
