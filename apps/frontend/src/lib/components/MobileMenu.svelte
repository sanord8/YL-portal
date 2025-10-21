<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { authStore, type User } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import Button from './Button.svelte';

  export let isOpen = false;
  export let onClose: () => void;
  export let isAuthenticated = false;
  export let user: User | null = null;

  // Navigation items for authenticated users
  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/movements', label: 'Movements' },
    { href: '/areas', label: 'Areas' },
    { href: '/departments', label: 'Departments' },
    { href: '/reports', label: 'Reports' },
    { href: '/profile', label: 'Profile' },
    { href: '/settings', label: 'Settings' },
  ];

  // Admin navigation item
  const adminNavItem = { href: '/admin/users', label: 'Admin' };

  $: displayNavItems = user?.isAdmin
    ? [...navItems.slice(0, 5), adminNavItem, ...navItems.slice(5)]
    : navItems;

  // Close menu when clicking a link
  function handleLinkClick() {
    onClose();
  }

  // Close on escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  async function handleLogout() {
    onClose();
    await authStore.logout();
    goto('/login');
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
    on:click={onClose}
    transition:fade={{ duration: 200 }}
    role="presentation"
  />

  <!-- Mobile Menu Panel -->
  <div
    class="fixed top-0 right-0 bottom-0 w-64 bg-yl-black shadow-2xl z-50 md:hidden"
    transition:fly={{ x: 300, duration: 300 }}
  >
    <!-- Close Button -->
    <div class="flex justify-end p-4">
      <button
        on:click={onClose}
        class="text-white hover:text-yl-green-accent transition-colors p-2"
        aria-label="Close menu"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Menu Items -->
    <nav class="px-4 py-2 flex flex-col h-[calc(100%-80px)]">
      {#if isAuthenticated && user}
        <!-- User info section -->
        <div class="px-4 py-4 mb-4 bg-yl-gray-800 rounded-lg">
          <p class="text-white font-semibold text-sm">{user.name}</p>
          <p class="text-yl-gray-400 text-xs truncate">{user.email}</p>
        </div>

        <!-- Navigation links -->
        <ul class="space-y-2 flex-1">
          {#each displayNavItems as item}
            <li>
              <a
                href={item.href}
                on:click={handleLinkClick}
                class="block px-4 py-3 text-white hover:bg-yl-green hover:text-white rounded-lg transition-all duration-200 font-medium text-lg"
              >
                {item.label}
              </a>
            </li>
          {/each}
        </ul>

        <!-- Logout button -->
        <div class="mt-4 px-4">
          <button
            on:click={handleLogout}
            class="w-full px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200 font-medium text-lg text-left"
          >
            Logout
          </button>
        </div>
      {:else}
        <!-- Auth buttons for non-authenticated users -->
        <div class="flex-1 flex flex-col justify-center space-y-4 px-4">
          <a href="/login" on:click={handleLinkClick}>
            <Button variant="primary" size="lg" class="w-full">
              Login
            </Button>
          </a>
          <p class="text-center text-sm text-yl-gray-400 mt-4">
            Need an account? Contact your administrator
          </p>
        </div>
      {/if}

      <!-- Footer Logo -->
      <div class="mt-auto pt-6 border-t border-yl-gray-700">
        <img
          src="/images/younglife-logo-white.svg"
          alt="YoungLife"
          class="h-10 mx-auto opacity-50"
        />
      </div>
    </nav>
  </div>
{/if}
