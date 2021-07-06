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
  getFunds
} from '../rest/fund.request';
let fundInfo
let initFundInfo
let error = ""
let localFunds = $fundNames

onMount(async () => {
  const res = await getFunds();
  if (res.status === 'OK') {
    fundInfo = res.data
    console.log('%c⧭', 'color: #cc7033', fundInfo);
    initFundInfo = [...res.data]
    mountTable()
  } else {
    error = res.msg || res
  }
});

function mountTable() {
  new window.Tabulator("#tableMountingPoint", {
    layout: "fitDataTable",
    data: fundInfo,
    pagination: "local",
    paginationSize: 25,
    columns: [
      {
        title: "",
        field: "id",
        formatter: function(cell) {
          const id = cell._cell.row.data.id;
          const a = document.createElement("i");
          a.className = "linkToRow";
          a.addEventListener("click", () =>goTo('/editFund', "id", id));
          a.innerText = "править";
          return a;
        },
      },
      {
        title: "Название",
        field: "name",
        sorter: "string",
      },
      {
        title: "Discord",
        field: "discord",
        sorter: "string",
      },
      {
        title: "Сайт",
        field: "site",
        sorter: "string",
      },
    ],
  });
}

function onFilter(e) {
  let input = e.target.value

  if (!fundInfo) return;

  if (input.length) {
    input = input.toLocaleLowerCase();
    fundInfo = initFundInfo.filter((val) => {
      let {
        name,
        site,
        discord
      } = val;

      if (name && name.toLocaleLowerCase().includes(input)) return true;
      if (site && site.toLocaleLowerCase().includes(input)) return true;
      if (discord && discord.toLocaleLowerCase().includes(input))
        return true;
    });
    return mountTable();
  }
  fundInfo = initFundInfo
  mountTable()
}
</script>

<div class="fundControls inline">
    <div class="ui icon input item">
        <input type="text" on:input={onFilter} placeholder="Поиск фондов" />
        <i class="search link icon" />
    </div>
    {#if $user.role === "root"}
    <div class="createContainer">
        <LinkButton to="createUser" label="Создать фонд" />
    </div>
    {/if}
</div>
<div id="tableMountingPoint" />
{error}

<style>
.fundControls {
  padding: 6px;
}

.fundControls input {
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
