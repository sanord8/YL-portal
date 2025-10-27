<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { trpc } from '$lib/trpc';
  import Button from '$lib/components/Button.svelte';
  import BulkActionBar from '$lib/components/BulkActionBar.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import InfoDialog from '$lib/components/InfoDialog.svelte';
  import { goto } from '$app/navigation';
  import { websocketStore } from '$lib/stores/websocketStore';
  import { toastStore } from '$lib/stores/toastStore';
  import { authStore } from '$lib/stores/authStore';
  import { debounce } from '$lib/utils/debounce';

  // Movement data
  let movements: any[] = [];
  let nextCursor: string | undefined = undefined;
  let isLoading = true;
  let isLoadingMore = false;
  let error = '';
  let scrollContainer: HTMLElement;

  // Filters
  let selectedArea = '';
  let selectedDepartment = '';
  let selectedType = '';
  let selectedStatus = '';
  let needsMyApproval = false;
  let searchQuery = '';
  let startDate = '';
  let endDate = '';
  let minAmount = '';
  let maxAmount = '';
  let sortBy: 'date' | 'amount' | 'status' | 'type' = 'date';
  let sortOrder: 'asc' | 'desc' = 'desc';

  // Bulk selection
  let selectedMovementIds = new Set<string>();
  let isApproving = false;
  let isRejecting = false;
  let showBulkApproveDialog = false;
  let showBulkRejectDialog = false;
  let showBulkApproveSuccess = false;
  let showBulkRejectSuccess = false;
  let bulkApproveComment = '';
  let bulkRejectReason = '';
  let bulkRejectComment = '';
  let bulkActionCount = 0;
  let isAreaManager = false;

  // Areas and departments for filter dropdowns
  let areas: any[] = [];
  let departments: any[] = [];

  // Type options
  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'INCOME', label: 'Income' },
    { value: 'EXPENSE', label: 'Expense' },
    { value: 'TRANSFER', label: 'Transfer' },
    { value: 'DISTRIBUTION', label: 'Distribution' },
  ];

  // Status options
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  onMount(async () => {
    await loadMovements();
  });

  async function loadMovements(append = false) {
    if (!append) {
      isLoading = true;
      movements = [];
      nextCursor = undefined;
    } else {
      isLoadingMore = true;
    }

    error = '';

    try {
      // Convert amount strings to cents (integers)
      const minAmountCents = minAmount ? Math.round(parseFloat(minAmount) * 100) : undefined;
      const maxAmountCents = maxAmount ? Math.round(parseFloat(maxAmount) * 100) : undefined;

      const result = await trpc.movement.list.query({
        limit: 100,
        cursor: append ? nextCursor : undefined,
        areaId: selectedArea || undefined,
        departmentId: selectedDepartment || undefined,
        type: selectedType || undefined,
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
        minAmount: minAmountCents,
        maxAmount: maxAmountCents,
        sortBy,
        sortOrder,
      });

      if (append) {
        movements = [...movements, ...result.movements];
      } else {
        movements = result.movements;
      }

      nextCursor = result.nextCursor;
    } catch (err: any) {
      console.error('Failed to load movements:', err);
      error = err.message || 'Failed to load movements. Please try again.';
    } finally {
      isLoading = false;
      isLoadingMore = false;
    }
  }

  function handleFilterChange() {
    loadMovements();
  }

  // Debounced version for search input (500ms delay)
  const debouncedFilterChange = debounce(() => {
    loadMovements();
  }, 500);

  // Debounced version for amount inputs (300ms delay)
  const debouncedAmountFilterChange = debounce(() => {
    loadMovements();
  }, 300);

  // Load areas for filter dropdown
  async function loadAreas() {
    try {
      areas = await trpc.area.list.query();
    } catch (err) {
      console.error('Failed to load areas:', err);
    }
  }

  // Load departments for filter dropdown
  async function loadDepartments() {
    try {
      const areaId = selectedArea || undefined;
      departments = await trpc.department.list.query({ areaId });
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  }

  // Update departments when area changes
  async function handleAreaChange() {
    selectedDepartment = '';
    await loadDepartments();
    handleFilterChange();
  }

  // Infinite scroll handler
  function handleScroll() {
    if (!scrollContainer || isLoadingMore || !nextCursor) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const scrolledPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Load more when scrolled 80% down
    if (scrolledPercentage > 0.8) {
      loadMovements(true);
    }
  }

  // Memoized formatters for performance
  const currencyFormatters = new Map<string, Intl.NumberFormat>();

  function formatCurrency(amount: number, currency: string = 'EUR') {
    if (!currencyFormatters.has(currency)) {
      currencyFormatters.set(
        currency,
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
        })
      );
    }
    return currencyFormatters.get(currency)!.format(amount / 100); // Convert cents to currency
  }

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  function formatDate(date: string | Date) {
    return dateFormatter.format(new Date(date));
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

  function handleCreateMovement() {
    goto('/movements/new');
  }

  function handleBulkImport() {
    goto('/movements/import');
  }

  function handleViewMovement(id: string) {
    goto(`/movements/${id}`);
  }

  // Check if user is area manager for any area
  async function checkIsAreaManager() {
    try {
      const areasData = await trpc.area.list.query();
      // If user has any area assignments, they can manage movements
      isAreaManager = areasData.length > 0;
    } catch (err) {
      console.error('Failed to check manager status:', err);
      isAreaManager = false;
    }
  }

  // Bulk selection handlers
  function toggleMovementSelection(movementId: string) {
    const newSet = new Set(selectedMovementIds);
    if (newSet.has(movementId)) {
      newSet.delete(movementId);
    } else {
      newSet.add(movementId);
    }
    selectedMovementIds = newSet;
  }

  function toggleSelectAll() {
    if (selectedMovementIds.size === pendingMovements.length) {
      selectedMovementIds = new Set();
    } else {
      selectedMovementIds = new Set(pendingMovements.map(m => m.id));
    }
  }

  function clearSelection() {
    selectedMovementIds = new Set();
  }

  // Get only pending movements for bulk selection
  $: pendingMovements = movements.filter(m => m.status === 'PENDING');
  $: allPendingSelected = pendingMovements.length > 0 && selectedMovementIds.size === pendingMovements.length;

  // Bulk approve handler
  async function handleBulkApprove() {
    try {
      isApproving = true;
      bulkActionCount = selectedMovementIds.size;
      await trpc.movement.bulkApprove.mutate({
        ids: Array.from(selectedMovementIds),
        comment: bulkApproveComment.trim() || undefined,
      });
      selectedMovementIds = new Set();
      bulkApproveComment = '';
      showBulkApproveDialog = false;
      showBulkApproveSuccess = true;
      await loadMovements();
    } catch (err: any) {
      console.error('Failed to bulk approve:', err);
      toastStore.add(err.message || 'Failed to approve movements. Please try again.', 'error');
    } finally {
      isApproving = false;
    }
  }

  // Bulk reject handler
  async function handleBulkReject() {
    try {
      isRejecting = true;
      bulkActionCount = selectedMovementIds.size;
      await trpc.movement.bulkReject.mutate({
        ids: Array.from(selectedMovementIds),
        reason: bulkRejectReason.trim() || undefined,
        comment: bulkRejectComment.trim() || undefined,
      });
      selectedMovementIds = new Set();
      bulkRejectReason = '';
      bulkRejectComment = '';
      showBulkRejectDialog = false;
      showBulkRejectSuccess = true;
      await loadMovements();
    } catch (err: any) {
      console.error('Failed to bulk reject:', err);
      toastStore.add(err.message || 'Failed to reject movements. Please try again.', 'error');
    } finally {
      isRejecting = false;
    }
  }

  // Update onMount to check manager status and subscribe to WebSocket events
  let unsubscribeMovementCreated: (() => void) | null = null;
  let unsubscribeMovementUpdated: (() => void) | null = null;
  let unsubscribeMovementDeleted: (() => void) | null = null;
  let unsubscribeMovementApproved: (() => void) | null = null;
  let unsubscribeMovementRejected: (() => void) | null = null;
  let unsubscribeBulkApproved: (() => void) | null = null;
  let unsubscribeBulkRejected: (() => void) | null = null;

  onMount(async () => {
    await Promise.all([loadMovements(), checkIsAreaManager(), loadAreas(), loadDepartments()]);

    // Add scroll listener for infinite scroll
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
    }

    // Subscribe to real-time WebSocket events
    unsubscribeMovementCreated = websocketStore.on('movement:created', (event) => {
      console.log('Movement created:', event);
      // Add new movement to the top of the list
      const newMovement = event.data;
      movements = [newMovement, ...movements];
      toastStore.info(`New movement created: ${newMovement.description}`);
    });

    unsubscribeMovementUpdated = websocketStore.on('movement:updated', (event) => {
      console.log('Movement updated:', event);
      // Update existing movement in the list using index-based update
      const updatedMovement = event.data;
      const index = movements.findIndex((m) => m.id === updatedMovement.id);
      if (index !== -1) {
        movements[index] = { ...movements[index], ...updatedMovement };
        movements = movements; // Trigger Svelte reactivity
      }
      toastStore.info(`Movement updated: ${updatedMovement.description}`);
    });

    unsubscribeMovementDeleted = websocketStore.on('movement:deleted', (event) => {
      console.log('Movement deleted:', event);
      // Remove movement from the list using index-based deletion
      const { movementId } = event.data;
      const index = movements.findIndex((m) => m.id === movementId);
      if (index !== -1) {
        movements.splice(index, 1);
        movements = movements; // Trigger Svelte reactivity
      }
      toastStore.warning('A movement was deleted');
    });

    unsubscribeMovementApproved = websocketStore.on('movement:approved', (event) => {
      console.log('Movement approved:', event);
      // Update movement status using index-based update
      const { movementId, approverName } = event.data;
      const index = movements.findIndex((m) => m.id === movementId);
      if (index !== -1) {
        movements[index] = { ...movements[index], status: 'APPROVED' };
        movements = movements; // Trigger Svelte reactivity
      }
      toastStore.success(`Movement approved by ${approverName}`);
    });

    unsubscribeMovementRejected = websocketStore.on('movement:rejected', (event) => {
      console.log('Movement rejected:', event);
      // Update movement status using index-based update
      const { movementId, rejecterName } = event.data;
      const index = movements.findIndex((m) => m.id === movementId);
      if (index !== -1) {
        movements[index] = { ...movements[index], status: 'REJECTED' };
        movements = movements; // Trigger Svelte reactivity
      }
      toastStore.error(`Movement rejected by ${rejecterName}`);
    });

    unsubscribeBulkApproved = websocketStore.on('movement:bulk-approved', (event) => {
      console.log('Bulk approved:', event);
      const { movementIds, count } = event.data;
      // Use Set for O(1) lookup and update in place
      const idSet = new Set(movementIds);
      for (let i = 0; i < movements.length; i++) {
        if (idSet.has(movements[i].id)) {
          movements[i] = { ...movements[i], status: 'APPROVED' };
        }
      }
      movements = movements; // Trigger Svelte reactivity
      toastStore.success(`${count} movements approved`);
    });

    unsubscribeBulkRejected = websocketStore.on('movement:bulk-rejected', (event) => {
      console.log('Bulk rejected:', event);
      const { movementIds, count } = event.data;
      // Use Set for O(1) lookup and update in place
      const idSet = new Set(movementIds);
      for (let i = 0; i < movements.length; i++) {
        if (idSet.has(movements[i].id)) {
          movements[i] = { ...movements[i], status: 'REJECTED' };
        }
      }
      movements = movements; // Trigger Svelte reactivity
      toastStore.error(`${count} movements rejected`);
    });
  });

  // Cleanup WebSocket subscriptions and scroll listener on unmount
  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', handleScroll);
    }
    unsubscribeMovementCreated?.();
    unsubscribeMovementUpdated?.();
    unsubscribeMovementDeleted?.();
    unsubscribeMovementApproved?.();
    unsubscribeMovementRejected?.();
    unsubscribeBulkApproved?.();
    unsubscribeBulkRejected?.();
  });
