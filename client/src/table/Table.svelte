<script>
import {
  onMount
} from "svelte";
import LinkButton from "../LinkButton.svelte";
import {
  api
} from "../rest/config";
import {
  fundNames,
  fundRights,
  goTo,  
  isWriter,
  user
} from "../rest/store";
import {
  getTable
} from '../rest/table.request'

let error = ""
let query
let order = "desc" 
let where = ""
let timeout
async function tableRequest() {
  const res = await getTable(query, order);
  if (res.status !== 'OK') return error = res.msg || res
  return res
}

function mountTable(data = [], last_page) {
  // Preparations
  const arrayFormatter = (cell) => {
    const {
      field
    } = cell._cell.column;

    const content = cell._cell.row.data[field].join(", ");
    const div = document.createElement("div");
    div.title = content;
    div.innerText = content;
    return div;
  };
  const arrayField = (name, label) => {
    return {
      title: label,
      field: name,
      formatter: arrayFormatter,
    };
  };
  // Table mounting
  new Tabulator("#tableMountingPoint", {
    data,
    pagination: "remote", //enable remote pagination
    paginationSize: 25,
    paginationSizeSelector: [10, 25, 50, 100],
    ajaxURL: api + "table", //set url for ajax request
    ajaxParams: {
      where: where,
      id: query || "",
      order: order,
    },
    columnMaxWidth: 300,
    dataTree:true,
    // groupBy: "fundName",

    columns: [{
        title: "<div class='editColumnTitle'></div>",
        field: "id",
        frozen: true,
        minWidth: 0,
        width: 54,
        formatter: function(cell) {
          const id = cell._cell.row.data.id;
          const author = cell._cell.row.data.author;
          const a = document.createElement("i");
          a.className =
            "linkToRow material-icons notranslate";
          if (cell._cell.row.data.history) {            
            a.addEventListener("click", () => {
              mountModal(id, cell._cell.row.data)
            });
            a.innerText = "visibility";
            return a;
          }
          if (
            $user.role === "root" ||
            $user.role === "admin" ||
            ($fundRights[author] && $fundRights[author] !== "readonly")
          ) {
            a.addEventListener("click", () =>
              goTo("/editNote", "id", id)
            );
            a.innerText = "create";
            return a;
          } else {
            a.addEventListener("click", () => {
              mountModal(id, cell._cell.row.data)
            });
            a.innerText = "visibility";
            return a;
          }
        },
        headerSort: false,
      },
      {
        title: "Фонд",
        field: "author",
        formatter: (cell) => {
          const author = cell._cell.row.data.author
          return $fundNames[author]
        },
      },
      {
        title: "Создано",
        field: "created",
        formatter: (cell) => {
          if (cell._cell.row.data.old) {
            return "архив";
          } else
            return moment(cell._cell.row.data.created).format("MM-DD-YYYY");
        },
      },
      {
        title: "Обновлено",
        field: "updated",
        formatter: (cell) => {
          if (cell._cell.row.data.old) {
            return "архив";
          } else
            return moment(cell._cell.row.data.updated).format("MM-DD-YYYY");
        },
      },
      {
        title: "Автор",
        field: "fundName",
        visible: false,
        sorter: "string",
      },
      {
        title: "Арбитраж",
        field: "case",
        width: 150,
        formatter: function(cell, formatterParams, onRendered) {
          const mappos = cell._cell.row.data.case.map((caseObj) => {
            return caseObj.arbitrage;
          });
          const content = mappos.join(", ");
          const div = document.createElement("div");
          div.title = content;
          div.innerText = content;
          return div;
        },
        sorter: "string",
      },
      {
        title: "Ники",
        field: "nickname",
        width: 350,
        formatter: function(cell) {
          const mappos = cell._cell.row.data.nickname.map((obj) => {
            if (cell._cell.row.data.old)
              return cell._cell.row.data.nicknameOld;
            else if (obj.room)
              return obj.room + (obj.value && " - " + obj.value);
            else return obj.value;
          });
          const content = mappos.join(", ");
          const div = document.createElement("div");
          div.title = content;
          div.innerText = content;
          return div;
        },
      },
      {
        title: "Дисциплина",
        field: "nickname",
        width: 150,
        formatter: function(cell, formatterParams, onRendered) {
          const mappos = cell._cell.row.data.nickname.map((nickObj) => {
            return nickObj.discipline; // !
          });
          return mappos.join(", ");
        },
        sorter: "string",
      },
      {
        title: "ФИО",
        field: "FIO",
        width: 250,
        formatter: function(cell, formatterParams, onRendered) {
          const mappos = cell._cell.row.data.FIO.map((fioObj) => {
            return (
              (fioObj.lastname || "") +
              " " +
              (fioObj.firstname || "") +
              " " +
              (fioObj.middlename || "")
            );
          });
          return mappos.join(", ");
        },
      },
      {
        title: "Описание",
        field: "case",
        width: 250,
        formatter: function(cell, formatterParams, onRendered) {
          const mappos = cell._cell.row.data.case.map((caseObj) => {
            return caseObj.descr;
          });
          const content = mappos.join(" | ");
          const div = document.createElement("div");
          div.title = content;
          div.innerText = content;
          return div;
        },
        sorter: "string",
      },
      {
        title: "Ущерб ($)",
        field: "case",
        width: 100,
        formatter: function(cell, formatterParams, onRendered) {
          const mappos = cell._cell.row.data.case.map((caseObj) => {
            return caseObj.amount;
          });
          const content = mappos.join(" | ");
          const div = document.createElement("div");
          div.title = content;
          div.innerText = content;
          return div;
        },
        sorter: "string",
      },
      arrayField("gipsyteam", "Gipsy team"),
      arrayField("skype", "Skype"),
      arrayField("skrill", "Skrill"),
      arrayField("neteller", "Neteller"),
      arrayField("phone", "Телефоны"),
      {
        title: "Адреса",
        field: "location",
        formatter: function(cell, formatterParams, onRendered) {
          const mappos = cell._cell.row.data.location.map((obj) => {
            return obj.country + " " + obj.town + " " + obj.address;
          });
          return mappos.join(" ,");
        },
      },
      arrayField("pokerstrategy", "Poker Strategy"),
      arrayField("google", "Google"),
      arrayField("mail", "e-mail"),
      arrayField("vk", "Вконтакте"),
      arrayField("facebook", "Facebook"),
      arrayField("blog", "Блог"),
      arrayField("forum", "Форум"),
      arrayField("instagram", "Instagram"),
      arrayField("ecopayz", "Ecopayz"),
      {
        title: "Webmoney",
        field: "webmoney",
        formatter: function(cell, formatterParams, onRendered) {
          const mappos = cell._cell.row.data.webmoney.map((obj) => {
            const wallets =
              obj.wallets &&
              Array.isArray(obj.wallets) &&
              obj.wallets.join(" ,");
            return obj.WMID + ": " + wallets;
          });
          return mappos.join(" | ");
        },
      },
      {
        title: "Комментарии",
        field: "comments",
      },
    ],

    locale: true,
    langs: {
      "en-gb": {
        columns: {},
        ajax: {
          loading: "Loading",
          error: "Error",
        },
        groups: {
          item: "item",
          items: "items",
        },
        pagination: {
          page_size: "Page Size",
          page_title: "Show Page",
          first: "First",
          first_title: "First Page",
          last: "Last",
          last_title: "Last Page",
          prev: "Prev",
          prev_title: "Prev Page",
          next: "Next",
          next_title: "Next Page",
          all: "All",
        },
        headerFilters: {
          default: "filter column...",
          columns: {
            column: "filter name..."
          },
        },
        custom: {},
      },
      "ru-ru": {
        columns: {},
        ajax: {
          loading: "Загрузка...",
          error: "Ошибка!",
        },
        groups: {
          item: "свойство",
          items: "свойства",
        },
        pagination: {
          page_size: "Кол-во строк",
          page_title: "Показать страницу",
          first: "Первая",
          first_title: "Первая страница",
          last: "Последняя",
          last_title: "Последняя страница",
          prev: "Пред.",
          prev_title: "Предыдущая страница",
          next: "След.",
          next_title: "Следущая страница",
          all: "Всё",
        },
        headerFilters: {
          default: "Отфильтровать...",
          columns: {},
        },
        custom: {},
      },
    },
    tableBuilt: function() {
      document.querySelector(".tabulator").classList.add("compact", "very");
      this.redraw(true);
    },
  });

}

