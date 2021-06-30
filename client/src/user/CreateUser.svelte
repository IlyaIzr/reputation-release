<script>
import {
  onMount
} from 'svelte';
import {
  user
} from '../rest/store';
import { createUser } from '../rest/user.request'

const regOptions = [{
  id: "guest",
  name: "Обычный"
}];
if ($user.role === "root") regOptions.unshift({
  id: "root",
  name: "root"
});
const addChildren = id => $user.children.push(id)

const config = {

  fields: {
    name : {
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
    password: {
      label: "Пароль",
      type: "password",
      required: true,
      rules: [(val) => val.length > 5 || "введите минимум 6 символов"],
      // prepend: "settings",
      // async prependOnClick(vNode) {  //TODO password generation
      //   let ps = new Jen().password(10);
      //   vNode.setValue(ps);
      // },
    },
    role: {
      label: "Роль",
      type: "select",
      autocomplete: false,
      options: regOptions,
      value: "guest",
      visible: regOptions.length > 1,
    },
    message: {
      type: "html",
      value: "",
      service: true,
    },
  },
  methods: {
    async onSubmit(fb, comp, data) {

      if (!data.login && !data.discord && !data.email) {
        return fb.fields.message.value = "Введите логин, или discord или email"
      }

      const cleaned = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== "") cleaned[key] = value;
      }

      const res = await createUser(cleaned);
      console.log('%c⧭', 'color: #40fff2', res);
      fb.fields.message.value = res.msg || "Неизвестная ошибка, проверьте подключение";

      if (res.status === 'OK')  addChildren(res.user.id)
      
    },
  },
  // buttons: [{
  //   type: "submit",
  //   label: "отправить",
  //   color: "primary",
  // }, ],
  title: "Создать пользователя",

}
onMount(() => {
  window.callForm2('#createUserForm', {}, config);
});
</script>

<div>
  <div id="createUserForm" />
</div>
