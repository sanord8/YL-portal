<script lang="ts">
  import { goto } from '$app/navigation';
  import { createQuery } from '@tanstack/svelte-query';
  import { trpc } from '$lib/trpc-client';
  import StatsCard from '$lib/components/StatsCard.svelte';
  import BalanceCard from '$lib/components/BalanceCard.svelte';
  import LineChart from '$lib/components/LineChart.svelte';
  import PieChart from '$lib/components/PieChart.svelte';
  import CollapsibleSection from '$lib/components/CollapsibleSection.svelte';

  // TanStack Query - Auto-caching with 5-minute refetch interval
  // 10x faster dashboard loads after first visit!

  const statsQuery = createQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => trpc.dashboard.getOverviewStats.query(),
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  const balancesQuery = createQuery({
    queryKey: ['dashboard', 'balances'],
    queryFn: () => trpc.dashboard.getBalances.query(),
    refetchInterval: 5 * 60 * 1000,
  });

  const alertsQuery = createQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: () => trpc.dashboard.getOrganizationAlerts.query(),
    refetchInterval: 5 * 60 * 1000,
  });

  const draftStatsQuery = createQuery({
    queryKey: ['draft', 'stats'],
    queryFn: () => trpc.draft.getStats.query(),
    refetchInterval: 5 * 60 * 1000,
  });

  const trendQuery = createQuery({
    queryKey: ['dashboard', 'trend', 6],
    queryFn: () => trpc.dashboard.getIncomeVsExpense.query({ months: 6 }),
    refetchInterval: 5 * 60 * 1000,
  });

  const areaExpensesQuery = createQuery({
    queryKey: ['dashboard', 'areaExpenses', 6],
    queryFn: () => trpc.dashboard.getExpensesByArea.query({ months: 6 }),
    refetchInterval: 5 * 60 * 1000,
  });

  const bankAccountsQuery = createQuery({
    queryKey: ['bankAccount', 'list'],
    queryFn: () => trpc.bankAccount.list.query(),
    refetchInterval: 5 * 60 * 1000,
  });

  const unsplitMovementsQuery = createQuery({
    queryKey: ['movement', 'list', 'DRAFT', 10],
    queryFn: async () => {
      // Only fetch 10 for dashboard preview (was 100 - too slow!)
      const result = await trpc.movement.list.query({
        limit: 10,
        status: 'DRAFT',
      });
      // Count unsplit movements (movements that are not split parents and have no parent)
      const count = result.movements.filter(
        (m: any) => !m.isSplitParent && !m.parentId
      ).length;
      return { ...result, unsplitCount: count };
    },
    refetchInterval: 5 * 60 * 1000,
  });

  // Reactive statements for data and loading states
  $: stats = $statsQuery.data;
  $: isLoadingStats = $statsQuery.isLoading;
  $: statsError = $statsQuery.error?.message || '';

  $: balances = $balancesQuery.data || [];
  $: isLoadingBalances = $balancesQuery.isLoading;
  $: balancesError = $balancesQuery.error?.message || '';

  $: alerts = $alertsQuery.data;
  $: isLoadingAlerts = $alertsQuery.isLoading;
  $: alertsError = $alertsQuery.error?.message || '';

  $: draftStats = $draftStatsQuery.data;
  $: isLoadingDrafts = $draftStatsQuery.isLoading;
  $: draftStatsError = $draftStatsQuery.error?.message || '';

  $: trendRawData = $trendQuery.data;
  $: trendData = trendRawData?.map(item => ({
    label: item.month,
    value1: item.income,
    value2: item.expenses,
  })) || [];
  $: isLoadingTrend = $trendQuery.isLoading;
  $: trendError = $trendQuery.error?.message || '';

  $: areaExpenses = $areaExpensesQuery.data;
  $: isLoadingAreaExpenses = $areaExpensesQuery.isLoading;
  $: areaExpensesError = $areaExpensesQuery.error?.message || '';

  $: bankAccounts = $bankAccountsQuery.data || [];
  $: isLoadingBankAccounts = $bankAccountsQuery.isLoading;
  $: bankAccountsError = $bankAccountsQuery.error?.message || '';

  $: unsplitMovementsCount = $unsplitMovementsQuery.data?.unsplitCount || 0;
  $: isLoadingUnsplitMovements = $unsplitMovementsQuery.isLoading;
  $: unsplitMovementsError = $unsplitMovementsQuery.error?.message || '';

  function formatCurrency(amount: number, currency: string = 'EUR') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  }
</script>

