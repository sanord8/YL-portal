<script lang="ts">
  export let data: Array<{ label: string; value1: number; value2: number }> = [];
  export let label1 = 'Series 1';
  export let label2 = 'Series 2';
  export let color1 = '#90c83c'; // YoungLife Green
  export let color2 = '#ef4444'; // Red
  export let height = 300;
  export let currency = 'EUR';

  // Chart dimensions - using fixed pixel coordinates
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };

  // ViewBox dimensions (virtual coordinate system)
  $: viewBoxWidth = 800; // Fixed virtual width
  $: viewBoxHeight = height;
  $: chartHeight = viewBoxHeight - padding.top - padding.bottom;
  $: chartWidth = viewBoxWidth - padding.left - padding.right;

  $: maxValue = Math.max(...data.flatMap((d) => [d.value1, d.value2]), 0);

  // Scale functions - now return pixel coordinates
  $: yScale = (value: number) => {
    if (maxValue === 0) return chartHeight;
    return chartHeight - (value / maxValue) * chartHeight;
  };

  $: xScale = (index: number) => {
    if (data.length <= 1) return chartWidth / 2;
    return (index / (data.length - 1)) * chartWidth;
  };

  // Generate path for line
  function generatePath(values: number[]): string {
    if (values.length === 0) return '';

    let path = `M ${xScale(0)} ${yScale(values[0])}`;

    for (let i = 1; i < values.length; i++) {
      path += ` L ${xScale(i)} ${yScale(values[i])}`;
    }

    return path;
  }

  $: path1 = generatePath(data.map((d) => d.value1));
  $: path2 = generatePath(data.map((d) => d.value2));

  // Y-axis ticks
  $: yTicks = maxValue > 0 ? [0, maxValue / 4, maxValue / 2, (3 * maxValue) / 4, maxValue] : [0];

  function formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  }

  function formatValue(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value / 100);
  }

  // Format month labels (YYYY-MM to short month name)
  function formatMonth(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short' });
  }
</script>

<div class="relative" style="height: {height}px;">
  {#if data.length === 0}
    <div class="flex items-center justify-center h-full">
      <p class="text-sm text-yl-gray-600">No data available</p>
    </div>
  {:else}
    <svg
      width="100%"
      {height}
      viewBox="0 0 {viewBoxWidth} {viewBoxHeight}"
      preserveAspectRatio="xMidYMid meet"
      class="overflow-visible"
    >
      <!-- Y-axis -->
      <g>
        {#each yTicks as tick}
          <g transform="translate(0, {padding.top + yScale(tick)})">
            <line
              x1={padding.left - 5}
              y1="0"
              x2={padding.left}
              y2="0"
              stroke="#9ca3af"
              stroke-width="1"
            />
            <text
              x={padding.left - 10}
              y="0"
              text-anchor="end"
              dominant-baseline="middle"
              class="text-xs fill-yl-gray-600"
            >
              {formatCurrency(tick)}
            </text>
            <!-- Grid line -->
            <line
              x1={padding.left}
              y1="0"
              x2={viewBoxWidth - padding.right}
              y2="0"
              stroke="#e5e7eb"
              stroke-width="1"
              stroke-dasharray="4,4"
            />
          </g>
        {/each}
      </g>

      <!-- Chart area -->
      <g transform="translate({padding.left}, {padding.top})">
        <!-- Line 1 (Income) -->
        <path
          d={path1}
          fill="none"
          stroke={color1}
          stroke-width="2.5"
          class="transition-all"
        />

        <!-- Line 2 (Expenses) -->
        <path
          d={path2}
          fill="none"
          stroke={color2}
          stroke-width="2.5"
          class="transition-all"
        />

        <!-- Data points for Line 1 -->
        {#each data as point, i}
          <circle
            cx={xScale(i)}
            cy={yScale(point.value1)}
            r="4"
            fill={color1}
            class="hover:r-6 transition-all cursor-pointer"
          >
            <title>{label1}: {formatValue(point.value1)}</title>
          </circle>
        {/each}

        <!-- Data points for Line 2 -->
        {#each data as point, i}
          <circle
            cx={xScale(i)}
            cy={yScale(point.value2)}
            r="4"
            fill={color2}
            class="hover:r-6 transition-all cursor-pointer"
          >
            <title>{label2}: {formatValue(point.value2)}</title>
          </circle>
        {/each}
      </g>

      <!-- X-axis labels -->
      <g transform="translate({padding.left}, {viewBoxHeight - padding.bottom + 10})">
        {#each data as point, i}
          <text
            x={xScale(i)}
            y="0"
            text-anchor="middle"
            class="text-xs fill-yl-gray-600"
          >
            {formatMonth(point.label)}
          </text>
        {/each}
      </g>
    </svg>

    <!-- Legend -->
    <div class="flex justify-center items-center gap-6 mt-4">
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded-full" style="background-color: {color1};"></div>
        <span class="text-sm text-yl-gray-600">{label1}</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded-full" style="background-color: {color2};"></div>
        <span class="text-sm text-yl-gray-600">{label2}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  svg {
    font-family: inherit;
  }
</style>
