<script lang="ts">
  import FormInput from '$lib/components/FormInput.svelte';
  import Button from '$lib/components/Button.svelte';
  import { authStore } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let rememberMe = false;
  let errors: { email?: string; password?: string; general?: string } = {};
  let isLoading = false;

  async function handleSubmit(event: Event) {
    event.preventDefault();
    errors = {};
    isLoading = true;

    // Basic validation
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (Object.keys(errors).length > 0) {
      isLoading = false;
      return;
    }

    // Use auth store to handle login
    const result = await authStore.login(email, password, rememberMe);

    if (result.success) {
      // Redirect to dashboard on success
      goto('/');
    } else {
      errors.general = result.error || 'Login failed. Please try again.';
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Login - YoungLife Portal</title>
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
        Welcome Back
      </h2>
      <p class="mt-2 text-sm text-yl-gray-600">
        Sign in to your YoungLife Portal account
      </p>
    </div>

    <!-- Login Form -->
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

        <!-- Password Input -->
        <FormInput
          label="Password"
          type="password"
          bind:value={password}
          placeholder="Enter your password"
          error={errors.password}
          required
          autocomplete="current-password"
        />

        <!-- Remember Me & Forgot Password -->
        <div class="flex items-center justify-between">
          <label class="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={rememberMe}
              class="w-4 h-4 text-yl-green border-yl-gray-300 rounded focus:ring-yl-green focus:ring-2"
            />
            <span class="text-sm text-yl-gray-700">Remember me</span>
          </label>

          <a
            href="/forgot-password"
            class="text-sm text-yl-green hover:text-yl-green-accent font-medium transition-colors"
          >
            Forgot password?
          </a>
        </div>

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
            Signing in...
          {:else}
            Sign In
          {/if}
        </Button>
      </form>
    </div>

    <!-- Sign Up Link -->
    <p class="text-center text-sm text-yl-gray-600">
      Don't have an account?
      <a
        href="/register"
        class="font-semibold text-yl-green hover:text-yl-green-accent transition-colors"
      >
        Create an account
      </a>
    </p>
  </div>
</div>
