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
      <div class="flex justify-between items-center">
        <div class="flex items-center space-x-2">
          <span
            class="px-2 py-1 text-xs font-medium rounded-full {getTypeColor(movement.type)}"
          >
            {movement.type}
          </span>
          <span class="text-xs text-yl-gray-600">{movement.area?.name || 'N/A'}</span>
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
