<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc';
  import Button from '$lib/components/Button.svelte';
  import FormInput from '$lib/components/FormInput.svelte';

  // Form data
  let areaId = '';
  let departmentId = '';
  let type = 'EXPENSE' as 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'DISTRIBUTION';
  let amount = '';
  let currency = 'EUR';
  let description = '';
  let category = '';
  let reference = '';
  let transactionDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD

  // State
  let isSubmitting = false;
  let error = '';
  let validationErrors: Record<string, string> = {};

  // Areas and departments (will be loaded from API in future)
  let areas: any[] = [];
  let departments: any[] = [];

  // Mock areas for now (TODO: Load from API)
  onMount(() => {
    // For now, show a helpful message
    // In future, load areas from: await trpc.area.list.query()
    areas = [
      { id: '1', name: 'General Fund', code: 'GEN', currency: 'EUR' },
      { id: '2', name: 'Youth Programs', code: 'YTH', currency: 'USD' },
      { id: '3', name: 'Operations', code: 'OPS', currency: 'EUR' },
    ];
  });

  function validateForm(): boolean {
    validationErrors = {};
    let isValid = true;

    if (!areaId) {
      validationErrors.areaId = 'Please select an area';
      isValid = false;
    }

    if (!type) {
      validationErrors.type = 'Please select a movement type';
      isValid = false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      validationErrors.amount = 'Please enter a valid amount greater than 0';
      isValid = false;
    }

    if (!description || description.trim().length < 1) {
      validationErrors.description = 'Please enter a description';
      isValid = false;
    }

    if (description.length > 500) {
      validationErrors.description = 'Description must be less than 500 characters';
      isValid = false;
    }

    if (!transactionDate) {
      validationErrors.transactionDate = 'Please select a transaction date';
      isValid = false;
    }

    return isValid;
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    isSubmitting = true;
    error = '';

    try {
      // Convert amount to cents
      const amountInCents = Math.round(parseFloat(amount) * 100);

      // Create ISO datetime string from date
      const transactionDateTime = new Date(transactionDate + 'T12:00:00Z').toISOString();

      const newMovement = await trpc.movement.create.mutate({
        areaId,
        departmentId: departmentId || undefined,
        type,
        amount: amountInCents,
        currency,
        description: description.trim(),
        category: category.trim() || undefined,
        reference: reference.trim() || undefined,
        transactionDate: transactionDateTime,
      });

      // Success! Redirect to movements list
      goto('/movements');
    } catch (err: any) {
      console.error('Failed to create movement:', err);

      // Handle specific error codes
      if (err.data?.code === 'FORBIDDEN') {
        error = 'You do not have permission to create movements in this area.';
      } else if (err.data?.code === 'UNAUTHORIZED') {
        error = 'You must be logged in to create movements.';
      } else if (err.message?.includes('verify')) {
        error = 'You must verify your email before creating movements.';
      } else {
        error = err.message || 'Failed to create movement. Please try again.';
      }
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    goto('/movements');
  }

  function updateCurrencyFromArea() {
    const selectedArea = areas.find(a => a.id === areaId);
    if (selectedArea) {
      currency = selectedArea.currency;
    }
  }
</script>

<svelte:head>
  <title>New Movement - YoungLife Portal</title>
</svelte:head>

<div class="max-w-3xl mx-auto space-y-6">
  <!-- Header -->
  <div>
    <button
      on:click={handleCancel}
      class="flex items-center text-sm text-yl-gray-600 hover:text-yl-black mb-4 transition-colors"
    >
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Movements
    </button>
    <h1 class="text-3xl font-bold text-yl-black">Create New Movement</h1>
    <p class="text-sm text-yl-gray-600 mt-1">Record a new financial transaction</p>
  </div>

  <!-- Form -->
  <form on:submit={handleSubmit} class="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
    <!-- Error Alert -->
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-start">
          <svg class="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <p class="text-sm text-red-800">{error}</p>
        </div>
      </div>
    {/if}

    <!-- Area Selection -->
    <div>
      <label for="area" class="block text-sm font-medium text-yl-black mb-2">
        Area <span class="text-red-500">*</span>
      </label>
      <select
        id="area"
        bind:value={areaId}
        on:change={updateCurrencyFromArea}
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        class:border-red-500={validationErrors.areaId}
      >
        <option value="">Select an area...</option>
        {#each areas as area}
          <option value={area.id}>{area.name} ({area.code})</option>
        {/each}
      </select>
      {#if validationErrors.areaId}
        <p class="text-xs text-red-600 mt-1">{validationErrors.areaId}</p>
      {/if}
    </div>

    <!-- Type Selection -->
    <div>
      <label for="type" class="block text-sm font-medium text-yl-black mb-2">
        Movement Type <span class="text-red-500">*</span>
      </label>
      <select
        id="type"
        bind:value={type}
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        class:border-red-500={validationErrors.type}
      >
        <option value="INCOME">Income</option>
        <option value="EXPENSE">Expense</option>
        <option value="TRANSFER">Transfer</option>
        <option value="DISTRIBUTION">Distribution</option>
      </select>
      {#if validationErrors.type}
        <p class="text-xs text-red-600 mt-1">{validationErrors.type}</p>
      {/if}
    </div>

    <!-- Amount and Currency -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="sm:col-span-2">
        <label for="amount" class="block text-sm font-medium text-yl-black mb-2">
          Amount <span class="text-red-500">*</span>
        </label>
        <input
          type="number"
          id="amount"
          bind:value={amount}
          step="0.01"
          min="0"
          placeholder="0.00"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
          class:border-red-500={validationErrors.amount}
        />
        {#if validationErrors.amount}
          <p class="text-xs text-red-600 mt-1">{validationErrors.amount}</p>
        {/if}
      </div>
      <div>
        <label for="currency" class="block text-sm font-medium text-yl-black mb-2">
          Currency
        </label>
        <input
          type="text"
          id="currency"
          bind:value={currency}
          maxlength="3"
          placeholder="EUR"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
          disabled
        />
      </div>
    </div>

    <!-- Description -->
    <div>
      <label for="description" class="block text-sm font-medium text-yl-black mb-2">
        Description <span class="text-red-500">*</span>
      </label>
      <textarea
        id="description"
        bind:value={description}
        rows="3"
        maxlength="500"
        placeholder="Enter a description of this transaction..."
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent resize-none"
        class:border-red-500={validationErrors.description}
      ></textarea>
      <div class="flex justify-between items-center mt-1">
        <p class="text-xs text-yl-gray-600">
          {#if validationErrors.description}
            <span class="text-red-600">{validationErrors.description}</span>
          {:else}
            Maximum 500 characters
          {/if}
        </p>
        <p class="text-xs text-yl-gray-600">{description.length}/500</p>
      </div>
    </div>

    <!-- Transaction Date -->
    <div>
      <label for="transactionDate" class="block text-sm font-medium text-yl-black mb-2">
        Transaction Date <span class="text-red-500">*</span>
      </label>
      <input
        type="date"
        id="transactionDate"
        bind:value={transactionDate}
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        class:border-red-500={validationErrors.transactionDate}
      />
      {#if validationErrors.transactionDate}
        <p class="text-xs text-red-600 mt-1">{validationErrors.transactionDate}</p>
      {/if}
    </div>

    <!-- Optional Fields -->
    <details class="border-t pt-4">
      <summary class="cursor-pointer text-sm font-medium text-yl-black hover:text-yl-green transition-colors">
        Additional Fields (Optional)
      </summary>
      <div class="space-y-4 mt-4">
        <!-- Category -->
        <div>
          <label for="category" class="block text-sm font-medium text-yl-black mb-2">
            Category
          </label>
          <input
            type="text"
            id="category"
            bind:value={category}
            placeholder="e.g., Office Supplies, Travel, Donations"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
          />
        </div>

        <!-- Reference -->
        <div>
          <label for="reference" class="block text-sm font-medium text-yl-black mb-2">
            Reference Number
          </label>
          <input
            type="text"
            id="reference"
            bind:value={reference}
            placeholder="e.g., Invoice #12345, Receipt #6789"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
          />
        </div>

        <!-- Department (TODO: Load from API) -->
        <div>
          <label for="department" class="block text-sm font-medium text-yl-black mb-2">
            Department
          </label>
          <select
            id="department"
            bind:value={departmentId}
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
          >
            <option value="">None</option>
            {#each departments as dept}
              <option value={dept.id}>{dept.name}</option>
            {/each}
          </select>
        </div>
      </div>
    </details>

    <!-- Form Actions -->
    <div class="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
      <Button
        type="button"
        variant="secondary"
        size="md"
        on:click={handleCancel}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={isSubmitting}
      >
        {#if isSubmitting}
          <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Creating...
        {:else}
          Create Movement
        {/if}
      </Button>
    </div>
  </form>
</div>
