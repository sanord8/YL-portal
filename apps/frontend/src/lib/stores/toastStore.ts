import { writable } from 'svelte/store';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; // in milliseconds, default 5000
}

interface ToastState {
  toasts: Toast[];
}

const initialState: ToastState = {
  toasts: [],
};

function createToastStore() {
  const { subscribe, update } = writable<ToastState>(initialState);

  let idCounter = 0;

  function generateId(): string {
    return `toast-${Date.now()}-${idCounter++}`;
  }

  function add(type: Toast['type'], message: string, duration = 5000) {
    const id = generateId();
    const toast: Toast = { id, type, message, duration };

    update((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }

    return id;
  }

  function remove(id: string) {
    update((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  }

  return {
    subscribe,
    success: (message: string, duration?: number) => add('success', message, duration),
    error: (message: string, duration?: number) => add('error', message, duration),
    warning: (message: string, duration?: number) => add('warning', message, duration),
    info: (message: string, duration?: number) => add('info', message, duration),
    remove,
  };
}

export const toastStore = createToastStore();
