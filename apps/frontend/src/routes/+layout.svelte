<script lang="ts">
  import '../app.css';
</script>

<div class="min-h-screen bg-gray-50">
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <h1 class="text-xl font-bold text-gray-900">YL Portal</h1>
        </div>
        <div class="flex items-center space-x-4">
          <a href="/" class="text-gray-600 hover:text-gray-900">Dashboard</a>
          <a href="/movements" class="text-gray-600 hover:text-gray-900">Movements</a>
          <a href="/reports" class="text-gray-600 hover:text-gray-900">Reports</a>
        </div>
      </div>
    </div>
  </nav>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <slot />
  </main>

  <footer class="bg-white border-t mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <p class="text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} YL Portal. All rights reserved.
      </p>
    </div>
  </footer>
</div>
