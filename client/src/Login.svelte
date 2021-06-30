<script>
import {
  onMount
} from "svelte";
import {
  login
} from './rest/auth.request'
import {
  user,
  goTo
} from './rest/store'

const config = {
  fields: {
    credential: {
      label: "Логин, email или ник discord",
      type: "email",
    },
    password: {
      label: "Пароль",
      type: "password",
    },
    message: {
      type: "html",
      value: "",
    }
  },

  methods: {
    async onSubmit(fb, form, data, f) {

      const res = await login(data.credential, data.password);
      if (res.status === "OK") {
        user.set(res.data)
        fb.fields.message.value = res.msg
        setTimeout(() => {
          goTo('/')
        }, 500);
      } else {
        fb.fields.message.value = res.msg || "Неизвестная ошибка, проверьте подключение";
      }
    },
  },
}
onMount(() => {
  window.callForm2('#loginForm', {}, config);
});
</script>

<main>
    <div id="loginForm" />
</main>
