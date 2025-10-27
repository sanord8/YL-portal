<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { trpc } from '$lib/trpc';
  import StatsCard from '$lib/components/StatsCard.svelte';
  import BalanceCard from '$lib/components/BalanceCard.svelte';
  import SpecialFundsCard from '$lib/components/SpecialFundsCard.svelte';
  import LineChart from '$lib/components/LineChart.svelte';
  import CollapsibleSection from '$lib/components/CollapsibleSection.svelte';
  import SwipeableCardRow from '$lib/components/SwipeableCardRow.svelte';
  import QuickActionBar from '$lib/components/QuickActionBar.svelte';

  // Loading states
  let isLoadingStats = true;
  let isLoadingBalances = true;
  let isLoadingPersonalFunds = true;
  let isLoadingRecent = true;
  let isLoadingBreakdown = true;
  let isLoadingTrend = true;
  let isLoadingDrafts = true;

  // Data
  let stats: any = null;
  let balances: any[] = [];
  let personalFunds: any = null;
  let recentMovements: any[] = [];
  let expenseBreakdown: any = null;
  let trendData: any[] = [];
  let draftStats: any = null;

  // Errors
  let statsError = '';
  let balancesError = '';
  let personalFundsError = '';
  let recentError = '';
  let breakdownError = '';
  let trendError = '';
  let draftStatsError = '';

  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  onMount(async () => {
    loadAllData();

    // Auto-refresh every 5 minutes
    refreshInterval = setInterval(() => {
      loadAllData();
    }, 5 * 60 * 1000);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });

  async function loadAllData() {
    loadStats();
    loadBalances();
    loadPersonalFunds();
    loadDrafts();
    loadRecentMovements();
    loadExpenseBreakdown();
    loadTrend();
  }

  async function loadStats() {
    try {
      isLoadingStats = true;
      statsError = '';
      stats = await trpc.dashboard.getOverviewStats.query();
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      statsError = err.message || 'Failed to load statistics';
    } finally {
      isLoadingStats = false;
    }
  }

  async function loadBalances() {
    try {
      isLoadingBalances = true;
      balancesError = '';
      balances = await trpc.dashboard.getBalances.query();
    } catch (err: any) {
      console.error('Failed to load balances:', err);
      balancesError = err.message || 'Failed to load balances';
    } finally {
      isLoadingBalances = false;
    }
  }

  async function loadPersonalFunds() {
    try {
      isLoadingPersonalFunds = true;
      personalFundsError = '';
      personalFunds = await trpc.dashboard.getPersonalFunds.query();
    } catch (err: any) {
      console.error('Failed to load personal funds:', err);
      personalFundsError = err.message || 'Failed to load personal funds';
    } finally {
      isLoadingPersonalFunds = false;
    }
  }

  async function loadDrafts() {
    try {
      isLoadingDrafts = true;
      draftStatsError = '';
      draftStats = await trpc.draft.getStats.query();
    } catch (err: any) {
      console.error('Failed to load draft stats:', err);
      draftStatsError = err.message || 'Failed to load draft statistics';
    } finally {
      isLoadingDrafts = false;
    }
  }

  async function loadRecentMovements() {
    try {
      isLoadingRecent = true;
      recentError = '';
      recentMovements = await trpc.dashboard.getRecentMovements.query({ limit: 5 });
    } catch (err: any) {
      console.error('Failed to load recent movements:', err);
      recentError = err.message || 'Failed to load recent movements';
    } finally {
      isLoadingRecent = false;
    }
  }

  async function loadExpenseBreakdown() {
    try {
      isLoadingBreakdown = true;
      breakdownError = '';
      expenseBreakdown = await trpc.dashboard.getExpenseBreakdown.query({ months: 3 }); // Shorter period for users
    } catch (err: any) {
      console.error('Failed to load expense breakdown:', err);
      breakdownError = err.message || 'Failed to load expense breakdown';
    } finally {
      isLoadingBreakdown = false;
    }
  }

  async function loadTrend() {
    try {
      isLoadingTrend = true;
      trendError = '';
      const rawData = await trpc.dashboard.getIncomeVsExpense.query({ months: 3 }); // Simplified for users
      trendData = rawData.map(item => ({
        label: item.month,
        value1: item.income,
        value2: item.expenses,
      }));
    } catch (err: any) {
      console.error('Failed to load trend data:', err);
      trendError = err.message || 'Failed to load trend data';
    } finally {
      isLoadingTrend = false;
    }
  }

  function formatCurrency(amount: number, currency: string = 'EUR') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  }

  function formatDate(date: string | Date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  }

  function getTypeColor(type: string) {
    switch (type) {
      case 'INCOME':
        return 'bg-green-100 text-green-800';
      case 'EXPENSE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Quick action buttons for mobile (removed "New" action per new workflow)
  const quickActions = [
    { label: 'Movements', icon: '📋', href: '/movements' },
    { label: 'Drafts', icon: '📝', href: '/movements/drafts' },
    { label: 'Reports', icon: '📊', href: '/reports' },
  ];
</script>

<div class="space-y-6 pb-6">
  <!-- Header -->
  <div>
    <h1 class="text-2xl sm:text-3xl font-bold text-yl-black">My Dashboard</h1>
    <p class="text-sm text-yl-gray-600 mt-1">Your personal financial overview</p>
  </div>

  <!-- Special Funds Card (Highlighted at top if exists) -->
  {#if isLoadingPersonalFunds}
    <div class="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg shadow-lg border-2 border-yellow-300 p-6 animate-pulse">
      <div class="h-6 bg-yellow-200 rounded w-1/2 mb-4"></div>
      <div class="h-10 bg-yellow-200 rounded w-3/4 mb-4"></div>
      <div class="grid grid-cols-2 gap-3">
        <div class="h-16 bg-yellow-200 rounded"></div>
        <div class="h-16 bg-yellow-200 rounded"></div>
      </div>
    </div>
  {:else if personalFundsError}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
      {personalFundsError}
    </div>
  {:else if personalFunds}
    <SpecialFundsCard
      department={personalFunds.department}
      area={personalFunds.area}
      balance={personalFunds.balance}
      income={personalFunds.income}
      expenses={personalFunds.expenses}
      movementCount={personalFunds.movementCount}
    />
  {/if}

  <!-- Pending Categorization Alert -->
  {#if isLoadingDrafts}
    <div class="bg-blue-50 rounded-lg shadow border border-blue-200 p-4 sm:p-6 animate-pulse">
      <div class="h-5 bg-blue-200 rounded w-1/3 mb-3"></div>
      <div class="h-8 bg-blue-200 rounded w-2/3 mb-3"></div>
      <div class="h-10 bg-blue-200 rounded w-32"></div>
    </div>
  {:else if draftStatsError}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
      {draftStatsError}
    </div>
  {:else if draftStats && draftStats.total > 0}
    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg border-2 border-blue-300 p-4 sm:p-6">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="text-base sm:text-lg font-semibold text-blue-900 mb-2">
            📝 Imported Movements (Drafts)
          </h3>
          <p class="text-2xl sm:text-3xl font-bold text-blue-900 mb-1">
            {draftStats.total}
          </p>
          <p class="text-sm text-blue-700">
            {#if draftStats.needsCategorization > 0}
              <span class="font-semibold">{draftStats.needsCategorization}</span> need categorization
            {:else}
              All categorized
            {/if}
          </p>

          {#if draftStats.byArea.length > 0}
            <div class="mt-3 space-y-1">
              {#each draftStats.byArea.slice(0, 3) as areaStats}
                <p class="text-xs text-blue-600">
                  {areaStats.area.name}: <span class="font-semibold">{areaStats.count}</span> draft{areaStats.count > 1 ? 's' : ''}
                </p>
              {/each}
              {#if draftStats.byArea.length > 3}
                <p class="text-xs text-blue-500">+ {draftStats.byArea.length - 3} more area{draftStats.byArea.length - 3 > 1 ? 's' : ''}</p>
              {/if}
            </div>
          {/if}
        </div>
      </div>

      <div class="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          on:click={() => goto('/movements/drafts')}
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {#if draftStats.needsCategorization > 0}
            Categorize Now →
          {:else}
            View Drafts →
          {/if}
        </button>
        {#if draftStats.needsCategorization > 0}
          <button
            on:click={() => goto('/movements/drafts?needsCategorization=true')}
            class="px-4 py-2 bg-white text-blue-700 text-sm font-medium rounded-lg border-2 border-blue-300 hover:bg-blue-50 transition-colors"
          >
            Only Uncategorized
          </button>
        {/if}
      </div>

      <p class="text-xs text-blue-600 mt-3">
        💡 Review and categorize imported movements before finalizing
      </p>
    </div>
  {/if}

  <!-- Overview Stats -->
  <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    {#if isLoadingStats}
      {#each [1, 2, 3, 4] as _}
        <div class="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6 animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
          <div class="h-6 sm:h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      {/each}
    {:else if statsError}
      <div class="col-span-full bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
        {statsError}
      </div>
    {:else if stats}
      <StatsCard
        title="My Income"
        value={formatCurrency(stats.totalIncome)}
        icon="income"
        color="green"
      />
      <StatsCard
        title="My Expenses"
        value={formatCurrency(stats.totalExpenses)}
        icon="expense"
        color="red"
      />
      <StatsCard
        title="Draft"
        value={stats.draftCount}
        icon="pending"
        color="yellow"
      />
      <StatsCard
        title="My Areas"
        value={stats.areasCount}
        icon="areas"
        color="blue"
      />
    {/if}
  </div>

  <!-- My Areas (Swipeable on mobile, grid on desktop) -->
  {#if isLoadingBalances}
    <div class="space-y-3">
      <h2 class="text-xl font-semibold text-yl-black px-1">My Areas</h2>
      <div class="flex gap-4 overflow-x-auto pb-4">
        {#each [1, 2, 3] as _}
          <div class="bg-white rounded-lg shadow border border-gray-200 p-6 animate-pulse min-w-[280px]">
            <div class="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div class="h-10 bg-gray-200 rounded w-3/4"></div>
          </div>
        {/each}
      </div>
    </div>
  {:else if balancesError}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
      {balancesError}
    </div>
  {:else if balances.length === 0}
    <div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <p class="text-yl-gray-600">No areas assigned. Contact your administrator for access.</p>
    </div>
  {:else}
    <SwipeableCardRow title="My Areas">
      {#each balances as balance}
        <BalanceCard
          areaId={balance.area.id}
          areaName={balance.area.name}
          areaCode={balance.area.code}
          currency={balance.area.currency}
          balance={balance.balance}
          income={balance.income}
          expenses={balance.expenses}
        />
      {/each}
    </SwipeableCardRow>
  {/if}

  <!-- Income vs Expenses Trend (Collapsible on mobile) -->
  <CollapsibleSection title="Income vs Expenses (3 months)" icon="📈" isOpen={true}>
    {#if isLoadingTrend}
      <div class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yl-green"></div>
      </div>
    {:else if trendError}
      <p class="text-sm text-red-600 text-center py-8">{trendError}</p>
    {:else}
      <LineChart
        data={trendData}
        label1="Income"
        label2="Expenses"
        color1="#90c83c"
        color2="#ef4444"
        height={250}
      />
    {/if}
  </CollapsibleSection>

  <!-- Recent Movements & Expense Breakdown -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Recent Movements -->
    <CollapsibleSection title="Recent Activity" icon="📋" isOpen={true}>
      {#if isLoadingRecent}
        <div class="space-y-3">
          {#each [1, 2, 3] as _}
            <div class="animate-pulse flex justify-between items-center py-3 border-b border-gray-200">
              <div class="flex-1">
                <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div class="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div class="h-5 bg-gray-200 rounded w-20"></div>
            </div>
          {/each}
        </div>
      {:else if recentError}
        <p class="text-sm text-red-600">{recentError}</p>
      {:else if recentMovements.length === 0}
        <div class="text-center py-8">
          <svg class="w-12 h-12 text-yl-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-sm text-yl-gray-600 mb-4">No recent movements</p>
          <button
            on:click={() => goto('/movements/new')}
            class="px-4 py-2 bg-yl-green text-white text-sm font-medium rounded-lg hover:bg-yl-green-accent transition-colors"
          >
            Create First Movement
          </button>
        </div>
      {:else}
        <div class="space-y-0 divide-y divide-gray-200">
          {#each recentMovements as movement}
            <button
              on:click={() => goto(`/movements/${movement.id}`)}
              class="w-full flex justify-between items-center py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-yl-black truncate">{movement.description}</p>
                <div class="flex items-center space-x-2 mt-1">
                  <span class="px-2 py-0.5 text-xs font-medium rounded-full {getTypeColor(movement.type)}">
                    {movement.type}
                  </span>
                  <span class="text-xs text-yl-gray-600">{formatDate(movement.transactionDate)}</span>
                </div>
              </div>
              <p class="text-sm font-semibold ml-4 {movement.type === 'INCOME' ? 'text-green-600' : 'text-yl-black'}">
                {movement.type === 'INCOME' ? '+' : '-'}{formatCurrency(movement.amount, movement.currency)}
              </p>
            </button>
          {/each}
        </div>
        <div class="mt-4 text-center">
          <button
            on:click={() => goto('/movements')}
            class="text-sm text-yl-green hover:text-yl-green-accent font-medium"
          >
            View All →
          </button>
        </div>
      {/if}
    </CollapsibleSection>

    <!-- Expense Breakdown -->
    <CollapsibleSection title="My Expenses (3 months)" icon="💰" isOpen={true}>
      {#if isLoadingBreakdown}
        <div class="space-y-3">
          {#each [1, 2, 3] as _}
            <div class="animate-pulse">
              <div class="flex justify-between mb-2">
                <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                <div class="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div class="h-2 bg-gray-200 rounded"></div>
            </div>
          {/each}
        </div>
      {:else if breakdownError}
        <p class="text-sm text-red-600">{breakdownError}</p>
      {:else if !expenseBreakdown || expenseBreakdown.breakdown.length === 0}
        <div class="text-center py-8">
          <svg class="w-12 h-12 text-yl-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
          <p class="text-sm text-yl-gray-600">No expenses recorded</p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each expenseBreakdown.breakdown.slice(0, 5) as item}
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="font-medium text-yl-black">{item.category}</span>
                <span class="text-yl-gray-600">{formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)</span>
              </div>
              <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full bg-red-500 transition-all"
                  style="width: {item.percentage}%"
                ></div>
              </div>
            </div>
          {/each}

          {#if expenseBreakdown.breakdown.length > 5}
            <p class="text-xs text-yl-gray-600 text-center mt-4">
              + {expenseBreakdown.breakdown.length - 5} more categories
            </p>
          {/if}

          <div class="pt-4 border-t border-gray-200">
            <div class="flex justify-between text-sm font-semibold">
              <span class="text-yl-black">Total</span>
              <span class="text-red-600">{formatCurrency(expenseBreakdown.total)}</span>
            </div>
          </div>
        </div>
      {/if}
    </CollapsibleSection>
  </div>
</div>

<!-- Quick Action Bar (Mobile only) -->
<QuickActionBar actions={quickActions} />
