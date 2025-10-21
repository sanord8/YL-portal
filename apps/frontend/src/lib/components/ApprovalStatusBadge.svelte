<script lang="ts">
  export let status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  export let size: 'sm' | 'md' | 'lg' = 'md';

  $: config = {
    PENDING: {
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      label: 'Pending',
    },
    APPROVED: {
      color: 'bg-green-100 text-green-700 border-green-200',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      label: 'Approved',
    },
    REJECTED: {
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      label: 'Rejected',
    },
    CANCELLED: {
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
      label: 'Cancelled',
    },
  };

  $: sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  $: iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  $: statusConfig = config[status];
</script>

<span class="inline-flex items-center gap-1.5 font-medium rounded-full border {statusConfig.color} {sizeClasses[size]}">
  <svg class="{iconSizes[size]} flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={statusConfig.icon} />
  </svg>
  <span>{statusConfig.label}</span>
</span>
