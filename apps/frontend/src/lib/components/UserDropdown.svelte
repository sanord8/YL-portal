<script lang="ts">
  import { authStore } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { fly } from 'svelte/transition';
  import { clickOutside } from '$lib/utils/clickOutside';

  let isOpen = false;

  $: user = $authStore.user;
  $: initials = user
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function closeDropdown() {
    isOpen = false;
  }

  async function handleLogout() {
    closeDropdown();
    await authStore.logout();
    goto('/login');
  }

  function navigateTo(path: string) {
    closeDropdown();
    goto(path);
  }
</script>

<div class="relative" use:clickOutside={closeDropdown}>
  <!-- User Avatar Button -->
  <button
    on:click={toggleDropdown}
    class="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-yl-green rounded-full transition-all"
    aria-label="User menu"
    aria-expanded={isOpen}
  >
    <div
      class="w-10 h-10 rounded-full bg-yl-green flex items-center justify-center text-white font-semibold text-sm hover:bg-yl-green-accent transition-colors"
    >
      {initials}
    </div>
    <!-- Chevron icon -->
    <svg
      class="w-4 h-4 text-yl-gray-600 transition-transform {isOpen ? 'rotate-180' : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <!-- Dropdown Menu -->
  {#if isOpen}
    <div
      transition:fly={{ y: -10, duration: 200 }}
      class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
    >
      <!-- User Info Section -->
      <div class="px-4 py-3 border-b border-gray-100">
        <p class="text-sm font-semibold text-yl-black">{user?.name}</p>
        <p class="text-xs text-yl-gray-600 truncate">{user?.email}</p>
        {#if !user?.emailVerified}
          <p class="text-xs text-yellow-600 mt-1">
            Email not verified
          </p>
        {/if}
      </div>

      <!-- Menu Items -->
      <div class="py-1">
        <button
          on:click={() => navigateTo('/profile')}
          class="w-full text-left px-4 py-2 text-sm text-yl-gray-700 hover:bg-yl-gray-50 transition-colors flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span>Profile</span>
        </button>

        <button
          on:click={() => navigateTo('/settings')}
          class="w-full text-left px-4 py-2 text-sm text-yl-gray-700 hover:bg-yl-gray-50 transition-colors flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>Settings</span>
        </button>
      </div>

      <!-- Logout Section -->
      <div class="border-t border-gray-100 py-1">
        <button
          on:click={handleLogout}
          class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </div>
  {/if}
</div>
