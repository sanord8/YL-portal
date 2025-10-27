<script lang="ts">
  export let movement: any;
  export let isAreaManager: boolean = false;
  export let isSelected: boolean = false;
  export let onSelect: (() => void) | null = null;
  export let onView: (() => void) | null = null;

  function formatCurrency(amount: number, currency: string = 'EUR') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  }

  function formatDate(date: string | Date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
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
      case 'TRANSFER':
        return 'bg-blue-100 text-blue-800';
      case 'DISTRIBUTION':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'APPROVED':
        return 'bg-yl-green/10 text-yl-green';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getBankAccountColor(index: number) {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-cyan-100 text-cyan-800',
      'bg-teal-100 text-teal-800',
    ];
    return colors[index % colors.length];
  }

  function handleClick() {
    if (onView) onView();
  }

  function handleCheckboxChange(e: Event) {
    e.stopPropagation();
    if (onSelect) onSelect();
  }
</script>

<div
  class="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
  class:cursor-pointer={movement.status !== 'PENDING' || !isAreaManager}
>
  <div class="flex items-start gap-3 mb-3">
    {#if isAreaManager && movement.status === 'PENDING'}
      <input
        type="checkbox"
        checked={isSelected}
        on:change={handleCheckboxChange}
        class="mt-1 w-4 h-4 text-yl-green border-gray-300 rounded focus:ring-yl-green"
      />
    {/if}

    <div
      class="flex-1"
      on:click={handleClick}
      on:keydown={(e) => e.key === 'Enter' && handleClick()}
      role="button"
      tabindex="0"
    >
      <div class="flex justify-between items-start mb-3">
        <div class="flex-1">
          <p class="text-sm font-medium text-yl-black">{movement.description}</p>
          <p class="text-xs text-yl-gray-600 mt-1">
            {formatDate(movement.transactionDate)}
          </p>
        </div>
        <span
          class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(
            movement.status
          )} ml-2"
        >
          {movement.status}
        </span>
      </div>

      <!-- Badges Row -->
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <!-- Type Badge -->
        <span
          class="px-2 py-1 text-xs font-medium rounded-full {getTypeColor(movement.type)}"
        >
          {movement.type}
        </span>

        <!-- Bank Account Badge -->
        {#if movement.sourceBankAccount}
          <span
            class="px-2 py-1 text-xs font-medium rounded-full {getBankAccountColor(
              movement.sourceBankAccount.id?.charCodeAt(0) || 0
            )}"
            title="Source bank account"
          >
            <svg class="w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            {movement.sourceBankAccount.name}
          </span>
        {/if}

        <!-- Internal Transfer Badge -->
        {#if movement.isInternalTransfer}
          <span
            class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700"
            title="Internal transfer (same bank account)"
          >
            <svg class="w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Internal
          </span>
        {/if}

        <!-- Split Parent Badge -->
        {#if movement.isSplitParent}
          <span
            class="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800"
            title="Split into {movement.children?.length || 0} parts"
          >
            <svg class="w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Split ({movement.children?.length || 0})
          </span>
        {/if}

        <!-- Child Movement Badge -->
        {#if movement.parentId}
          <span
            class="px-2 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-700"
            title="Part of split movement"
          >
            <svg class="w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Split Part
          </span>
        {/if}
      </div>

      <div class="flex justify-between items-center">
        <div class="flex items-center space-x-2">
          <span class="text-xs text-yl-gray-600">{movement.area?.name || 'N/A'}</span>
          {#if movement.department}
            <span class="text-xs text-yl-gray-500">· {movement.department.name}</span>
          {/if}
        </div>
        <p
          class="text-sm font-bold {movement.type === 'INCOME'
            ? 'text-green-600'
            : 'text-yl-black'}"
        >
          {movement.type === 'INCOME' ? '+' : '-'}{formatCurrency(
            movement.amount,
            movement.currency
          )}
        </p>
      </div>
    </div>
  </div>
</div>
