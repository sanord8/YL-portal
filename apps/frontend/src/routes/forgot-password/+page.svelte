<script lang="ts">
  import FormInput from '$lib/components/FormInput.svelte';
  import Button from '$lib/components/Button.svelte';

  let email = '';
  let errors: { email?: string; general?: string } = {};
  let isLoading = false;
  let isSuccess = false;

  async function handleSubmit(event: Event) {
    event.preventDefault();
    errors = {};
    isLoading = true;
    isSuccess = false;

    // Basic validation
    if (!email) {
      errors.email = 'Email is required';
      isLoading = false;
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
      isLoading = false;
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        errors.general = data.message || 'Failed to send reset email. Please try again.';
        isLoading = false;
        return;
      }

      // Show success message
      isSuccess = true;
      isLoading = false;
    } catch (error) {
      console.error('Forgot password error:', error);
      errors.general = 'An error occurred. Please try again.';
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Forgot Password - YoungLife Portal</title>
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
        Forgot Password?
      </h2>
      <p class="mt-2 text-sm text-yl-gray-600">
        Enter your email and we'll send you a link to reset your password
      </p>
    </div>

    {#if isSuccess}
      <!-- Success Message -->
      <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-6 sm:p-8">
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yl-green/10 mb-4">
            <svg class="h-8 w-8 text-yl-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-yl-black mb-2">Check Your Email</h3>
          <p class="text-sm text-yl-gray-600 mb-4">
            If an account with that email exists, we've sent password reset instructions to <strong>{email}</strong>
          </p>
          <p class="text-xs text-yl-gray-500 mb-6">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <a href="/login">
            <Button variant="primary" size="md" class="w-full">
              Return to Login
            </Button>
          </a>
        </div>
      </div>
    {:else}
      <!-- Reset Form -->
      <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-6 sm:p-8">
        <form on:submit={handleSubmit} class="space-y-6">
          <!-- Email Input -->
          <FormInput
            label="Email Address"
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            error={errors.email}
            required
            autocomplete="email"
          />

          <!-- Error Message -->
          {#if errors.general}
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
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

          <!-- Submit Button -->
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isLoading}
            class="w-full"
          >
            {#if isLoading}
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending Reset Link...
            {:else}
              Send Reset Link
            {/if}
          </Button>
        </form>
      </div>
    {/if}

    <!-- Back to Login Link -->
    <p class="text-center text-sm text-yl-gray-600">
      Remember your password?
      <a
        href="/login"
        class="font-semibold text-yl-green hover:text-yl-green-accent transition-colors"
      >
        Sign in
      </a>
    </p>
  </div>
</div>
