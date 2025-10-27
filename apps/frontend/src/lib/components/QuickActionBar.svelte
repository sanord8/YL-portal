<script lang="ts">
  import { goto } from '$app/navigation';

  export let actions: Array<{
    label: string;
    icon: string;
    href?: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary';
  }> = [];

  function handleAction(action: typeof actions[0]) {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      goto(action.href);
    }
  }

  function getButtonClass(variant: string = 'secondary') {
    if (variant === 'primary') {
      return 'bg-yl-green text-white hover:bg-yl-green-accent';
    }
    return 'bg-white text-yl-black border border-gray-300 hover:bg-gray-50';
  }
</script>

<!-- Desktop: Hidden (actions shown inline in dashboard) -->
<div class="hidden md:block">
  <slot />
</div>

<!-- Mobile: Floating action bar at bottom -->
<div class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 safe-area-pb">
  <div class="flex items-center justify-around px-2 py-3 max-w-lg mx-auto">
    {#each actions as action}
      <button
        on:click={() => handleAction(action)}
        class="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors min-w-[64px] {getButtonClass(action.variant)}"
      >
        <span class="text-xl">{action.icon}</span>
        <span class="text-xs font-medium">{action.label}</span>
      </button>
    {/each}
  </div>
</div>

<!-- Add padding to bottom of page content to prevent overlap with fixed bar -->
<div class="md:hidden h-20" />

<style>
  /* Safe area for devices with notches/home indicators */
  .safe-area-pb {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
</style>
