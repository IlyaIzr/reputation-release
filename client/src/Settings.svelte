<script>
  import { onMount } from "svelte";
  import { updateCreds } from "./rest/auth.request";
  import { user } from "./rest/store";

  const config = {
    fields: {
      username: {
        label: "Имя пользователя",
        hint: 'Как к вам обращаться'
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
        rules: [
          (val) =>
            val == false ||
            Boolean(val.includes("@") && val.includes(".")) ||
            "неверный формат e-mail",
        ],
      },
      // oldPassword: {
      //   label: "Текущий пароль",
      //   type: "password",
      //   hint: "Введите, чтобы подтвердить изменения",
      // },
      password: {
        label: "Новый пароль",
        type: "password",
        // prepend: "settings",
        // async prependOnClick(vNode) {
        //   let ps = new Jen().password(10);
        //   vNode.setValue(ps);
        // },
      },
      msg: {
        type: "html",
        value: "",
      },
    },
    methods: {
      async onSubmit(fb, form, data) {
        const msg = fb.fields.msg
        
        if (!data.login && !data.discord && !data.email) {
          msg.value = "Введите логин, или discord или email"
          return;
        }

        const cleaned = {};
        for (const [key, value] of Object.entries(data)) {
          if (value !== "") cleaned[key] = value;
        }

        const res = await updateCreds(cleaned);
          if (res.status === "OK") {
            $user = {...$user, ...res.data}
          }
          msg.value = res.msg
      }
    }
  }
  
onMount(() => {
  window.callForm2('#userEditForm', $user, config);
});
  ;
</script>

<div id="userEditForm" />
