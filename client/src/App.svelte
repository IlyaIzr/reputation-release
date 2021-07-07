<script>
import Navbar from './Navbar.svelte';
import { refresh } from './rest/auth.request';

import { fundNames, fundRights, goTo, location, user } from './rest/store';
import CreateFund from './fund/CreateFund.svelte';

import Login from './Login.svelte';
import Table from './table/Table.svelte';
import Users from './user/Users.svelte';
import CreateUser from './user/CreateUser.svelte';
import EditUser from './user/EditUser.svelte';
import Funds from './fund/Funds.svelte';
import EditFund from './fund/EditFund.svelte';
import CreateNote from './table/CreateNote.svelte';
import EditNote from './table/EditNote.svelte';
import Settings from './Settings.svelte';

let isLoaded = false;

// Start by requesting user info

(async function init() {
  const res = await refresh()
  
  isLoaded = true
	if (res.status = 'OK') {
    res.data.userProps?.funds && fundRights.set(res.data.userProps.funds)
    const objectOfNames = {}
    res.data.fundNames.length && res.data.fundNames.forEach(({id, name}) => objectOfNames[id] = name) 
    fundNames.set(objectOfNames)
    $user = res.data.user
    if(res.data.userProps?.children) $user.children = res.data.userProps.children
    return;
  }
	goTo('/login')
})();

// Catch initial location
location.set(window.location.pathname)
// Catch back and forward buttons
window.onpopstate = function(e){
	location.set('/' + e.state)
};
</script>

<main>
  <Navbar />
  <div class="navFiller" />

  <!-- Routing -->

  {#if !isLoaded}
    Loading...
  {:else if !$user.role}
    <Login />
  {:else if $location === "/createFund"}
    <CreateFund />
  {:else if $location === "/createUser"}
    <CreateUser />
  {:else if $location === "/createNote"}
    <CreateNote />
  {:else if $location === "/editUser"}
    <EditUser />
  {:else if $location === "/editFund"}
    <EditFund />
  {:else if $location === "/editNote"}
    <EditNote />
  {:else if $location === "/users"}
    <Users />
  {:else if $location === "/funds"}
    <Funds />
  {:else if $location === "/settings"}
    <Settings />
  {:else if $location === "/"}
    <Table />
  {:else}
    404
  {/if}
</main>

<style>
  .navFiller {
    height: 34px;
  }
</style>
