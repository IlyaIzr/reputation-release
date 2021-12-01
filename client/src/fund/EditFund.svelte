<script>
  import { onMount, tick } from "svelte";
  import { user } from "../rest/store";
  import { createUser, getAvailibleUsers } from "../rest/user.request";
  import { getFundFormated, updateFundOwner, updateFundForm, addUserToFund, updateUserRole, deleteFromFund } from "../rest/fund.request";
  import { userRightsTranslation } from "../rest/config";

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  let tab = 0;
  let error = "";
  let options = [
    {
      label: "Менеджер",
      value: "manager",
    },
    {
      label: "Обычный пользователь",
      value: "user",
    },
    {
      label: "Только чтение",
      value: "readonly",
    },
  ];
  let groupInfo;
  const usersObj = {};
  let availibleUsers = [];
  let currentUser;
  let selectedUser;
  let prevRole;

  function mountForm() {
    const formConfig = {
      fields: {
        name: {
          label: "Название",
          required: true,
        },
        email: {
          label: "E-mail",
          type: "email",
        },
        skype: {
          label: "Skype",
        },
        site: {
          label: "Сайт",
        },
        discord: {
          label: "Сервер discord",
        },
        owner: {
          label: "Создатель",
          hint: "Начните вводить имя",
          options: availibleUsers,
          type: "select",
          // async onKeyDown(fb, c, val) {
          //   if (val && val.length > 2) {
          //     const res = await getUsersByQuery(val);
          //     // TBC
          //     if (res.status === "OK") {
          //       res.data.forEach(opt => opt.name = opt.username)
          //       fb.fields.owner.options = res.data
          //       if (res.data.length) c.$refs.input.blur()
          //     }
          //   }
          // },
          onInput(fb, c, val) {
            const res = fb.fields.owner.options.find((opt) => opt.id === val);
            currentUser = res;
          },
        },
        msg: {
          type: "html",
          value: "",
        },
      },
      methods: {
        async onSubmit(fb, comp, data) {
          if (data.owner && data.owner !== groupInfo.owner.value) {
            const res = await updateFundOwner(groupInfo.id, data.owner, groupInfo.owner.value);
            if (res.status === "OK") {
              // Update local data of group and user info
              groupInfo.owner = currentUser;
              currentUser = null;
              usersObj[data.owner] = "owner";
              if (usersObj[groupInfo.owner.value]) delete usersObj[groupInfo.owner.value];
            }
            fb.fields.msg.value = res.msg || res;
          }

          const cleaned = {};
          for (const [key, value] of Object.entries(data)) {
            if (value !== "" && key !== "owner") cleaned[key] = value;
          }
          const res = await updateFundForm(groupInfo.id, cleaned);
          if (res.status === "OK") {
            delete data.owner;
            groupInfo = {
              ...groupInfo,
              ...data,
            };
          }
          fb.fields.msg.value = res.msg;
        },
      },
    };
    window.callForm2(
      "#editGroupForm",
      {
        ...groupInfo,
        owner: groupInfo.owner.value,
      },
      formConfig
    );
  }

  function mountAddUser() {
    const formConfig = {
      title: "Добавить зарегистрированных участников",
      fields: {
        user: {
          label: "Пользователь",
          required: true,
          hint: "Начните вводить имя пользователя",
          options: availibleUsers,
          type: "select",
          // async onKeyDown(fb, c, val) {
          //   if (val && val.length > 2) {
          //     const res = await getUsersByQuery(val);
          //     // TBC
          //     if (res.status === "OK") {
          //       res.data.forEach(opt => opt.name = opt.username)
          //       if (res.data.length) fb.fields.user.options.push(...res.data)
          //       // if (res.data.length) c.$refs.input.blur()
          //     }
          //   }
          // },
          onInput(fb, c, val) {
            const res = fb.fields.user.options.find((opt) => opt.id === val);
            currentUser = res;
          },
        },

        role: {
          label: "Роль",
          options,
          type: "select",
          required: true,
        },

        msg: {
          type: "html",
          value: "",
          service: true,
        },
      },
      methods: {
        async onSubmit(fb, comp, data) {
          // Check if user exists
          if (usersObj[data.user]) {
            fb.fields.msg.value = "Пользователь уже добавлен, перейдите во вкладку редактирования";
            return;
          }

          const res = await addUserToFund(data.user, data.role, groupInfo.id);
          if (res.status === "OK") {
            groupInfo[data.role + "s"].push({
              label: currentUser.name,
              value: currentUser.id,
            });
            usersObj[data.user] = data.role;
            await groupRequest();
          }
          fb.fields.msg.value = res.msg || res;
        },
      },
      buttons: {
        submit: {
          label: "Добавить",
          color: "primary",
        },
      },
    };
    window.callForm2("#addUsersForm", {}, formConfig);
  }

  function mountRegAndConfig() {
    // Register and add
    const regOptions = [
      {
        id: "guest",
        name: "Обычный",
      },
    ];
    if ($user.role === "root")
      regOptions.unshift({
        id: "root",
        name: "root",
      });

    const formRegConfig = {
      title: "Зарегистрировать и добавить участников",
      fields: {
        login: {
          label: "Логин",
        },
        name: {
          label: "Имя пользователя",
        },
        discord: {
          label: "Ник discord",
        },
        email: {
          label: "E-mail",
          type: "email",
          rules: [(val) => val == false || Boolean(val.includes("@") && val.includes(".")) || "неверный формат e-mail"],
        },
        password: {
          label: "Пароль",
          type: "password",
          rules: [(val) => val.length > 5 || "введите минимум 6 символов"],
          required: true,
        },

        role: {
          label: "Роль на сайте",
          type: "select",
          autocomplete: false,
          options: regOptions,
          value: "guest",
          visible: $user.role === "root",
          required: true,
        },
        groupRole: {
          label: "Роль в фонде",
          type: "select",
          options: [
            {
              name: "Менеджер",
              id: "manager",
            },
            {
              name: "Обычный",
              id: "user",
            },
            {
              name: "Только чтение",
              id: "readonly",
            },
          ],
          required: true,
        },

        msg: {
          type: "html",
          value: "",
          service: true,
        },
      },
      methods: {
        async onSubmit(fb, comp, data) {
          if (!data.login && !data.discord && !data.email) {
            fb.fields.msg.value = "Введите логин, или discord или email";
            return;
          }

          const cleaned = {};
          for (const [key, value] of Object.entries(data)) {
            if (value !== "" && key !== "groupRole") cleaned[key] = value;
          }

          const createResponse = await createUser(cleaned);
          if (createResponse.status !== "OK") {
            return false;
          }
          fb.fields.msg.value = createResponse.msg || createResponse;

          const createdUser = createResponse.data;
          $user.children.push(createdUser.id);

          const response = await addUserToFund(createdUser.id, data.groupRole, groupInfo.id);
          if (response.status === "OK") {
            groupInfo[data.groupRole + "s"].push({
              label: createdUser.name,
              value: createdUser.id,
            });
            usersObj[createdUser.id] = data.groupRole;
            await groupRequest();
          }

          fb.fields.msg.value = response.msg || response;
        },
      },
      buttons: {
        submit: {
          label: "Создать и добавить",
          color: "primary",
        },
      },
    };
    window.callForm2("#regAndAddUsersForm", {}, formRegConfig);
  }

  function mountUserTable() {
    const users = [...groupInfo.managers, ...groupInfo.users, ...groupInfo.readonlys];
    const filtered = users.filter((userObj) => userObj.id !== $user.id);
    new Tabulator("#usersTable", {
      layout: "fitDataTable",
      data: filtered,
      pagination: "local",
      paginationSize: 15,
      columns: [
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
          title: "Роль",
          field: "role",
          sorter: "string",
          formatter: function (cell) {
            const role = usersObj[cell._cell.row.data.id];
            return userRightsTranslation[role];
          },
        },
        {
          title: "",
          field: "id",
          formatter: function (cell) {
            const role = usersObj[cell._cell.row.data.id];
            const a = document.createElement("button");
            a.className = "linkToRow";
            a.addEventListener("click", () => {
              selectedUser = {
                ...cell._cell.row.data,
                role,
              };
              prevRole = role;
              error = "";
              mountUserEditor();
            });
            a.innerText = "выбрать";
            return a;
          },
        },
      ],
    });
  }

  function mountUserEditor() {
    const config = {
      fields: {
        role: {
          row: 1,
          type: "select",
          label: "Выберете новую роль",
          options: options.filter((o) => o.value !== prevRole),
          required: true,
        },
        deleteUser: {
          type: "button",
          label: "или",
          value: "Удалите пользователя",
          color: "red",
          size: "sm",
          async onClick(fb) {
            const res = await deleteFromFund(selectedUser.id, groupInfo.id, prevRole);
            fb.fields.msg.value = res.msg || res;
            if (res.status === "OK") {
              delete usersObj[selectedUser.id];
              await groupRequest();
              mountUserTable();
              fb.modal.closeModal();
            }
          },
        },
        msg: {
          type: "html",
          value: "",
        },
      },
      methods: {
        async onSubmit(fb, c, data) {
          const res = await updateUserRole(selectedUser.id, data.role, prevRole, groupInfo.id);
          fb.fields.msg.value = res.msg || res;
          if (res.status === "OK") {
            await groupRequest();
            mountUserTable();
          }
        },
      },
      modal: true,
      buttons: {
        submit: {
          label: "Обновить роль",
          color: "primary",
        },
      },
      title: "Редактирование пользователя " + selectedUser.username,
    };
    window.callForm2("#userEditor", {}, config);
  }

  async function groupRequest() {
    const response = await getFundFormated(id);
    const res = await getAvailibleUsers();
    if (res.data?.length) res.data.forEach((userObj) => availibleUsers.push({ ...userObj, name: userObj.username }));
    if (response.status === "OK") {
      groupInfo = response.data;
      // Set users
      groupInfo.owner?.value && (usersObj[groupInfo.owner.value] = "owner");
      groupInfo.managers.forEach((e) => (usersObj[e.value] = "manager"));
      groupInfo.users.forEach((e) => (usersObj[e.value] = "user"));
      groupInfo.readonlys.forEach((e) => (usersObj[e.value] = "readonly"));
      return groupInfo;
    } else error = response.msg || response;
  }

  async function tabClick(number = 0) {
    tab = number;
    error = "";
    await tick();
    if (number === 0) return mountForm();
    if (number === 1) return mountAddUser() || mountRegAndConfig();
    if (number === 2) return mountUserTable();
  }
  onMount(async () => {
    const res = await groupRequest();
    if (res) mountForm();
  });
