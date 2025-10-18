<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import Button from '$lib/components/Button.svelte';

  $: token = $page.params.token;

  let password = '';
  let confirmPassword = '';
  let errors: {
    password?: string;
    confirmPassword?: string;
    general?: string;
  } = {};
  let isLoading = false;
  let isSuccess = false;
  let isValidToken = true;

  // Password strength indicator
  $: passwordStrength = getPasswordStrength(password);

  function getPasswordStrength(pwd: string): { strength: number; label: string; color: string } {
    if (!pwd) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z\d]/.test(pwd)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength, label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { strength, label: 'Good', color: 'bg-blue-500' };
    return { strength, label: 'Strong', color: 'bg-yl-green' };
  }

  onMount(() => {
    // Validate token format (basic check)
    if (!token || token.length < 32) {
      isValidToken = false;
      errors.general = 'Invalid or expired reset link';
    }
  });

  async function handleSubmit(event: Event) {
    event.preventDefault();
    errors = {};
    isLoading = true;

    // Validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'Password must contain at least one lowercase letter';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one number';
    } else if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.password = 'Password must contain at least one special character';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      isLoading = false;
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        errors.general = data.message || 'Failed to reset password. Please try again.';
        isLoading = false;
        return;
      }

      // Show success and redirect to login
      isSuccess = true;
      isLoading = false;

      // Redirect to login after 3 seconds
      setTimeout(() => {
        goto('/login');
      }, 3000);
    } catch (error) {
      console.error('Reset password error:', error);
      errors.general = 'An error occurred. Please try again.';
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Reset Password - YoungLife Portal</title>
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
        Reset Your Password
      </h2>
      <p class="mt-2 text-sm text-yl-gray-600">
        Enter your new password below
      </p>
    </div>

    {#if !isValidToken}
      <!-- Invalid Token Message -->
      <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-6 sm:p-8">
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg class="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-yl-black mb-2">Invalid Reset Link</h3>
          <p class="text-sm text-yl-gray-600 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <a href="/forgot-password">
            <Button variant="primary" size="md" class="w-full">
              Request New Reset Link
            </Button>
          </a>
        </div>
      </div>
    {:else if isSuccess}
      <!-- Success Message -->
      <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-6 sm:p-8">
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yl-green/10 mb-4">
            <svg class="h-8 w-8 text-yl-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-yl-black mb-2">Password Reset Successfully!</h3>
          <p class="text-sm text-yl-gray-600 mb-6">
            Your password has been reset. You can now log in with your new password.
          </p>
          <p class="text-xs text-yl-gray-500 mb-4">
            Redirecting to login page...
          </p>
          <a href="/login">
            <Button variant="primary" size="md" class="w-full">
              Go to Login
            </Button>
          </a>
        </div>
      </div>
    {:else}
      <!-- Reset Form -->
      <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-6 sm:p-8">
        <form on:submit={handleSubmit} class="space-y-5">
          <!-- Password Input -->
          <div>
            <FormInput
              label="New Password"
              type="password"
              bind:value={password}
              placeholder="Create a strong password"
              error={errors.password}
              required
              autocomplete="new-password"
            />

            <!-- Password Strength Indicator -->
            {#if password}
              <div class="mt-2">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs text-yl-gray-600">Password Strength:</span>
                  <span class="text-xs font-semibold text-yl-black">{passwordStrength.label}</span>
                </div>
                <div class="w-full h-2 bg-yl-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full transition-all duration-300 {passwordStrength.color}"
                    style="width: {(passwordStrength.strength / 5) * 100}%"
                  />
                </div>
              </div>
            {/if}
          </div>

          <!-- Confirm Password Input -->
          <FormInput
            label="Confirm New Password"
            type="password"
            bind:value={confirmPassword}
            placeholder="Re-enter your password"
            error={errors.confirmPassword}
            required
            autocomplete="new-password"
          />

          <!-- Password Requirements -->
          <div class="bg-yl-gray-50 border border-yl-gray-200 rounded-lg p-4">
            <p class="text-xs font-semibold text-yl-black mb-2">Password must contain:</p>
            <ul class="text-xs text-yl-gray-600 space-y-1">
              <li class="flex items-center">
                <svg class="w-3 h-3 mr-2 {password.length >= 8 ? 'text-yl-green' : 'text-yl-gray-400'}" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                At least 8 characters
              </li>
              <li class="flex items-center">
                <svg class="w-3 h-3 mr-2 {/[a-z]/.test(password) ? 'text-yl-green' : 'text-yl-gray-400'}" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                One lowercase letter
              </li>
              <li class="flex items-center">
                <svg class="w-3 h-3 mr-2 {/[A-Z]/.test(password) ? 'text-yl-green' : 'text-yl-gray-400'}" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                One uppercase letter
              </li>
              <li class="flex items-center">
                <svg class="w-3 h-3 mr-2 {/[0-9]/.test(password) ? 'text-yl-green' : 'text-yl-gray-400'}" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                One number
              </li>
              <li class="flex items-center">
                <svg class="w-3 h-3 mr-2 {/[^a-zA-Z0-9]/.test(password) ? 'text-yl-green' : 'text-yl-gray-400'}" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                One special character
              </li>
            </ul>
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
              Resetting Password...
            {:else}
              Reset Password
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