function mountModal(id, data) {

  const modalConfig = {
    modal: true,
    fields: {
      author: {
        label: "Автор",
        disabled: true,
        value: $fundNames[id]
      },

      // Rest info

      case: {
        label: "Арбитраж",
        type: "multiple",
        value: [],
        settings: {
          arbitrage: {
            label: "Арбитраж",
            row: 1,
          },
          descr: {
            label: "Описание",
            type: "textarea",
            row: 1,
          },
          amount: {
            label: "Размер",
            row: 1,
          },
        },
      },

      nickname: {
        label: "Дисциплины",
        type: "multiple",
        value: [],
        settings: {
          discipline: {
            label: "Дисциплина",
            row: 1,
          },
          room: {
            label: "Room",
            row: 1,
          },
          value: {
            label: "Nick",
            row: 1,
          },
        },
      },

      horizont: {
        type: "html",
        value: '<div class="filler"/>'
      },

      nicknameOld: {
        label: "Архивные значения",
        type: "textarea",
        visible: false,
      },

      FIO: {
        label: "ФИО",
        type: "multiple",
        value: [],
        settings: {
          firstname: {
            label: "Имя",
            row: 1,
          },
          lastname: {
            label: "Фамилия",
            row: 1,
          },
          middlename: {
            label: "Отчество",
            row: 1,
          },
        },
      },

      horizont2: {
        type: "html",
        value: '<hr class="q-ma-none q-pa-none"/>'
      },

      gipsyteam: {
        label: "Gipsy team",
        type: "creatable",
        outlined: true,
      },
      skype: {
        label: "Аккаунты Skype",
        type: "creatable",
        outlined: true,
      },
      skrill: {
        label: "Аккаунты skrill",
        type: "creatable",
        outlined: true,
      },
      neteller: {
        label: "Аккаунты neteller",
        type: "creatable",
        outlined: true,
      },
      phone: {
        label: "Телефоны",
        type: "creatable",
        outlined: true,
      },
      pokerstrategy: {
        label: "Poker Strategy",
        type: "creatable",
        outlined: true,
      },
      google: {
        label: "Google аккаунты",
        type: "creatable",
        outlined: true,
      },
      mail: {
        label: "Адреса e-mail",
        type: "creatable",
        outlined: true,
      },
      vk: {
        label: "Аккаунты vkontakte",
        type: "creatable",
        outlined: true,
      },
      facebook: {
        label: "Аккаунты facebook",
        type: "creatable",
        outlined: true,
      },
      blog: {
        label: "Блоги",
        type: "creatable",
        outlined: true,
      },
      instagram: {
        label: "Аккаунты instagram",
        type: "creatable",
        outlined: true,
      },
      forum: {
        label: "Форумы",
        type: "creatable",
        outlined: true,
      },
      ecopayz: {
        label: "Аккаунты ecopayz",
        type: "creatable",
        outlined: true,
      },
      location: {
        label: "Адреса",
        type: "multiple",
        value: [],
        settings: {
          country: {
            label: "Страна",
            row: 1,
          },
          town: {
            label: "Город",
            row: 1,
          },
          address: {
            label: "Адрес",
            row: 1,
          },
        },
      },
      webmoney: {
        label: "Аккаунты Webmoney",
        type: "multiple",
        value: [],
        settings: {
          WMID: {
            row: 1,
            label: "WMID",
            required: true,
          },
          wallets: {
            label: "Кошельки",
            type: "creatable",
            row: 1,
          },
        },
      },
      comments: {
        label: "Комментарии",
        type: 'textarea'
      },
      old: {
        type: 'checkbox',
        label: 'Архивная запись',
        hint: 'снимите флажок, если запись была отредактирована в новый формат'
      },
    },
    title: "Просмотр записи",
    buttons: null,
    noButtons: true,
    global: {
      fields: {
        readonly: true
      }
    }
  };
  window.callForm2("#modalPoint", data, modalConfig);
}

async function onFilter(e) {
  let input = e.target.value
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    where = input;
    mountTable()
  }, 500);
}
onMount(async () => {
  const res = await tableRequest()
  if (res) mountTable(res.data, res.last_page)
});
</script>

<main>
    {error}
    <br />
    <div class="userControls inline">
        <div class="ui icon input item">
            <input type="text" on:input={onFilter} placeholder="Поиск записей" />
            <i class="search link icon" />
        </div>

        {#if $user.role === "root" || isWriter()}
        <div class="createContainer">
            <LinkButton to="createNote" label="Создать запись" />
        </div>
        {/if}
    </div>

    <div id="tableMountingPoint" />
    <div id="modalPoint" />
</main>

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
