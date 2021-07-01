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

<div class="link-button" class:current on:click={onClick}>{label || to}</div>

<style>
  .link-button {
    cursor: pointer;
    display: inline-block;
    font-size: 16px;
    margin: 0px 0px 0px 0px;
    padding: 2px 8px 4px 8px;
    border-radius: 2px;
    font-family: Roboto, -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif;
  }
  .current {
    pointer-events: none;
    color: #2b0635;
    background-color: #fff;
    /* font-weight: 550;
      opacity: 0.8; */
  }
</style>
