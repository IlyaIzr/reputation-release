<script>
  import { onMount } from "svelte";

  import { createFund } from "./create.conf";

  onMount(() => {
    window.callForm2("#createGroupForm", {}, createFund);
  });
</script>

<main>
  <div id="createGroupForm" />
</main>
