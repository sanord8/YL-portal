<script lang="ts">
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc/client';
  import Button from '$lib/components/Button.svelte';
  import { toastStore } from '$lib/stores/toastStore';

  // Form data
  let name = '';
  let accountNumber = '';
  let bankName = '';
  let currency = 'EUR';
  let description = '';

  // Form state
  let isSubmitting = false;
  let errors: Record<string, string> = {};

  // Currency options (common currencies)
  const currencyOptions = [
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'CHF', label: 'CHF - Swiss Franc' },
  ];

  function validateForm(): boolean {
    errors = {};

    if (!name.trim()) {
      errors.name = 'Bank account name is required';
    }

    if (currency && currency.length !== 3) {
      errors.currency = 'Currency must be a 3-letter code (e.g., EUR, USD)';
    }

    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.bankAccount.create.mutate({
        name: name.trim(),
        accountNumber: accountNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        currency: currency || 'EUR',
        description: description.trim() || undefined,
      });

      toastStore.add('Bank account created successfully', 'success');
      goto(`/admin/bank-accounts/${result.id}`);
    } catch (err: any) {
      console.error('Failed to create bank account:', err);
      toastStore.add(err?.message || 'Failed to create bank account', 'error');
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    goto('/admin/bank-accounts');
  }
</script>

<svelte:head>
  <title>New Bank Account - Admin - YL Portal</title>
</svelte:head>

<div class="max-w-3xl mx-auto space-y-6">
  <!-- Header -->
  <div class="flex items-center gap-4">
    <button
      on:click={handleCancel}
      class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      title="Back to bank accounts"
    >
      <svg class="w-5 h-5 text-yl-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    </button>
    <div>
      <h1 class="text-2xl font-bold text-yl-black">New Bank Account</h1>
      <p class="text-sm text-yl-gray-600 mt-1">Add a new bank account to the organization</p>
    </div>
  </div>

  <!-- Form -->
  <form on:submit|preventDefault={handleSubmit} class="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
    <!-- Account Name -->
    <div>
      <label for="name" class="block text-sm font-medium text-yl-gray-700 mb-1">
        Account Name <span class="text-red-600">*</span>
      </label>
      <input
        id="name"
        type="text"
        bind:value={name}
        placeholder="e.g., Catalunya, Madrid, Andalucia"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        class:border-red-500={errors.name}
        required
      />
      {#if errors.name}
        <p class="mt-1 text-sm text-red-600">{errors.name}</p>
      {/if}
      <p class="mt-1 text-xs text-yl-gray-500">A descriptive name for this bank account</p>
    </div>

    <!-- Account Number -->
    <div>
      <label for="accountNumber" class="block text-sm font-medium text-yl-gray-700 mb-1">
        Account Number (Optional)
      </label>
      <input
        id="accountNumber"
        type="text"
        bind:value={accountNumber}
        placeholder="e.g., **** 1234 (masked for security)"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
      />
      <p class="mt-1 text-xs text-yl-gray-500">Masked account number for reference (last 4 digits recommended)</p>
    </div>

    <!-- Bank Name -->
    <div>
      <label for="bankName" class="block text-sm font-medium text-yl-gray-700 mb-1">
        Bank Name (Optional)
      </label>
      <input
        id="bankName"
        type="text"
        bind:value={bankName}
        placeholder="e.g., CaixaBank, Banco Santander"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
      />
      <p class="mt-1 text-xs text-yl-gray-500">The financial institution name</p>
    </div>

    <!-- Currency -->
    <div>
      <label for="currency" class="block text-sm font-medium text-yl-gray-700 mb-1">
        Currency <span class="text-red-600">*</span>
      </label>
      <select
        id="currency"
        bind:value={currency}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        class:border-red-500={errors.currency}
        required
      >
        {#each currencyOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      {#if errors.currency}
        <p class="mt-1 text-sm text-red-600">{errors.currency}</p>
      {/if}
      <p class="mt-1 text-xs text-yl-gray-500">All transactions will be recorded in this currency</p>
    </div>

    <!-- Description -->
    <div>
      <label for="description" class="block text-sm font-medium text-yl-gray-700 mb-1">
        Description (Optional)
      </label>
      <textarea
        id="description"
        bind:value={description}
        rows="3"
        placeholder="Additional notes or details about this bank account..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent resize-none"
      />
      <p class="mt-1 text-xs text-yl-gray-500">Any additional information about this account</p>
    </div>

    <!-- Actions -->
    <div class="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-200">
      <Button
        type="button"
        variant="outline"
        size="md"
        on:click={handleCancel}
        disabled={isSubmitting}
        class="w-full sm:w-auto"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={isSubmitting}
        class="w-full sm:w-auto"
      >
        {isSubmitting ? 'Creating...' : 'Create Bank Account'}
      </Button>
    </div>
  </form>
</div>
