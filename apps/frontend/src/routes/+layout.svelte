<script lang="ts">
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { authStore } from '$lib/stores/authStore';
  import { websocketStore } from '$lib/stores/websocketStore';
  import MobileMenu from '$lib/components/MobileMenu.svelte';
  import UserDropdown from '$lib/components/UserDropdown.svelte';
  import Button from '$lib/components/Button.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import LoadingBar from '$lib/components/LoadingBar.svelte';
  import { loadingStore } from '$lib/stores/loadingStore';
  import { navigating } from '$app/stores';

  let isMobileMenuOpen = false;
  let toggleTimeout: number | undefined;

  // Initialize auth and WebSocket on mount
  onMount(() => {
    authStore.checkAuth();

    // Connect to WebSocket if authenticated
    if (browser && $authStore.isAuthenticated) {
      // Get session ID from cookie
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find((c) => c.trim().startsWith('yl_session='));
      if (sessionCookie) {
        const sessionId = sessionCookie.split('=')[1];
        websocketStore.connect(sessionId);
      }
    }
  });

  // Cleanup WebSocket and timers on unmount
  onDestroy(() => {
    if (browser) {
      websocketStore.disconnect();
    }
    if (toggleTimeout) {
      clearTimeout(toggleTimeout);
    }
  });

  // Watch for authentication changes to connect/disconnect WebSocket
  // Only re-run when authentication state actually changes
  let lastAuthState = false;
  $: if (browser && $authStore.isAuthenticated !== lastAuthState) {
    lastAuthState = $authStore.isAuthenticated;
    if ($authStore.isAuthenticated && !$websocketStore.connected) {
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find((c) => c.trim().startsWith('yl_session='));
      if (sessionCookie) {
        const sessionId = sessionCookie.split('=')[1];
        websocketStore.connect(sessionId);
      }
    }
  }

  $: isAuthenticated = $authStore.isAuthenticated;
  $: isLoading = $authStore.isLoading;
  $: user = $authStore.user;
  $: needsEmailVerification = isAuthenticated && user && !user.emailVerified;

  // Track navigation for loading bar
  $: if ($navigating) {
    loadingStore.start();
  } else {
    loadingStore.stop();
  }

  let isResendingVerification = false;
  let resendMessage = '';

  // Debounced toggle with requestAnimationFrame for smooth animation
  function toggleMobileMenu() {
    if (toggleTimeout) {
      return; // Prevent rapid toggling
    }

    requestAnimationFrame(() => {
      isMobileMenuOpen = !isMobileMenuOpen;
    });

    toggleTimeout = setTimeout(() => {
      toggleTimeout = undefined;
    }, 300) as unknown as number;
  }

  function closeMobileMenu() {
    requestAnimationFrame(() => {
      isMobileMenuOpen = false;
    });
  }

  async function resendVerificationEmail() {
    isResendingVerification = true;
    resendMessage = '';

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        resendMessage = 'Verification email sent! Please check your inbox.';
      } else {
        resendMessage = data.message || 'Failed to send verification email.';
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      resendMessage = 'An error occurred. Please try again.';
    } finally {
      isResendingVerification = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <!-- Loading Bar -->
  <LoadingBar show={$loadingStore} />

  <!-- Toast Container -->
  <ToastContainer />

  <!-- Email Verification Banner -->
  {#if needsEmailVerification}
    <div class="bg-yellow-50 border-b border-yellow-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center space-x-3">
            <svg class="h-5 w-5 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <p class="text-sm text-yellow-800">
              <span class="font-semibold">Email not verified.</span> Please check your inbox for a verification link.
            </p>
          </div>
          <button
            on:click={resendVerificationEmail}
            disabled={isResendingVerification}
            class="text-sm font-medium text-yellow-600 hover:text-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {#if isResendingVerification}
              Sending...
            {:else}
              Resend Email
            {/if}
          </button>
        </div>
        {#if resendMessage}
          <p class="text-xs text-yellow-700 mt-2">{resendMessage}</p>
        {/if}
      </div>
    </div>
  {/if}
  <!-- Navigation with professional black background -->
  <nav class="bg-yl-black shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex items-center space-x-2 flex-shrink-0">
          <a href="/" class="flex items-center space-x-2 hover:opacity-90 transition-opacity">
            <img
              src="/images/younglife-logo-white.svg"
              alt="YoungLife"
              class="h-8 sm:h-10 md:h-12"
            />
            <span class="text-white font-semibold text-base sm:text-lg">Portal</span>
          </a>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-6">
          {#if isAuthenticated}
            <!-- Navigation links for authenticated users -->
            <a
              href="/dashboard"
              class="text-white hover:text-yl-green-accent transition-colors duration-200 font-medium"
            >
              Dashboard
            </a>
            <a
              href="/movements"
              class="text-white hover:text-yl-green-accent transition-colors duration-200 font-medium"
            >
              Movements
            </a>
            <a
              href="/areas"
              class="text-white hover:text-yl-green-accent transition-colors duration-200 font-medium"
            >
              Areas
            </a>
            <a
              href="/departments"
              class="text-white hover:text-yl-green-accent transition-colors duration-200 font-medium"
            >
              Departments
            </a>
            <a
              href="/reports"
              class="text-white hover:text-yl-green-accent transition-colors duration-200 font-medium"
            >
              Reports
            </a>
            {#if user?.isAdmin}
              <a
                href="/admin/users"
                class="text-white hover:text-yl-green-accent transition-colors duration-200 font-medium"
              >
                Admin
              </a>
            {/if}
            <!-- User dropdown -->
            <UserDropdown />
          {:else if !isLoading}
            <!-- Auth buttons for non-authenticated users -->
            <a href="/login">
              <Button variant="primary" size="sm">
                Login
              </Button>
            </a>
          {/if}
        </div>

        <!-- Mobile Menu Button -->
        <button
          on:click={toggleMobileMenu}
          on:touchstart|passive
          class="md:hidden text-white active:text-yl-green-accent transition-colors p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
          style="touch-action: manipulation;"
          aria-label="Open menu"
          aria-expanded={isMobileMenuOpen}
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  </nav>

  <!-- Mobile Menu Component -->
  <MobileMenu
    isOpen={isMobileMenuOpen}
    onClose={closeMobileMenu}
    isAuthenticated={isAuthenticated}
    user={$authStore.user}
  />

  <!-- Main content area -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <slot />
  </main>

  <!-- Footer - Responsive -->
  <footer class="bg-white border-t mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div class="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
        <p class="text-xs sm:text-sm text-yl-gray-500 text-center sm:text-left">
          &copy; {new Date().getFullYear()} YoungLife Portal. All rights reserved.
        </p>
        <div class="flex items-center space-x-2 sm:space-x-3">
          <span class="text-xs sm:text-sm text-yl-gray-500">Powered by</span>
          <img
            src="/images/younglife-logo.svg"
            alt="YoungLife"
            class="h-6 sm:h-8"
          />
        </div>
      </div>
    </div>
  </footer>
</div>
