<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import StatsGrid from '$lib/components/StatsGrid.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import SearchDropdown from '$lib/components/SearchDropdown.svelte';

  let areaId = $page.params.id;
  let area: any = null;
  let departments: any[] = [];
  let movements: any[] = [];
  let unassignedUsers: any[] = [];

  let isLoading = true;
  let isLoadingDepartments = true;
  let isLoadingMovements = true;
  let isLoadingUsers = false;
  let error = '';

  // User assignment
  let showAddUser = false;
  let isAssigningUser = false;

  // Delete confirmation
  let showDeleteDialog = false;
  let isDeleting = false;
  let userToRemove: { id: string; name: string | null } | null = null;
  let showRemoveUserDialog = false;

  onMount(async () => {
    await loadArea();
    await loadDepartments();
    await loadRecentMovements();
  });

  async function loadArea() {
    try {
      isLoading = true;
      error = '';
      area = await trpc.area.getById.query({ id: areaId });
    } catch (err: any) {
      error = err.message || 'Failed to load area';
    } finally {
      isLoading = false;
    }
  }

  async function loadDepartments() {
    try {
      isLoadingDepartments = true;
      departments = await trpc.department.list.query({ areaId });
    } catch (err: any) {
      console.error('Failed to load departments:', err);
    } finally {
      isLoadingDepartments = false;
    }
  }

  async function loadRecentMovements() {
    try {
      isLoadingMovements = true;
      const result = await trpc.movement.list.query({
        areaId,
        limit: 5
      });
      movements = result.items;
    } catch (err: any) {
      console.error('Failed to load movements:', err);
    } finally {
      isLoadingMovements = false;
    }
  }

  async function loadUnassignedUsers() {
    try {
      isLoadingUsers = true;
      unassignedUsers = await trpc.user.getUnassigned.query({ areaId });
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      isLoadingUsers = false;
    }
  }

  async function handleAddUserClick() {
    showAddUser = true;
    await loadUnassignedUsers();
  }

  async function handleUserSelect(event: CustomEvent<{ id: string; name: string | null; email: string }>) {
    try {
      isAssigningUser = true;
      await trpc.area.assignUser.mutate({
        areaId,
        userId: event.detail.id,
      });
      await loadArea(); // Reload to get updated user list
      await loadUnassignedUsers(); // Refresh available users
    } catch (err: any) {
      alert(`Failed to assign user: ${err.message}`);
    } finally {
      isAssigningUser = false;
    }
  }

  function handleRemoveUserClick(userId: string, userName: string | null) {
    userToRemove = { id: userId, name: userName };
    showRemoveUserDialog = true;
  }

  async function confirmRemoveUser() {
    if (!userToRemove) return;

    try {
      await trpc.area.unassignUser.mutate({
        areaId,
        userId: userToRemove.id,
      });
      await loadArea();
      await loadUnassignedUsers();
      showRemoveUserDialog = false;
      userToRemove = null;
    } catch (err: any) {
      alert(`Failed to remove user: ${err.message}`);
    }
  }

  async function handleDelete() {
    try {
      isDeleting = true;
      await trpc.area.delete.mutate({ id: areaId });
      goto('/areas');
    } catch (err: any) {
      alert(`Failed to delete area: ${err.message}`);
      isDeleting = false;
      showDeleteDialog = false;
    }
  }

  function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  $: stats = area ? [
    {
      label: 'Assigned Users',
      value: area.users?.length || 0,
      icon: 'user' as const,
      color: 'blue' as const,
    },
    {
      label: 'Departments',
      value: area._count?.departments || 0,
      icon: 'department' as const,
      color: 'purple' as const,
    },
    {
      label: 'Movements',
      value: area._count?.movements || 0,
      icon: 'movement' as const,
      color: 'orange' as const,
    },
    {
      label: 'Budget',
      value: area.budget ? formatCurrency(area.budget, area.currency) : 'No budget set',
      icon: 'budget' as const,
      color: 'green' as const,
    },
  ] : [];
</script>

