<script>
import { goTo, location } from "./rest/store";
// props
export let to
export let label = to;
let current = false

function onClick() {
  current = !current
  goTo('/' + to)
}
location.subscribe(loc => {
  if (loc.substring(1) === to) current = true
  else current = false
})
;
</script>

<button class="link-button" class:current on:click={onClick}>{label || to}</button>

<style>
  .link-button {
    cursor: pointer;
  }
  .current {
    text-decoration: underline;
    pointer-events: none;
  }

</style>
