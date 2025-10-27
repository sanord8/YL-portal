<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import FormInput from '$lib/components/FormInput.svelte';
  import { toastStore } from '$lib/stores/toastStore';

  // Form fields
  let areaId = '';
  let name = '';
  let code = '';
  let description = '';

  // State
  let areas: any[] = [];
  let isLoading = true;
  let isLoadingAreas = true;
  let isSaving = false;
  let error = '';

  // Reactive department ID from route params
  $: departmentId = $page.params.id;

  // Reload data when department ID changes
  $: if (departmentId) {
    loadDepartment();
  }

  onMount(async () => {
    await loadAreas();
    // Department load handled by reactive statement
  });

  async function loadAreas() {
    try {
      isLoadingAreas = true;
      areas = await trpc.area.listAll.query();
    } catch (err: any) {
      console.error('Failed to load areas:', err);
    } finally {
      isLoadingAreas = false;
    }
  }

  async function loadDepartment() {
    try {
      isLoading = true;
      error = '';

      const dept = await trpc.department.getById.query({ id: departmentId });

      // Populate form
      areaId = dept.areaId;
      name = dept.name;
      code = dept.code;
      description = dept.description || '';
    } catch (err: any) {
      error = err.message || 'Failed to load department';
    } finally {
      isLoading = false;
    }
  }

  function handleCodeInput(event: Event) {
    const target = event.target as HTMLInputElement;
    code = target.value.toUpperCase();
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();

    // Validation is handled by HTML5 required attributes

    try {
      isSaving = true;

      await trpc.department.update.mutate({
        id: departmentId,
        areaId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
      });

      // Navigate to detail page
      goto(`/departments/${departmentId}`);
    } catch (err: any) {
      toastStore.add(`Failed to update department: ${err.message}`, 'error');
    } finally {
      isSaving = false;
    }
  }

  function handleCancel() {
    goto(`/departments/${departmentId}`);
  }

  $: characterCount = description.length;
  $: maxCharacters = 500;
</script>

<svelte:head>
  <title>Edit Department - YL Portal</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <!-- Header -->
  <div class="mb-6">
    <div class="flex items-center gap-2 text-sm text-yl-gray-600 mb-2">
      <a href="/departments" class="hover:text-yl-green transition-colors">Departments</a>
      <span>/</span>
      <a href="/departments/{departmentId}" class="hover:text-yl-green transition-colors">
        {name || 'Loading...'}
      </a>
      <span>/</span>
      <span class="text-yl-black">Edit</span>
    </div>
    <h1 class="text-3xl font-bold text-yl-black">Edit Department</h1>
    <p class="mt-2 text-yl-gray-600">Update department information</p>
  </div>

  {#if isLoading}
    <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div class="animate-pulse space-y-4">
        <div class="h-10 bg-gray-200 rounded"></div>
        <div class="h-10 bg-gray-200 rounded"></div>
        <div class="h-10 bg-gray-200 rounded"></div>
        <div class="h-24 bg-gray-200 rounded"></div>
      </div>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-600">{error}</p>
      <button
        on:click={() => goto('/departments')}
        class="mt-2 text-sm text-red-600 hover:text-red-700 underline"
      >
        Back to departments
      </button>
    </div>
  {:else}
    <form on:submit={handleSubmit} class="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
      <!-- Area Selection -->
      <div>
        <label for="area" class="block text-sm font-medium text-yl-gray-700 mb-1">
          Area <span class="text-red-500">*</span>
        </label>
        <select
          id="area"
          bind:value={areaId}
          required
          disabled={isLoadingAreas}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent disabled:bg-gray-50"
        >
          <option value="">{isLoadingAreas ? 'Loading areas...' : 'Select an area...'}</option>
          {#each areas as area}
            <option value={area.id}>{area.name} ({area.code})</option>
          {/each}
        </select>
        <p class="mt-1 text-xs text-yl-gray-500">
          The parent area this department belongs to
        </p>
      </div>

      <!-- Department Name -->
      <FormInput
        label="Department Name"
        bind:value={name}
        required
        maxlength={100}
        placeholder="e.g., Youth Ministry, Finance, Events"
        helpText="The display name for this department"
      />

      <!-- Department Code -->
      <div>
        <label for="code" class="block text-sm font-medium text-yl-gray-700 mb-1">
          Department Code <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="code"
          value={code}
          on:input={handleCodeInput}
          required
          maxlength={10}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent uppercase font-mono"
          placeholder="e.g., YOUTH, FIN"
        />
        <p class="mt-1 text-xs text-yl-gray-500">
          Short code unique within the area (automatically converted to uppercase). {code.length}/10 characters.
        </p>
      </div>

      <!-- Description -->
      <div>
        <label for="description" class="block text-sm font-medium text-yl-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          bind:value={description}
          maxlength={maxCharacters}
          rows={4}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yl-green focus:border-transparent resize-none"
          placeholder="Optional description of this department's purpose and responsibilities..."
        />
        <p class="mt-1 text-xs text-yl-gray-500">
          {characterCount}/{maxCharacters} characters
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          on:click={handleCancel}
          disabled={isSaving}
          class="px-4 py-2 text-sm font-medium text-yl-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || isLoadingAreas}
          class="px-4 py-2 text-sm font-medium text-white bg-yl-green hover:bg-yl-green-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yl-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  {/if}
</div>
