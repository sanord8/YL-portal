<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc/client';
  import Button from '$lib/components/Button.svelte';
  import UserRoleBadge from '$lib/components/UserRoleBadge.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import InfoDialog from '$lib/components/InfoDialog.svelte';
  import ResetPasswordModal from '$lib/components/ResetPasswordModal.svelte';
  import { toastStore } from '$lib/stores/toastStore';

  // Pagination & Filters
  let page = 1;
  let pageSize = 20;
  let search = '';
  let includeDeleted = false;
  let isAdminFilter: boolean | undefined = undefined;

  // Data
  let users: any[] = [];
  let pagination = { page: 1, pageSize: 20, total: 0, totalPages: 0 };
  let isLoading = false;
  let error = '';

  // Modals
  let deleteDialogOpen = false;
  let restoreDialogOpen = false;
  let resetPasswordModalOpen = false;
  let passwordResetSuccessOpen = false;
  let selectedUser: any = null;

  // Actions
  let isDeleting = false;
  let isRestoring = false;
  let isResettingPassword = false;

  // Debounce search
  let searchTimeout: ReturnType<typeof setTimeout>;
  $: {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (page !== 1) page = 1;
      else loadUsers();
    }, 300);
    search; // Track dependency
  }

  // Reload on filter changes
  $: {
    if (page !== 1) page = 1;
    else loadUsers();
    includeDeleted;
    isAdminFilter;
  }

  // Reload on page change
  $: {
    loadUsers();
    page;
  }

  onMount(() => {
    loadUsers();
  });

  async function loadUsers() {
    isLoading = true;
    error = '';

    try {
      const result = await trpc.admin.users.list.query({
        page,
        pageSize,
        search: search.trim() || undefined,
        includeDeleted,
        isAdmin: isAdminFilter,
      });

      users = result.users;
      pagination = result.pagination;
    } catch (err: any) {
      console.error('Failed to load users:', err);
      error = err?.message || 'Failed to load users';
    } finally {
      isLoading = false;
    }
  }

  function openDeleteDialog(user: any) {
    selectedUser = user;
    deleteDialogOpen = true;
  }

  function openRestoreDialog(user: any) {
    selectedUser = user;
    restoreDialogOpen = true;
  }

  function openResetPasswordModal(user: any) {
    selectedUser = user;
    resetPasswordModalOpen = true;
  }

  async function handleDelete() {
    if (!selectedUser) return;

    isDeleting = true;
    try {
      await trpc.admin.users.delete.mutate({ id: selectedUser.id });
      deleteDialogOpen = false;
      selectedUser = null;
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      toastStore.add(err?.message || 'Failed to delete user', 'error');
    } finally {
      isDeleting = false;
    }
  }

  async function handleRestore() {
    if (!selectedUser) return;

    isRestoring = true;
    try {
      await trpc.admin.users.restore.mutate({ id: selectedUser.id });
      restoreDialogOpen = false;
      selectedUser = null;
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to restore user:', err);
      toastStore.add(err?.message || 'Failed to restore user', 'error');
    } finally {
      isRestoring = false;
    }
  }

  async function handleResetPassword(event: CustomEvent<{ password: string }>) {
    if (!selectedUser) return;

    isResettingPassword = true;
    try {
      await trpc.admin.users.resetPassword.mutate({
        id: selectedUser.id,
        newPassword: event.detail.password,
      });
      resetPasswordModalOpen = false;
      passwordResetSuccessOpen = true;
      selectedUser = null;
    } catch (err: any) {
      console.error('Failed to reset password:', err);
      toastStore.add(err?.message || 'Failed to reset password', 'error');
    } finally {
      isResettingPassword = false;
    }
  }

  function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
</script>

