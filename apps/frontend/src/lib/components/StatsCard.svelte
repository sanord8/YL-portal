<script lang="ts">
  export let title: string;
  export let value: string | number;
  export let icon: 'income' | 'expense' | 'pending' | 'areas' | 'balance' = 'balance';
  export let trend: 'up' | 'down' | 'neutral' | null = null;
  export let trendValue: string = '';
  export let color: 'green' | 'red' | 'blue' | 'gray' | 'yellow' = 'gray';

  const iconPaths = {
    income: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    expense: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    pending: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    areas: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    balance: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  };

  const colorClasses = {
    green: 'bg-yl-green/10 text-yl-green',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
    gray: 'bg-gray-100 text-yl-gray-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  };
</script>

<div class="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
  <div class="flex items-center justify-between">
    <div class="flex-1">
      <p class="text-sm font-medium text-yl-gray-600 mb-1">{title}</p>
      <p class="text-2xl md:text-3xl font-bold text-yl-black">{value}</p>

      {#if trend && trendValue}
        <div class="flex items-center mt-2">
          {#if trend === 'up'}
            <svg class="w-4 h-4 text-yl-green mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span class="text-sm text-yl-green font-medium">{trendValue}</span>
          {:else if trend === 'down'}
            <svg class="w-4 h-4 text-red-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
            <span class="text-sm text-red-600 font-medium">{trendValue}</span>
          {:else}
            <span class="text-sm text-yl-gray-600 font-medium">{trendValue}</span>
          {/if}
        </div>
      {/if}
    </div>

    <div class="ml-4 flex-shrink-0">
      <div class="w-12 h-12 rounded-full {colorClasses[color]} flex items-center justify-center">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPaths[icon]} />
        </svg>
      </div>
    </div>
  </div>
</div>
