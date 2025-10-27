<script lang="ts">
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc/client';
  import Button from '$lib/components/Button.svelte';
  import PasswordStrengthMeter from '$lib/components/PasswordStrengthMeter.svelte';

  // Form data
  let name = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let isAdmin = false;
  let emailVerified = false;

  // State
  let isSubmitting = false;
  let error = '';
  let fieldErrors: Record<string, string> = {};

  // Validation
  $: nameValid = name.trim().length >= 2;
  $: emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  $: passwordValid = password.length >= 8 &&
                     /[a-z]/.test(password) &&
                     /[A-Z]/.test(password) &&
                     /[0-9]/.test(password) &&
                     /[^a-zA-Z0-9]/.test(password);
  $: passwordsMatch = password === confirmPassword && password.length > 0;
  $: formValid = nameValid && emailValid && passwordValid && passwordsMatch;

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
    if (!passwordValid) {
      fieldErrors.password = 'Password does not meet requirements';
    }
    if (!passwordsMatch) {
      fieldErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    isSubmitting = true;

    try {
      await trpc.admin.users.create.mutate({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        isAdmin,
        emailVerified,
      });

      // Success - redirect to users list
      goto('/admin/users');
    } catch (err: any) {
      console.error('Failed to create user:', err);

      if (err?.data?.code === 'CONFLICT') {
        fieldErrors.email = 'A user with this email already exists';
      } else {
        error = err?.message || 'Failed to create user';
      }
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    goto('/admin/users');
  }
</script>

<svelte:head>
  <title>Create User - Admin - YL Portal</title>
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
    <h1 class="text-xl sm:text-2xl font-bold text-yl-black">Create New User</h1>
    <p class="text-sm text-yl-gray-600 mt-1">Add a new user account to the system</p>
  </div>

  <!-- Form -->
  <form on:submit|preventDefault={handleSubmit} class="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
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
        placeholder="Enter full name"
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
        placeholder="user@example.com"
        autocomplete="email"
        required
      />
      {#if fieldErrors.email}
        <p class="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
      {/if}
    </div>

    <!-- Password -->
    <div>
      <label for="password" class="block text-sm font-medium text-yl-gray-700 mb-1">
        Password <span class="text-red-500">*</span>
      </label>
      <input
        id="password"
        type="password"
        bind:value={password}
        disabled={isSubmitting}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        class:border-red-300={fieldErrors.password}
        placeholder="Enter a strong password"
        autocomplete="new-password"
        required
      />
      {#if fieldErrors.password}
        <p class="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
      {/if}

      <!-- Password Strength -->
      {#if password}
        <div class="mt-3">
          <PasswordStrengthMeter password={password} />
        </div>
      {/if}
    </div>

    <!-- Confirm Password -->
    <div>
      <label for="confirm-password" class="block text-sm font-medium text-yl-gray-700 mb-1">
        Confirm Password <span class="text-red-500">*</span>
      </label>
      <input
        id="confirm-password"
        type="password"
        bind:value={confirmPassword}
        disabled={isSubmitting}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        class:border-red-300={fieldErrors.confirmPassword}
        placeholder="Re-enter password"
        autocomplete="new-password"
        required
      />
      {#if confirmPassword && !passwordsMatch}
        <p class="text-xs text-red-600 mt-1">Passwords do not match</p>
      {:else if confirmPassword && passwordsMatch}
        <p class="text-xs text-green-600 mt-1">Passwords match</p>
      {/if}
      {#if fieldErrors.confirmPassword}
        <p class="text-xs text-red-600 mt-1">{fieldErrors.confirmPassword}</p>
      {/if}
    </div>

    <!-- Divider -->
    <div class="border-t border-gray-200 pt-6">
      <h3 class="text-sm font-medium text-yl-gray-900 mb-4">Permissions & Settings</h3>

      <!-- Admin Checkbox -->
      <div class="space-y-3">
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

        <!-- Email Verified Checkbox -->
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
              Mark this user's email as verified (user won't need to verify)
            </p>
          </div>
        </label>
      </div>
    </div>

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
        {isSubmitting ? 'Creating User...' : 'Create User'}
      </Button>
    </div>
  </form>
</div>
