<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc';
  import Button from '$lib/components/Button.svelte';

  $: movementId = $page.params.id;

  let movement: any = null;
  let isLoading = true;
  let error = '';

  // Delete confirmation
  let showDeleteConfirm = false;
  let isDeleting = false;

  onMount(async () => {
    await loadMovement();
  });

  async function loadMovement() {
    isLoading = true;
    error = '';

    try {
      movement = await trpc.movement.getById.query({ id: movementId });
    } catch (err: any) {
      console.error('Failed to load movement:', err);

      if (err.data?.code === 'NOT_FOUND') {
        error = 'Movement not found.';
      } else if (err.data?.code === 'FORBIDDEN') {
        error = 'You do not have permission to view this movement.';
      } else {
        error = err.message || 'Failed to load movement. Please try again.';
      }
    } finally {
      isLoading = false;
    }
  }

  async function handleDelete() {
    isDeleting = true;

    try {
      await trpc.movement.delete.mutate({ id: movementId });
      goto('/movements');
    } catch (err: any) {
      console.error('Failed to delete movement:', err);
      alert(err.message || 'Failed to delete movement. Please try again.');
    } finally {
      isDeleting = false;
      showDeleteConfirm = false;
    }
  }

  function formatCurrency(amount: number, currency: string = 'EUR') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  }

  function formatDate(date: string | Date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  }

  function formatDateTime(date: string | Date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
        return 'bg-yl-green/10 text-yl-green border-yl-green';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-800';
    }
  }

  function handleBack() {
    goto('/movements');
  }
</script>

