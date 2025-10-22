<script lang="ts">
  export let open = false;
  export let title = 'Information';
  export let message = '';
  export let okText = 'OK';
  export let variant: 'success' | 'info' | 'warning' = 'success';
  export let onOk: () => void;
  export let disabled = false;

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onOk();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter') {
      onOk();
    }
  }

  $: variantClasses = {
    success: 'bg-yl-green hover:bg-yl-green-dark focus:ring-yl-green',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
  };
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
    ></button>

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div
        class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 transform transition-all max-h-[90vh] overflow-y-auto"
      >
        <!-- Icon -->
        <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full {
          variant === 'success' ? 'bg-green-100' :
          variant === 'warning' ? 'bg-yellow-100' :
          'bg-blue-100'
        }">
          {#if variant === 'success'}
            <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          {:else if variant === 'warning'}
            <svg class="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          {:else}
            <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          {/if}
        </div>

        <!-- Title -->
        <h3 id="modal-title" class="text-lg font-semibold text-yl-black text-center mb-2">
          {title}
        </h3>

        <!-- Message or Slot Content -->
        <div class="mb-6">
          <slot>
            <p class="text-sm text-yl-gray-600 text-center">
              {message}
            </p>
          </slot>
        </div>

        <!-- Action -->
        <div class="flex justify-center">
          <button
            type="button"
            class="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation {variantClasses[variant]}"
            on:click={onOk}
            disabled={disabled}
            autofocus
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
