const formConfig = {
  title: 'Basic form',

  fields: {
    name: {
      onFocus(fb) {
      },
      rules: [val => val?.length > 3 || 'Name too short']
    },

    // Common field props
    defaultPropValues: {
      type: 'text',
      value: '',
      clearable: true,
      "clear-icon": 'close',
      required: false,
      visible: true,
      rules: [],
    },

    // Props that every field can have
    universalProps: {
      row: 1,
      order: 1,
      label: 'some string',
      hint: 'some string down the field',
      disable: false, // needs testing
    },
  },

  methods: {
    onSubmit(formGlobal, component, values) {
      console.log(values);
    }
  },

  // Buttons 

  buttons: {
    // Submit is the only default button. 
    // String as button label
    submit: 'Send',
    // Config for verbose button config
    // See more: https://quasar.dev/vue-components/button#qbtn-api
    reset: {
      label: 'reset',
      color: 'accent'
    },
    clear: {
      label: 'clear',
      color: 'warning'
    },

    // Redifine tabs buttons
    next: "Next step",
    back: "Go back",
    // Redifine modal close button
    close: 'X'
  }
}
