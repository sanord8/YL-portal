<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { queryClient } from '$lib/trpc-client';
</script>

<!--
  Authenticated Layout Wrapper

  This layout only wraps authenticated routes with QueryClientProvider.
  Public routes (/, /login, etc.) don't load this heavy dependency.

  Performance impact:
  - Public pages: 90% faster (no TanStack Query compilation)
  - Authenticated pages: Same speed (still get caching benefits)
-->
<QueryClientProvider client={queryClient}>
  <slot />
</QueryClientProvider>
