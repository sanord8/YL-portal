<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc';
  import { toastStore } from '$lib/stores/toastStore';
  import { authStore } from '$lib/stores/authStore';
  import Button from '$lib/components/Button.svelte';

  // State
  let drafts: any[] = [];
  let stats: any = null;
  let isLoading = true;
  let isLoadingMore = false;
  let nextCursor: string | undefined = undefined;

  // Filters
  let selectedAreaId = '';
  let needsCategorization = false;
  let availableAreas: any[] = [];

  // Selection
  let selectedDraftIds = new Set<string>();
  let bulkAreaId = '';
  let bulkDepartmentId = '';
  let bulkCategory = '';

  // Inline editing
  let editingDrafts = new Map<string, any>(); // draftId -> {areaId, departmentId, category}
  let departmentsByArea = new Map<string, any[]>(); // areaId -> departments[]

  onMount(async () => {
    await loadAreas();
    await loadStats();
    await loadDrafts();
  });

  async function loadAreas() {
    try {
      availableAreas = await trpc.area.listAll.query();

      // Load departments for each area
      for (const area of availableAreas) {
        const departments = await trpc.department.list.query({
          areaId: area.id,
          includeSpecialFunds: false
        });
        departmentsByArea.set(area.id, departments);
      }
    } catch (err: any) {
      console.error('Failed to load areas:', err);
      toastStore.error('Failed to load areas');
    }
  }

  async function loadStats() {
    try {
      stats = await trpc.draft.getStats.query();
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  }

  async function loadDrafts(cursor?: string) {
    try {
      if (cursor) {
        isLoadingMore = true;
      } else {
        isLoading = true;
      }

      const result = await trpc.draft.list.query({
        areaId: selectedAreaId || undefined,
        needsCategorization: needsCategorization || undefined,
        cursor,
        limit: 50,
      });

      if (cursor) {
        drafts = [...drafts, ...result.drafts];
      } else {
        drafts = result.drafts;
      }

      nextCursor = result.nextCursor;
    } catch (err: any) {
      console.error('Failed to load drafts:', err);
      toastStore.error('Failed to load drafts');
    } finally {
      isLoading = false;
      isLoadingMore = false;
    }
  }

  function startEditing(draft: any) {
    editingDrafts.set(draft.id, {
      areaId: draft.areaId,
      departmentId: draft.departmentId,
      category: draft.category || '',
    });
    editingDrafts = editingDrafts; // Trigger reactivity
  }

  function cancelEditing(draftId: string) {
    editingDrafts.delete(draftId);
    editingDrafts = editingDrafts;
  }

  async function saveEdit(draftId: string) {
    const edits = editingDrafts.get(draftId);
    if (!edits) return;

    try {
      await trpc.draft.update.mutate({
        id: draftId,
        areaId: edits.areaId,
        departmentId: edits.departmentId || null,
        category: edits.category || null,
      });

      toastStore.success('Draft updated');
      editingDrafts.delete(draftId);
      editingDrafts = editingDrafts;

      // Reload to get fresh data
      await loadDrafts();
      await loadStats();
    } catch (err: any) {
      console.error('Failed to update draft:', err);
      toastStore.error(`Failed to update: ${err.message}`);
    }
  }

  function toggleSelection(draftId: string) {
    if (selectedDraftIds.has(draftId)) {
      selectedDraftIds.delete(draftId);
    } else {
      selectedDraftIds.add(draftId);
    }
    selectedDraftIds = selectedDraftIds;
  }

  function selectAll() {
    selectedDraftIds = new Set(drafts.map(d => d.id));
  }

  function deselectAll() {
    selectedDraftIds = new Set();
  }

  async function bulkFinalize() {
    if (selectedDraftIds.size === 0) {
      toastStore.warning('No drafts selected');
      return;
    }

    try {
      const result = await trpc.draft.bulkFinalize.mutate({
        ids: Array.from(selectedDraftIds),
      });

      toastStore.success(`Finalized ${result.finalized} drafts`);
      selectedDraftIds = new Set();
      await loadDrafts();
      await loadStats();
    } catch (err: any) {
      console.error('Failed to finalize:', err);
      toastStore.error(`Failed to finalize: ${err.message}`);
    }
  }

  async function bulkDelete() {
    if (selectedDraftIds.size === 0) {
      toastStore.warning('No drafts selected');
      return;
    }

    if (!confirm(`Delete ${selectedDraftIds.size} draft(s)?`)) {
      return;
    }

    try {
      const result = await trpc.draft.bulkDelete.mutate({
        ids: Array.from(selectedDraftIds),
      });

      toastStore.success(`Deleted ${result.deleted} drafts`);
      selectedDraftIds = new Set();
      await loadDrafts();
      await loadStats();
    } catch (err: any) {
      console.error('Failed to delete:', err);
      toastStore.error(`Failed to delete: ${err.message}`);
    }
  }

  async function bulkCategorize() {
    if (selectedDraftIds.size === 0) {
      toastStore.warning('No drafts selected');
      return;
    }

    if (!bulkDepartmentId) {
      toastStore.warning('Please select a department');
      return;
    }

    try {
      const result = await trpc.draft.bulkUpdate.mutate({
        ids: Array.from(selectedDraftIds),
        areaId: bulkAreaId || undefined,
        departmentId: bulkDepartmentId,
        category: bulkCategory || undefined,
      });

      toastStore.success(`Updated ${result.updated} drafts`);
      selectedDraftIds = new Set();
      bulkAreaId = '';
      bulkDepartmentId = '';
      bulkCategory = '';
      await loadDrafts();
      await loadStats();
    } catch (err: any) {
      console.error('Failed to categorize:', err);
      toastStore.error(`Failed to categorize: ${err.message}`);
    }
  }

  async function handleFinalize(draftId: string) {
    try {
      await trpc.draft.finalize.mutate({ id: draftId });
      toastStore.success('Draft finalized');
      await loadDrafts();
      await loadStats();
    } catch (err: any) {
      console.error('Failed to finalize:', err);
      toastStore.error(`Failed to finalize: ${err.message}`);
    }
  }

  async function handleDelete(draftId: string) {
    if (!confirm('Delete this draft?')) return;

    try {
      await trpc.draft.delete.mutate({ id: draftId });
      toastStore.success('Draft deleted');
      await loadDrafts();
      await loadStats();
    } catch (err: any) {
      console.error('Failed to delete:', err);
      toastStore.error(`Failed to delete: ${err.message}`);
    }
  }

  function formatCurrency(amount: number, currency: string = 'EUR') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  }

  function formatDate(date: string | Date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  }

  $: bulkDepartments = bulkAreaId ? departmentsByArea.get(bulkAreaId) || [] : [];