<svelte:head>
  <title>{area ? area.name : 'Area Details'} - YL Portal</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <!-- Header -->
  <div class="mb-6">
    <div class="flex items-center gap-2 text-sm text-yl-gray-600 mb-2">
      <a href="/areas" class="hover:text-yl-green transition-colors">Areas</a>
      <span>/</span>
      <span class="text-yl-black">{area?.name || 'Loading...'}</span>
    </div>

    {#if isLoading}
      <div class="animate-pulse">
        <div class="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-600">{error}</p>
        <button
          on:click={() => goto('/areas')}
          class="mt-2 text-sm text-red-600 hover:text-red-700 underline"
        >
          Back to areas
        </button>
      </div>
    {:else if area}
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <h1 class="text-3xl font-bold text-yl-black">{area.name}</h1>
            <span class="px-3 py-1 text-sm font-mono font-medium bg-gray-100 text-yl-gray-700 rounded">
              {area.code}
            </span>
          </div>
          {#if area.description}
            <p class="text-yl-gray-600">{area.description}</p>
          {/if}
          <div class="flex items-center gap-4 mt-2 text-sm text-yl-gray-600">
            <span>Currency: <strong>{area.currency}</strong></span>
            <span>Created: {formatDate(area.createdAt)}</span>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            on:click={() => goto(`/areas/${areaId}/edit`)}
            class="px-4 py-2 text-sm font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green"
          >
            Edit
          </button>
          <button
            on:click={() => showDeleteDialog = true}
            class="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    {/if}
  </div>

  {#if area && !error}
    <!-- Statistics -->
    <div class="mb-8">
      <StatsGrid {stats} />
    </div>

    <!-- Assigned Users -->
    <div class="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-yl-black">Assigned Users</h2>
        <button
          on:click={handleAddUserClick}
          class="px-3 py-1.5 text-sm font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green"
        >
          Add User
        </button>
      </div>

      {#if showAddUser}
        <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium text-yl-black">Add User to Area</h3>
            <button
              on:click={() => showAddUser = false}
              class="text-yl-gray-500 hover:text-yl-gray-700"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <SearchDropdown
            users={unassignedUsers}
            isLoading={isLoadingUsers || isAssigningUser}
            placeholder="Search for users to add..."
            emptyMessage="All users are already assigned"
            on:select={handleUserSelect}
          />
        </div>
      {/if}

      {#if area.users && area.users.length > 0}
        <div class="space-y-2">
          {#each area.users as { user }}
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-yl-green-light flex items-center justify-center">
                  <span class="text-yl-green font-semibold text-sm">
                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p class="font-medium text-yl-black">{user.name || 'No name'}</p>
                  <p class="text-sm text-yl-gray-600">{user.email}</p>
                </div>
              </div>
              <button
                on:click={() => handleRemoveUserClick(user.id, user.name)}
                class="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-sm text-yl-gray-500 text-center py-4">
          No users assigned to this area yet. Click "Add User" to assign users.
        </p>
      {/if}
    </div>

    <!-- Departments -->
    <div class="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-yl-black">Departments</h2>
        <button
          on:click={() => goto(`/departments/new?areaId=${areaId}`)}
          class="px-3 py-1.5 text-sm font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green"
        >
          New Department
        </button>
      </div>

      {#if isLoadingDepartments}
        <div class="space-y-2">
          {#each [1, 2, 3] as _}
            <div class="animate-pulse h-16 bg-gray-200 rounded-lg"></div>
          {/each}
        </div>
      {:else if departments.length > 0}
        <div class="space-y-2">
          {#each departments as dept}
            <a
              href="/departments/{dept.id}"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div class="flex-1">
                <p class="font-medium text-yl-black">{dept.name}</p>
                <p class="text-sm text-yl-gray-600">Code: {dept.code}</p>
              </div>
              <div class="text-right text-sm">
                <p class="font-medium {
                  (dept.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }">
                  {formatCurrency(dept.balance || 0, area.currency)}
                </p>
                <p class="text-yl-gray-600">{dept._count?.movements || 0} movements</p>
              </div>
            </a>
          {/each}
        </div>
      {:else}
        <p class="text-sm text-yl-gray-500 text-center py-4">
          No departments in this area yet. Click "New Department" to create one.
        </p>
      {/if}
    </div>

    <!-- Recent Movements -->
    <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-yl-black">Recent Movements</h2>
        <a
          href="/movements?areaId={areaId}"
          class="text-sm text-yl-green hover:text-yl-green-dark font-medium"
        >
          View all →
        </a>
      </div>

      {#if isLoadingMovements}
        <div class="space-y-2">
          {#each [1, 2, 3] as _}
            <div class="animate-pulse h-16 bg-gray-200 rounded-lg"></div>
          {/each}
        </div>
      {:else if movements.length > 0}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">Type</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">Description</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">Amount</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each movements as movement}
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded {
                      movement.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }">
                      {movement.type}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-yl-gray-900">{movement.description}</td>
                  <td class="px-4 py-3 text-sm font-medium {
                    movement.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                  }">
                    {formatCurrency(movement.amount, area.currency)}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded {
                      movement.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      movement.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }">
                      {movement.status}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-yl-gray-600 whitespace-nowrap">
                    {formatDate(movement.transactionDate)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="text-sm text-yl-gray-500 text-center py-4">
          No movements in this area yet.
        </p>
      {/if}
    </div>
  {/if}
</div>

<!-- Delete Area Confirmation -->
<ConfirmDialog
  open={showDeleteDialog}
  title="Delete Area"
  message={`Are you sure you want to delete "${area?.name}"? This action cannot be undone. ${area?._count?.movements > 0 ? 'This area has movements and cannot be deleted.' : ''}`}
  confirmText={isDeleting ? 'Deleting...' : 'Delete'}
  cancelText="Cancel"
  variant="danger"
  onConfirm={handleDelete}
  onCancel={() => showDeleteDialog = false}
/>

<!-- Remove User Confirmation -->
<ConfirmDialog
  open={showRemoveUserDialog}
  title="Remove User"
  message={`Are you sure you want to remove ${userToRemove?.name || 'this user'} from "${area?.name}"?`}
  confirmText="Remove"
  cancelText="Cancel"
  variant="warning"
  onConfirm={confirmRemoveUser}
  onCancel={() => {
    showRemoveUserDialog = false;
    userToRemove = null;
  }}
/>