</script>

<main>
  {#if groupInfo}
    <h5 class="">Фонд {groupInfo?.name}</h5>
  {/if}
  <div class="navigation">
    <div class={tab === 0 ? "current" : "link-button"} on:click={() => tabClick(0)}>Общая информация</div>
    <div class={tab === 1 ? "current" : "link-button"} on:click={() => tabClick(1)}>Добавить участников</div>
    <div class={tab === 2 ? "current" : "link-button"} on:click={() => tabClick(2)}>Редактировать участников</div>
  </div>

  {#if error}
    {error}
    <br />
  {/if}

  {#if tab === 0}
    <div id="editGroupForm" />
  {:else if tab === 1}
    <div id="addUsersForm" />
    <div id="regAndAddUsersForm" />
  {:else if tab === 2}
    <div id="usersTable" />
    <div id="userEditor" />
  {/if}
</main>

<style>
  .navigation {
    padding: 2px 6px;
  }
  h5 {
    padding: 0 14px;
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: normal;
  }
  .link-button {
    cursor: pointer;
    display: inline-block;
    font-size: 16px;
    margin: 0px 0px 0px 0px;
    padding: 4px 8px;
    border-radius: 2px;
    font-family: Roboto, -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif;
  }
  .current {
    display: inline-block;
    pointer-events: none;
    color: #2b0635;
    font-size: 16px;
    margin: 0px 0px 0px 0px;
    padding: 4px 8px;
    font-family: Roboto, -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif;
    background-color: #50c8ff;
    border-radius: 2px;
  }
</style>
