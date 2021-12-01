import { insertFund } from "../rest/fund.request";
import { fundNames, user } from "../rest/store";
export const createFund = {
  title: "Создание фонда",
  fields: {
    name: {
      label: "Название",
      required: true,
    },
    email: {
      label: "E-mail",
      type: "email",
      rules: [(val) => Boolean(val) == false || Boolean(val.includes("@") && val.includes(".")) || "неверный формат e-mail"],
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
    // owner: {
    //   label: "Создатель",
    //   hint: "Начните вводить имя или e-mail",
    //   options: [
    //     {
    //       name: "",
    //       id: "",
    //     },
    //   ],
    //   type: "creatable",
    //   async onKeyDown(fb, comp, val) {
    //     if (val?.length > 2) {
    //       const res = await getUsers(val, app.state.token);
    //       if (res.status === "OK") {
    //         v.setOptions(res.users);
    //       }
    //     }
    //   },
    // },
    msg: {
      type: "html",
      value: "",
      service: true,
    },
  },
  methods: {
    async onSubmit(fb, comp, data) {
      let ownId;
      user.subscribe((val) => (ownId = val.id));

      // Todo
      const cleaned = {
        owner: ownId,
      };
      for (const [key, value] of Object.entries(data)) {
        if (value !== "") cleaned[key] = value;
      }

      const res = await insertFund(cleaned);
      fb.fields.msg.value = res.msg;
      if (res.status === "OK") {
        fundNames.update((prev) => {
          return { ...prev, [res.data.fund.id]: data.name };
        });
      }
    },
  },
  buttons: {
    submit: {
      label: "отправить",
      color: "primary",
    },
  },
};
