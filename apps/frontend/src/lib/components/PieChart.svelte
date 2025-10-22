<script lang="ts">
  export let data: Array<{ label: string; value: number; percentage: number }> = [];
  export let height = 300;
  export let currency = 'EUR';

  // Predefined color palette for consistent area/department coloring
  const colors = [
    '#90c83c', // YoungLife Green
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
  ];

  // Chart dimensions
  const radius = 100;
  const centerX = radius + 20;
  const centerY = radius + 20;
  const viewBoxSize = (radius + 20) * 2;

  // Calculate pie slices with memoization
  let previousDataStr = '';
  let cachedSlices: Array<{ label: string; value: number; percentage: number; path: string; color: string }> = [];

  $: {
    const dataStr = JSON.stringify(data);
    if (dataStr !== previousDataStr) {
      previousDataStr = dataStr;
      cachedSlices = calculateSlices(data);
    }
  }

  $: slices = cachedSlices;

  function calculateSlices(data: Array<{ label: string; value: number; percentage: number }>) {
    if (data.length === 0) return [];

    let currentAngle = -90; // Start at top

    return data.map((item, index) => {
      const angle = (item.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      // Calculate path
      const path = createArc(centerX, centerY, radius, startAngle, endAngle);

      currentAngle = endAngle;

      return {
        label: item.label,
        value: item.value,
        percentage: item.percentage,
        path,
        color: colors[index % colors.length],
      };
    });
  }

  function createArc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ): string {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M',
      x,
      y,
      'L',
      start.x,
      start.y,
      'A',
      radius,
      radius,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      'Z',
    ].join(' ');
  }

  function polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value / 100);
  }
</script>

<div class="relative" style="min-height: {height}px;">
  {#if !data || data.length === 0}
    <div class="flex items-center justify-center" style="height: {height}px;">
      <div class="text-center">
        <svg class="w-16 h-16 text-yl-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        <p class="text-sm text-yl-gray-600 font-medium">No data available</p>
        <p class="text-xs text-yl-gray-500 mt-1">Data will appear here once recorded</p>
      </div>
    </div>
  {:else}
    <div class="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 py-4">
      <!-- Pie Chart SVG -->
      <div class="flex-shrink-0">
        <svg
          width={viewBoxSize}
          height={viewBoxSize}
          viewBox="0 0 {viewBoxSize} {viewBoxSize}"
          class="overflow-visible max-w-full"
        >
          {#each slices as slice, i}
            <g class="transition-opacity duration-150 hover:opacity-80">
              <path d={slice.path} fill={slice.color} class="cursor-pointer">
                <title>{slice.label}: {formatCurrency(slice.value)} ({slice.percentage.toFixed(1)}%)</title>
              </path>
            </g>
          {/each}
        </svg>
      </div>

      <!-- Legend -->
      <div class="flex-1 min-w-0 max-w-md w-full lg:w-auto">
        <div class="space-y-2 max-h-[300px] overflow-y-auto px-2">
          {#each slices as slice}
            <div class="flex items-center justify-between gap-3 text-sm py-1">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <div
                  class="w-3 h-3 rounded-sm flex-shrink-0"
                  style="background-color: {slice.color};"
                ></div>
                <span class="text-yl-black truncate font-medium" title={slice.label}>{slice.label}</span>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0 text-right">
                <span class="text-yl-gray-600 tabular-nums">{slice.percentage.toFixed(1)}%</span>
                <span class="text-yl-black font-semibold tabular-nums whitespace-nowrap">{formatCurrency(slice.value)}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  svg {
    font-family: inherit;
  }
</style>
