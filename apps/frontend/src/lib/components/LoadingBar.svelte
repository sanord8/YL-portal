<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let show = false;
  export let color = '#90c83c'; // YL Green

  let progress = 0;
  let interval: ReturnType<typeof setInterval> | null = null;

  $: if (show) {
    startProgress();
  } else {
    completeProgress();
  }

  function startProgress() {
    progress = 0;
    if (interval) clearInterval(interval);

    // Simulate progress
    interval = setInterval(() => {
      if (progress < 90) {
        // Slow down as we approach 90%
        const increment = (90 - progress) * 0.1;
        progress += Math.max(increment, 1);
      }
    }, 100);
  }

  function completeProgress() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    progress = 100;

    // Reset after animation completes
    setTimeout(() => {
      if (!show) {
        progress = 0;
      }
    }, 300);
  }

  onMount(() => {
    return () => {
      if (interval) clearInterval(interval);
    };
  });
</script>

<div
  class="fixed top-0 left-0 right-0 z-[9999] h-1 pointer-events-none"
  class:opacity-0={!show && progress === 0}
  class:opacity-100={show || progress > 0}
  style="transition: opacity 0.2s ease-in-out;"
>
  <div
    class="h-full shadow-lg transition-all duration-300 ease-out"
    style="
      width: {progress}%;
      background: linear-gradient(90deg, {color} 0%, {color}cc 50%, {color} 100%);
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    "
  >
    <!-- Shimmer effect -->
    <div
      class="absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-r from-transparent via-white/20 to-transparent"
      style="animation: shimmer 1.5s infinite;"
    ></div>
  </div>
</div>

<style>
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(400%);
    }
  }
</style>
