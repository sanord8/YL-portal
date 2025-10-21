<script lang="ts">
  export let history: Array<{
    id: string;
    action: 'APPROVED' | 'REJECTED' | 'COMMENT' | 'EDITED';
    comment: string | null;
    createdAt: Date | string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }> = [];

  const actionConfig = {
    APPROVED: {
      color: 'bg-green-100 text-green-700 border-green-300',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      label: 'approved',
    },
    REJECTED: {
      color: 'bg-red-100 text-red-700 border-red-300',
      icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      label: 'rejected',
    },
    COMMENT: {
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      label: 'commented',
    },
    EDITED: {
      color: 'bg-orange-100 text-orange-700 border-orange-300',
      icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      label: 'edited',
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
</script>

{#if history.length === 0}
  <div class="text-center py-8 text-yl-gray-500 text-sm">
    No approval history yet
  </div>
{:else}
  <div class="flow-root">
    <ul class="-mb-8">
      {#each history as item, i}
        {@const config = actionConfig[item.action]}
        {@const isLast = i === history.length - 1}

        <li>
          <div class="relative pb-8">
            <!-- Connector line -->
            {#if !isLast}
              <span class="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
            {/if}

            <div class="relative flex items-start space-x-3">
              <!-- Avatar -->
              <div class="relative">
                <div class="h-10 w-10 rounded-full {config.color} border-2 flex items-center justify-center font-semibold text-sm">
                  {getInitials(item.user.name, item.user.email)}
                </div>

                <!-- Action icon badge -->
                <span class="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 border border-gray-200">
                  <svg class="w-3.5 h-3.5 {config.color.split(' ')[1]}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={config.icon} />
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

                <!-- Comment -->
                {#if item.comment}
                  <div class="mt-2 text-sm text-yl-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p class="whitespace-pre-wrap">{item.comment}</p>
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
