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
  <!-- Hero Section -->
  <div class="bg-white rounded-lg shadow-sm p-8">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">
      Welcome to YL Portal
    </h1>
    <p class="text-lg text-gray-600 mb-6">
      Employee portal and expense management system
    </p>

    <!-- API Status -->
    <div class="flex items-center space-x-3">
      <div class="flex items-center space-x-2">
        <span class="text-sm font-medium text-gray-700">API Status:</span>
        {#if healthStatus === 'loading'}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Loading...
          </span>
        {:else if healthStatus === 'ok'}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Online
          </span>
        {:else}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            ✗ Offline
          </span>
        {/if}
      </div>
    </div>

    {#if apiMessage}
      <p class="mt-4 text-sm text-gray-600">{apiMessage}</p>
    {/if}
  </div>

  <!-- Quick Stats Grid -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h3 class="text-sm font-medium text-gray-500 mb-2">Total Balance</h3>
      <p class="text-3xl font-bold text-gray-900">€0.00</p>
      <p class="text-sm text-gray-600 mt-2">Across all areas</p>
    </div>

    <div class="bg-white rounded-lg shadow-sm p-6">
      <h3 class="text-sm font-medium text-gray-500 mb-2">Recent Movements</h3>
      <p class="text-3xl font-bold text-gray-900">0</p>
      <p class="text-sm text-gray-600 mt-2">This month</p>
    </div>

    <div class="bg-white rounded-lg shadow-sm p-6">
      <h3 class="text-sm font-medium text-gray-500 mb-2">Pending Approvals</h3>
      <p class="text-3xl font-bold text-gray-900">0</p>
      <p class="text-sm text-gray-600 mt-2">Awaiting action</p>
    </div>
  </div>

  <!-- Features Section -->
  <div class="bg-white rounded-lg shadow-sm p-8">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Features</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <span class="text-primary-600 font-bold">$</span>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Expense Management</h3>
          <p class="text-sm text-gray-600">Track and manage expenses across multiple areas</p>
        </div>
      </div>

      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <span class="text-primary-600 font-bold">📊</span>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Real-time Reports</h3>
          <p class="text-sm text-gray-600">Generate comprehensive financial reports</p>
        </div>
      </div>

      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <span class="text-primary-600 font-bold">🔒</span>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Security First</h3>
          <p class="text-sm text-gray-600">Multi-factor authentication and audit trails</p>
        </div>
      </div>

      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <span class="text-primary-600 font-bold">🌍</span>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Multi-language</h3>
          <p class="text-sm text-gray-600">Support for English, Spanish, and Catalan</p>
        </div>
      </div>
    </div>
  </div>
</div>
