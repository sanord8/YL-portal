<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'outline' | 'black' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';

  // Allow custom classes to be passed
  let className = '';
  export { className as class };

  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md';

  const variantClasses = {
    // YoungLife green primary button
    primary: 'bg-yl-green text-white hover:bg-yl-green-accent focus:ring-yl-green',
    // Professional black button
    black: 'bg-yl-black text-white hover:bg-yl-gray-800 focus:ring-yl-gray-600',
    // Light secondary button
    secondary: 'bg-yl-gray-100 text-yl-black hover:bg-yl-gray-200 focus:ring-yl-gray-300',
    // Outline button with green accent
    outline: 'border-2 border-yl-green text-yl-green hover:bg-yl-green hover:text-white focus:ring-yl-green',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
  };

  $: classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
</script>

<button {type} {disabled} class={classes} on:click>
  <slot />
</button>
