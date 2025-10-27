<script lang="ts">
  import { trpc } from '$lib/trpc/client';

  export let movementId: string;

  // Fetch categorization history (CATEGORIZED actions only)
  const historyQuery = trpc.movement.getApprovalHistory.query({ id: movementId });

  $: categorizationHistory = $historyQuery.data
    ? $historyQuery.data.filter((h) => h.action === 'CATEGORIZED')
    : [];

  const actionConfig = {
    CATEGORIZED: {
      color: 'bg-purple-100 text-purple-700 border-purple-300',
      icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
      label: 'categorized',
    },
  };

  function formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return then.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: then.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  function getInitials(name: string | null, email: string): string {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  }

  function formatMetadata(metadata: any): string {
    if (!metadata) return '';

    const changes = [];

    if (metadata.area) {
      if (metadata.area.before) {
        changes.push(`Area changed from "${metadata.area.before.name}" to new area`);
      } else {
        changes.push('Area assigned');
      }
    }

    if (metadata.department) {
      if (metadata.department.before) {
        changes.push(
          `Department changed from "${metadata.department.before.name}" to ${metadata.department.after ? 'new department' : 'none'}`
        );
      } else if (metadata.department.after) {
        changes.push('Department assigned');
      } else {
        changes.push('Department removed');
      }
    }

    return changes.join(', ');
  }
</script>

<div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
  <h3 class="text-lg font-semibold text-yl-black mb-4">Categorization History</h3>

  {#if $historyQuery.isLoading}
    <div class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-yl-green mx-auto"></div>
    </div>
  {:else if $historyQuery.isError}
    <div class="text-center py-8 text-red-600 text-sm">
      Failed to load categorization history
    </div>
  {:else if categorizationHistory.length === 0}
    <div class="text-center py-8 text-yl-gray-500 text-sm">
      No categorization changes yet
    </div>
  {:else}
    <div class="flow-root">
      <ul class="-mb-8">
        {#each categorizationHistory as item, i}
          {@const config = actionConfig.CATEGORIZED}
          {@const isLast = i === categorizationHistory.length - 1}

          <li>
            <div class="relative pb-8">
              <!-- Connector line -->
              {#if !isLast}
                <span
                  class="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                ></span>
              {/if}

              <div class="relative flex items-start space-x-3">
                <!-- Avatar -->
                <div class="relative">
                  <div
                    class="h-10 w-10 rounded-full {config.color} border-2 flex items-center justify-center font-semibold text-sm"
                  >
                    {getInitials(item.user.name, item.user.email)}
                  </div>

                  <!-- Action icon badge -->
                  <span
                    class="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 border border-gray-200"
                  >
                    <svg
                      class="w-3.5 h-3.5 {config.color.split(' ')[1]}"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d={config.icon}
                      />
                    </svg>
                  </span>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div>
                    <div class="text-sm">
                      <span class="font-medium text-yl-black">
                        {item.user.name || 'Unknown User'}
                      </span>
                      <span class="text-yl-gray-600"> {config.label} this movement</span>
                    </div>
                    <p class="mt-0.5 text-xs text-yl-gray-500">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>

                  <!-- Metadata -->
                  {#if item.metadata}
                    <div
                      class="mt-2 text-sm text-yl-gray-700 bg-purple-50 rounded-lg p-3 border border-purple-200"
                    >
                      <p class="font-medium text-purple-900 mb-1">Changes:</p>
                      <p class="text-purple-800">{formatMetadata(item.metadata)}</p>
                    </div>
                  {/if}

                  <!-- Comment -->
                  {#if item.comment}
                    <div class="mt-2 text-xs text-yl-gray-600 italic">
                      {item.comment}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
