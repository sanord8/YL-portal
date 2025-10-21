<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from './Button.svelte';
  import PasswordStrengthMeter from './PasswordStrengthMeter.svelte';

  export let open = false;
  export let userName = '';
  export let isLoading = false;

  const dispatch = createEventDispatcher<{
    confirm: { password: string };
    cancel: void;
  }>();

  let newPassword = '';
  let confirmPassword = '';
  let error = '';

  $: passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;
  $: passwordValid = newPassword.length >= 8 &&
                     /[a-z]/.test(newPassword) &&
                     /[A-Z]/.test(newPassword) &&
                     /[0-9]/.test(newPassword) &&
                     /[^a-zA-Z0-9]/.test(newPassword);
  $: canSubmit = passwordValid && passwordsMatch && !isLoading;

  function handleSubmit() {
    error = '';

    if (!passwordValid) {
      error = 'Password does not meet requirements';
      return;
    }

    if (!passwordsMatch) {
      error = 'Passwords do not match';
      return;
    }

    dispatch('confirm', { password: newPassword });
  }

  function handleCancel() {
    newPassword = '';
    confirmPassword = '';
    error = '';
    dispatch('cancel');
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !isLoading) {
      handleCancel();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !isLoading) {
      handleCancel();
    } else if (event.key === 'Enter' && canSubmit) {
      handleSubmit();
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 overflow-y-auto"
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <!-- Backdrop -->
    <button
      type="button"
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity cursor-default"
      on:click={handleBackdropClick}
      tabindex="-1"
      aria-label="Close dialog"
      disabled={isLoading}
    />

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div
        class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all"
      >
        <!-- Icon -->
        <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100">
          <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>

        <!-- Title -->
        <h3 id="modal-title" class="text-lg font-semibold text-yl-black text-center mb-2">
          Reset Password
        </h3>

        <!-- Description -->
        <p class="text-sm text-yl-gray-600 text-center mb-6">
          Set a new password for <strong>{userName}</strong>
        </p>

        <!-- Form -->
        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
          <!-- New Password -->
          <div>
            <label for="new-password" class="block text-sm font-medium text-yl-gray-700 mb-1">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              bind:value={newPassword}
              disabled={isLoading}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              autocomplete="new-password"
              required
            />
          </div>

          <!-- Password Strength Meter -->
          {#if newPassword}
            <PasswordStrengthMeter password={newPassword} />
          {/if}

          <!-- Confirm Password -->
          <div>
            <label for="confirm-password" class="block text-sm font-medium text-yl-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              bind:value={confirmPassword}
              disabled={isLoading}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              autocomplete="new-password"
              required
            />
            {#if confirmPassword && !passwordsMatch}
              <p class="text-xs text-red-600 mt-1">Passwords do not match</p>
            {:else if confirmPassword && passwordsMatch}
              <p class="text-xs text-green-600 mt-1">Passwords match</p>
            {/if}
          </div>

          <!-- Error Message -->
          {#if error}
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
              <p class="text-sm text-red-800">{error}</p>
            </div>
          {/if}

          <!-- Warning -->
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p class="text-xs text-yellow-800">
              <strong>Warning:</strong> This will log out the user from all devices and invalidate all existing sessions.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              class="flex-1"
              on:click={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              class="flex-1"
              disabled={!canSubmit}
              loading={isLoading}
            >
              Reset Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
