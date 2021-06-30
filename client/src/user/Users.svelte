<script>
import {
  onMount
} from 'svelte';
import {
  userRightsTranslation
} from '../rest/config';
import LinkButton from '../LinkButton.svelte'

import {
  fundNames,
  goTo,
  user
} from '../rest/store';

import {
  getUsers
} from './getUsers'
let userInfo
let initUserInfo
let message
let localFunds = $fundNames

onMount(async () => {
  [userInfo, message] = await getUsers($user);
  initUserInfo = [...userInfo]

  if (userInfo) mountTable()
});

function mountTable() {
  const data = userInfo.map((row, i) => {
    row.index = i;
    return row;
  });
  new window.Tabulator("#tableMountingPoint", {
    data,
    layout: "fitDataTable",
    pagination: "local",
    paginationSize: 25,
    columns: [{
        title: "#",
        field: "index",
        sorter: "number",
        cellClick: function(e, cell) {
          const id = cell._cell.row.data.userProps.id;
          goTo('/editUser', "id", id)
        },
      },
      {
        title: " ",
        formatter: function(cell) {
          const id = cell._cell.row.data.userProps.id;
          const a = document.createElement("i");
          a.className = "linkToRow";
          a.addEventListener("click", () =>goTo('/editUser', "id", id));
          a.innerText = "править";
          return a;
        },
      },
      {
        title: "Имя пользователя",
        field: "username",
        sorter: "string",
      },
      {
        title: "Логин",
        field: "login",
        sorter: "string",
      },
      {
        title: "Ник discord",
        field: "discord",
        sorter: "string",
      },
      {
        title: "E-mail",
        field: "email",
        sorter: "string",
      },
      {
        title: "Фонды",
        field: "groups",
        formatter: function(cell) {
          const groupObj = cell._cell.row.data.userProps.funds;
          if (!groupObj) return ''
          const res = []
          Object.entries(groupObj).forEach(([fundId, role]) => {
            res.push(localFunds[fundId] + ' - ' + userRightsTranslation[role])
          })
          if (res.length) return res.join(", ");
          return '';
        },
      },
    ],
  });
}

function onFilter(e) {
  let input = e.target.value

  if (!userInfo) return;
  
  if (input.length) {
    input = input.toLocaleLowerCase();
    userInfo = initUserInfo.filter((val) => {
      let {
        username,
        email,
        discord,
        login,
        funds
      } = val;

      if (username && username.toLocaleLowerCase().includes(input)) return true;
      if (email && email.toLocaleLowerCase().includes(input)) return true;
      if (discord && discord.toLocaleLowerCase().includes(input))
        return true;
      if (login && login.toLocaleLowerCase().includes(input)) return true;
      // if (funds) { //TODO
      //   const res = funds.filter((fundName) =>
      //     fundName.toLocaleLowerCase().includes(input)
      //   );
      //   if (res.length) return true;
      // }
    });
    return mountTable();
  }
  userInfo = initUserInfo
  mountTable()
}

</script>

<div class="userControls inline">
  <div class="ui icon input item">
    <input type="text" on:input={onFilter} placeholder="Поиск пользователей" />
    <i class="search link icon" />
  </div>
  {#if $user.role === "root"}
    <div class="createContainer">
      <LinkButton to="createUser" label="Создать пользователя" />
    </div>
  {/if}
</div>
<div id="tableMountingPoint" />

<style>
  .userControls {
    padding: 6px;
  }

  .userControls input {
    min-width: 280px;
  }
  .inline {
    flex-wrap: wrap;
  }
  .createContainer {
    display: inline-block;
    margin-left: 24px;
  }
</style>
