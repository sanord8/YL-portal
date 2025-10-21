<script lang="ts">
  export let stats: Array<{
    label: string;
    value: string | number;
    icon?: 'user' | 'department' | 'movement' | 'budget' | 'balance' | 'currency';
    color?: 'green' | 'blue' | 'purple' | 'orange' | 'gray' | 'red';
  }> = [];

  const iconPaths = {
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    department: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    movement: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    budget: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    balance: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
    currency: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };

  const colorClasses = {
    green: 'bg-yl-green-light text-yl-green',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    gray: 'bg-gray-100 text-gray-600',
    red: 'bg-red-100 text-red-600',
  };
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {#each stats as stat}
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <p class="text-xs font-medium text-yl-gray-600 uppercase tracking-wide mb-1">
            {stat.label}
          </p>
          <p class="text-2xl font-bold text-yl-black">
            {stat.value}
          </p>
        </div>
        {#if stat.icon}
          <div class="w-10 h-10 rounded-full flex items-center justify-center {colorClasses[stat.color || 'gray']}">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPaths[stat.icon]} />
            </svg>
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>
