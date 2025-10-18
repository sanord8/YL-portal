<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/authStore';
  import Button from '$lib/components/Button.svelte';

  $: token = $page.params.token;

  let isVerifying = true;
  let isSuccess = false;
  let errorMessage = '';

  onMount(async () => {
    if (!token || token.length < 32) {
      isVerifying = false;
      errorMessage = 'Invalid verification link';
      return;
    }

    // Verify email with token
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        errorMessage = data.message || 'Failed to verify email. The link may have expired.';
        isVerifying = false;
        return;
      }

      // Success!
      isSuccess = true;
      isVerifying = false;

      // Refresh auth state to update emailVerified
      await authStore.checkAuth();

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        goto('/');
      }, 3000);
    } catch (error) {
      console.error('Verify email error:', error);
      errorMessage = 'An error occurred while verifying your email. Please try again.';
      isVerifying = false;
    }
  });
</script>

<svelte:head>
  <title>Verify Email - YoungLife Portal</title>
</svelte:head>

<div class="min-h-[calc(100vh-4rem)] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Logo and Header -->
    <div class="text-center">
      <img
        src="/images/younglife-logo.svg"
        alt="YoungLife"
        class="h-16 mx-auto mb-6"
      />
      <h2 class="text-3xl font-bold text-yl-black">
        Email Verification
      </h2>
    </div>

    <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-6 sm:p-8">
      {#if isVerifying}
        <!-- Verifying State -->
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yl-green/10 mb-4">
            <svg class="animate-spin h-8 w-8 text-yl-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-yl-black mb-2">Verifying Your Email...</h3>
          <p class="text-sm text-yl-gray-600">
            Please wait while we verify your email address.
          </p>
        </div>
      {:else if isSuccess}
        <!-- Success State -->
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yl-green/10 mb-4">
            <svg class="h-8 w-8 text-yl-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-yl-black mb-2">Email Verified Successfully!</h3>
          <p class="text-sm text-yl-gray-600 mb-6">
            Your email has been verified. You now have full access to your account.
          </p>
          <p class="text-xs text-yl-gray-500 mb-4">
            Redirecting to dashboard...
          </p>
          <a href="/">
            <Button variant="primary" size="md" class="w-full">
              Go to Dashboard
            </Button>
          </a>
        </div>
      {:else}
        <!-- Error State -->
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg class="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-yl-black mb-2">Verification Failed</h3>
          <p class="text-sm text-yl-gray-600 mb-6">
            {errorMessage}
          </p>

          {#if $authStore.isAuthenticated}
            <div class="space-y-3">
              <p class="text-sm text-yl-gray-600">
                You can request a new verification link from your profile.
              </p>
              <a href="/profile">
                <Button variant="primary" size="md" class="w-full">
                  Go to Profile
                </Button>
              </a>
            </div>
          {:else}
            <a href="/login">
              <Button variant="primary" size="md" class="w-full">
                Go to Login
              </Button>
            </a>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
