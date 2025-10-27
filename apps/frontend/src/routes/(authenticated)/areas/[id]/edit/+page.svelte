<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import FormInput from '$lib/components/FormInput.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import { toastStore } from '$lib/stores/toastStore';

  // Form fields
  let name = '';
  let code = '';
  let description = '';
  let currency = 'EUR';
  let budget = '';
  let bankAccountId = '';

  // State
  let isLoading = true;
  let isSaving = false;
  let error = '';
  let originalCurrency = '';
  let hasMovements = false;

  // Bank accounts
  let bankAccounts: any[] = [];
  let isLoadingBankAccounts = true;
  let bankAccountsError = '';

  // Currency change confirmation
  let showCurrencyWarning = false;
  let pendingSubmit = false;

  // Reactive area ID from route params
  $: areaId = $page.params.id;

  // Reload data when area ID changes
  $: if (areaId) {
    loadArea();
  }

  onMount(async () => {
    // Initial load handled by reactive statement
    loadBankAccounts();
  });

  async function loadBankAccounts() {
    try {
      isLoadingBankAccounts = true;
      bankAccountsError = '';
      bankAccounts = await trpc.bankAccount.list.query();
    } catch (err: any) {
      console.error('Failed to load bank accounts:', err);
      bankAccountsError = err.message || 'Failed to load bank accounts';
    } finally {
      isLoadingBankAccounts = false;
    }
  }

  async function loadArea() {
    try {
      isLoading = true;
      error = '';

      const area = await trpc.area.getById.query({ id: areaId });

      // Populate form
      name = area.name;
      code = area.code;
      description = area.description || '';
      currency = area.currency;
      budget = area.budget ? (area.budget / 100).toFixed(2) : '';
      bankAccountId = area.bankAccountId || '';

      // Track original currency and movement count
      originalCurrency = area.currency;
      hasMovements = (area._count?.movements || 0) > 0;
    } catch (err: any) {
      error = err.message || 'Failed to load area';
    } finally {
      isLoading = false;
    }
  }

  function handleCodeInput(event: Event) {
    const target = event.target as HTMLInputElement;
    code = target.value.toUpperCase();
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();

    // Validation is handled by HTML5 required attributes and inline validation
    // No need for alerts

    // Warn about currency change if there are movements
    if (hasMovements && currency !== originalCurrency && !pendingSubmit) {
      showCurrencyWarning = true;
      return;
    }

    await saveArea();
  }

  async function saveArea() {
    try {
      isSaving = true;

      const budgetInCents = budget ? Math.round(parseFloat(budget) * 100) : undefined;

      await trpc.area.update.mutate({
        id: areaId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        currency,
        budget: budgetInCents,
        bankAccountId: bankAccountId || undefined,
      });

      // Navigate to detail page
      goto(`/areas/${areaId}`);
    } catch (err: any) {
      toastStore.add(`Failed to update area: ${err.message}`, 'error');
    } finally {
      isSaving = false;
      pendingSubmit = false;
      showCurrencyWarning = false;
    }
  }

  function confirmCurrencyChange() {
    pendingSubmit = true;
    showCurrencyWarning = false;
    saveArea();
  }

  function handleCancel() {
    goto(`/areas/${areaId}`);
  }

  $: characterCount = description.length;
  $: maxCharacters = 500;
</script>

