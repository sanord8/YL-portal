<script lang="ts">
  import { authStore } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let redirectTo = '/login';

  $: isAuthenticated = $authStore.isAuthenticated;
  $: isLoading = $authStore.isLoading;

  // Redirect to login if not authenticated
  onMount(() => {
    if (!isLoading && !isAuthenticated && browser) {
      goto(redirectTo);
    }
  });

  // Watch for changes in authentication state
  $: if (!isLoading && !isAuthenticated && browser) {
    goto(redirectTo);
  }
</script>

{#if isLoading}
  <!-- Loading state -->
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-yl-green border-t-transparent"></div>
      <p class="mt-4 text-yl-gray-600">Loading...</p>
    </div>
  </div>
{:else if isAuthenticated}
  <!-- Render protected content -->
  <slot />
{:else}
  <!-- Redirecting message (brief display before navigation) -->
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-yl-green border-t-transparent"></div>
      <p class="mt-4 text-yl-gray-600">Redirecting to login...</p>
    </div>
  </div>
{/if}
