<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc/client';
  import Button from '$lib/components/Button.svelte';
  import UserRoleBadge from '$lib/components/UserRoleBadge.svelte';

  // Get user ID from route params
  $: userId = $page.params.id;

  // Form data
  let name = '';
  let email = '';
  let isAdmin = false;
  let emailVerified = false;
  let twoFactorEnabled = false;

  // Original data for comparison
  let originalData: any = null;

  // State
  let isLoading = true;
  let isSubmitting = false;
  let error = '';
  let fieldErrors: Record<string, string> = {};

  // Area assignment state
  let availableAreas: any[] = [];
  let selectedAreaId = '';
  let isLoadingAreas = false;
  let isAssigningArea = false;
  let isUnassigningArea = false;
  let areaError = '';

  // Track changes
  $: hasChanges = originalData && (
    name.trim() !== originalData.name ||
    email.toLowerCase().trim() !== originalData.email ||
    isAdmin !== originalData.isAdmin ||
    emailVerified !== originalData.emailVerified ||
    twoFactorEnabled !== originalData.twoFactorEnabled
  );

  // Validation
  $: nameValid = name.trim().length >= 2;
  $: emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  $: formValid = nameValid && emailValid && hasChanges;

  // Get unassigned areas (areas not yet assigned to this user)
  $: unassignedAreas = availableAreas.filter(
    (area) => !originalData?.userAreas?.some((ua: any) => ua.areaId === area.id)
  );

  onMount(async () => {
    await loadUser();
    await loadAvailableAreas();
  });

  async function loadUser() {
    isLoading = true;
    error = '';

    try {
      const user = await trpc.admin.users.getById.query({ id: userId });

      originalData = {
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt,
        userAreas: user.userAreas,
      };

      name = user.name;
      email = user.email;
      isAdmin = user.isAdmin;
      emailVerified = user.emailVerified;
      twoFactorEnabled = user.twoFactorEnabled;
    } catch (err: any) {
      console.error('Failed to load user:', err);
      error = err?.message || 'Failed to load user';
    } finally {
      isLoading = false;
    }
  }

  async function handleSubmit() {
    // Clear errors
    error = '';
    fieldErrors = {};

    // Validate
    if (!nameValid) {
      fieldErrors.name = 'Name must be at least 2 characters';
    }
    if (!emailValid) {
      fieldErrors.email = 'Please enter a valid email address';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    isSubmitting = true;

    try {
      // Build update object with only changed fields
      const updates: any = { id: userId };

      if (name.trim() !== originalData.name) {
        updates.name = name.trim();
      }
      if (email.toLowerCase().trim() !== originalData.email) {
        updates.email = email.toLowerCase().trim();
      }
      if (isAdmin !== originalData.isAdmin) {
        updates.isAdmin = isAdmin;
      }
      if (emailVerified !== originalData.emailVerified) {
        updates.emailVerified = emailVerified;
      }
      if (twoFactorEnabled !== originalData.twoFactorEnabled) {
        updates.twoFactorEnabled = twoFactorEnabled;
      }

      await trpc.admin.users.update.mutate(updates);

      // Success - redirect to users list
      goto('/admin/users');
    } catch (err: any) {
      console.error('Failed to update user:', err);

      if (err?.data?.code === 'CONFLICT') {
        fieldErrors.email = 'A user with this email already exists';
      } else if (err?.data?.code === 'NOT_FOUND') {
        error = 'User not found';
      } else if (err?.data?.code === 'BAD_REQUEST') {
        error = err?.message || 'Invalid request';
      } else {
        error = err?.message || 'Failed to update user';
      }
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    goto('/admin/users');
  }

  function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async function loadAvailableAreas() {
    try {
      isLoadingAreas = true;
      availableAreas = await trpc.area.listAll.query();
    } catch (err: any) {
      console.error('Failed to load areas:', err);
      areaError = 'Failed to load available areas';
    } finally {
      isLoadingAreas = false;
    }
  }

  async function handleAssignArea() {
    if (!selectedAreaId) return;

    try {
      isAssigningArea = true;
      areaError = '';

      await trpc.area.assignUser.mutate({
        areaId: selectedAreaId,
        userId: userId,
      });

      // Reload user data to refresh assigned areas
      await loadUser();

      // Reset selection
      selectedAreaId = '';
    } catch (err: any) {
      console.error('Failed to assign area:', err);
      areaError = err?.message || 'Failed to assign area to user';
    } finally {
      isAssigningArea = false;
    }
  }

  async function handleUnassignArea(areaId: string) {
    try {
      isUnassigningArea = true;
      areaError = '';

      await trpc.area.unassignUser.mutate({
        areaId: areaId,
        userId: userId,
      });

      // Reload user data to refresh assigned areas
      await loadUser();
    } catch (err: any) {
      console.error('Failed to unassign area:', err);
      areaError = err?.message || 'Failed to remove area from user';
    } finally {
      isUnassigningArea = false;
    }
  }
</script>

<svelte:head>
  <title>Edit User - Admin - YL Portal</title>
</svelte:head>

<div class="max-w-2xl px-4 sm:px-0">
  <!-- Header -->
  <div class="mb-6">
    <button
      on:click={handleCancel}
      class="text-sm text-yl-gray-600 hover:text-yl-gray-900 mb-2 flex items-center touch-manipulation"
    >
      <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Users
    </button>
    <h1 class="text-xl sm:text-2xl font-bold text-yl-black">Edit User</h1>
    <p class="text-sm text-yl-gray-600 mt-1">Update user account details and permissions</p>
  </div>

  {#if isLoading}
    <div class="bg-white rounded-lg shadow border border-gray-200 p-12">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-yl-green border-t-transparent mb-2" />
        <p class="text-sm text-yl-gray-600">Loading user...</p>
      </div>
    </div>
  {:else if error && !originalData}
    <div class="bg-white rounded-lg shadow border border-gray-200 p-12">
      <div class="text-center">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p class="text-sm text-red-800">{error}</p>
          <div class="flex gap-3 mt-4 justify-center">
            <Button variant="outline" size="sm" on:click={loadUser}>
              Retry
            </Button>
            <Button variant="outline" size="sm" on:click={handleCancel}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  {:else if originalData}
    <!-- Form -->
    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <!-- User Info Card -->
      <div class="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1 min-w-0">
            <h2 class="text-base sm:text-lg font-semibold text-yl-black">User Information</h2>
            <p class="text-xs text-yl-gray-500 mt-1 truncate">ID: {userId}</p>
          </div>
          <UserRoleBadge
            isAdmin={originalData.isAdmin}
            emailVerified={originalData.emailVerified}
            deletedAt={originalData.deletedAt}
            size="sm"
          />
        </div>

        <!-- Metadata -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs text-yl-gray-600 pb-4 border-b border-gray-200">
          <div>
            <span class="font-medium">Created:</span> {formatDate(originalData.createdAt)}
          </div>
          <div>
            <span class="font-medium">Last Updated:</span> {formatDate(originalData.updatedAt)}
          </div>
          <div>
            <span class="font-medium">Areas:</span> {originalData.userAreas.length}
          </div>
        </div>
      </div>

      <!-- Edit Form -->
      <div class="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
        <!-- General Error -->
        {#if error}
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex">
              <svg class="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <p class="text-sm text-red-800">{error}</p>
            </div>
          </div>
        {/if}

        <!-- Name -->
        <div>
          <label for="name" class="block text-sm font-medium text-yl-gray-700 mb-1">
            Full Name <span class="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            bind:value={name}
            disabled={isSubmitting}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            class:border-red-300={fieldErrors.name}
            required
          />
          {#if fieldErrors.name}
            <p class="text-xs text-red-600 mt-1">{fieldErrors.name}</p>
          {/if}
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-yl-gray-700 mb-1">
            Email Address <span class="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            disabled={isSubmitting}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            class:border-red-300={fieldErrors.email}
            autocomplete="email"
            required
          />
          {#if fieldErrors.email}
            <p class="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
          {/if}
        </div>

        <!-- Divider -->
        <div class="border-t border-gray-200 pt-6">
          <h3 class="text-sm font-medium text-yl-gray-900 mb-4">Permissions & Settings</h3>

          <!-- Checkboxes -->
          <div class="space-y-3">
            <!-- Admin -->
            <label class="flex items-start cursor-pointer">
              <input
                type="checkbox"
                bind:checked={isAdmin}
                disabled={isSubmitting}
                class="w-4 h-4 mt-0.5 text-yl-green border-gray-300 rounded focus:ring-yl-green disabled:cursor-not-allowed"
              />
              <div class="ml-3">
                <span class="text-sm font-medium text-yl-gray-900">Administrator</span>
                <p class="text-xs text-yl-gray-500">
                  Grant full admin access including user management and system settings
                </p>
              </div>
            </label>

            <!-- Email Verified -->
            <label class="flex items-start cursor-pointer">
              <input
                type="checkbox"
                bind:checked={emailVerified}
                disabled={isSubmitting}
                class="w-4 h-4 mt-0.5 text-yl-green border-gray-300 rounded focus:ring-yl-green disabled:cursor-not-allowed"
              />
              <div class="ml-3">
                <span class="text-sm font-medium text-yl-gray-900">Email Verified</span>
                <p class="text-xs text-yl-gray-500">
                  Mark this user's email as verified
                </p>
              </div>
            </label>

            <!-- Two-Factor -->
            <label class="flex items-start cursor-pointer">
              <input
                type="checkbox"
                bind:checked={twoFactorEnabled}
                disabled={isSubmitting}
                class="w-4 h-4 mt-0.5 text-yl-green border-gray-300 rounded focus:ring-yl-green disabled:cursor-not-allowed"
              />
              <div class="ml-3">
                <span class="text-sm font-medium text-yl-gray-900">Two-Factor Authentication</span>
                <p class="text-xs text-yl-gray-500">
                  Enable or disable 2FA for this user
                </p>
              </div>
            </label>
          </div>
        </div>

        <!-- Changes Warning -->
        {#if hasChanges}
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p class="text-xs text-blue-800">
              <strong>Note:</strong> You have unsaved changes
            </p>
          </div>
        {/if}

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            size="md"
            class="flex-1 order-2 sm:order-1"
            on:click={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            class="flex-1 order-1 sm:order-2"
            disabled={!formValid || isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <!-- User Areas -->
      <div class="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
        <h3 class="text-sm font-medium text-yl-gray-900 mb-4">Area Assignments</h3>

        <!-- Area Error -->
        {#if areaError}
          <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p class="text-xs text-red-800">{areaError}</p>
          </div>
        {/if}

        <!-- Assign New Area -->
        <div class="mb-6 pb-6 border-b border-gray-200">
          <label for="areaSelect" class="block text-xs font-medium text-yl-gray-700 mb-2">
            Assign New Area
          </label>
          <div class="flex gap-2">
            <select
              id="areaSelect"
              bind:value={selectedAreaId}
              disabled={isLoadingAreas || isAssigningArea}
              class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {#if isLoadingAreas}
                  Loading areas...
                {:else if unassignedAreas.length === 0}
                  All areas assigned
                {:else}
                  Select an area...
                {/if}
              </option>
              {#each unassignedAreas as area}
                <option value={area.id}>{area.name} ({area.code})</option>
              {/each}
            </select>
            <Button
              type="button"
              variant="primary"
              size="md"
              on:click={handleAssignArea}
              disabled={!selectedAreaId || isAssigningArea || isLoadingAreas}
              loading={isAssigningArea}
            >
              {#if isAssigningArea}
                Adding...
              {:else}
                Add
              {/if}
            </Button>
          </div>
        </div>

        <!-- Assigned Areas List -->
        {#if originalData.userAreas && originalData.userAreas.length > 0}
          <div class="space-y-2">
            {#each originalData.userAreas as userArea}
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg gap-2">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-yl-black">
                    {userArea.area.name} ({userArea.area.code})
                  </p>
                  <p class="text-xs text-yl-gray-600">
                    {userArea.role.name} • {userArea.areaRole}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  on:click={() => handleUnassignArea(userArea.areaId)}
                  disabled={isUnassigningArea}
                  class="flex-shrink-0"
                >
                  Remove
                </Button>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-sm text-yl-gray-600 text-center py-4">No areas assigned yet</p>
        {/if}
      </div>
    </form>
  {/if}
</div>
