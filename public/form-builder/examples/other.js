const formConfig = {
  title: 'Other type of inputs',

  fields: {
    // two fields from same group
    a: {
      group: 1,
      groupLabel: 'Test group'
    },
    b: {
      group: 1
    },

    // Field validation rules

    anyField: {
      rules: [
        () => {
          // Rules are array of functions. They happend onInput event and validate user input
        },
        (val) => {
          console.log(val)
          return true
          // if faunction returns true, validation is successful
        },
        (val) => {
          // if function result !== true it returns validation error
          return 'String value will be shown as validation error message'
        },
        // You can use extra arguments
        (val, formValues, fbGlobal, metaValue = 'In development') => console.log(val, formValues, fbGlobal) == false
      ]
    },

    // Checkbox

    checkbox: {
      type: 'checkbox',
      value: true,
      onInput(formGlobal, component, value) {
        if (value) console.log('Agreed');
      }
    },

    // Html injector

    html: {
      type: 'html',
      value: 'some <br> html',
      // no Event handler functions
    },

    // Slider

    slider: {
      type: 'slider',
      label: 'some slider',
      // value: 12,
      min: -10,
      max: 22,
      rules: [val => val > 5 || 'bigger then 5, please'],
      showValue: false,
      // More props can be found here https://quasar.dev/vue-components/slider#qslider-api
    },

    // Text editor

    editor: {
      type: 'editor',
      onInput(formGlobal, component, value) {
        // value is a String of html content
      },
      disable: false
    },

    // Button, custom button

    triggerButton: {
      type: 'button',
      label: 'custom button',
      color: 'primary',
      size: 'sm',
      onClick(fb, component, fieldConfig) {
        fb.fields.targetField.visible = true
      },
      onInput() {
        // onClick alias
      },
      onFocus() {
        // onClick alias
      },
      onBlur() {
        // onClick alias
      },
      // See more button props: https://quasar.dev/vue-components/button#qbtn-api
    },


  },

  // Global values
  // lowest priority

  global: {
    fields: {
      label: 'Label for fields without label'
    },
    tabs: {
      steps: {
        title: 'tab thing',
        icon: 'settings'
      }
    }
  },

  // Value meta option

  metaValueUsage: {
    meta: {
      value: 'Pepe',
      payload: 'some other info'
    },
  },
  metaValueUsage_2: {
    meta: {
      superName: 'Pepe',
      payload: 'some other info'
    },
    // define another name for field value inside meta{}
    metaValueKey: 'superName',
    // This will submit whole object instead of just it's value, or renamed value
    metaShouldSumbmit: true
  },


  // Form event handlers
  methods: {
    async onSubmit(formGlobal, component, values, notifyRef) {
      console.log(values);
      notifyRef({
        type: 'positive',
        message: 'Finished',
        timeout: 333
      })
    },
    async onReset(formGlobal, component) {
      // Callback functions availible for all event handlers
      return async (formGlobal) => {
        // do something AFTER reset
        formGlobal.title = 'Warning, form has been reseted'
      }
    },
    async onClear(formGlobal, component) {
      return (formGlobal) => {
        // do something AFTER form been cleared
        formGlobal.title = 'Warning, form has been reseted'
      }
    },
    async onValidateSuccess(fb, component) {
      // runs after all fields validated successfully
    },
    async onValidateError(fb, component, error) {
      console.log(error);
    },
    async onValidationError(f, c, e) {
      // Alias onValidateError
    },
    async onValidateSuccess(fb, component) {
      // runs after all fields validated successfully
    },
    async onMount(formGlobal, component, formRef) {
      // runs after form component did mount
    }
  },

  // Set up notify actions on form submit
  notify: {
    message: 'Sended!',
    timeout: 333,
    type: 'ongoing',
    // See more at https://quasar.dev/quasar-plugins/notify
  }

}