<script>
import {
  onMount
} from "svelte";
import {
fundNames,
  fundRights,
  user
} from '../rest/store'
import {
  createNote
} from '../rest/table.request'

let creatableGroups = []

function mountForm() {
  const formConfig = {
    fields: {
      author: {
        label: "Создать от имени",
        type: "select",
        options: creatableGroups,
        required: true,
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
        // onInput(fb, c, val){
        //   if (val.length) {
        //     const index = val.length-1
        //     const previousFields = fb.fields.nickname.fields
        //     console.log(fb.fields.nickname.fields[index]);
        //   }

        // }
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

      htmlHint: {
        type: "html",
        value: "Добавляйте значения при помощи клавиши 'enter'",
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
      msg: {
        type: "html",
        value: "",
      },
    },
    methods: {
      async onSubmit(fb, comp, data) {
        fb.fields.msg.value = ""
        const req = {};

        for (const [key, value] of Object.entries({
            ...data
          })) {
          if (value !== "") {
            req[key] = value;
          }
        }
        const response = await createNote(req);
        fb.fields.msg.value = response.msg
      },
    },
    title: "Создать запись о репутации игрока",
  };
  window.callForm2("#createNoteForm", {}, formConfig);
};
onMount(async () => {
  if ($user.role === 'root') {
    Object.entries($fundNames).forEach(([id,name])=> creatableGroups.push({id,name}))
    return mountForm()
  }

  for (const [id, value] of Object.entries($fundRights)) {
    if (value === "owner" || value === "manager" || value === "user")
      creatableGroups.push({
        id,
        name: $fundNames[id]
      });
  }
  mountForm()
})
;
</script>

<div id="createNoteForm" />
