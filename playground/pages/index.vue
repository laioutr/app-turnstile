<script setup lang="ts">
const result = ref('');

const run = async () => {
  result.value = 'running';
  try {
    const headers = await useBotProtection().prepare({ action: 'playground/check' });
    const verdict = await $fetch('/api/turnstile-check', { method: 'POST', headers });
    result.value = JSON.stringify(verdict);
  } catch (error) {
    result.value = `failed: ${(error as Error).name} ${(error as Error).message}`;
  }
};
</script>

<template>
  <button type="button" data-check @click="run">Run a protected action</button>
  <output data-result>{{ result }}</output>
</template>
