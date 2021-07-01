<script>
import NavButton from "./NavButton.svelte";
import { logout } from "./rest/auth.request";
import { fundRights, goTo, isManager, user } from "./rest/store";
async function logOut() {
  const res = await logout()
  if (res.status === 'OK') {
    $user = {children: []}
    $fundRights = {}
    goTo('/login')
  }
}

</script>

<nav>
  {#if !$user.role}
    <NavButton to="login" />
  {:else}
    <NavButton label="Таблица" to="" />
    {#if $user.role === "root" || isManager()}
      <NavButton to="funds" label="Фонды" />
      <NavButton to="users" label="Пользователи" />
    {/if}
    <div class="link-button" on:click={logOut}>Выйти</div>
  {/if}
</nav>

<style>
  nav {
    position: fixed;
    top: 0;
    left: 0;
    height: 30px;
    width: 100%;
    z-index: 1;
    padding: 2px 6px;
    background-color: #50c8ff;
  }
  .link-button {
    cursor: pointer;
    display: inline-block;
    font-size: 16px;
    margin: 2px 6px;
  }
</style>
