<script lang="ts">
  import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import Button from '$lib/components/Button.svelte';
  import { authStore } from '$lib/stores/authStore';
  import { trpc } from '$lib/trpc';

  $: user = $authStore.user;

  let isEditing = false;
  let editedName = '';
  let editedEmail = '';
  let errors: { name?: string; email?: string; general?: string } = {};
  let isLoading = false;
  let successMessage = '';

  function startEditing() {
    if (user) {
      editedName = user.name;
      editedEmail = user.email;
      isEditing = true;
      errors = {};
      successMessage = '';
    }
  }

  function cancelEditing() {
    isEditing = false;
    errors = {};
    successMessage = '';
  }

  async function handleSave() {
    errors = {};
    successMessage = '';
    isLoading = true;

    // Validation
    if (!editedName || editedName.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!editedEmail) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editedEmail)) {
      errors.email = 'Please enter a valid email';
    }

    if (Object.keys(errors).length > 0) {
      isLoading = false;
      return;
    }

    try {
      // Update profile via tRPC
      const updatedUser = await trpc.user.updateProfile.mutate({
        name: editedName,
        email: editedEmail,
      });

      // Update the auth store with new user data
      if (user) {
        authStore.updateUser({
          ...user,
          name: updatedUser.name,
          email: updatedUser.email,
          emailVerified: updatedUser.emailVerified,
        });
      }

      successMessage = 'Profile updated successfully';
      isEditing = false;
      isLoading = false;
    } catch (error: any) {
      console.error('Update profile error:', error);
      errors.general = error.message || 'An error occurred while updating your profile';
      isLoading = false;
    }
  }

  function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
</script>

<ProtectedRoute>
  <svelte:head>
    <title>Profile - YoungLife Portal</title>
  </svelte:head>

  <div class="max-w-4xl mx-auto">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-yl-black mb-2">Profile</h1>
      <p class="text-yl-gray-600">Manage your account information</p>
    </div>

    <!-- Profile Card -->
    <div class="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <!-- Header with Avatar -->
      <div class="bg-gradient-to-r from-yl-green to-yl-green-accent p-8">
        <div class="flex items-center space-x-4">
          <div
            class="w-20 h-20 rounded-full bg-white flex items-center justify-center text-yl-green font-bold text-2xl shadow-lg"
          >
            {user
              ? user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : ''}
          </div>
          <div>
            <h2 class="text-2xl font-bold text-white">{user?.name || 'User'}</h2>
            <p class="text-white/90 text-sm">{user?.email || ''}</p>
          </div>
        </div>
      </div>

      <!-- Profile Information -->
      <div class="p-8">
        {#if successMessage}
          <div class="mb-6 bg-yl-green/10 border border-yl-green rounded-lg p-4">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-yl-green" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <p class="text-sm text-yl-green-dark font-medium">{successMessage}</p>
            </div>
          </div>
        {/if}

        {#if errors.general}
          <div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
              <p class="text-sm text-red-800">{errors.general}</p>
            </div>
          </div>
        {/if}

        {#if isEditing}
          <!-- Edit Mode -->
          <div class="space-y-6">
            <FormInput
              label="Full Name"
              type="text"
              bind:value={editedName}
              error={errors.name}
              required
              autocomplete="name"
            />

            <FormInput
              label="Email Address"
              type="email"
              bind:value={editedEmail}
              error={errors.email}
              required
              autocomplete="email"
            />

            <div class="flex items-center space-x-4 pt-4">
              <Button
                variant="primary"
                size="md"
                on:click={handleSave}
                disabled={isLoading}
              >
                {#if isLoading}
                  <svg
                    class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                {:else}
                  Save Changes
                {/if}
              </Button>
              <Button variant="secondary" size="md" on:click={cancelEditing} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </div>
        {:else}
          <!-- View Mode -->
          <div class="space-y-6">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-yl-gray-700 mb-2">Full Name</label>
              <p class="text-yl-black text-lg">{user?.name || 'N/A'}</p>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-yl-gray-700 mb-2">Email Address</label>
              <div class="flex items-center space-x-2">
                <p class="text-yl-black text-lg">{user?.email || 'N/A'}</p>
                {#if user?.emailVerified}
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yl-green/10 text-yl-green"
                  >
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    Verified
                  </span>
                {:else}
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                  >
                    Not Verified
                  </span>
                {/if}
              </div>
            </div>

            <!-- Account Created -->
            <div>
              <label class="block text-sm font-medium text-yl-gray-700 mb-2">Member Since</label>
              <p class="text-yl-black text-lg">
                {user?.createdAt ? formatDate(user.createdAt) : 'N/A'}
              </p>
            </div>

            <!-- Two-Factor Authentication -->
            <div>
              <label class="block text-sm font-medium text-yl-gray-700 mb-2"
                >Two-Factor Authentication</label
              >
              <p class="text-yl-black text-lg">
                {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>

            <div class="pt-4">
              <Button variant="primary" size="md" on:click={startEditing}>
                Edit Profile
              </Button>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Additional Sections -->
    <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Security Card -->
      <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-yl-black mb-4">Security</h3>
        <ul class="space-y-3">
          <li>
            <a
              href="/settings/password"
              class="text-yl-green hover:text-yl-green-accent transition-colors font-medium flex items-center"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Change Password
            </a>
          </li>
          <li>
            <a
              href="/settings/2fa"
              class="text-yl-green hover:text-yl-green-accent transition-colors font-medium flex items-center"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Two-Factor Authentication
            </a>
          </li>
        </ul>
      </div>

      <!-- Preferences Card -->
      <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-yl-black mb-4">Preferences</h3>
        <ul class="space-y-3">
          <li>
            <a
              href="/settings/notifications"
              class="text-yl-green hover:text-yl-green-accent transition-colors font-medium flex items-center"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              Notification Settings
            </a>
          </li>
          <li>
            <a
              href="/settings/privacy"
              class="text-yl-green hover:text-yl-green-accent transition-colors font-medium flex items-center"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Privacy Settings
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</ProtectedRoute>
