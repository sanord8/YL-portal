<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc/client';
  import Button from '$lib/components/Button.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import { toastStore } from '$lib/stores/toastStore';

  // Data
  let bankAccounts: any[] = [];
  let isLoading = false;
  let error = '';

  // Modals
  let deleteDialogOpen = false;
  let selectedBankAccount: any = null;

  // Actions
  let isDeleting = false;

  onMount(() => {
    loadBankAccounts();
  });

  async function loadBankAccounts() {
    isLoading = true;
    error = '';

    try {
      bankAccounts = await trpc.bankAccount.list.query();
    } catch (err: any) {
      console.error('Failed to load bank accounts:', err);
      error = err?.message || 'Failed to load bank accounts';
    } finally {
      isLoading = false;
    }
  }

  function openDeleteDialog(bankAccount: any) {
    selectedBankAccount = bankAccount;
    deleteDialogOpen = true;
  }

  async function handleDelete() {
    if (!selectedBankAccount) return;

    isDeleting = true;
    try {
      await trpc.bankAccount.delete.mutate({ id: selectedBankAccount.id });
      toastStore.add('Bank account deleted successfully', 'success');
      deleteDialogOpen = false;
      selectedBankAccount = null;
      await loadBankAccounts();
    } catch (err: any) {
      console.error('Failed to delete bank account:', err);
      toastStore.add(err?.message || 'Failed to delete bank account', 'error');
    } finally {
      isDeleting = false;
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
</script>

<svelte:head>
  <title>Bank Accounts - Admin - YL Portal</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-yl-black">Bank Accounts</h1>
      <p class="text-sm text-yl-gray-600 mt-1">Manage organization bank accounts and their associated areas</p>
    </div>
    <Button variant="primary" size="md" on:click={() => goto('/admin/bank-accounts/new')} class="w-full sm:w-auto">
      <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Add Bank Account
    </Button>
  </div>

  <!-- Bank Accounts Grid -->
  <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
    {#if isLoading}
      <div class="flex items-center justify-center p-12">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-yl-green border-t-transparent mb-2" />
          <p class="text-sm text-yl-gray-600">Loading bank accounts...</p>
        </div>
      </div>
    {:else if error}
      <div class="p-12 text-center">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p class="text-sm text-red-800">{error}</p>
          <Button variant="outline" size="sm" class="mt-4" on:click={loadBankAccounts}>
            Retry
          </Button>
        </div>
      </div>
    {:else if bankAccounts.length === 0}
      <div class="p-12 text-center">
        <svg class="w-12 h-12 text-yl-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <p class="text-yl-gray-600 mb-4">No bank accounts found</p>
        <Button variant="primary" size="sm" on:click={() => goto('/admin/bank-accounts/new')}>
          Add Your First Bank Account
        </Button>
      </div>
    {:else}
      <!-- Desktop Table View (hidden on mobile) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
          <thead class="bg-yl-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase tracking-wider">
                Bank Account
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase tracking-wider">
                Bank Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase tracking-wider">
                Currency
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase tracking-wider">
                Areas
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase tracking-wider">
                Created
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-yl-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each bankAccounts as account}
              <tr class="hover:bg-gray-50 transition-colors">
                <!-- Bank Account -->
                <td class="px-6 py-4">
                  <div>
                    <p class="text-sm font-medium text-yl-black">{account.name}</p>
                    {#if account.accountNumber}
                      <p class="text-xs text-yl-gray-500">{account.accountNumber}</p>
                    {/if}
                  </div>
                </td>

                <!-- Bank Name -->
                <td class="px-6 py-4">
                  <p class="text-sm text-yl-gray-700">{account.bankName || '-'}</p>
                </td>

                <!-- Currency -->
                <td class="px-6 py-4">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {account.currency}
                  </span>
                </td>

                <!-- Areas -->
                <td class="px-6 py-4">
                  <p class="text-sm text-yl-gray-700">{account._count?.areas || 0} areas</p>
                </td>

                <!-- Created -->
                <td class="px-6 py-4">
                  <p class="text-xs text-yl-gray-600">{formatDate(account.createdAt)}</p>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      on:click={() => goto(`/admin/bank-accounts/${account.id}`)}
                      class="text-yl-green hover:text-yl-green-dark text-sm font-medium"
                      title="View details"
                    >
                      View
                    </button>
                    {#if !account.deletedAt}
                      <button
                        on:click={() => openDeleteDialog(account)}
                        class="text-red-600 hover:text-red-800 text-sm font-medium"
                        title="Delete bank account"
                      >
                        Delete
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Mobile Card View (visible only on mobile) -->
      <div class="md:hidden divide-y divide-gray-200">
        {#each bankAccounts as account}
          <div class="p-4 hover:bg-gray-50 transition-colors">
            <!-- Account Info -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <p class="text-sm font-medium text-yl-black">{account.name}</p>
                {#if account.accountNumber}
                  <p class="text-xs text-yl-gray-500 mt-0.5">{account.accountNumber}</p>
                {/if}
                {#if account.bankName}
                  <p class="text-xs text-yl-gray-600 mt-1">{account.bankName}</p>
                {/if}
              </div>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {account.currency}
              </span>
            </div>

            <!-- Stats -->
            <div class="flex gap-4 text-xs text-yl-gray-600 mb-3">
              <div>
                <span class="font-medium">{account._count?.areas || 0}</span> areas
              </div>
              <div class="ml-auto">
                {formatDate(account.createdAt)}
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
              <button
                on:click={() => goto(`/admin/bank-accounts/${account.id}`)}
                class="flex-1 px-3 py-2 bg-yl-green text-white text-sm font-medium rounded-lg hover:bg-yl-green-dark transition-colors"
              >
                View Details
              </button>
              {#if !account.deletedAt}
                <button
                  on:click={() => openDeleteDialog(account)}
                  class="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
  open={deleteDialogOpen}
  title="Delete Bank Account"
  message="Are you sure you want to delete {selectedBankAccount?.name}? This will also remove associations with areas."
  confirmText={isDeleting ? 'Deleting...' : 'Delete'}
  variant="danger"
  onConfirm={handleDelete}
  onCancel={() => { deleteDialogOpen = false; selectedBankAccount = null; }}
/>
