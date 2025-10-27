<script lang="ts">
  import { slide } from 'svelte/transition';

  export let title: string;
  export let isOpen = true;
  export let icon: string | null = null;
  export let headerClass = '';
  export let contentClass = '';

  function toggle() {
    isOpen = !isOpen;
  }
</script>

<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
  <!-- Header (always visible, clickable) -->
  <button
    on:click={toggle}
    class="w-full px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between hover:bg-gray-50 transition-colors {headerClass}"
  >
    <div class="flex items-center space-x-3">
      {#if icon}
        <span class="text-xl sm:text-2xl">{icon}</span>
      {/if}
      <h2 class="text-lg sm:text-xl font-semibold text-yl-black">{title}</h2>
    </div>

    <svg
      class="w-5 h-5 sm:w-6 sm:h-6 text-yl-gray-500 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <!-- Content (collapsible) -->
  {#if isOpen}
    <div transition:slide={{ duration: 200 }} class="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-200 {contentClass}">
      <slot />
    </div>
  {/if}
</div>
