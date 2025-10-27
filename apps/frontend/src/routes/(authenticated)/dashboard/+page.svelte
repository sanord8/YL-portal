<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/authStore';
  import AdminDashboard from '$lib/components/AdminDashboard.svelte';
  import UserDashboard from '$lib/components/UserDashboard.svelte';

  $: user = $authStore.user;
  $: isAuthenticated = $authStore.isAuthenticated;

  // Redirect to root if not authenticated
  onMount(() => {
    if (!isAuthenticated) {
      goto('/');
    }
  });
</script>

<svelte:head>
  <title>Dashboard - YoungLife Portal</title>
</svelte:head>

<!-- Role-Specific Dashboard -->
{#if user?.isAdmin}
  <AdminDashboard />
{:else}
  <UserDashboard />
{/if}
