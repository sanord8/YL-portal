<script lang="ts">
  export let isAdmin: boolean = false;
  export let emailVerified: boolean = false;
  export let deletedAt: Date | null = null;
  export let size: 'sm' | 'md' = 'md';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };
</script>

<div class="flex items-center gap-1.5 flex-wrap">
  {#if isAdmin}
    <span
      class="inline-flex items-center rounded-full bg-purple-100 text-purple-800 font-medium {sizeClasses[size]}"
    >
      Admin
    </span>
  {/if}

  {#if emailVerified}
    <span
      class="inline-flex items-center rounded-full bg-green-100 text-green-800 font-medium {sizeClasses[size]}"
    >
      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clip-rule="evenodd"
        />
      </svg>
      Verified
    </span>
  {:else}
    <span
      class="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 font-medium {sizeClasses[size]}"
    >
      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clip-rule="evenodd"
        />
      </svg>
      Unverified
    </span>
  {/if}

  {#if deletedAt}
    <span
      class="inline-flex items-center rounded-full bg-red-100 text-red-800 font-medium {sizeClasses[size]}"
    >
      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
          clip-rule="evenodd"
        />
      </svg>
      Deleted
    </span>
  {/if}
</div>
