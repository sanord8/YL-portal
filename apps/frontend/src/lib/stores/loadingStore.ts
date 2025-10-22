import { writable } from 'svelte/store';

function createLoadingStore() {
  const { subscribe, set, update } = writable(false);

  let loadingCount = 0;

  return {
    subscribe,
    start() {
      loadingCount++;
      set(true);
    },
    stop() {
      loadingCount = Math.max(0, loadingCount - 1);
      if (loadingCount === 0) {
        set(false);
      }
    },
    reset() {
      loadingCount = 0;
      set(false);
    },
  };
}

export const loadingStore = createLoadingStore();
