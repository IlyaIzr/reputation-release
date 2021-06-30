const formConfig = {
  title: 'Tabs example',

  fields: {
    bio: {
      label: 'Tell us about yourself'
    },
    name: {
      label: 'Ваше имя',
      value: 'Anton',
      tab: 2
    },
    city: {
      label: 'City',
      rules: [a => a && a.length > 3 || 'err msg'],
      tab: 3,
    },
  },

  tabs: true,  // Thats enough

  // More verbose config
  tabs: {
    "header-nav": true,
    steps: [
      { title: 'First', icon: 'settings' }, //Icon names: https://material.io/resources/icons/
      { title: 'Second', icon: 'img:https://cdn.quasar.dev/logo/svg/quasar-logo.svg' }
    ]
    // More properties: https://quasar.dev/vue-components/stepper#qstepper-api
  },

  global: {
    tabs: {      
      steps: {
        title: 'tab thing',
        icon: 'settings'
      }
    }
  },

  buttons: {   // Not required

    // You can re-assign buttons values
    submit: {
      label: 'Send', class: 'customClass'
    },
    next: {
      label: '=>'
    }
  },
},
