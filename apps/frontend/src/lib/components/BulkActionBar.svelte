<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let selectedCount: number = 0;
  export let isApproving: boolean = false;
  export let isRejecting: boolean = false;

  const dispatch = createEventDispatcher<{
    approve: void;
    reject: void;
    clear: void;
  }>();

  function handleApprove() {
    dispatch('approve');
  }

  function handleReject() {
    dispatch('reject');
  }

  function handleClear() {
    dispatch('clear');
  }
</script>

{#if selectedCount > 0}
  <div class="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-yl-green shadow-lg z-40 transition-all duration-300">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex items-center justify-between">
        <!-- Selection info -->
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-full bg-yl-green-light">
            <svg class="w-5 h-5 text-yl-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-yl-black">
              {selectedCount} {selectedCount === 1 ? 'movement' : 'movements'} selected
            </p>
            <p class="text-xs text-yl-gray-600">
              Choose an action below
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            on:click={handleClear}
            disabled={isApproving || isRejecting}
            class="px-4 py-2 text-sm font-medium text-yl-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Selection
          </button>

          <button
            type="button"
            on:click={handleReject}
            disabled={isApproving || isRejecting}
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {#if isRejecting}
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Rejecting...
            {:else}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Reject Selected
            {/if}
          </button>

          <button
            type="button"
            on:click={handleApprove}
            disabled={isApproving || isRejecting}
            class="px-4 py-2 text-sm font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {#if isApproving}
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Approving...
            {:else}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Approve Selected
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Spacer to prevent content from being hidden behind the bar -->
  <div class="h-20" aria-hidden="true"></div>
{/if}
