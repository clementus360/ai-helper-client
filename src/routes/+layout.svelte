<!-- src/app.html or src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeAuth } from '$lib/stores/auth';
  import '../app.css'; // Your global styles

  onMount(() => {
    initializeAuth();
  });
</script>

<main>
  <slot />
</main>