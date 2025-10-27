<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from './Button.svelte';

  export let open = false;
  export let userName = '';
  export let userId = '';
  export let availableAreas: any[] = [];
  export let isLoading = false;

  const dispatch = createEventDispatcher<{
    confirm: { userId: string; areaId: string; name: string; code: string; description: string };
    cancel: void;
  }>();

  let areaId = '';
  let name = 'Personal Funds';
  let code = 'PF';
  let description = 'Personal funds department';
  let error = '';

  $: areaValid = areaId !== '';
  $: nameValid = name.trim().length >= 1 && name.trim().length <= 100;
  $: codeValid = code.trim().length >= 1 && code.trim().length <= 10;
  $: canSubmit = areaValid && nameValid && codeValid && !isLoading;

  function handleSubmit() {
    error = '';

    if (!areaValid) {
      error = 'Please select an area';
      return;
    }

    if (!nameValid) {
      error = 'Name must be between 1 and 100 characters';
      return;
    }

    if (!codeValid) {
      error = 'Code must be between 1 and 10 characters';
      return;
    }

    dispatch('confirm', {
      userId,
      areaId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || 'Personal funds department',
    });
  }

  function handleCancel() {
    areaId = '';
    name = 'Personal Funds';
    code = 'PF';
    description = 'Personal funds department';
    error = '';
    dispatch('cancel');
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !isLoading) {
      handleCancel();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !isLoading) {
      handleCancel();
    } else if (event.key === 'Enter' && canSubmit) {
      handleSubmit();
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 overflow-y-auto"
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <!-- Backdrop -->
    <button
      type="button"
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity cursor-default"
      on:click={handleBackdropClick}
      tabindex="-1"
      aria-label="Close dialog"
      disabled={isLoading}
    />

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div
        class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all"
      >
        <!-- Icon -->
        <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-100">
          <svg class="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <!-- Title -->
        <h3 id="modal-title" class="text-lg font-semibold text-yl-black text-center mb-2">
          Create Personal Fund
        </h3>

        <!-- Description -->
        <p class="text-sm text-yl-gray-600 text-center mb-6">
          Create a personal fund department for <strong>{userName}</strong>
        </p>

        <!-- Form -->
        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
          <!-- Area Selection -->
          <div>
            <label for="area" class="block text-sm font-medium text-yl-gray-700 mb-1">
              Area <span class="text-red-500">*</span>
            </label>
            <select
              id="area"
              bind:value={areaId}
              disabled={isLoading}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            >
              <option value="">Select an area...</option>
              {#each availableAreas as area}
                <option value={area.id}>{area.name} ({area.code})</option>
              {/each}
            </select>
            <p class="text-xs text-yl-gray-500 mt-1">
              Select which area this personal fund will belong to
            </p>
          </div>

          <!-- Department Name -->
          <div>
            <label for="name" class="block text-sm font-medium text-yl-gray-700 mb-1">
              Department Name
            </label>
            <input
              id="name"
              type="text"
              bind:value={name}
              disabled={isLoading}
              maxlength="100"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            />
            <p class="text-xs text-yl-gray-500 mt-1">
              Default: "Personal Funds"
            </p>
          </div>

          <!-- Department Code -->
          <div>
            <label for="code" class="block text-sm font-medium text-yl-gray-700 mb-1">
              Department Code
            </label>
            <input
              id="code"
              type="text"
              bind:value={code}
              disabled={isLoading}
              maxlength="10"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed uppercase"
              required
            />
            <p class="text-xs text-yl-gray-500 mt-1">
              Default: "PF" (auto-converted to uppercase)
            </p>
          </div>

          <!-- Description (Optional) -->
          <div>
            <label for="description" class="block text-sm font-medium text-yl-gray-700 mb-1">
              Description <span class="text-yl-gray-500 text-xs">(optional)</span>
            </label>
            <textarea
              id="description"
              bind:value={description}
              disabled={isLoading}
              maxlength="500"
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            />
          </div>

          <!-- Error Message -->
          {#if error}
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
              <p class="text-sm text-red-800">{error}</p>
            </div>
          {/if}

          <!-- Info -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p class="text-xs text-blue-800">
              <strong>Note:</strong> Each user can have at most one personal fund department. Movements in this fund will be auto-approved and private.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              class="flex-1"
              on:click={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              class="flex-1"
              disabled={!canSubmit}
              loading={isLoading}
            >
              Create Fund
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