<svelte:head>
  <title>{movement ? `Movement - ${movement.description}` : 'Movement'} - YoungLife Portal</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
  <!-- Header -->
  <div>
    <button
      on:click={handleBack}
      class="flex items-center text-sm text-yl-gray-600 hover:text-yl-black mb-4 transition-colors"
    >
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Movements
    </button>
    <h1 class="text-3xl font-bold text-yl-black">Movement Details</h1>
  </div>

  <!-- Loading State -->
  {#if isLoading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yl-green"></div>
    </div>
  {:else if error}
    <!-- Error State -->
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-red-800 font-semibold mb-2">Error Loading Movement</p>
      <p class="text-red-600 text-sm">{error}</p>
      <div class="mt-4 space-x-3">
        <Button variant="secondary" size="sm" on:click={loadMovement}>
          Try Again
        </Button>
        <Button variant="primary" size="sm" on:click={handleBack}>
          Back to List
        </Button>
      </div>
    </div>
  {:else if movement}
    <!-- Movement Details -->
    <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <!-- Header Section -->
      <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <span class="px-3 py-1 text-sm font-medium rounded-full {getTypeColor(movement.type)}">
                {movement.type}
              </span>
              <span class="px-3 py-1 text-sm font-medium rounded-full border {getStatusColor(movement.status)}">
                {movement.status}
              </span>
            </div>
            <h2 class="text-2xl font-bold text-yl-black">{movement.description}</h2>
          </div>
          <div class="text-right">
            <p class="text-sm text-yl-gray-600 mb-1">Amount</p>
            <p class="text-3xl font-bold {movement.type === 'INCOME' ? 'text-green-600' : 'text-yl-black'}">
              {movement.type === 'INCOME' ? '+' : '-'}{formatCurrency(movement.amount, movement.currency)}
            </p>
          </div>
        </div>
      </div>

      <!-- Details Section -->
      <div class="p-6 space-y-6">
        <!-- Transaction Information -->
        <div>
          <h3 class="text-lg font-semibold text-yl-black mb-4">Transaction Information</h3>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt class="text-sm font-medium text-yl-gray-600">Transaction Date</dt>
              <dd class="mt-1 text-sm text-yl-black">{formatDate(movement.transactionDate)}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-yl-gray-600">Currency</dt>
              <dd class="mt-1 text-sm text-yl-black">{movement.currency}</dd>
            </div>
            {#if movement.category}
              <div>
                <dt class="text-sm font-medium text-yl-gray-600">Category</dt>
                <dd class="mt-1 text-sm text-yl-black">{movement.category}</dd>
              </div>
            {/if}
            {#if movement.reference}
              <div>
                <dt class="text-sm font-medium text-yl-gray-600">Reference</dt>
                <dd class="mt-1 text-sm text-yl-black">{movement.reference}</dd>
              </div>
            {/if}
          </dl>
        </div>

        <!-- Area & Department -->
        <div>
          <h3 class="text-lg font-semibold text-yl-black mb-4">Organization</h3>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {#if movement.area}
              <div>
                <dt class="text-sm font-medium text-yl-gray-600">Area</dt>
                <dd class="mt-1 text-sm text-yl-black">
                  {movement.area.name}
                  <span class="text-yl-gray-500">({movement.area.code})</span>
                </dd>
              </div>
            {/if}
            {#if movement.department}
              <div>
                <dt class="text-sm font-medium text-yl-gray-600">Department</dt>
                <dd class="mt-1 text-sm text-yl-black">
                  {movement.department.name}
                  <span class="text-yl-gray-500">({movement.department.code})</span>
                </dd>
              </div>
            {/if}
          </dl>
        </div>

        <!-- User Information -->
        {#if movement.user}
          <div>
            <h3 class="text-lg font-semibold text-yl-black mb-4">Created By</h3>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt class="text-sm font-medium text-yl-gray-600">Name</dt>
                <dd class="mt-1 text-sm text-yl-black">{movement.user.name}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-yl-gray-600">Email</dt>
                <dd class="mt-1 text-sm text-yl-black">{movement.user.email}</dd>
              </div>
            </dl>
          </div>
        {/if}

        <!-- Timestamps -->
        <div>
          <h3 class="text-lg font-semibold text-yl-black mb-4">System Information</h3>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt class="text-sm font-medium text-yl-gray-600">Created</dt>
              <dd class="mt-1 text-sm text-yl-black">{formatDateTime(movement.createdAt)}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-yl-gray-600">Last Updated</dt>
              <dd class="mt-1 text-sm text-yl-black">{formatDateTime(movement.updatedAt)}</dd>
            </div>
          </dl>
        </div>

        <!-- Attachments (if any) -->
        {#if movement.attachments && movement.attachments.length > 0}
          <div>
            <h3 class="text-lg font-semibold text-yl-black mb-4">Attachments</h3>
            <ul class="space-y-2">
              {#each movement.attachments as attachment}
                <li class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <svg class="w-5 h-5 text-yl-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <div>
                      <p class="text-sm font-medium text-yl-black">{attachment.filename}</p>
                      <p class="text-xs text-yl-gray-600">{(attachment.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm font-medium text-yl-green hover:text-yl-green-accent"
                  >
                    Download
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Related Movements -->
        {#if (movement.parent || (movement.children && movement.children.length > 0))}
          <div>
            <h3 class="text-lg font-semibold text-yl-black mb-4">Related Movements</h3>

            {#if movement.parent}
              <div class="mb-4">
                <p class="text-sm font-medium text-yl-gray-600 mb-2">Parent Movement</p>
                <div class="p-3 bg-gray-50 rounded-lg">
                  <p class="text-sm text-yl-black">{movement.parent.description}</p>
                  <p class="text-xs text-yl-gray-600 mt-1">
                    {formatCurrency(movement.parent.amount)}
                  </p>
                </div>
              </div>
            {/if}

            {#if movement.children && movement.children.length > 0}
              <div>
                <p class="text-sm font-medium text-yl-gray-600 mb-2">Child Movements</p>
                <ul class="space-y-2">
                  {#each movement.children as child}
                    <li class="p-3 bg-gray-50 rounded-lg">
                      <div class="flex justify-between items-start">
                        <div>
                          <p class="text-sm text-yl-black">{child.description}</p>
                          <p class="text-xs text-yl-gray-600 mt-1">
                            {child.area?.name} ({child.area?.code})
                          </p>
                        </div>
                        <p class="text-sm font-medium text-yl-black">
                          {formatCurrency(child.amount)}
                        </p>
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Actions Footer -->
      <div class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-3">
        <Button variant="secondary" size="md" on:click={handleBack}>
          Back to List
        </Button>
        <div class="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            disabled={movement.status !== 'PENDING'}
            title={movement.status !== 'PENDING' ? 'Only pending movements can be edited' : ''}
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            size="md"
            class="!text-red-600 !border-red-600 hover:!bg-red-50"
            on:click={() => showDeleteConfirm = true}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <div class="flex items-start mb-4">
        <div class="flex-shrink-0">
          <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <h3 class="text-lg font-semibold text-yl-black">Delete Movement</h3>
          <p class="text-sm text-yl-gray-600 mt-2">
            Are you sure you want to delete this movement? This action cannot be undone.
          </p>
        </div>
      </div>
      <div class="flex justify-end gap-3 mt-6">
        <Button
          variant="secondary"
          size="sm"
          on:click={() => showDeleteConfirm = false}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          class="!bg-red-600 hover:!bg-red-700"
          on:click={handleDelete}
          disabled={isDeleting}
        >
          {#if isDeleting}
            Deleting...
          {:else}
            Delete
          {/if}
        </Button>
      </div>
    </div>
  </div>
{/if}