<svelte:head>
  <title>Edit Area - YL Portal</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <!-- Header -->
  <div class="mb-6">
    <div class="flex items-center gap-2 text-sm text-yl-gray-600 mb-2 overflow-x-auto">
      <a href="/areas" class="hover:text-yl-green transition-colors whitespace-nowrap">Areas</a>
      <span>/</span>
      <a href="/areas/{areaId}" class="hover:text-yl-green transition-colors truncate">
        {name || 'Loading...'}
      </a>
      <span>/</span>
      <span class="text-yl-black whitespace-nowrap">Edit</span>
    </div>
    <h1 class="text-2xl sm:text-3xl font-bold text-yl-black">Edit Area</h1>
    <p class="mt-2 text-sm text-yl-gray-600">Update area information and settings</p>
  </div>

  {#if isLoading}
    <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div class="animate-pulse space-y-4">
        <div class="h-10 bg-gray-200 rounded"></div>
        <div class="h-10 bg-gray-200 rounded"></div>
        <div class="h-24 bg-gray-200 rounded"></div>
        <div class="h-10 bg-gray-200 rounded w-1/3"></div>
      </div>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-600">{error}</p>
      <button
        on:click={() => goto('/areas')}
        class="mt-2 text-sm text-red-600 hover:text-red-700 underline"
      >
        Back to areas
      </button>
    </div>
  {:else}
    <form on:submit={handleSubmit} class="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
      <!-- Area Name -->
      <FormInput
        label="Area Name"
        bind:value={name}
        required
        maxlength={100}
        placeholder="e.g., Madrid Central, Barcelona North"
        helpText="The display name for this financial area"
      />

      <!-- Area Code -->
      <div>
        <label for="code" class="block text-sm font-medium text-yl-gray-700 mb-1">
          Area Code <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="code"
          value={code}
          on:input={handleCodeInput}
          required
          maxlength={10}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent uppercase font-mono"
          placeholder="e.g., MAD-CTR"
        />
        <p class="mt-1 text-xs text-yl-gray-500">
          Short unique code (automatically converted to uppercase). {code.length}/10 characters.
        </p>
      </div>

      <!-- Description -->
      <div>
        <label for="description" class="block text-sm font-medium text-yl-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          bind:value={description}
          maxlength={maxCharacters}
          rows={4}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent resize-none"
          placeholder="Optional description of this area's purpose and scope..."
        />
        <p class="mt-1 text-xs text-yl-gray-500">
          {characterCount}/{maxCharacters} characters
        </p>
      </div>

      <!-- Bank Account -->
      <div>
        <label for="bankAccount" class="block text-sm font-medium text-yl-gray-700 mb-1">
          Bank Account (Optional)
        </label>
        {#if isLoadingBankAccounts}
          <div class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-yl-gray-500">
            Loading bank accounts...
          </div>
        {:else if bankAccountsError}
          <div class="w-full px-3 py-2 border border-red-300 rounded-lg bg-red-50 text-sm text-red-700">
            {bankAccountsError}
          </div>
        {:else}
          <select
            id="bankAccount"
            bind:value={bankAccountId}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
          >
            <option value="">No bank account</option>
            {#each bankAccounts as account}
              <option value={account.id}>
                {account.name} ({account.currency})
                {#if account.bankName} - {account.bankName}{/if}
              </option>
            {/each}
          </select>
          <p class="mt-1 text-xs text-yl-gray-500">
            Assign this area to a bank account for tracking movements
          </p>
        {/if}
      </div>

      <!-- Currency -->
      <div>
        <label for="currency" class="block text-sm font-medium text-yl-gray-700 mb-1">
          Currency <span class="text-red-500">*</span>
        </label>
        <select
          id="currency"
          bind:value={currency}
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        >
          <option value="EUR">EUR (€)</option>
          <option value="USD">USD ($)</option>
          <option value="GBP">GBP (£)</option>
          <option value="MXN">MXN ($)</option>
          <option value="COP">COP ($)</option>
        </select>
        {#if hasMovements && currency !== originalCurrency}
          <p class="mt-1 text-xs text-yellow-600 flex items-start gap-1">
            <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>Warning: This area has movements. Changing currency may affect reports.</span>
          </p>
        {:else}
          <p class="mt-1 text-xs text-yl-gray-500">
            The currency used for all financial transactions in this area.
          </p>
        {/if}
      </div>

      <!-- Budget -->
      <div>
        <label for="budget" class="block text-sm font-medium text-yl-gray-700 mb-1">
          Current Budget (Optional)
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-yl-gray-500">
            {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '$'}
          </span>
          <input
            type="number"
            id="budget"
            bind:value={budget}
            step="0.01"
            min="0"
            class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
            placeholder="0.00"
          />
        </div>
        <p class="mt-1 text-xs text-yl-gray-500">
          Leave empty if no budget is set.
        </p>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          on:click={handleCancel}
          disabled={isSaving}
          class="order-2 sm:order-1 px-4 py-2 text-sm font-medium text-yl-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          class="order-1 sm:order-2 px-4 py-2 text-sm font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  {/if}
</div>

<!-- Currency Change Warning Dialog -->
<ConfirmDialog
  open={showCurrencyWarning}
  title="Change Currency?"
  confirmText="Yes, Change Currency"
  cancelText="Cancel"
  variant="warning"
  onConfirm={confirmCurrencyChange}
  onCancel={() => {
    showCurrencyWarning = false;
    pendingSubmit = false;
  }}
>
  <div class="text-sm text-yl-gray-600 space-y-3">
    <p class="font-medium text-yl-black">
      Warning: This area has existing movements
    </p>
    <p>
      Changing the currency from <strong class="text-yl-black">{originalCurrency}</strong> to <strong class="text-yl-black">{currency}</strong> may affect:
    </p>
    <ul class="list-disc list-inside space-y-1 text-left ml-4">
      <li>Financial reports and summaries</li>
      <li>Historical transaction records</li>
      <li>Budget calculations and comparisons</li>
    </ul>
    <p class="text-yellow-700 font-medium">
      Are you sure you want to continue?
    </p>
  </div>
</ConfirmDialog>
