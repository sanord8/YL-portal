<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let users: Array<{
    id: string;
    name: string | null;
    email: string;
    emailVerified: Date | null;
  }> = [];
  export let placeholder = 'Search users...';
  export let isLoading = false;
  export let emptyMessage = 'No users found';

  const dispatch = createEventDispatcher<{ select: { id: string; name: string | null; email: string } }>();

  let searchQuery = '';
  let isOpen = false;
  let dropdownElement: HTMLDivElement;

  $: filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    const name = user.name?.toLowerCase() || '';
    const email = user.email.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  function handleSelect(user: { id: string; name: string | null; email: string }) {
    dispatch('select', user);
    searchQuery = '';
    isOpen = false;
  }

  function handleFocus() {
    isOpen = true;
  }

  function handleBlur(event: FocusEvent) {
    // Only close if we're not clicking within the dropdown
    setTimeout(() => {
      if (!dropdownElement?.contains(document.activeElement)) {
        isOpen = false;
      }
    }, 200);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      isOpen = false;
      searchQuery = '';
    }
  }
</script>

<div class="relative" bind:this={dropdownElement}>
  <!-- Search Input -->
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <svg class="h-5 w-5 text-yl-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <input
      type="text"
      bind:value={searchQuery}
      on:focus={handleFocus}
      on:blur={handleBlur}
      on:keydown={handleKeydown}
      {placeholder}
      disabled={isLoading}
      class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-50 disabled:text-yl-gray-500"
    />
    {#if isLoading}
      <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
        <svg class="animate-spin h-5 w-5 text-yl-gray-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    {/if}
  </div>

  <!-- Dropdown -->
  {#if isOpen && !isLoading}
    <div class="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
      {#if filteredUsers.length === 0}
        <div class="px-4 py-3 text-sm text-yl-gray-500 text-center">
          {searchQuery ? 'No users match your search' : emptyMessage}
        </div>
      {:else}
        <ul class="py-1">
          {#each filteredUsers as user}
            <li>
              <button
                type="button"
                class="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
                on:click={() => handleSelect(user)}
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-yl-black truncate">
                      {user.name || 'No name'}
                    </p>
                    <p class="text-xs text-yl-gray-600 truncate">
                      {user.email}
                    </p>
                  </div>
                  {#if user.emailVerified}
                    <div class="ml-2 flex-shrink-0">
                      <svg class="h-4 w-4 text-yl-green" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  {/if}
                </div>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>
