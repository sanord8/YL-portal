<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/authStore';
  import { trpc } from '$lib/trpc';
  import StatsCard from '$lib/components/StatsCard.svelte';
  import BalanceCard from '$lib/components/BalanceCard.svelte';
  import LineChart from '$lib/components/LineChart.svelte';

  // Loading states
  let isLoadingStats = true;
  let isLoadingBalances = true;
  let isLoadingRecent = true;
  let isLoadingBreakdown = true;
  let isLoadingTrend = true;

  // Data
  let stats: any = null;
  let balances: any[] = [];
  let recentMovements: any[] = [];
  let expenseBreakdown: any = null;
  let trendData: any[] = [];

  // Errors
  let statsError = '';
  let balancesError = '';
  let recentError = '';
  let breakdownError = '';
  let trendError = '';

  $: isAuthenticated = $authStore.isAuthenticated;

  onMount(async () => {
    if (!isAuthenticated) {
      return;
    }

    // Load all dashboard data in parallel
    loadAllData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadAllData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  });

  async function loadAllData() {
    loadStats();
    loadBalances();
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
      expenseBreakdown = await trpc.dashboard.getExpenseBreakdown.query({ months: 6 });
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
      const rawData = await trpc.dashboard.getIncomeVsExpense.query({ months: 6 });
      // Transform data for LineChart component
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
</script>

<svelte:head>
  <title>Dashboard - YoungLife Portal</title>
</svelte:head>

{#if !isAuthenticated}
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
        <a href="/login">
          <button class="w-full sm:w-auto px-6 py-3 bg-yl-green text-white font-semibold rounded-lg hover:bg-yl-green-accent transition-colors shadow-md">
            Sign In
          </button>
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
{:else}
  <!-- Authenticated User Dashboard -->
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-yl-black">Dashboard</h1>
      <p class="text-sm text-yl-gray-600 mt-1">Welcome back! Here's your financial overview</p>
    </div>

    <!-- Overview Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {#if isLoadingStats}
        <!-- Loading Skeletons -->
        {#each [1, 2, 3, 4] as _}
          <div class="bg-white rounded-lg shadow border border-gray-200 p-6 animate-pulse">
            <div class="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div class="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        {/each}
      {:else if statsError}
        <div class="col-span-full bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {statsError}
        </div>
      {:else if stats}
        <StatsCard
          title="Total Income"
          value={formatCurrency(stats.totalIncome)}
          icon="income"
          color="green"
        />
        <StatsCard
          title="Total Expenses"
          value={formatCurrency(stats.totalExpenses)}
          icon="expense"
          color="red"
        />
        <StatsCard
          title="Pending"
          value={stats.pendingCount}
          icon="pending"
          color="yellow"
        />
        <StatsCard
          title="Areas"
          value={stats.areasCount}
          icon="areas"
          color="blue"
        />
      {/if}
    </div>

    <!-- Balance Cards -->
    <div>
      <h2 class="text-xl font-semibold text-yl-black mb-4">Balance by Area</h2>
      {#if isLoadingBalances}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each [1, 2, 3] as _}
            <div class="bg-white rounded-lg shadow border border-gray-200 p-6 animate-pulse">
              <div class="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div class="h-10 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div class="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          {/each}
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
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        </div>
      {/if}
    </div>

    <!-- Income vs Expenses Trend Chart -->
    <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 class="text-xl font-semibold text-yl-black mb-4">Income vs Expenses (Last 6 Months)</h2>

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
          height={300}
        />
      {/if}
    </div>

    <!-- Recent Movements & Expense Breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Movements -->
      <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-yl-black">Recent Movements</h2>
          <button
            on:click={() => goto('/movements')}
            class="text-sm text-yl-green hover:text-yl-green-accent font-medium"
          >
            View All →
          </button>
        </div>

        {#if isLoadingRecent}
          <div class="space-y-3">
            {#each [1, 2, 3, 4, 5] as _}
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
            <p class="text-sm text-yl-gray-600">No recent movements</p>
            <button
              on:click={() => goto('/movements/new')}
              class="mt-4 px-4 py-2 bg-yl-green text-white text-sm font-medium rounded-lg hover:bg-yl-green-accent transition-colors"
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
        {/if}
      </div>

      <!-- Expense Breakdown -->
      <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 class="text-xl font-semibold text-yl-black mb-4">Expense Breakdown (6 months)</h2>

        {#if isLoadingBreakdown}
          <div class="space-y-3">
            {#each [1, 2, 3, 4] as _}
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
                <span class="text-yl-black">Total Expenses</span>
                <span class="text-red-600">{formatCurrency(expenseBreakdown.total)}</span>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
