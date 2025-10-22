<script lang="ts">
  export let open = false;
  export let title = 'Confirm Action';
  export let message = 'Are you sure you want to proceed?';
  export let confirmText = 'Confirm';
  export let cancelText = 'Cancel';
  export let variant: 'danger' | 'warning' | 'info' | 'success' = 'danger';
  export let onConfirm: () => void;
  export let onCancel: () => void;
  export let disabled = false;
  export let isLoading = false;

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onCancel();
    }
  }

  $: variantClasses = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-yl-green hover:bg-yl-green-dark focus:ring-yl-green',
    success: 'bg-yl-green hover:bg-yl-green-dark focus:ring-yl-green',
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
          variant === 'danger' ? 'bg-red-100' :
          variant === 'warning' ? 'bg-yellow-100' :
          variant === 'success' ? 'bg-green-100' :
          'bg-yl-green-light'
        }">
          {#if variant === 'danger'}
            <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          {:else if variant === 'warning'}
            <svg class="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          {:else if variant === 'success'}
            <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          {:else}
            <svg class="w-6 h-6 text-yl-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            class="flex-1 order-2 sm:order-1 px-4 py-2.5 text-sm font-medium text-yl-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            on:click={onCancel}
            disabled={disabled || isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            class="flex-1 order-1 sm:order-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation {variantClasses[variant]}"
            on:click={onConfirm}
            disabled={disabled || isLoading}
          >
            {#if isLoading}
              <div class="flex items-center justify-center">
                <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              </div>
            {:else}
              {confirmText}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
