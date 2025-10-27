<script lang="ts">
  /**
   * SwipeableCardRow - Horizontal scrolling container for cards on mobile
   * Displays cards in a grid on desktop, horizontal scroll on mobile
   */
  export let title: string | null = null;
  export let showScrollIndicator = true;
</script>

<div class="space-y-3">
  {#if title}
    <h2 class="text-xl font-semibold text-yl-black px-1">{title}</h2>
  {/if}

  <!-- Desktop: Grid layout -->
  <div class="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
    <slot />
  </div>

  <!-- Mobile: Horizontal scroll -->
  <div class="md:hidden relative">
    <div
      class="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
      style="scroll-behavior: smooth; -webkit-overflow-scrolling: touch;"
    >
      <slot />
    </div>

    {#if showScrollIndicator}
      <!-- Scroll indicator (fade on right edge) -->
      <div class="absolute top-0 right-0 bottom-4 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
    {/if}
  </div>
</div>

<style>
  /* Hide scrollbar for Chrome, Safari and Opera */
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Hide scrollbar for IE, Edge and Firefox */
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }

  /* Snap to cards on mobile */
  .scrollbar-hide > :global(*) {
    scroll-snap-align: start;
    flex-shrink: 0;
    width: 280px; /* Fixed width for mobile cards */
  }

  @media (min-width: 640px) {
    .scrollbar-hide > :global(*) {
      width: 320px; /* Slightly wider on larger phones */
    }
  }
</style>