</script>

<svelte:head>
  <title>Movements - YoungLife Portal</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div class="flex-1">
      <h1 class="text-2xl sm:text-3xl font-bold text-yl-black">Financial Movements</h1>
      <p class="text-sm text-yl-gray-600 mt-1">Track and manage all financial transactions</p>
    </div>
    <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      {#if $authStore.user?.isAdmin}
        <Button variant="secondary" size="md" on:click={handleBulkImport} class="w-full sm:w-auto">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Bulk Import
        </Button>
      {/if}
      <Button variant="primary" size="md" on:click={handleCreateMovement} class="w-full sm:w-auto">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Movement
      </Button>
    </div>
  </div>

  <!-- Filters -->
  <div class="bg-white rounded-lg shadow border border-gray-200 p-4">
    <!-- Search Bar -->
    <div class="mb-4">
      <label for="search" class="block text-sm font-medium text-yl-black mb-2">
        Search
      </label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-yl-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          id="search"
          type="text"
          bind:value={searchQuery}
          on:input={debouncedFilterChange}
          placeholder="Search by description, reference, or category..."
          class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        />
      </div>
    </div>

    <!-- Filter Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <!-- Area Filter -->
      <div>
        <label for="area-filter" class="block text-sm font-medium text-yl-black mb-2">
          Area
        </label>
        <select
          id="area-filter"
          bind:value={selectedArea}
          on:change={handleAreaChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        >
          <option value="">All Areas</option>
          {#each areas as area}
            <option value={area.id}>{area.name}</option>
          {/each}
        </select>
      </div>

      <!-- Department Filter -->
      <div>
        <label for="department-filter" class="block text-sm font-medium text-yl-black mb-2">
          Department
        </label>
        <select
          id="department-filter"
          bind:value={selectedDepartment}
          on:change={handleFilterChange}
          disabled={!selectedArea && departments.length === 0}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">All Departments</option>
          {#each departments as dept}
            <option value={dept.id}>{dept.name}</option>
          {/each}
        </select>
      </div>

      <!-- Type Filter -->
      <div>
        <label for="type-filter" class="block text-sm font-medium text-yl-black mb-2">
          Type
        </label>
        <select
          id="type-filter"
          bind:value={selectedType}
          on:change={handleFilterChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        >
          {#each typeOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <!-- Status Filter -->
      <div>
        <label for="status-filter" class="block text-sm font-medium text-yl-black mb-2">
          Status
        </label>
        <select
          id="status-filter"
          bind:value={selectedStatus}
          on:change={handleFilterChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        >
          {#each statusOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <!-- Start Date Filter -->
      <div>
        <label for="start-date" class="block text-sm font-medium text-yl-black mb-2">
          Start Date
        </label>
        <input
          id="start-date"
          type="date"
          bind:value={startDate}
          on:change={handleFilterChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        />
      </div>

      <!-- End Date Filter -->
      <div>
        <label for="end-date" class="block text-sm font-medium text-yl-black mb-2">
          End Date
        </label>
        <input
          id="end-date"
          type="date"
          bind:value={endDate}
          on:change={handleFilterChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        />
      </div>

      <!-- Min Amount Filter -->
      <div>
        <label for="min-amount" class="block text-sm font-medium text-yl-black mb-2">
          Min Amount
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span class="text-yl-gray-500">€</span>
          </div>
          <input
            id="min-amount"
            type="number"
            step="0.01"
            min="0"
            bind:value={minAmount}
            on:input={debouncedAmountFilterChange}
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
          />
        </div>
      </div>

      <!-- Max Amount Filter -->
      <div>
        <label for="max-amount" class="block text-sm font-medium text-yl-black mb-2">
          Max Amount
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span class="text-yl-gray-500">€</span>
          </div>
          <input
            id="max-amount"
            type="number"
            step="0.01"
            min="0"
            bind:value={maxAmount}
            on:input={debouncedAmountFilterChange}
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
          />
        </div>
      </div>

      <!-- Sort By -->
      <div>
        <label for="sort-by" class="block text-sm font-medium text-yl-black mb-2">
          Sort By
        </label>
        <select
          id="sort-by"
          bind:value={sortBy}
          on:change={handleFilterChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        >
          <option value="date">Date</option>
          <option value="amount">Amount</option>
          <option value="status">Status</option>
          <option value="type">Type</option>
        </select>
      </div>

      <!-- Sort Order -->
      <div>
        <label for="sort-order" class="block text-sm font-medium text-yl-black mb-2">
          Sort Order
        </label>
        <select
          id="sort-order"
          bind:value={sortOrder}
          on:change={handleFilterChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      <!-- Needs My Approval Filter (Only show if user is manager) -->
      {#if isAreaManager}
        <div class="flex items-end">
          <label class="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={needsMyApproval}
              on:change={() => {
                if (needsMyApproval) {
                  selectedStatus = 'PENDING';
                } else {
                  selectedStatus = '';
                }
                handleFilterChange();
              }}
              class="w-4 h-4 text-yl-green border-gray-300 rounded focus:ring-yl-green"
            />
            <span class="text-sm font-medium text-yl-black">Needs My Approval</span>
          </label>
        </div>
      {/if}

      <!-- Clear Filters -->
      <div class="flex items-end">
        <button
          on:click={() => {
            selectedType = '';
            selectedStatus = '';
            selectedArea = '';
            selectedDepartment = '';
            needsMyApproval = false;
            searchQuery = '';
            startDate = '';
            endDate = '';
            minAmount = '';
            maxAmount = '';
            sortBy = 'date';
            sortOrder = 'desc';
            loadDepartments();
            handleFilterChange();
          }}
          class="w-full px-4 py-2 text-sm font-medium text-yl-gray-600 hover:text-yl-black border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  </div>

  <!-- Movements List -->
  {#if isLoading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yl-green"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-red-800 font-semibold mb-2">Error Loading Movements</p>
      <p class="text-red-600 text-sm">{error}</p>
      <Button variant="secondary" size="sm" class="mt-4" on:click={() => loadMovements()}>
        Try Again
      </Button>
    </div>
  {:else if movements.length === 0}
    <div class="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
      <svg class="w-16 h-16 text-yl-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="text-lg font-semibold text-yl-black mb-2">No Movements Found</h3>
      <p class="text-sm text-yl-gray-600 mb-6">
        {#if searchQuery || selectedType || selectedStatus || selectedArea || selectedDepartment || startDate || endDate || minAmount || maxAmount}
          No movements match your current filters. Try adjusting your search criteria.
        {:else}
          Get started by creating your first financial movement.
        {/if}
      </p>
      <Button variant="primary" size="md" on:click={handleCreateMovement}>
        Create First Movement
      </Button>
    </div>
  {:else}
    <!-- Desktop Table View -->
    <div class="hidden md:block bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            {#if isAreaManager && pendingMovements.length > 0}
              <th class="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  on:change={toggleSelectAll}
                  class="w-4 h-4 text-yl-green border-gray-300 rounded focus:ring-yl-green"
                  title="Select all pending movements"
                />
              </th>
            {/if}
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Date
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Description
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Type
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Area
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Amount
            </th>
            <th class="px-6 py-3 text-center text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-yl-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each movements as movement}
            <tr class="hover:bg-gray-50 transition-colors" class:cursor-pointer={movement.status !== 'PENDING' || !isAreaManager}>
              {#if isAreaManager && pendingMovements.length > 0}
                <td class="px-6 py-4 whitespace-nowrap">
                  {#if movement.status === 'PENDING'}
                    <input
                      type="checkbox"
                      checked={selectedMovementIds.has(movement.id)}
                      on:change|stopPropagation={() => toggleMovementSelection(movement.id)}
                      class="w-4 h-4 text-yl-green border-gray-300 rounded focus:ring-yl-green"
                    />
                  {/if}
                </td>
              {/if}
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-yl-black"
                on:click={() => handleViewMovement(movement.id)}
                role="button"
                tabindex="0"
              >
                {formatDate(movement.transactionDate)}
              </td>
              <td
                class="px-6 py-4 text-sm text-yl-black cursor-pointer"
                on:click={() => handleViewMovement(movement.id)}
                role="button"
                tabindex="0"
              >
                <div class="max-w-xs truncate">{movement.description}</div>
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap cursor-pointer"
                on:click={() => handleViewMovement(movement.id)}
                role="button"
                tabindex="0"
              >
                <span class="px-2 py-1 text-xs font-medium rounded-full {getTypeColor(movement.type)}">
                  {movement.type}
                </span>
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-yl-gray-600 cursor-pointer"
                on:click={() => handleViewMovement(movement.id)}
                role="button"
                tabindex="0"
              >
                {movement.area?.name || 'N/A'}
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm font-medium text-right {movement.type === 'INCOME' ? 'text-green-600' : 'text-yl-black'} cursor-pointer"
                on:click={() => handleViewMovement(movement.id)}
                role="button"
                tabindex="0"
              >
                {movement.type === 'INCOME' ? '+' : '-'}{formatCurrency(movement.amount, movement.currency)}
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-center cursor-pointer"
                on:click={() => handleViewMovement(movement.id)}
                role="button"
                tabindex="0"
              >
                <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(movement.status)}">
                  {movement.status}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  on:click|stopPropagation={() => handleViewMovement(movement.id)}
                  class="text-yl-green hover:text-yl-green-accent font-medium"
                >
                  View
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View -->
    <div class="md:hidden space-y-4">
      {#each movements as movement}
        <div
          class="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
          class:cursor-pointer={movement.status !== 'PENDING' || !isAreaManager}
        >
          <div class="flex items-start gap-3 mb-3">
            <!-- Checkbox for pending movements if user is manager -->
            {#if isAreaManager && movement.status === 'PENDING'}
              <input
                type="checkbox"
                checked={selectedMovementIds.has(movement.id)}
                on:change|stopPropagation={() => toggleMovementSelection(movement.id)}
                class="mt-1 w-4 h-4 text-yl-green border-gray-300 rounded focus:ring-yl-green"
              />
            {/if}

            <div
              class="flex-1"
              on:click={() => handleViewMovement(movement.id)}
              on:keydown={(e) => e.key === 'Enter' && handleViewMovement(movement.id)}
              role="button"
              tabindex="0"
            >
              <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                  <p class="text-sm font-medium text-yl-black">{movement.description}</p>
                  <p class="text-xs text-yl-gray-600 mt-1">{formatDate(movement.transactionDate)}</p>
                </div>
                <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(movement.status)} ml-2">
                  {movement.status}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <div class="flex items-center space-x-2">
                  <span class="px-2 py-1 text-xs font-medium rounded-full {getTypeColor(movement.type)}">
                    {movement.type}
                  </span>
                  <span class="text-xs text-yl-gray-600">{movement.area?.name || 'N/A'}</span>
                </div>
                <p class="text-sm font-bold {movement.type === 'INCOME' ? 'text-green-600' : 'text-yl-black'}">
                  {movement.type === 'INCOME' ? '+' : '-'}{formatCurrency(movement.amount, movement.currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Loading More Indicator -->
    {#if isLoadingMore}
      <div class="flex justify-center items-center py-8">
        <div class="flex items-center space-x-3 text-yl-gray-600">
          <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm">Loading more movements...</span>
        </div>
      </div>
    {:else if nextCursor}
      <div class="flex justify-center py-4">
        <p class="text-sm text-yl-gray-500">Scroll down to load more</p>
      </div>
    {:else if movements.length > 0}
      <div class="flex justify-center py-4">
        <p class="text-sm text-yl-gray-500">No more movements to load</p>
      </div>
    {/if}
  {/if}

  <!-- Bulk Action Bar -->
  {#if isAreaManager}
    <BulkActionBar
      selectedCount={selectedMovementIds.size}
      {isApproving}
      {isRejecting}
      on:approve={() => { showBulkApproveDialog = true; }}
      on:reject={() => { showBulkRejectDialog = true; }}
      on:clear={clearSelection}
    />
  {/if}
</div>

<!-- Bulk Approve Dialog -->
<ConfirmDialog
  open={showBulkApproveDialog}
  title="Approve Selected Movements"
  confirmText="Approve {selectedMovementIds.size} Movement{selectedMovementIds.size === 1 ? '' : 's'}"
  cancelText="Cancel"
  variant="success"
  onConfirm={handleBulkApprove}
  onCancel={() => {
    showBulkApproveDialog = false;
    bulkApproveComment = '';
  }}
  isLoading={isApproving}
  disabled={isApproving}
>
  <p class="text-sm text-yl-gray-600 mb-4">
    You are about to approve {selectedMovementIds.size} movement{selectedMovementIds.size === 1 ? '' : 's'}.
    This action cannot be undone.
  </p>

  <div>
    <label for="bulk-approve-comment" class="block text-sm font-medium text-yl-black mb-2">
      Comment (Optional)
    </label>
    <textarea
      id="bulk-approve-comment"
      bind:value={bulkApproveComment}
      rows="3"
      placeholder="Add a comment for this approval..."
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent resize-none"
    ></textarea>
  </div>
</ConfirmDialog>

<!-- Bulk Reject Dialog -->
<ConfirmDialog
  open={showBulkRejectDialog}
  title="Reject Selected Movements"
  confirmText="Reject {selectedMovementIds.size} Movement{selectedMovementIds.size === 1 ? '' : 's'}"
  cancelText="Cancel"
  variant="danger"
  onConfirm={handleBulkReject}
  onCancel={() => {
    showBulkRejectDialog = false;
    bulkRejectReason = '';
    bulkRejectComment = '';
  }}
  isLoading={isRejecting}
  disabled={isRejecting}
>
  <p class="text-sm text-yl-gray-600 mb-4">
    You are about to reject {selectedMovementIds.size} movement{selectedMovementIds.size === 1 ? '' : 's'}.
    This action cannot be undone.
  </p>

  <div class="space-y-4">
    <div>
      <label for="bulk-reject-reason" class="block text-sm font-medium text-yl-black mb-2">
        Rejection Reason (Optional)
      </label>
      <input
        type="text"
        id="bulk-reject-reason"
        bind:value={bulkRejectReason}
        placeholder="e.g., Missing documentation, Incorrect amount..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
      />
    </div>

    <div>
      <label for="bulk-reject-comment" class="block text-sm font-medium text-yl-black mb-2">
        Additional Comment (Optional)
      </label>
      <textarea
        id="bulk-reject-comment"
        bind:value={bulkRejectComment}
        rows="3"
        placeholder="Add additional details about the rejection..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
      ></textarea>
    </div>
  </div>
</ConfirmDialog>

<!-- Bulk Approve Success Dialog -->
<InfoDialog
  open={showBulkApproveSuccess}
  title="Movements Approved"
  message="Successfully approved {bulkActionCount} movement{bulkActionCount === 1 ? '' : 's'}. The changes have been reflected across the system."
  variant="success"
  okText="OK"
  onOk={() => { showBulkApproveSuccess = false; }}
/>

<!-- Bulk Reject Success Dialog -->
<InfoDialog
  open={showBulkRejectSuccess}
  title="Movements Rejected"
  message="Successfully rejected {bulkActionCount} movement{bulkActionCount === 1 ? '' : 's'}. The submitters have been notified."
  variant="warning"
  okText="OK"
  onOk={() => { showBulkRejectSuccess = false; }}
/>