<svelte:head>
  <title>User Management - Admin - YL Portal</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-yl-black">User Management</h1>
      <p class="text-sm text-yl-gray-600 mt-1">Manage user accounts and permissions</p>
    </div>
    <Button variant="primary" size="md" on:click={() => goto('/admin/users/new')} class="w-full sm:w-auto">
      <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Create User
    </Button>
  </div>

  <!-- Filters -->
  <div class="bg-white rounded-lg shadow border border-gray-200 p-4">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- Search -->
      <div class="md:col-span-2">
        <label for="search" class="block text-sm font-medium text-yl-gray-700 mb-1">
          Search
        </label>
        <input
          id="search"
          type="text"
          bind:value={search}
          placeholder="Search by name or email..."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        />
      </div>

      <!-- Admin Filter -->
      <div>
        <label for="admin-filter" class="block text-sm font-medium text-yl-gray-700 mb-1">
          Role
        </label>
        <select
          id="admin-filter"
          bind:value={isAdminFilter}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        >
          <option value={undefined}>All Users</option>
          <option value={true}>Admins Only</option>
          <option value={false}>Non-Admins</option>
        </select>
      </div>

      <!-- Include Deleted -->
      <div class="flex items-end">
        <label class="flex items-center cursor-pointer">
          <input
            type="checkbox"
            bind:checked={includeDeleted}
            class="w-4 h-4 text-yl-green border-gray-300 rounded focus:ring-yl-green"
          />
          <span class="ml-2 text-sm text-yl-gray-700">Show deleted users</span>
        </label>
      </div>
    </div>
  </div>

  <!-- Users Table -->
  <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
    {#if isLoading}
      <div class="flex items-center justify-center p-12">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-yl-green border-t-transparent mb-2" />
          <p class="text-sm text-yl-gray-600">Loading users...</p>
        </div>
      </div>
    {:else if error}
      <div class="p-12 text-center">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p class="text-sm text-red-800">{error}</p>
          <Button variant="outline" size="sm" class="mt-4" on:click={loadUsers}>
            Retry
          </Button>
        </div>
      </div>
    {:else if users.length === 0}
      <div class="p-12 text-center">
        <svg class="w-12 h-12 text-yl-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p class="text-yl-gray-600">No users found</p>
      </div>
    {:else}
      <!-- Desktop Table View (hidden on mobile) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
          <thead class="bg-yl-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase tracking-wider">
                User
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase tracking-wider">
                Activity
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-700 uppercase tracking-wider">
                Created
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-yl-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each users as user}
              <tr class="hover:bg-gray-50 transition-colors">
                <!-- User -->
                <td class="px-6 py-4">
                  <div>
                    <p class="text-sm font-medium text-yl-black">{user.name}</p>
                    <p class="text-xs text-yl-gray-500">{user.email}</p>
                  </div>
                </td>

                <!-- Status -->
                <td class="px-6 py-4">
                  <UserRoleBadge
                    isAdmin={user.isAdmin}
                    emailVerified={user.emailVerified}
                    deletedAt={user.deletedAt}
                    size="sm"
                  />
                </td>

                <!-- Activity -->
                <td class="px-6 py-4">
                  <div class="text-xs text-yl-gray-600">
                    <p>{user._count.movements} movements</p>
                    <p>{user._count.userAreas} areas</p>
                  </div>
                </td>

                <!-- Created -->
                <td class="px-6 py-4">
                  <p class="text-xs text-yl-gray-600">{formatDate(user.createdAt)}</p>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    {#if !user.deletedAt}
                      <button
                        on:click={() => goto(`/admin/users/${user.id}/edit`)}
                        class="text-yl-green hover:text-yl-green-dark text-sm font-medium"
                        title="Edit user"
                      >
                        Edit
                      </button>
                      <button
                        on:click={() => openResetPasswordModal(user)}
                        class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        title="Reset password"
                      >
                        Reset Password
                      </button>
                      <button
                        on:click={() => openDeleteDialog(user)}
                        class="text-red-600 hover:text-red-800 text-sm font-medium"
                        title="Delete user"
                      >
                        Delete
                      </button>
                    {:else}
                      <button
                        on:click={() => openRestoreDialog(user)}
                        class="text-yl-green hover:text-yl-green-dark text-sm font-medium"
                        title="Restore user"
                      >
                        Restore
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Mobile Card View (visible only on mobile) -->
      <div class="md:hidden divide-y divide-gray-200">
        {#each users as user}
          <div class="p-4 hover:bg-gray-50 transition-colors">
            <!-- User Info -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <p class="text-sm font-medium text-yl-black">{user.name}</p>
                <p class="text-xs text-yl-gray-500 mt-0.5">{user.email}</p>
              </div>
              <UserRoleBadge
                isAdmin={user.isAdmin}
                emailVerified={user.emailVerified}
                deletedAt={user.deletedAt}
                size="sm"
              />
            </div>

            <!-- Stats -->
            <div class="flex gap-4 text-xs text-yl-gray-600 mb-3">
              <div>
                <span class="font-medium">{user._count.movements}</span> movements
              </div>
              <div>
                <span class="font-medium">{user._count.userAreas}</span> areas
              </div>
              <div class="ml-auto">
                {formatDate(user.createdAt)}
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-wrap gap-2">
              {#if !user.deletedAt}
                <button
                  on:click={() => goto(`/admin/users/${user.id}/edit`)}
                  class="flex-1 min-w-0 px-3 py-2 bg-yl-green text-white text-sm font-medium rounded-lg hover:bg-yl-green-dark transition-colors"
                >
                  Edit
                </button>
                <button
                  on:click={() => openResetPasswordModal(user)}
                  class="flex-1 min-w-0 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reset Password
                </button>
                <button
                  on:click={() => openDeleteDialog(user)}
                  class="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              {:else}
                <button
                  on:click={() => openRestoreDialog(user)}
                  class="w-full px-3 py-2 bg-yl-green text-white text-sm font-medium rounded-lg hover:bg-yl-green-dark transition-colors"
                >
                  Restore User
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <!-- Pagination -->
      {#if pagination.totalPages > 1}
        <div class="px-4 md:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p class="text-xs sm:text-sm text-yl-gray-600 text-center sm:text-left">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} users
          </p>
          <div class="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              on:click={() => page--}
              class="flex-1 sm:flex-none"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              on:click={() => page++}
              class="flex-1 sm:flex-none"
            >
              Next
            </Button>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
  open={deleteDialogOpen}
  title="Delete User"
  message="Are you sure you want to delete {selectedUser?.name}? This action can be reversed later."
  confirmText={isDeleting ? 'Deleting...' : 'Delete'}
  variant="danger"
  onConfirm={handleDelete}
  onCancel={() => { deleteDialogOpen = false; selectedUser = null; }}
/>

<!-- Restore Confirmation Dialog -->
<ConfirmDialog
  open={restoreDialogOpen}
  title="Restore User"
  message="Are you sure you want to restore {selectedUser?.name}?"
  confirmText={isRestoring ? 'Restoring...' : 'Restore'}
  variant="info"
  onConfirm={handleRestore}
  onCancel={() => { restoreDialogOpen = false; selectedUser = null; }}
/>

<!-- Reset Password Modal -->
<ResetPasswordModal
  open={resetPasswordModalOpen}
  userName={selectedUser?.name || ''}
  isLoading={isResettingPassword}
  on:confirm={handleResetPassword}
  on:cancel={() => { resetPasswordModalOpen = false; selectedUser = null; }}
/>

<!-- Password Reset Success Dialog -->
<InfoDialog
  open={passwordResetSuccessOpen}
  title="Password Reset Successful"
  message="The password has been reset successfully. The user has been logged out from all devices and can now log in with their new password."
  variant="success"
  okText="OK"
  onOk={() => { passwordResetSuccessOpen = false; }}
/>
