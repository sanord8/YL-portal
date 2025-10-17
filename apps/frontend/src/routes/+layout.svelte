<script lang="ts">
  import '../app.css';
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <!-- Navigation with professional black background -->
  <nav class="bg-yl-black shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center space-x-3">
          <!-- Logo placeholder - will be replaced with actual logo -->
          <div class="flex items-center space-x-2">
            <div class="w-10 h-10 bg-yl-green rounded flex items-center justify-center">
              <span class="text-white font-bold text-xl">YL</span>
            </div>
            <h1 class="text-xl font-bold text-white">Portal</h1>
          </div>
        </div>
        <div class="flex items-center space-x-6">
          <a
            href="/"
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
            href="/reports"
            class="text-white hover:text-yl-green-accent transition-colors duration-200 font-medium"
          >
            Reports
          </a>
        </div>
      </div>
    </div>
  </nav>

  <!-- Main content area -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <slot />
  </main>

  <!-- Footer -->
  <footer class="bg-white border-t mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex justify-between items-center">
        <p class="text-sm text-yl-gray-500">
          &copy; {new Date().getFullYear()} YoungLife Portal. All rights reserved.
        </p>
        <div class="flex items-center space-x-2">
          <span class="text-sm text-yl-gray-500">Powered by</span>
          <span class="font-semibold text-yl-green">YoungLife</span>
        </div>
      </div>
    </div>
  </footer>
</div>
