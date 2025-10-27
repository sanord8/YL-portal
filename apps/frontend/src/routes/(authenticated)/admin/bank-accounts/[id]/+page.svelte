<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { trpc } from '$lib/trpc/client';
  import Button from '$lib/components/Button.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import { toastStore } from '$lib/stores/toastStore';

  // Get bank account ID from URL
  $: bankAccountId = $page.params.id;

  // Data
  let bankAccount: any = null;
  let areas: any[] = [];
  let recentMovements: any[] = [];
  let isLoading = false;
  let error = '';

  // Edit mode
  let isEditMode = false;
  let editForm = {
    name: '',
    accountNumber: '',
    bankName: '',
    currency: 'EUR',
    description: '',
  };

  // Actions
  let isSaving = false;
  let deleteDialogOpen = false;
  let isDeleting = false;

  // Currency options
  const currencyOptions = [
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'CHF', label: 'CHF - Swiss Franc' },
  ];

  onMount(() => {
    loadBankAccount();
  });

  $: if (bankAccountId) {
    loadBankAccount();
  }

  async function loadBankAccount() {
    isLoading = true;
    error = '';

    try {
      // Load bank account details
      bankAccount = await trpc.bankAccount.getById.query({ id: bankAccountId });

      // Load associated areas
      const allAreas = await trpc.area.list.query();
      areas = allAreas.filter((a: any) => a.bankAccountId === bankAccountId);

      // Load recent movements for this bank account
      const movementsResult = await trpc.movement.list.query({
        limit: 10,
      });

      // Filter movements for this bank account
      recentMovements = movementsResult.movements.filter(
        (m: any) => m.sourceBankAccount?.id === bankAccountId || m.destinationBankAccount?.id === bankAccountId
      );

      // Initialize edit form
      editForm = {
        name: bankAccount.name,
        accountNumber: bankAccount.accountNumber || '',
        bankName: bankAccount.bankName || '',
        currency: bankAccount.currency,
        description: bankAccount.description || '',
      };
    } catch (err: any) {
      console.error('Failed to load bank account:', err);
      error = err?.message || 'Failed to load bank account';
    } finally {
      isLoading = false;
    }
  }

  function toggleEditMode() {
    if (isEditMode) {
      // Cancel edit - reset form
      editForm = {
        name: bankAccount.name,
        accountNumber: bankAccount.accountNumber || '',
        bankName: bankAccount.bankName || '',
        currency: bankAccount.currency,
        description: bankAccount.description || '',
      };
    }
    isEditMode = !isEditMode;
  }

  async function handleSave() {
    isSaving = true;

    try {
      await trpc.bankAccount.update.mutate({
        id: bankAccountId,
        name: editForm.name.trim(),
        accountNumber: editForm.accountNumber.trim() || undefined,
        bankName: editForm.bankName.trim() || undefined,
        currency: editForm.currency,
        description: editForm.description.trim() || undefined,
      });

      toastStore.add('Bank account updated successfully', 'success');
      isEditMode = false;
      await loadBankAccount();
    } catch (err: any) {
      console.error('Failed to update bank account:', err);
      toastStore.add(err?.message || 'Failed to update bank account', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function handleDelete() {
    isDeleting = true;

    try {
      await trpc.bankAccount.delete.mutate({ id: bankAccountId });
      toastStore.add('Bank account deleted successfully', 'success');
      goto('/admin/bank-accounts');
    } catch (err: any) {
      console.error('Failed to delete bank account:', err);
      toastStore.add(err?.message || 'Failed to delete bank account', 'error');
    } finally {
      isDeleting = false;
      deleteDialogOpen = false;
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
</script>

<svelte:head>
  <title>{bankAccount?.name || 'Bank Account'} - Admin - YL Portal</title>
</svelte:head>

<div class="max-w-5xl mx-auto space-y-6">
  {#if isLoading}
    <div class="flex items-center justify-center p-12">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-yl-green border-t-transparent mb-2" />
        <p class="text-sm text-yl-gray-600">Loading bank account...</p>
      </div>
    </div>
  {:else if error}
    <div class="p-12 text-center">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
        <p class="text-sm text-red-800">{error}</p>
        <Button variant="outline" size="sm" class="mt-4" on:click={loadBankAccount}>
          Retry
        </Button>
      </div>
    </div>
  {:else if bankAccount}
    <!-- Header -->
    <div class="flex items-center gap-4">
      <button
        on:click={() => goto('/admin/bank-accounts')}
        class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Back to bank accounts"
      >
        <svg class="w-5 h-5 text-yl-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <div class="flex-1">
        <h1 class="text-2xl font-bold text-yl-black">{bankAccount.name}</h1>
        <p class="text-sm text-yl-gray-600 mt-1">Bank Account Details</p>
      </div>
      <div class="flex gap-2">
        {#if isEditMode}
          <Button variant="outline" size="sm" on:click={toggleEditMode} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" on:click={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        {:else}
          <Button variant="outline" size="sm" on:click={toggleEditMode}>
            Edit
          </Button>
          <Button variant="danger" size="sm" on:click={() => (deleteDialogOpen = true)}>
            Delete
          </Button>
        {/if}
      </div>
    </div>

    <!-- Bank Account Details -->
    <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
      {#if isEditMode}
        <!-- Edit Form -->
        <div class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-yl-gray-700 mb-1">
              Account Name <span class="text-red-600">*</span>
            </label>
            <input
              id="name"
              type="text"
              bind:value={editForm.name}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
              required
            />
          </div>

          <div>
            <label for="accountNumber" class="block text-sm font-medium text-yl-gray-700 mb-1">
              Account Number
            </label>
            <input
              id="accountNumber"
              type="text"
              bind:value={editForm.accountNumber}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
            />
          </div>

          <div>
            <label for="bankName" class="block text-sm font-medium text-yl-gray-700 mb-1">
              Bank Name
            </label>
            <input
              id="bankName"
              type="text"
              bind:value={editForm.bankName}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
            />
          </div>

          <div>
            <label for="currency" class="block text-sm font-medium text-yl-gray-700 mb-1">
              Currency <span class="text-red-600">*</span>
            </label>
            <select
              id="currency"
              bind:value={editForm.currency}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
              required
            >
              {#each currencyOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-yl-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              bind:value={editForm.description}
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent resize-none"
            />
          </div>
        </div>
      {:else}
        <!-- View Mode -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-sm font-medium text-yl-gray-600 mb-1">Account Name</h3>
            <p class="text-base text-yl-black">{bankAccount.name}</p>
          </div>

          <div>
            <h3 class="text-sm font-medium text-yl-gray-600 mb-1">Currency</h3>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {bankAccount.currency}
            </span>
          </div>

          {#if bankAccount.accountNumber}
            <div>
              <h3 class="text-sm font-medium text-yl-gray-600 mb-1">Account Number</h3>
              <p class="text-base text-yl-black">{bankAccount.accountNumber}</p>
            </div>
          {/if}

          {#if bankAccount.bankName}
            <div>
              <h3 class="text-sm font-medium text-yl-gray-600 mb-1">Bank Name</h3>
              <p class="text-base text-yl-black">{bankAccount.bankName}</p>
            </div>
          {/if}

          <div>
            <h3 class="text-sm font-medium text-yl-gray-600 mb-1">Created</h3>
            <p class="text-base text-yl-black">{formatDate(bankAccount.createdAt)}</p>
          </div>

          <div>
            <h3 class="text-sm font-medium text-yl-gray-600 mb-1">Last Updated</h3>
            <p class="text-base text-yl-black">{formatDate(bankAccount.updatedAt)}</p>
          </div>

          {#if bankAccount.description}
            <div class="md:col-span-2">
              <h3 class="text-sm font-medium text-yl-gray-600 mb-1">Description</h3>
              <p class="text-base text-yl-black">{bankAccount.description}</p>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Associated Areas -->
    <div class="bg-white rounded-lg shadow border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-yl-black">Associated Areas ({areas.length})</h2>
        <p class="text-sm text-yl-gray-600 mt-1">Areas that use this bank account</p>
      </div>

      {#if areas.length === 0}
        <div class="p-12 text-center">
          <svg class="w-12 h-12 text-yl-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p class="text-yl-gray-600">No areas assigned to this bank account</p>
        </div>
      {:else}
        <div class="divide-y divide-gray-200">
          {#each areas as area}
            <div class="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-yl-black">{area.name}</p>
                  <p class="text-xs text-yl-gray-500">{area.code}</p>
                </div>
                <button
                  on:click={() => goto(`/admin/areas/${area.id}`)}
                  class="text-yl-green hover:text-yl-green-dark text-sm font-medium"
                >
                  View Area
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Recent Movements -->
    <div class="bg-white rounded-lg shadow border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-yl-black">Recent Movements ({recentMovements.length})</h2>
        <p class="text-sm text-yl-gray-600 mt-1">Latest transactions from this bank account</p>
      </div>

      {#if recentMovements.length === 0}
        <div class="p-12 text-center">
          <svg class="w-12 h-12 text-yl-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p class="text-yl-gray-600">No movements found for this bank account</p>
        </div>
      {:else}
        <div class="divide-y divide-gray-200">
          {#each recentMovements as movement}
            <div class="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {getMovementTypeBadge(movement.type).color}">
                      {getMovementTypeBadge(movement.type).label}
                    </span>
                    {#if movement.isInternalTransfer}
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        Internal
                      </span>
                    {/if}
                  </div>
                  <p class="text-sm text-yl-black">{movement.description}</p>
                  <p class="text-xs text-yl-gray-500 mt-1">{movement.area?.name} · {formatDate(movement.transactionDate)}</p>
                </div>
                <div class="text-right ml-4">
                  <p class="text-base font-medium {movement.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}">
                    {movement.type === 'INCOME' ? '+' : '-'}{formatCurrency(movement.amount, movement.currency || 'EUR')}
                  </p>
                  <button
                    on:click={() => goto(`/movements/${movement.id}`)}
                    class="text-xs text-yl-green hover:text-yl-green-dark font-medium mt-1"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
  open={deleteDialogOpen}
  title="Delete Bank Account"
  message="Are you sure you want to delete {bankAccount?.name}? This will also remove associations with areas. This action cannot be undone."
  confirmText={isDeleting ? 'Deleting...' : 'Delete'}
  variant="danger"
  onConfirm={handleDelete}
  onCancel={() => { deleteDialogOpen = false; }}
/>
