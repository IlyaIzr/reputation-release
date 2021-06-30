<script>
import {
  onMount
} from "svelte";

import {
  user
} from "../rest/store";
import {
  getUserInfo, updateAnoterUser
} from "../rest/user.request";

const params = new URLSearchParams(window.location.search)
const id = params.get('id')
let error = ''
let editor = $user
let targetUser
async function retrieveUserInfo() {
  const response = await getUserInfo(id);
  if (response.status === "OK") {
    targetUser = response.data;
    mountForm();
  } else error = response.msg || response;
}
onMount(async () => {
  retrieveUserInfo()
})

function mountForm() {

  const regOptions = [{
    id: "guest",
    name: "Обычный"
  }, ];
  if (editor.role === "root")
    regOptions.unshift({
      id: "root",
      name: "root"
    });
  const formConfig = {
    fields: {
      username: {
        label: "Имя пользователя",
      },
      login: {
        label: "Логин",
      },
      discord: {
        label: "Ник discord",
      },
      email: {
        label: "E-mail",
        type: "email",
        // rules: [
        //   (val) =>
        //     val == false ||
        //     Boolean(val.includes("@") && val.includes(".")) ||
        //     "неверный формат e-mail",
        // ],
      },
      role: {
        label: "Роль",
        key: "",
        type: "select",
        autocomplete: false,
        options: regOptions,
        value: "guest",
        visible: editor.role === "root",
      },
      password: {
        label: "Задать новый пароль",
        type: "password",
        rules: [
          (val) =>
          Boolean(val) == false ||
          val.length > 5 ||
          "введите минимум 6 символов",
        ],
        // prepend: "settings",
        // async prependOnClick(vNode) {
        //   let ps = new Jen().password(10);
        //   vNode.setValue(ps);
        // },
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
          fb.fields.msg.value = "Введите логин, или discord или email"
          return;
        }
        fb.fields.msg.value = ""

        const cleaned = {};
        for (const [key, value] of Object.entries(data)) {
          if (value !== "") cleaned[key] = value;
        }

        const res = await updateAnoterUser(id, cleaned);
        fb.fields.msg.value = res.msg
      },
    },
    
  };
  window.callForm2("#formEditUser", {
    ...targetUser
  }, formConfig);
}
</script>

<div id="formEditUser"></div>
{error}