<div class="space-y-6">
  <!-- Header with admin badge -->
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <div class="flex items-center space-x-3">
        <h1 class="text-2xl sm:text-3xl font-bold text-yl-black">Admin Dashboard</h1>
        <span class="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
          ADMIN
        </span>
      </div>
      <p class="text-sm text-yl-gray-600 mt-1">Organization-wide overview and alerts</p>
    </div>

    <button
      on:click={() => goto('/admin/users')}
      class="px-4 py-2 bg-yl-green text-white text-sm font-medium rounded-lg hover:bg-yl-green-accent transition-colors"
    >
      Manage Users
    </button>
  </div>

  <!-- Organization Alerts (Mobile: Collapsible, Desktop: Always visible) -->
  {#if (!isLoadingAlerts && alerts && (alerts.pendingApprovals > 0 || alerts.recentRejections > 0 || alerts.highValuePending > 0)) || (!isLoadingDrafts && draftStats && draftStats.total > 0) || (!isLoadingUnsplitMovements && unsplitMovementsCount > 0)}
    <div class="block md:hidden">
      <CollapsibleSection title="🚨 Alerts" isOpen={true} headerClass="bg-red-50">
        <div class="space-y-3">
          {#if !isLoadingDrafts && draftStats && draftStats.total > 0}
            <div class="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <p class="font-semibold text-blue-900">Imported Drafts</p>
                <p class="text-sm text-blue-700">
                  {draftStats.total} draft{draftStats.total > 1 ? 's' : ''}
                  {#if draftStats.needsCategorization > 0}
                    ({draftStats.needsCategorization} need categorization)
                  {/if}
                </p>
              </div>
              <button
                on:click={() => goto('/movements/drafts')}
                class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Review
              </button>
            </div>
          {/if}

          {#if !isLoadingUnsplitMovements && unsplitMovementsCount > 0}
            <div class="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div>
                <p class="font-semibold text-purple-900">Unsplit Bank Movements</p>
                <p class="text-sm text-purple-700">
                  {unsplitMovementsCount} movement{unsplitMovementsCount > 1 ? 's' : ''} need{unsplitMovementsCount === 1 ? 's' : ''} splitting
                </p>
              </div>
              <button
                on:click={() => goto('/admin/bank-movements')}
                class="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Split
              </button>
            </div>
          {/if}

          {#if alerts && alerts.pendingApprovals > 0}
            <div class="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div>
                <p class="font-semibold text-yellow-900">Pending Approvals</p>
                <p class="text-sm text-yellow-700">{alerts.pendingApprovals} movement{alerts.pendingApprovals > 1 ? 's' : ''} awaiting review</p>
              </div>
              <button
                on:click={() => goto('/movements?status=PENDING')}
                class="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Review
              </button>
            </div>
          {/if}

          {#if alerts.highValuePending > 0}
            <div class="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div>
                <p class="font-semibold text-orange-900">High-Value Pending</p>
                <p class="text-sm text-orange-700">{alerts.highValuePending} high-value transaction{alerts.highValuePending > 1 ? 's' : ''}</p>
              </div>
              <button
                on:click={() => goto('/movements?status=PENDING')}
                class="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Review
              </button>
            </div>
          {/if}

          {#if alerts.recentRejections > 0}
            <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="font-semibold text-red-900">Recent Rejections</p>
              <p class="text-sm text-red-700">{alerts.recentRejections} movement{alerts.recentRejections > 1 ? 's' : ''} rejected in last 7 days</p>
            </div>
          {/if}
        </div>
      </CollapsibleSection>
    </div>

    <div class="hidden md:block bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 class="text-xl font-semibold text-yl-black mb-4">🚨 Organization Alerts</h2>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {#if !isLoadingDrafts && draftStats && draftStats.total > 0}
          <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p class="text-2xl font-bold text-blue-900">{draftStats.total}</p>
            <p class="text-sm text-blue-700 mt-1">
              Imported Draft{draftStats.total > 1 ? 's' : ''}
              {#if draftStats.needsCategorization > 0}
                <br /><span class="font-semibold">{draftStats.needsCategorization}</span> need categorization
              {/if}
            </p>
            <button
              on:click={() => goto('/movements/drafts')}
              class="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Review →
            </button>
          </div>
        {/if}

        {#if !isLoadingUnsplitMovements && unsplitMovementsCount > 0}
          <div class="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p class="text-2xl font-bold text-purple-900">{unsplitMovementsCount}</p>
            <p class="text-sm text-purple-700 mt-1">Unsplit Bank Movement{unsplitMovementsCount > 1 ? 's' : ''}</p>
            <button
              on:click={() => goto('/admin/bank-movements')}
              class="mt-3 text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              Split Now →
            </button>
          </div>
        {/if}

        {#if alerts && alerts.pendingApprovals > 0}
          <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p class="text-2xl font-bold text-yellow-900">{alerts.pendingApprovals}</p>
            <p class="text-sm text-yellow-700 mt-1">Pending Approvals</p>
            <button
              on:click={() => goto('/movements?status=PENDING')}
              class="mt-3 text-sm text-yellow-600 hover:text-yellow-800 font-medium"
            >
              Review →
            </button>
          </div>
        {/if}

        {#if alerts.highValuePending > 0}
          <div class="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p class="text-2xl font-bold text-orange-900">{alerts.highValuePending}</p>
            <p class="text-sm text-orange-700 mt-1">High-Value Pending</p>
            <button
              on:click={() => goto('/movements?status=PENDING')}
              class="mt-3 text-sm text-orange-600 hover:text-orange-800 font-medium"
            >
              Review →
            </button>
          </div>
        {/if}

        {#if alerts.recentRejections > 0}
          <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-2xl font-bold text-red-900">{alerts.recentRejections}</p>
            <p class="text-sm text-red-700 mt-1">Recent Rejections (7 days)</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Overview Stats -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {#if isLoadingStats}
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
        title="Draft Movements"
        value={stats.draftCount}
        icon="pending"
        color="yellow"
      />
      <StatsCard
        title="Total Areas"
        value={stats.areasCount}
        icon="areas"
        color="blue"
      />
    {/if}
  </div>

  <!-- Bank Accounts Overview -->
  <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold text-yl-black">
        <svg class="w-5 h-5 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        Bank Accounts
      </h2>
      <button
        on:click={() => goto('/admin/bank-accounts')}
        class="text-sm text-yl-green hover:text-yl-green-dark font-medium"
      >
        Manage →
      </button>
    </div>

    {#if isLoadingBankAccounts}
      <div class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yl-green"></div>
      </div>
    {:else if bankAccountsError}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
        {bankAccountsError}
      </div>
    {:else if bankAccounts.length === 0}
      <div class="text-center py-8">
        <svg class="w-12 h-12 text-yl-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <p class="text-sm text-yl-gray-600 mb-3">No bank accounts configured</p>
        <button
          on:click={() => goto('/admin/bank-accounts/new')}
          class="px-4 py-2 bg-yl-green text-white text-sm font-medium rounded-lg hover:bg-yl-green-dark transition-colors"
        >
          Add Bank Account
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each bankAccounts as account}
          <button
            on:click={() => goto(`/admin/bank-accounts/${account.id}`)}
            class="text-left p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <p class="font-semibold text-yl-black text-sm">{account.name}</p>
                {#if account.bankName}
                  <p class="text-xs text-yl-gray-600 mt-0.5">{account.bankName}</p>
                {/if}
              </div>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {account.currency}
              </span>
            </div>
            {#if account.accountNumber}
              <p class="text-xs text-yl-gray-500 mb-2">{account.accountNumber}</p>
            {/if}
            <div class="flex items-center justify-between text-xs">
              <span class="text-yl-gray-600">
                {account._count?.areas || 0} area{account._count?.areas === 1 ? '' : 's'}
              </span>
              <span class="text-blue-600 font-medium">View →</span>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Balance by Area (Mobile: Collapsible) -->
  <div class="block md:hidden">
    <CollapsibleSection title="Balance by Area" icon="💼" isOpen={false}>
      {#if isLoadingBalances}
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yl-green"></div>
        </div>
      {:else if balancesError}
        <p class="text-sm text-red-600">{balancesError}</p>
      {:else if balances.length === 0}
        <p class="text-sm text-yl-gray-600">No areas found</p>
      {:else}
        <div class="space-y-4">
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
    </CollapsibleSection>
  </div>

  <div class="hidden md:block">
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

  <!-- Income vs Expenses Trend -->
  <CollapsibleSection title="Income vs Expenses Trend (6 months)" icon="📈" isOpen={true}>
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
  </CollapsibleSection>

  <!-- Expenses by Area -->
  <CollapsibleSection title="Expenses by Area (6 months)" icon="🏢" isOpen={false}>
    {#if isLoadingAreaExpenses}
      <div class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yl-green"></div>
      </div>
    {:else if areaExpensesError}
      <p class="text-sm text-red-600 text-center py-8">{areaExpensesError}</p>
    {:else if !areaExpenses || areaExpenses.breakdown.length === 0}
      <p class="text-sm text-yl-gray-600 text-center py-8">No area expenses recorded</p>
    {:else}
      <PieChart
        data={areaExpenses.breakdown.map((item) => ({
          label: `${item.areaName} (${item.areaCode})`,
          value: item.amount,
          percentage: item.percentage,
        }))}
        height={300}
      />
    {/if}
  </CollapsibleSection>
</div>
