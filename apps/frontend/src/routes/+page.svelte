<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { authStore } from '$lib/stores/authStore';

  $: isAuthenticated = $authStore.isAuthenticated;
  $: isLoading = $authStore.isLoading;

  // Redirect authenticated users to dashboard
  $: if (browser && isAuthenticated) {
    goto('/dashboard');
  }
</script>

<svelte:head>
  <title>Welcome - YoungLife Portal</title>
</svelte:head>

<!-- Welcome Hero for Non-Authenticated Users -->
  <div class="space-y-8">
    <div class="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 md:p-8 lg:p-12">
      <div class="flex flex-col sm:flex-row items-center sm:space-x-3 space-y-3 sm:space-y-0 mb-4 sm:mb-6">
        <div class="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-yl-green rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
          <span class="text-white font-bold text-xl sm:text-2xl">YL</span>
        </div>
        <div class="text-center sm:text-left">
          <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-yl-black">
            Welcome to YoungLife Portal
          </h1>
        </div>
      </div>

      <p class="text-sm sm:text-base md:text-lg text-yl-gray-600 mb-6 text-center sm:text-left max-w-2xl">
        Streamline your financial operations with our comprehensive employee portal and expense management system.
      </p>

      <div class="flex flex-col sm:flex-row gap-4">
        <a
          href="/login"
          class="inline-block w-full sm:w-auto px-6 py-3 bg-yl-green text-white font-semibold rounded-lg hover:bg-yl-green-accent transition-colors shadow-md text-center"
        >
          Sign In
        </a>
      </div>

      <p class="text-sm text-yl-gray-600 mt-4">
        Need an account? Contact your administrator
      </p>
    </div>

    <!-- Features Section -->
    <div class="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8 lg:p-10 border border-gray-200">
      <h2 class="text-2xl sm:text-3xl font-bold text-yl-black mb-6 sm:mb-8">Core Features</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div class="flex items-start space-x-3 sm:space-x-4">
          <div class="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-yl-green rounded-lg flex items-center justify-center shadow-sm">
            <span class="text-white font-bold text-lg sm:text-xl">€</span>
          </div>
          <div>
            <h3 class="font-bold text-yl-black text-base sm:text-lg mb-1">Expense Management</h3>
            <p class="text-xs sm:text-sm text-yl-gray-600">Track and manage expenses across multiple areas with real-time updates</p>
          </div>
        </div>

        <div class="flex items-start space-x-3 sm:space-x-4">
          <div class="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-yl-green-accent rounded-lg flex items-center justify-center shadow-sm">
            <span class="text-white font-bold text-lg sm:text-xl">📊</span>
          </div>
          <div>
            <h3 class="font-bold text-yl-black text-base sm:text-lg mb-1">Real-time Reports</h3>
            <p class="text-xs sm:text-sm text-yl-gray-600">Generate comprehensive financial reports with advanced analytics</p>
          </div>
        </div>

        <div class="flex items-start space-x-3 sm:space-x-4">
          <div class="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-yl-green rounded-lg flex items-center justify-center shadow-sm">
            <span class="text-white font-bold text-lg sm:text-xl">🔒</span>
          </div>
          <div>
            <h3 class="font-bold text-yl-black text-base sm:text-lg mb-1">Security First</h3>
            <p class="text-xs sm:text-sm text-yl-gray-600">Multi-factor authentication, audit trails, and role-based access</p>
          </div>
        </div>

        <div class="flex items-start space-x-3 sm:space-x-4">
          <div class="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-yl-green-accent rounded-lg flex items-center justify-center shadow-sm">
            <span class="text-white font-bold text-lg sm:text-xl">🌍</span>
          </div>
          <div>
            <h3 class="font-bold text-yl-black text-base sm:text-lg mb-1">Multi-language Support</h3>
            <p class="text-xs sm:text-sm text-yl-gray-600">Available in English, Spanish, and Catalan for global teams</p>
          </div>
        </div>
      </div>
    </div>
  </div>
