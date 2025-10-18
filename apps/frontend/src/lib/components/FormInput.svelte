<script lang="ts">
  export let label: string;
  export let type: 'text' | 'email' | 'password' | 'number' = 'text';
  export let value: string | number = '';
  export let placeholder: string = '';
  export let error: string = '';
  export let required: boolean = false;
  export let disabled: boolean = false;
  export let id: string = '';
  export let name: string = '';
  export let autocomplete: string = '';

  // Generate ID if not provided
  $: inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  // Handle input changes manually (Svelte doesn't allow dynamic type with bind:value)
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
  }
</script>

<div class="w-full">
  <!-- Label -->
  {#if label}
    <label
      for={inputId}
      class="block text-sm font-semibold text-yl-black mb-2"
    >
      {label}
      {#if required}
        <span class="text-red-500">*</span>
      {/if}
    </label>
  {/if}

  <!-- Input Field -->
  <input
    {type}
    id={inputId}
    {name}
    {placeholder}
    {required}
    {disabled}
    {autocomplete}
    value={value}
    on:input={handleInput}
    class="w-full px-4 py-3 text-base border-2 rounded-lg transition-all duration-200
           {error
             ? 'border-red-500 focus:border-red-600 focus:ring-red-200'
             : 'border-yl-gray-200 focus:border-yl-green focus:ring-yl-green/20'
           }
           focus:outline-none focus:ring-4
           disabled:bg-yl-gray-100 disabled:cursor-not-allowed
           placeholder:text-yl-gray-400
           text-yl-black
           min-h-[44px]"
    on:blur
    on:focus
    on:change
  />

  <!-- Error Message -->
  {#if error}
    <p class="mt-2 text-sm text-red-600 flex items-center space-x-1">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clip-rule="evenodd"
        />
      </svg>
      <span>{error}</span>
    </p>
  {/if}
</div>
