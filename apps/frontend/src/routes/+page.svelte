<script lang="ts">
  import { onMount } from 'svelte';

  let healthStatus: 'loading' | 'ok' | 'error' = 'loading';
  let apiMessage = '';

  onMount(async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();

      if (data.status === 'ok') {
        healthStatus = 'ok';
      } else {
        healthStatus = 'error';
      }
    } catch (error) {
      healthStatus = 'error';
      console.error('Failed to fetch health status:', error);
    }

    try {
      const response = await fetch('/api/v1/hello');
      const data = await response.json();
      apiMessage = data.message;
    } catch (error) {
      console.error('Failed to fetch API message:', error);
    }
  });
</script>

<div class="space-y-8">
  <!-- Hero Section with YoungLife Branding -->
  <div class="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md border border-gray-200 p-8 md:p-12">
    <div class="flex items-center space-x-3 mb-6">
      <div class="w-16 h-16 bg-yl-green rounded-lg flex items-center justify-center shadow-md">
        <span class="text-white font-bold text-2xl">YL</span>
      </div>
      <div>
        <h1 class="text-4xl md:text-5xl font-bold text-yl-black">
          Welcome to YoungLife Portal
        </h1>
      </div>
    </div>

    <p class="text-lg text-yl-gray-600 mb-6 max-w-2xl">
      Streamline your financial operations with our comprehensive employee portal and expense management system.
    </p>

    <!-- API Status with new branding -->
    <div class="flex items-center space-x-3">
      <div class="flex items-center space-x-2">
        <span class="text-sm font-semibold text-yl-black">System Status:</span>
        {#if healthStatus === 'loading'}
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yl-gray-100 text-yl-gray-700">
            Loading...
          </span>
        {:else if healthStatus === 'ok'}
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yl-green text-white">
            ✓ Online
          </span>
        {:else}
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            ✗ Offline
          </span>
        {/if}
      </div>
    </div>

    {#if apiMessage}
      <p class="mt-4 text-sm text-yl-gray-600 font-medium">{apiMessage}</p>
    {/if}
  </div>

  <!-- Quick Stats Grid with YoungLife styling -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="bg-white rounded-lg shadow-md border-l-4 border-yl-green p-6 hover:shadow-lg transition-shadow">
      <h3 class="text-sm font-semibold text-yl-gray-600 uppercase tracking-wide mb-2">Total Balance</h3>
      <p class="text-3xl font-bold text-yl-black">€0.00</p>
      <p class="text-sm text-yl-gray-500 mt-2">Across all areas</p>
    </div>

    <div class="bg-white rounded-lg shadow-md border-l-4 border-yl-green-accent p-6 hover:shadow-lg transition-shadow">
      <h3 class="text-sm font-semibold text-yl-gray-600 uppercase tracking-wide mb-2">Recent Movements</h3>
      <p class="text-3xl font-bold text-yl-black">0</p>
      <p class="text-sm text-yl-gray-500 mt-2">This month</p>
    </div>

    <div class="bg-white rounded-lg shadow-md border-l-4 border-yl-green p-6 hover:shadow-lg transition-shadow">
      <h3 class="text-sm font-semibold text-yl-gray-600 uppercase tracking-wide mb-2">Pending Approvals</h3>
      <p class="text-3xl font-bold text-yl-black">0</p>
      <p class="text-sm text-yl-gray-500 mt-2">Awaiting action</p>
    </div>
  </div>

  <!-- Features Section with YoungLife styling -->
  <div class="bg-white rounded-lg shadow-md p-8 md:p-10 border border-gray-200">
    <h2 class="text-3xl font-bold text-yl-black mb-8">Core Features</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="flex items-start space-x-4">
        <div class="flex-shrink-0 w-12 h-12 bg-yl-green rounded-lg flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
          <span class="text-white font-bold text-xl">€</span>
        </div>
        <div>
          <h3 class="font-bold text-yl-black text-lg mb-1">Expense Management</h3>
          <p class="text-sm text-yl-gray-600">Track and manage expenses across multiple areas with real-time updates</p>
        </div>
      </div>

      <div class="flex items-start space-x-4">
        <div class="flex-shrink-0 w-12 h-12 bg-yl-green-accent rounded-lg flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
          <span class="text-white font-bold text-xl">📊</span>
        </div>
        <div>
          <h3 class="font-bold text-yl-black text-lg mb-1">Real-time Reports</h3>
          <p class="text-sm text-yl-gray-600">Generate comprehensive financial reports with advanced analytics</p>
        </div>
      </div>

      <div class="flex items-start space-x-4">
        <div class="flex-shrink-0 w-12 h-12 bg-yl-green rounded-lg flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
          <span class="text-white font-bold text-xl">🔒</span>
        </div>
        <div>
          <h3 class="font-bold text-yl-black text-lg mb-1">Security First</h3>
          <p class="text-sm text-yl-gray-600">Multi-factor authentication, audit trails, and role-based access</p>
        </div>
      </div>

      <div class="flex items-start space-x-4">
        <div class="flex-shrink-0 w-12 h-12 bg-yl-green-accent rounded-lg flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
          <span class="text-white font-bold text-xl">🌍</span>
        </div>
        <div>
          <h3 class="font-bold text-yl-black text-lg mb-1">Multi-language Support</h3>
          <p class="text-sm text-yl-gray-600">Available in English, Spanish, and Catalan for global teams</p>
        </div>
      </div>
    </div>
  </div>
</div>
