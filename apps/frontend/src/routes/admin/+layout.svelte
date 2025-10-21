<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/authStore';
  import { trpc } from '$lib/trpc/client';

  let isCheckingAuth = true;
  let error = '';

  onMount(async () => {
    try {
      // Ensure user is authenticated and admin
      if (!$authStore.isAuthenticated || !$authStore.user) {
        goto('/login');
        return;
      }

      // Check if user is admin via tRPC
      // This will throw a FORBIDDEN error if not admin
      await trpc.admin.users.list.query({ page: 1, pageSize: 1 });

      isCheckingAuth = false;
    } catch (err: any) {
      console.error('Admin auth check failed:', err);

      if (err?.data?.code === 'FORBIDDEN') {
        error = 'Admin access required';
        setTimeout(() => goto('/'), 2000);
      } else if (err?.data?.code === 'UNAUTHORIZED') {
        goto('/login');
      } else {
        error = 'Failed to verify admin access';
        setTimeout(() => goto('/'), 2000);
      }
    }
  });
</script>

{#if isCheckingAuth}
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-yl-green border-t-transparent mb-4" />
      <p class="text-yl-gray-600">Verifying admin access...</p>
    </div>
  </div>
{:else if error}
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
        <svg class="w-12 h-12 text-red-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 class="text-lg font-semibold text-red-900 mb-2">Access Denied</h2>
        <p class="text-sm text-red-700">{error}</p>
        <p class="text-xs text-red-600 mt-2">Redirecting...</p>
      </div>
    </div>
  </div>
{:else}
  <!-- Admin Sub-Navigation -->
  <div class="bg-white border-b mb-6">
    <div class="flex space-x-8">
      <a
        href="/admin/users"
        class="px-4 py-3 text-sm font-medium border-b-2 transition-colors"
        class:border-yl-green={window.location.pathname.startsWith('/admin/users')}
        class:text-yl-green={window.location.pathname.startsWith('/admin/users')}
        class:border-transparent={!window.location.pathname.startsWith('/admin/users')}
        class:text-yl-gray-600={!window.location.pathname.startsWith('/admin/users')}
        class:hover:text-yl-gray-900={!window.location.pathname.startsWith('/admin/users')}
      >
        User Management
      </a>
      <!-- Future admin sections can be added here -->
      <!-- <a href="/admin/settings">Settings</a> -->
    </div>
  </div>

  <!-- Admin Content -->
  <slot />
{/if}
