<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc';
  import Button from '$lib/components/Button.svelte';
  import ApprovalStatusBadge from '$lib/components/ApprovalStatusBadge.svelte';
  import ApprovalHistoryTimeline from '$lib/components/ApprovalHistoryTimeline.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import InfoDialog from '$lib/components/InfoDialog.svelte';
  import FileUpload from '$lib/components/FileUpload.svelte';
  import AttachmentList from '$lib/components/AttachmentList.svelte';
  import { toastStore } from '$lib/stores/toastStore';

  $: movementId = $page.params.id;

  let movement: any = null;
  let approvalHistory: any[] = [];
  let isLoading = true;
  let isLoadingHistory = true;
  let error = '';

  // Approval state
  let isAreaManager = false;
  let showApproveDialog = false;
  let showRejectDialog = false;
  let showApproveSuccess = false;
  let showRejectSuccess = false;
  let approveComment = '';
  let rejectReason = '';
  let rejectComment = '';
  let newComment = '';
  let isApproving = false;
  let isRejecting = false;
  let isCommenting = false;

  // Delete confirmation
  let showDeleteConfirm = false;
  let isDeleting = false;

  // Attachments
  let attachmentListRef: any;

  onMount(async () => {
    await loadMovement();
    await loadApprovalHistory();
  });

  async function loadMovement() {
    isLoading = true;
    error = '';

    try {
      movement = await trpc.movement.getById.query({ id: movementId });
      await checkIsAreaManager();
    } catch (err: any) {
      console.error('Failed to load movement:', err);

      if (err.data?.code === 'NOT_FOUND') {
        error = 'Movement not found.';
      } else if (err.data?.code === 'FORBIDDEN') {
        error = 'You do not have permission to view this movement.';
      } else {
        error = err.message || 'Failed to load movement. Please try again.';
      }
    } finally {
      isLoading = false;
    }
  }

  async function loadApprovalHistory() {
    if (!movementId) return;

    try {
      isLoadingHistory = true;
      approvalHistory = await trpc.movement.getApprovalHistory.query({ id: movementId });
    } catch (err: any) {
      console.error('Failed to load approval history:', err);
    } finally {
      isLoadingHistory = false;
    }
  }

  async function checkIsAreaManager() {
    if (!movement) return;

    try {
      // Get user's areas to check if they're a manager
      const areas = await trpc.area.list.query();
      const userArea = areas.find((a: any) => a.id === movement.areaId);
      // In a real implementation, we'd check the areaRole field
      // For now, assume all users with area access are managers
      isAreaManager = !!userArea;
    } catch (err) {
      console.error('Failed to check manager status:', err);
      isAreaManager = false;
    }
  }

  async function handleApprove() {
    if (!movement) return;

    try {
      isApproving = true;
      await trpc.movement.approve.mutate({
        id: movementId,
        comment: approveComment.trim() || undefined,
      });

      showApproveDialog = false;
      approveComment = '';
      showApproveSuccess = true;
      await loadMovement();
      await loadApprovalHistory();
    } catch (err: any) {
      toastStore.add(`Failed to approve movement: ${err.message}`, 'error');
    } finally {
      isApproving = false;
    }
  }

  async function handleReject() {
    if (!movement) return;

    try {
      isRejecting = true;
      await trpc.movement.reject.mutate({
        id: movementId,
        reason: rejectReason.trim() || undefined,
        comment: rejectComment.trim() || undefined,
      });

      showRejectDialog = false;
      rejectReason = '';
      rejectComment = '';
      showRejectSuccess = true;
      await loadMovement();
      await loadApprovalHistory();
    } catch (err: any) {
      toastStore.add(`Failed to reject movement: ${err.message}`, 'error');
    } finally {
      isRejecting = false;
    }
  }

  async function handleAddComment() {
    if (!movement || !newComment.trim()) return;

    try {
      isCommenting = true;
      await trpc.movement.addComment.mutate({
        id: movementId,
        comment: newComment.trim(),
      });

      newComment = '';
      await loadApprovalHistory();
      toastStore.add('Comment added successfully!', 'success');
    } catch (err: any) {
      toastStore.add(`Failed to add comment: ${err.message}`, 'error');
    } finally {
      isCommenting = false;
    }
  }

  async function handleDelete() {
    isDeleting = true;

    try {
      await trpc.movement.delete.mutate({ id: movementId });
      goto('/movements');
    } catch (err: any) {
      console.error('Failed to delete movement:', err);
      toastStore.add(err.message || 'Failed to delete movement. Please try again.', 'error');
    } finally {
      isDeleting = false;
      showDeleteConfirm = false;
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  }

  function formatDateTime(date: string | Date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  function handleBack() {
    goto('/movements');
  }

  function handleUploadSuccess() {
    // Refresh the attachment list after successful upload
    if (attachmentListRef) {
      attachmentListRef.refresh();
    }
  }
</script>

<svelte:head>
  <title>{movement ? `Movement - ${movement.description}` : 'Movement'} - YoungLife Portal</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
  <!-- Header -->
  <div>
    <button
      on:click={handleBack}
      class="flex items-center text-sm text-yl-gray-600 hover:text-yl-black mb-4 transition-colors"
    >
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Movements
    </button>
    <h1 class="text-3xl font-bold text-yl-black">Movement Details</h1>
  </div>

  <!-- Loading State -->
  {#if isLoading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yl-green"></div>
    </div>
  {:else if error}
    <!-- Error State -->
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-red-800 font-semibold mb-2">Error Loading Movement</p>
      <p class="text-red-600 text-sm">{error}</p>
      <div class="mt-4 space-x-3">
        <Button variant="secondary" size="sm" on:click={loadMovement}>
          Try Again
        </Button>
        <Button variant="primary" size="sm" on:click={handleBack}>
          Back to List
        </Button>
      </div>
    </div>
  {:else if movement}
    <!-- Movement Details -->
    <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <!-- Header Section -->
      <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <span class="px-3 py-1 text-sm font-medium rounded-full {getTypeColor(movement.type)}">
                {movement.type}
              </span>
              <ApprovalStatusBadge status={movement.status} size="md" />
            </div>
            <h2 class="text-2xl font-bold text-yl-black">{movement.description}</h2>
          </div>
          <div class="text-right">
            <p class="text-sm text-yl-gray-600 mb-1">Amount</p>
            <p class="text-3xl font-bold {movement.type === 'INCOME' ? 'text-green-600' : 'text-yl-black'}">
              {movement.type === 'INCOME' ? '+' : '-'}{formatCurrency(movement.amount, movement.currency)}
            </p>
          </div>
        </div>
      </div>

      <!-- Approval Info Section -->
      {#if movement.status === 'APPROVED' && movement.approvedBy}
        <div class="bg-green-50 border-l-4 border-green-400 px-6 py-4">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <div class="ml-3">
              <p class="text-sm font-medium text-green-800">
                Approved by {movement.approver?.name || 'Unknown'}
              </p>
              <p class="text-xs text-green-700 mt-1">
                {formatDateTime(movement.approvedAt)}
              </p>
            </div>
          </div>
        </div>
      {/if}

      {#if movement.status === 'REJECTED' && movement.rejectedBy}
        <div class="bg-red-50 border-l-4 border-red-400 px-6 py-4">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <div class="ml-3 flex-1">
              <p class="text-sm font-medium text-red-800">
                Rejected by {movement.rejector?.name || 'Unknown'}
              </p>
              <p class="text-xs text-red-700 mt-1">
                {formatDateTime(movement.rejectedAt)}
              </p>
              {#if movement.rejectionReason}
                <div class="mt-2 text-sm text-red-800 bg-red-100 rounded p-2">
                  <p class="font-medium">Reason:</p>
                  <p class="mt-1">{movement.rejectionReason}</p>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <!-- Approval Actions (only for managers on pending movements) -->
      {#if isAreaManager && movement.status === 'PENDING'}
        <div class="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="ml-2 text-sm font-medium text-blue-800">
                This movement requires your approval
              </p>
            </div>
            <div class="flex gap-2">
              <button
                on:click={() => showRejectDialog = true}
                class="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Reject
              </button>
              <button
                on:click={() => showApproveDialog = true}
                class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- Details Section -->
      <div class="p-6 space-y-6">
        <!-- Transaction Information -->
        <div>
          <h3 class="text-lg font-semibold text-yl-black mb-4">Transaction Information</h3>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt class="text-sm font-medium text-yl-gray-600">Transaction Date</dt>
              <dd class="mt-1 text-sm text-yl-black">{formatDate(movement.transactionDate)}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-yl-gray-600">Currency</dt>
              <dd class="mt-1 text-sm text-yl-black">{movement.currency}</dd>
            </div>
            {#if movement.category}
              <div>
                <dt class="text-sm font-medium text-yl-gray-600">Category</dt>
                <dd class="mt-1 text-sm text-yl-black">{movement.category}</dd>
              </div>
            {/if}
            {#if movement.reference}
              <div>
                <dt class="text-sm font-medium text-yl-gray-600">Reference</dt>
                <dd class="mt-1 text-sm text-yl-black">{movement.reference}</dd>
              </div>
            {/if}
          </dl>
        </div>

        <!-- Area & Department -->
        <div>
          <h3 class="text-lg font-semibold text-yl-black mb-4">Organization</h3>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {#if movement.area}
              <div>
                <dt class="text-sm font-medium text-yl-gray-600">Area</dt>
                <dd class="mt-1 text-sm text-yl-black">
                  {movement.area.name}
                  <span class="text-yl-gray-500">({movement.area.code})</span>
                </dd>
              </div>
            {/if}
            {#if movement.department}
              <div>
                <dt class="text-sm font-medium text-yl-gray-600">Department</dt>
                <dd class="mt-1 text-sm text-yl-black">
                  {movement.department.name}
                  <span class="text-yl-gray-500">({movement.department.code})</span>
                </dd>
              </div>
            {/if}
          </dl>
        </div>

        <!-- User Information -->
        {#if movement.user}
          <div>
            <h3 class="text-lg font-semibold text-yl-black mb-4">Created By</h3>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt class="text-sm font-medium text-yl-gray-600">Name</dt>
                <dd class="mt-1 text-sm text-yl-black">{movement.user.name}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-yl-gray-600">Email</dt>
                <dd class="mt-1 text-sm text-yl-black">{movement.user.email}</dd>
              </div>
            </dl>
          </div>
        {/if}

        <!-- Approval History -->
        <div>
          <h3 class="text-lg font-semibold text-yl-black mb-4">Approval History</h3>
          {#if isLoadingHistory}
            <div class="flex justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-yl-green"></div>
            </div>
          {:else}
            <ApprovalHistoryTimeline history={approvalHistory} />
          {/if}
        </div>

        <!-- Add Comment (managers only) -->
        {#if isAreaManager}
          <div>
            <h3 class="text-lg font-semibold text-yl-black mb-4">Add Comment</h3>
            <div class="flex gap-2">
              <textarea
                bind:value={newComment}
                placeholder="Add a comment..."
                rows="3"
                maxlength="1000"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent resize-none"
              />
              <button
                on:click={handleAddComment}
                disabled={!newComment.trim() || isCommenting}
                class="px-4 py-2 text-sm font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
              >
                {isCommenting ? 'Adding...' : 'Add Comment'}
              </button>
            </div>
            <p class="text-xs text-yl-gray-500 mt-1">{newComment.length}/1000 characters</p>
          </div>
        {/if}

        <!-- Timestamps -->
        <div>
          <h3 class="text-lg font-semibold text-yl-black mb-4">System Information</h3>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt class="text-sm font-medium text-yl-gray-600">Created</dt>
              <dd class="mt-1 text-sm text-yl-black">{formatDateTime(movement.createdAt)}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-yl-gray-600">Last Updated</dt>
              <dd class="mt-1 text-sm text-yl-black">{formatDateTime(movement.updatedAt)}</dd>
            </div>
          </dl>
        </div>

        <!-- Attachments (if any) -->
        {#if movement.attachments && movement.attachments.length > 0}
          <div>
            <h3 class="text-lg font-semibold text-yl-black mb-4">Attachments</h3>
            <ul class="space-y-2">
              {#each movement.attachments as attachment}
                <li class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <svg class="w-5 h-5 text-yl-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <div>
                      <p class="text-sm font-medium text-yl-black">{attachment.filename}</p>
                      <p class="text-xs text-yl-gray-600">{(attachment.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm font-medium text-yl-green hover:text-yl-green-accent"
                  >
                    Download
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Related Movements -->
        {#if (movement.parent || (movement.children && movement.children.length > 0))}
          <div>
            <h3 class="text-lg font-semibold text-yl-black mb-4">Related Movements</h3>

            {#if movement.parent}
              <div class="mb-4">
                <p class="text-sm font-medium text-yl-gray-600 mb-2">Parent Movement</p>
                <div class="p-3 bg-gray-50 rounded-lg">
                  <p class="text-sm text-yl-black">{movement.parent.description}</p>
                  <p class="text-xs text-yl-gray-600 mt-1">
                    {formatCurrency(movement.parent.amount)}
                  </p>
                </div>
              </div>
            {/if}

            {#if movement.children && movement.children.length > 0}
              <div>
                <p class="text-sm font-medium text-yl-gray-600 mb-2">Child Movements</p>
                <ul class="space-y-2">
                  {#each movement.children as child}
                    <li class="p-3 bg-gray-50 rounded-lg">
                      <div class="flex justify-between items-start">
                        <div>
                          <p class="text-sm text-yl-black">{child.description}</p>
                          <p class="text-xs text-yl-gray-600 mt-1">
                            {child.area?.name} ({child.area?.code})
                          </p>
                        </div>
                        <p class="text-sm font-medium text-yl-black">
                          {formatCurrency(child.amount)}
                        </p>
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Actions Footer -->
      <div class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-3">
        <Button variant="secondary" size="md" on:click={handleBack}>
          Back to List
        </Button>
        <div class="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            disabled={movement.status !== 'PENDING'}
            title={movement.status === 'APPROVED' || movement.status === 'REJECTED' ? 'Editing will reset approval status to pending' : movement.status !== 'PENDING' ? 'Only pending movements can be edited' : ''}
          >
            {#if movement.status === 'APPROVED' || movement.status === 'REJECTED'}
              <svg class="w-4 h-4 inline mr-1 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            {/if}
            Edit
          </Button>
          <Button
            variant="secondary"
            size="md"
            class="!text-red-600 !border-red-600 hover:!bg-red-50"
            on:click={() => showDeleteConfirm = true}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Approve Confirmation Dialog -->
<ConfirmDialog
  open={showApproveDialog}
  title="Approve Movement"
  message="Are you sure you want to approve this movement?"
  confirmText={isApproving ? 'Approving...' : 'Approve'}
  cancelText="Cancel"
  variant="info"
  onConfirm={handleApprove}
  onCancel={() => {
    showApproveDialog = false;
    approveComment = '';
  }}
>
  <div class="mt-4">
    <label for="approve-comment" class="block text-sm font-medium text-yl-gray-700 mb-1">
      Comment (Optional)
    </label>
    <textarea
      id="approve-comment"
      bind:value={approveComment}
      rows="3"
      placeholder="Add an optional comment..."
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent resize-none"
    />
  </div>
</ConfirmDialog>

<!-- Reject Dialog -->
{#if showRejectDialog}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-yl-black">Reject Movement</h3>
        <button
          on:click={() => {
            showRejectDialog = false;
            rejectReason = '';
            rejectComment = '';
          }}
          class="text-yl-gray-400 hover:text-yl-gray-600"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p class="text-sm text-yl-gray-600 mb-4">
        Please provide details about why you're rejecting this movement.
      </p>

      <div class="space-y-4">
        <div>
          <label for="reject-reason" class="block text-sm font-medium text-yl-gray-700 mb-1">
            Reason (Optional)
          </label>
          <textarea
            id="reject-reason"
            bind:value={rejectReason}
            rows="2"
            placeholder="Why are you rejecting this?"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label for="reject-comment" class="block text-sm font-medium text-yl-gray-700 mb-1">
            Comment (Optional)
          </label>
          <textarea
            id="reject-comment"
            bind:value={rejectComment}
            rows="2"
            placeholder="Additional comments..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent resize-none"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button
          on:click={() => {
            showRejectDialog = false;
            rejectReason = '';
            rejectComment = '';
          }}
          disabled={isRejecting}
          class="px-4 py-2 text-sm font-medium text-yl-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          on:click={handleReject}
          disabled={isRejecting}
          class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRejecting ? 'Rejecting...' : 'Reject Movement'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <div class="flex items-start mb-4">
        <div class="flex-shrink-0">
          <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <h3 class="text-lg font-semibold text-yl-black">Delete Movement</h3>
          <p class="text-sm text-yl-gray-600 mt-2">
            Are you sure you want to delete this movement? This action cannot be undone.
          </p>
        </div>
      </div>
      <div class="flex justify-end gap-3 mt-6">
        <Button
          variant="secondary"
          size="sm"
          on:click={() => showDeleteConfirm = false}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          class="!bg-red-600 hover:!bg-red-700"
          on:click={handleDelete}
          disabled={isDeleting}
        >
          {#if isDeleting}
            Deleting...
          {:else}
            Delete
          {/if}
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- Approve Success Dialog -->
<InfoDialog
  open={showApproveSuccess}
  title="Movement Approved"
  message="The movement has been approved successfully. The submitter has been notified and the status has been updated."
  variant="success"
  okText="OK"
  onOk={() => { showApproveSuccess = false; }}
/>

<!-- Reject Success Dialog -->
<InfoDialog
  open={showRejectSuccess}
  title="Movement Rejected"
  message="The movement has been rejected. The submitter has been notified and can review your feedback."
  variant="warning"
  okText="OK"
  onOk={() => { showRejectSuccess = false; }}
/>
