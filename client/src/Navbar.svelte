<script>
import LinkButton from "./LinkButton.svelte";
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
  <LinkButton to="login" />
  {:else}
  <LinkButton label="Таблица" to="" />
  {#if $user.role === 'root' || isManager()}
  <LinkButton to="funds" label="Фонды"/>
  <LinkButton to="users" label="Пользователи"/>
  {/if}
  <button class="link-button" on:click={logOut}>Выйти</button>
  {/if}
</nav>

<style>
  nav{
    padding: 6px;
    border-bottom: 1px solid black;
  }
  .link-button {
    cursor: pointer;
  }
</style>