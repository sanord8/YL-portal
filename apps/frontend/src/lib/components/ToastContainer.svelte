<script lang="ts">
  import { toastStore } from '$lib/stores/toastStore';
  import { fly } from 'svelte/transition';

  $: toasts = $toastStore.toasts;

  function getIcon(type: string) {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '';
    }
  }

  function getColorClasses(type: string) {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  }

  function getIconColorClasses(type: string) {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  }
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
  {#each toasts as toast (toast.id)}
    <div
      class="pointer-events-auto border rounded-lg shadow-lg p-4 flex items-start gap-3 {getColorClasses(
        toast.type
      )}"
      transition:fly={{ y: -20, duration: 300 }}
    >
      <div
        class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold {getIconColorClasses(
          toast.type
        )}"
      >
        {getIcon(toast.type)}
      </div>
      <p class="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        on:click={() => toastStore.remove(toast.id)}
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  {/each}
</div>
