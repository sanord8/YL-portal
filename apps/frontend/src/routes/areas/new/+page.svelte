<script lang="ts">
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc';
  import Button from '$lib/components/Button.svelte';
  import FormInput from '$lib/components/FormInput.svelte';

  // Form data
  let name = '';
  let code = '';
  let description = '';
  let currency = 'EUR';
  let budget = '';

  // State
  let isSubmitting = false;
  let error = '';
  let validationErrors: Record<string, string> = {};

  // Currency options
  const currencyOptions = [
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'USD', label: 'USD ($)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'CAD', label: 'CAD ($)' },
    { value: 'AUD', label: 'AUD ($)' },
  ];

  function validateForm(): boolean {
    validationErrors = {};
    let isValid = true;

    if (!name || name.trim().length === 0) {
      validationErrors.name = 'Area name is required';
      isValid = false;
    } else if (name.length > 100) {
      validationErrors.name = 'Area name must be less than 100 characters';
      isValid = false;
    }

    if (!code || code.trim().length === 0) {
      validationErrors.code = 'Area code is required';
      isValid = false;
    } else if (code.length > 10) {
      validationErrors.code = 'Area code must be less than 10 characters';
      isValid = false;
    }

    if (description.length > 500) {
      validationErrors.description = 'Description must be less than 500 characters';
      isValid = false;
    }

    if (budget && parseFloat(budget) < 0) {
      validationErrors.budget = 'Budget must be a positive number';
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
      // Convert budget to cents if provided
      const budgetInCents = budget ? Math.round(parseFloat(budget) * 100) : undefined;

      await trpc.area.create.mutate({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        currency,
        budget: budgetInCents,
      });

      // Success! Redirect to areas list
      goto('/areas');
    } catch (err: any) {
      console.error('Failed to create area:', err);

      if (err.data?.code === 'CONFLICT') {
        error = 'An area with this code already exists';
      } else if (err.data?.code === 'FORBIDDEN') {
        error = 'You must verify your email before creating areas';
      } else {
        error = err.message || 'Failed to create area. Please try again.';
      }
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    goto('/areas');
  }

  // Auto-uppercase code as user types
  function handleCodeInput(event: Event) {
    const target = event.target as HTMLInputElement;
    code = target.value.toUpperCase();
  }
</script>

<svelte:head>
  <title>New Area - YoungLife Portal</title>
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
      Back to Areas
    </button>
    <h1 class="text-3xl font-bold text-yl-black">Create New Area</h1>
    <p class="text-sm text-yl-gray-600 mt-1">Add a new financial area to the system</p>
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

    <!-- Area Name -->
    <div>
      <FormInput
        label="Area Name"
        id="name"
        bind:value={name}
        placeholder="e.g., General Fund, Youth Programs"
        required={true}
        error={validationErrors.name}
      />
    </div>

    <!-- Area Code -->
    <div>
      <label for="code" class="block text-sm font-medium text-yl-black mb-2">
        Area Code <span class="text-red-500">*</span>
      </label>
      <input
        type="text"
        id="code"
        value={code}
        on:input={handleCodeInput}
        maxlength="10"
        placeholder="e.g., GEN, YTH, OPS"
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent uppercase"
        class:border-red-500={validationErrors.code}
        required
      />
      {#if validationErrors.code}
        <p class="text-xs text-red-600 mt-1">{validationErrors.code}</p>
      {:else}
        <p class="text-xs text-yl-gray-600 mt-1">Short code for identification (will be converted to uppercase)</p>
      {/if}
    </div>

    <!-- Description -->
    <div>
      <label for="description" class="block text-sm font-medium text-yl-black mb-2">
        Description
      </label>
      <textarea
        id="description"
        bind:value={description}
        rows="3"
        maxlength="500"
        placeholder="Enter a description for this area..."
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent resize-none"
        class:border-red-500={validationErrors.description}
      ></textarea>
      <div class="flex justify-between items-center mt-1">
        <p class="text-xs text-yl-gray-600">
          {#if validationErrors.description}
            <span class="text-red-600">{validationErrors.description}</span>
          {:else}
            Optional
          {/if}
        </p>
        <p class="text-xs text-yl-gray-600">{description.length}/500</p>
      </div>
    </div>

    <!-- Currency and Budget -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Currency -->
      <div>
        <label for="currency" class="block text-sm font-medium text-yl-black mb-2">
          Currency <span class="text-red-500">*</span>
        </label>
        <select
          id="currency"
          bind:value={currency}
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        >
          {#each currencyOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <!-- Budget -->
      <div>
        <label for="budget" class="block text-sm font-medium text-yl-black mb-2">
          Budget (Optional)
        </label>
        <input
          type="number"
          id="budget"
          bind:value={budget}
          step="0.01"
          min="0"
          placeholder="0.00"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
          class:border-red-500={validationErrors.budget}
        />
        {#if validationErrors.budget}
          <p class="text-xs text-red-600 mt-1">{validationErrors.budget}</p>
        {:else}
          <p class="text-xs text-yl-gray-600 mt-1">Annual budget for this area</p>
        {/if}
      </div>
    </div>

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
          Create Area
        {/if}
      </Button>
    </div>
  </form>
</div>
