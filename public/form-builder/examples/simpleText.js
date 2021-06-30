const formConfig = {
  title: 'Simple text inputs',

  fields: {
    textField: {},
    fieldWithMask: {
      mask: 'Aaa_##', // See more: https://quasar.dev/vue-components/input#mask
    },
    fieldAttachments: { // side elements
      outerLeft: {
        type: 'icon',
        name: 'settings'  // name of icon
      },
      innerLeft: {
        type: 'img',
        src: 'url://some url'
      },
      innerRight: {
        type: 'button',
        icon: 'warning',
        onClick: (fb, component, field) => {
          field.value = 'New value'
        }
      },
      outerRight: {
        type: 'button',
        label: 'check value',        
        onClick: (fb, component, field) => {
          if (field.value) console.log('checked');
        }
      }
    },
    password: {
      type: 'password'
    },
    email: {
      type: 'email',
      suffix: '@gmail.com'
    },
    number: {
      type: 'number',
      value: 5
    },
    time: {      
      type: 'time',
      value: '12.24'
    },
    dateNative: {
      // native html date input interface
      type: 'dateNative',
      value: '12.12.2012'
    },
    textarea: {
      type: 'textarea'
    },
    otherInputOptions: {
      // See more: https://quasar.dev/vue-components/input#qinput-api
      prefix: 'email: ',
      suffix: '@gmail.com'
    }
  },



}
