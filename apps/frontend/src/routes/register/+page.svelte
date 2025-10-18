<script lang="ts">
  import FormInput from '$lib/components/FormInput.svelte';
  import Button from '$lib/components/Button.svelte';
  import { authStore } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';

  let name = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let acceptTerms = false;
  let errors: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    general?: string;
  } = {};
  let isLoading = false;

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

  async function handleSubmit(event: Event) {
    event.preventDefault();
    errors = {};
    isLoading = true;

    // Validation
    if (!name || name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

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

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptTerms) {
      errors.terms = 'You must accept the terms and conditions';
    }

    if (Object.keys(errors).length > 0) {
      isLoading = false;
      return;
    }

    // Use auth store to handle registration
    const result = await authStore.register(name, email, password);

    if (result.success) {
      // Redirect to dashboard on success
      goto('/');
    } else {
      errors.general = result.error || 'Registration failed. Please try again.';
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Create Account - YoungLife Portal</title>
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
        Create Your Account
      </h2>
      <p class="mt-2 text-sm text-yl-gray-600">
        Join YoungLife Portal to manage your finances
      </p>
    </div>

    <!-- Registration Form -->
    <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-6 sm:p-8">
      <form on:submit={handleSubmit} class="space-y-5">
        <!-- Name Input -->
        <FormInput
          label="Full Name"
          type="text"
          bind:value={name}
          placeholder="John Doe"
          error={errors.name}
          required
          autocomplete="name"
        />

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
        <div>
          <FormInput
            label="Password"
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
          label="Confirm Password"
          type="password"
          bind:value={confirmPassword}
          placeholder="Re-enter your password"
          error={errors.confirmPassword}
          required
          autocomplete="new-password"
        />

        <!-- Terms and Conditions -->
        <div>
          <label class="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={acceptTerms}
              class="w-4 h-4 mt-1 text-yl-green border-yl-gray-300 rounded focus:ring-yl-green focus:ring-2"
            />
            <span class="text-sm text-yl-gray-700">
              I agree to the <a href="/terms" class="text-yl-green hover:text-yl-green-accent font-medium">Terms and Conditions</a>
              and <a href="/privacy" class="text-yl-green hover:text-yl-green-accent font-medium">Privacy Policy</a>
            </span>
          </label>
          {#if errors.terms}
            <p class="mt-1 text-sm text-red-600">{errors.terms}</p>
          {/if}
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
            Creating Account...
          {:else}
            Create Account
          {/if}
        </Button>
      </form>
    </div>

    <!-- Sign In Link -->
    <p class="text-center text-sm text-yl-gray-600">
      Already have an account?
      <a
        href="/login"
        class="font-semibold text-yl-green hover:text-yl-green-accent transition-colors"
      >
        Sign in
      </a>
    </p>
  </div>
</div>
