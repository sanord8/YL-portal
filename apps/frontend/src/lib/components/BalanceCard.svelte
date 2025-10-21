<script lang="ts">
  import { goto } from '$app/navigation';

  export let areaId: string;
  export let areaName: string;
  export let areaCode: string;
  export let currency: string;
  export let balance: number;
  export let income: number;
  export let expenses: number;
  export let clickable: boolean = true;

  function formatCurrency(amount: number, curr: string = 'EUR') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(amount / 100);
  }

  function handleClick() {
    if (clickable) {
      goto(`/movements?areaId=${areaId}`);
    }
  }

  $: isPositive = balance >= 0;
  $: balanceColor = isPositive ? 'text-yl-green' : 'text-red-600';
</script>

<div
  class="bg-white rounded-lg shadow border border-gray-200 p-6 transition-all"
  class:hover:shadow-md={clickable}
  class:cursor-pointer={clickable}
  on:click={clickable ? handleClick : undefined}
  on:keydown={clickable ? (e) => e.key === 'Enter' && handleClick() : undefined}
  role={clickable ? 'button' : undefined}
  {...(clickable ? { tabindex: 0 } : {})}
>
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <div>
      <h3 class="text-lg font-semibold text-yl-black">{areaName}</h3>
      <p class="text-sm text-yl-gray-600">{areaCode}</p>
    </div>
    {#if clickable}
      <svg class="w-5 h-5 text-yl-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    {/if}
  </div>

  <!-- Balance -->
  <div class="mb-4">
    <p class="text-sm text-yl-gray-600 mb-1">Current Balance</p>
    <p class="text-3xl font-bold {balanceColor}">
      {formatCurrency(balance, currency)}
    </p>
  </div>

  <!-- Income and Expenses -->
  <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
    <!-- Income -->
    <div>
      <div class="flex items-center mb-1">
        <svg class="w-4 h-4 text-yl-green mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <p class="text-xs text-yl-gray-600">Income</p>
      </div>
      <p class="text-sm font-semibold text-yl-green">
        {formatCurrency(income, currency)}
      </p>
    </div>

    <!-- Expenses -->
    <div>
      <div class="flex items-center mb-1">
        <svg class="w-4 h-4 text-red-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
        <p class="text-xs text-yl-gray-600">Expenses</p>
      </div>
      <p class="text-sm font-semibold text-red-600">
        {formatCurrency(expenses, currency)}
      </p>
    </div>
  </div>

  <!-- Progress Bar (visual representation) -->
  {#if income > 0 || expenses > 0}
    <div class="mt-4">
      <div class="h-2 bg-gray-200 rounded-full overflow-hidden flex">
        {#if income > 0}
          <div
            class="h-full bg-yl-green transition-all"
            style="width: {income / (income + expenses) * 100}%"
            title="Income: {(income / (income + expenses) * 100).toFixed(1)}%"
          ></div>
        {/if}
        {#if expenses > 0}
          <div
            class="h-full bg-red-500 transition-all"
            style="width: {expenses / (income + expenses) * 100}%"
            title="Expenses: {(expenses / (income + expenses) * 100).toFixed(1)}%"
          ></div>
        {/if}
      </div>
    </div>
  {/if}
</div>