</script>

<svelte:head>
  <title>Draft Movements - YL Portal</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <!-- Header -->
  <div class="mb-6">
    <div class="flex items-center gap-2 text-sm text-yl-gray-600 mb-2">
      <a href="/movements" class="hover:text-yl-green transition-colors">Movements</a>
      <span>/</span>
      <span class="text-yl-black">Drafts</span>
    </div>
    <h1 class="text-3xl font-bold text-yl-black">Draft Movements</h1>
    <p class="mt-2 text-yl-gray-600">Review and categorize imported movements before approval</p>
  </div>

  <!-- Stats -->
  {#if stats}
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow border border-gray-200 p-4">
        <p class="text-sm text-yl-gray-600">Total Drafts</p>
        <p class="text-2xl font-bold text-yl-black">{stats.total}</p>
      </div>
      <div class="bg-yellow-50 rounded-lg shadow border border-yellow-200 p-4">
        <p class="text-sm text-yellow-700">Needs Categorization</p>
        <p class="text-2xl font-bold text-yellow-600">{stats.needsCategorization}</p>
      </div>
      <div class="bg-blue-50 rounded-lg shadow border border-blue-200 p-4">
        <p class="text-sm text-blue-700">Areas</p>
        <p class="text-2xl font-bold text-blue-600">{stats.byArea.length}</p>
      </div>
    </div>
  {/if}

  <!-- Filters & Bulk Actions -->
  <div class="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <!-- Filter by Area -->
      <div>
        <label class="block text-sm font-medium text-yl-gray-700 mb-1">Filter by Area</label>
        <select
          bind:value={selectedAreaId}
          on:change={() => loadDrafts()}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green"
        >
          <option value="">All Areas</option>
          {#each availableAreas as area}
            <option value={area.id}>{area.name} ({area.code})</option>
          {/each}
        </select>
      </div>

      <!-- Filter by Categorization -->
      <div>
        <label class="block text-sm font-medium text-yl-gray-700 mb-1">Show Only</label>
        <label class="flex items-center h-10 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            bind:checked={needsCategorization}
            on:change={() => loadDrafts()}
            class="mr-2"
          />
          <span class="text-sm">Needs Categorization</span>
        </label>
      </div>

      <!-- Selection count -->
      <div class="flex items-end">
        <div class="text-sm text-yl-gray-600">
          {#if selectedDraftIds.size > 0}
            <span class="font-medium">{selectedDraftIds.size}</span> selected
          {:else}
            No drafts selected
          {/if}
        </div>
      </div>
    </div>

    <!-- Bulk Actions (shown when items selected) -->
    {#if selectedDraftIds.size > 0}
      <div class="border-t border-gray-200 pt-4">
        <p class="text-sm font-medium text-yl-gray-900 mb-3">Bulk Actions</p>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <!-- Bulk Categorize -->
          <select
            bind:value={bulkAreaId}
            class="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            disabled={!$authStore.user?.isAdmin}
          >
            <option value="">Select Area...</option>
            {#each availableAreas as area}
              <option value={area.id}>{area.name}</option>
            {/each}
          </select>

          <select
            bind:value={bulkDepartmentId}
            class="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            disabled={!bulkAreaId || !$authStore.user?.isAdmin}
          >
            <option value="">Select Department...</option>
            {#each bulkDepartments as dept}
              <option value={dept.id}>{dept.name}</option>
            {/each}
          </select>

          <Button
            variant="primary"
            size="sm"
            on:click={bulkCategorize}
            disabled={!bulkDepartmentId || !$authStore.user?.isAdmin}
          >
            Categorize Selected
          </Button>

          <div class="flex gap-2">
            <Button variant="primary" size="sm" on:click={bulkFinalize}>
              Finalize Selected
            </Button>
            <Button variant="outline" size="sm" on:click={bulkDelete}>
              Delete Selected
            </Button>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Drafts Table -->
  {#if isLoading}
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yl-green mx-auto mb-4"></div>
      <p class="text-yl-gray-600">Loading drafts...</p>
    </div>
  {:else if drafts.length === 0}
    <div class="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
      <svg class="w-16 h-16 text-yl-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="text-yl-gray-600 mb-4">No draft movements found</p>
      <Button variant="primary" on:click={() => goto('/movements/import')}>
        Import Movements
      </Button>
    </div>
  {:else}
    <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <!-- Desktop Table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedDraftIds.size === drafts.length && drafts.length > 0}
                  on:change={(e) => e.target.checked ? selectAll() : deselectAll()}
                  class="rounded"
                />
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase">Date</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase">Description</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase">Amount</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase">Area</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase">Department</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase">Category</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-yl-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each drafts as draft}
              {@const isEditing = editingDrafts.has(draft.id)}
              {@const edits = editingDrafts.get(draft.id)}
              {@const needsCat = !draft.departmentId}
              <tr class:bg-yellow-50={needsCat && !isEditing} class:bg-blue-50={isEditing}>
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedDraftIds.has(draft.id)}
                    on:change={() => toggleSelection(draft.id)}
                    class="rounded"
                  />
                </td>
                <td class="px-4 py-3 text-sm text-yl-gray-900 whitespace-nowrap">
                  {formatDate(draft.transactionDate)}
                </td>
                <td class="px-4 py-3 text-sm text-yl-gray-900 max-w-xs truncate">
                  {draft.description}
                </td>
                <td class="px-4 py-3 text-sm font-medium whitespace-nowrap">
                  <span class:text-green-600={draft.type === 'INCOME'} class:text-red-600={draft.type === 'EXPENSE'}>
                    {draft.type === 'INCOME' ? '+' : '-'}{formatCurrency(draft.amount, draft.currency)}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">
                  {#if isEditing}
                    <select
                      bind:value={edits.areaId}
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      {#each availableAreas as area}
                        <option value={area.id}>{area.name}</option>
                      {/each}
                    </select>
                  {:else}
                    {draft.area.name}
                  {/if}
                </td>
                <td class="px-4 py-3 text-sm">
                  {#if isEditing}
                    <select
                      bind:value={edits.departmentId}
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="">None</option>
                      {#each departmentsByArea.get(edits.areaId) || [] as dept}
                        <option value={dept.id}>{dept.name}</option>
                      {/each}
                    </select>
                  {:else if draft.department}
                    {draft.department.name}
                  {:else}
                    <span class="text-yellow-600 text-xs">⚠️ Needs categorization</span>
                  {/if}
                </td>
                <td class="px-4 py-3 text-sm">
                  {#if isEditing}
                    <input
                      type="text"
                      bind:value={edits.category}
                      placeholder="Category..."
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  {:else}
                    {draft.category || '-'}
                  {/if}
                </td>
                <td class="px-4 py-3 text-right text-sm space-x-2 whitespace-nowrap">
                  {#if isEditing}
                    <button
                      on:click={() => saveEdit(draft.id)}
                      class="text-green-600 hover:text-green-800 font-medium"
                    >
                      Save
                    </button>
                    <button
                      on:click={() => cancelEditing(draft.id)}
                      class="text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  {:else}
                    <button
                      on:click={() => startEditing(draft)}
                      class="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      on:click={() => handleFinalize(draft.id)}
                      disabled={needsCat}
                      class="text-green-600 hover:text-green-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      title={needsCat ? 'Categorize first' : 'Move to pending'}
                    >
                      Finalize
                    </button>
                    <button
                      on:click={() => handleDelete(draft.id)}
                      class="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="md:hidden divide-y divide-gray-200">
        {#each drafts as draft}
          {@const needsCat = !draft.departmentId}
          <div class="p-4" class:bg-yellow-50={needsCat}>
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <p class="text-sm font-medium text-yl-black">{draft.description}</p>
                <p class="text-xs text-yl-gray-600 mt-1">{formatDate(draft.transactionDate)}</p>
              </div>
              <input
                type="checkbox"
                checked={selectedDraftIds.has(draft.id)}
                on:change={() => toggleSelection(draft.id)}
                class="rounded"
              />
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs mt-3">
              <div>
                <span class="text-yl-gray-600">Amount:</span>
                <span class="font-medium" class:text-green-600={draft.type === 'INCOME'} class:text-red-600={draft.type === 'EXPENSE'}>
                  {draft.type === 'INCOME' ? '+' : '-'}{formatCurrency(draft.amount, draft.currency)}
                </span>
              </div>
              <div>
                <span class="text-yl-gray-600">Area:</span>
                <span class="font-medium">{draft.area.name}</span>
              </div>
              <div class="col-span-2">
                <span class="text-yl-gray-600">Department:</span>
                {#if draft.department}
                  <span class="font-medium">{draft.department.name}</span>
                {:else}
                  <span class="text-yellow-600 font-medium">⚠️ Needs categorization</span>
                {/if}
              </div>
            </div>

            <div class="flex gap-2 mt-3">
              <Button size="sm" variant="primary" on:click={() => goto(`/movements/${draft.id}`)}>
                Edit
              </Button>
              <Button size="sm" variant="outline" on:click={() => handleFinalize(draft.id)} disabled={needsCat}>
                Finalize
              </Button>
              <Button size="sm" variant="outline" on:click={() => handleDelete(draft.id)}>
                Delete
              </Button>
            </div>
          </div>
        {/each}
      </div>

      <!-- Load More -->
      {#if nextCursor}
        <div class="p-4 border-t border-gray-200 text-center">
          <Button
            variant="outline"
            on:click={() => loadDrafts(nextCursor)}
            disabled={isLoadingMore}
          >
            {#if isLoadingMore}
              Loading...
            {:else}
              Load More
            {/if}
          </Button>
        </div>
      {/if}
    </div>
  {/if}
</div>
