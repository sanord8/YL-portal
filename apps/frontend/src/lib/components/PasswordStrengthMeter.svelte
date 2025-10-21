<script lang="ts">
  export let password: string = '';

  interface PasswordStrength {
    score: number; // 0-4
    label: string;
    color: string;
    checks: {
      minLength: boolean;
      hasLower: boolean;
      hasUpper: boolean;
      hasNumber: boolean;
      hasSpecial: boolean;
    };
  }

  $: strength = calculateStrength(password);

  function calculateStrength(pwd: string): PasswordStrength {
    const checks = {
      minLength: pwd.length >= 8,
      hasLower: /[a-z]/.test(pwd),
      hasUpper: /[A-Z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[^a-zA-Z0-9]/.test(pwd),
    };

    // Calculate score based on checks
    const passedChecks = Object.values(checks).filter(Boolean).length;
    let score = 0;
    let label = 'None';
    let color = 'bg-gray-300';

    if (pwd.length === 0) {
      score = 0;
      label = 'None';
      color = 'bg-gray-300';
    } else if (passedChecks <= 2) {
      score = 1;
      label = 'Weak';
      color = 'bg-red-500';
    } else if (passedChecks === 3) {
      score = 2;
      label = 'Fair';
      color = 'bg-orange-500';
    } else if (passedChecks === 4) {
      score = 3;
      label = 'Good';
      color = 'bg-yellow-500';
    } else {
      score = 4;
      label = 'Strong';
      color = 'bg-green-500';
    }

    return { score, label, color, checks };
  }
</script>

<div class="space-y-2">
  <!-- Strength Bar -->
  <div class="flex items-center gap-2">
    <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        class="h-full transition-all duration-300 {strength.color}"
        style="width: {(strength.score / 4) * 100}%"
      />
    </div>
    {#if password.length > 0}
      <span class="text-xs font-medium text-yl-gray-600 w-12">{strength.label}</span>
    {/if}
  </div>

  <!-- Requirements Checklist -->
  {#if password.length > 0}
    <div class="text-xs space-y-1">
      <p class="font-medium text-yl-gray-700">Password requirements:</p>
      <ul class="space-y-0.5 text-yl-gray-600">
        <li class="flex items-center gap-1.5">
          <span class="{strength.checks.minLength ? 'text-green-600' : 'text-red-500'}">
            {strength.checks.minLength ? '✓' : '✗'}
          </span>
          At least 8 characters
        </li>
        <li class="flex items-center gap-1.5">
          <span class="{strength.checks.hasLower ? 'text-green-600' : 'text-red-500'}">
            {strength.checks.hasLower ? '✓' : '✗'}
          </span>
          Lowercase letter (a-z)
        </li>
        <li class="flex items-center gap-1.5">
          <span class="{strength.checks.hasUpper ? 'text-green-600' : 'text-red-500'}">
            {strength.checks.hasUpper ? '✓' : '✗'}
          </span>
          Uppercase letter (A-Z)
        </li>
        <li class="flex items-center gap-1.5">
          <span class="{strength.checks.hasNumber ? 'text-green-600' : 'text-red-500'}">
            {strength.checks.hasNumber ? '✓' : '✗'}
          </span>
          Number (0-9)
        </li>
        <li class="flex items-center gap-1.5">
          <span class="{strength.checks.hasSpecial ? 'text-green-600' : 'text-red-500'}">
            {strength.checks.hasSpecial ? '✓' : '✗'}
          </span>
          Special character (!@#$%...)
        </li>
      </ul>
    </div>
  {/if}
</div>
