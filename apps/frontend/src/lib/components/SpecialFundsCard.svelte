<script lang="ts">
  import { goto } from '$app/navigation';

  export let department: {
    id: string;
    name: string;
    code: string;
    description: string | null;
  };
  export let area: {
    id: string;
    name: string;
    code: string;
    currency: string;
  };
  export let balance: number;
  export let income: number;
  export let expenses: number;
  export let movementCount: number;

  function formatCurrency(amount: number, currency: string = 'EUR') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  }

  function getBalanceColor(balance: number) {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600';
  }
</script>

<div class="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg shadow-lg border-2 border-yellow-300 p-6 relative overflow-hidden">
  <!-- Gold accent corner -->
  <div class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-bl-full opacity-20" />

  <!-- Header with icon -->
  <div class="flex items-start justify-between mb-4 relative z-10">
    <div>
      <div class="flex items-center space-x-2 mb-1">
        <span class="text-2xl">💰</span>
        <h3 class="text-lg font-bold text-amber-900">{department.name}</h3>
      </div>
      <p class="text-sm text-amber-700">
        {area.name} ({area.code}) • {department.code}
      </p>
      {#if department.description}
        <p class="text-xs text-amber-600 mt-1">{department.description}</p>
      {/if}
    </div>

    <button
      on:click={() => goto(`/departments/${department.id}`)}
      class="text-amber-700 hover:text-amber-900 transition-colors"
      title="View details"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </button>
  </div>

  <!-- Balance -->
  <div class="mb-4 relative z-10">
    <p class="text-sm text-amber-700 mb-1">Current Balance</p>
    <p class="text-3xl sm:text-4xl font-bold {getBalanceColor(balance)}">
      {formatCurrency(balance, area.currency)}
    </p>
  </div>

  <!-- Income/Expense breakdown -->
  <div class="grid grid-cols-2 gap-3 mb-4 relative z-10">
    <div class="bg-white bg-opacity-60 rounded-lg p-3">
      <p class="text-xs text-amber-700 mb-1">Income</p>
      <p class="text-lg font-semibold text-green-600">
        +{formatCurrency(income, area.currency)}
      </p>
    </div>
    <div class="bg-white bg-opacity-60 rounded-lg p-3">
      <p class="text-xs text-amber-700 mb-1">Expenses</p>
      <p class="text-lg font-semibold text-red-600">
        -{formatCurrency(expenses, area.currency)}
      </p>
    </div>
  </div>

  <!-- Movement count & actions -->
  <div class="flex items-center justify-between relative z-10">
    <p class="text-xs text-amber-700">
      {movementCount} movement{movementCount !== 1 ? 's' : ''}
    </p>

    <button
      on:click={() => goto('/movements/new')}
      class="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors shadow-md"
    >
      Add Funds
    </button>
  </div>
</div>
