const formConfig = {
  title: 'Every possible config options',

  fields: {
    // No config
    noConfigDefaultField: {},

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

    universalProps: {
      row: 1,
      order: 1,
      label: 'some string',
      hint: 'some string down the field',
      disable: false, // needs testing
      service: false,
    },

    // Simple input
    simpleInput: {
      label: 'Simple as that'
    },

    simpleReactivity: {
      label: 'Focus on me!',
      onFocus(formBuilderConfig) {
        const fb = formBuilderConfig
        // Assign one property
        fb.fields.simpleInput.hint = 'additional hint'
        // Add several properties as object of properties
        fb.fields.simpleInput = {
          rules: [val => val && val.length > 5 || 'need more letters'],
          clearable: false
        }

        console.log(fb.fields.simpleInput.hint) // 'additional hint'
        console.log(fb.fields.simpleInput.label) // 'Focus on me!'
        console.log(fb.fields.simpleInput.clearable) // false
      },
    },

    // Select

    select: {
      type: 'select',
      // Options availible in any of those types
      // like this
      options: [{ name: 'Alpha', id: '114aZ' }, { name: 'Beta', id: '2aaaZ' },],
      // or this
      options: [{ label: 'Alpha', value: '114aZ' }, { label: 'Beta', value: '2aaaZ' },],
      // or this
      options: ['pepe', 'bebe'],
      // Value though is expected to be string or array of strings for multiple options
      value: "114aZ"
    },
    selectTrigger: {
      label: 'Click me',
      onFocus(fb) {
        // Example of reactivity usage
        fb.fields.select.value = '2aaaZ'
        fb.fields.select.options = [...fb.fields.select.options, { name: 'New ops', id: 'sass' }]
      }
    },
    multipleSelect: {
      type: 'select',
      options: ['pepe', 'bebe'],
      // value must be an array
      value: [],
      multiple: true,
    },
    otherSelectOptions: {
      type: 'select',
      writable: false, // True by dafault. Allow user to write values to reduce select options
    },

    // Multiple

    multiple: {
      type: 'multiple',
      label: "Multiple with simple inputs",
      value: [
        { firstName: 'Peter', lastName: '' },
        { firstName: 'Lois', lastName: 'Puttershmidt' }
      ],
      settings: {
        // Field settings expected. Any type except for 'multple'
        firstName: {
          label: 'First name',
        },
        lastName: {
        },
      },
    },

    multipleReactivity: {
      label: 'Focus on me',
      onFocus(formGlobal) {
        const fb = formGlobal

        // Change one property on rendered field
        fb.fields.multiple.fields[0].firstName.hint = 'First rendered "firstname" hint'

        // Rewrite fields settings
        // __ Rewrite whole field config
        fb.fields.multiple.settings.lastName = {
          label: 'Family name',
          hint: 'a.k.a second name'
        }

        // __ Update single property (without rewriting config)
        fb.fields.multiple.settings.lastName.hint = 'family name'
      }
    },

    // Date

    inputDate: {
      type: 'date',
    },
    calendarDate: {
      type: 'date',
      // shows calendar interface only
      withInput: false, // true by default
      value: '12.12.2012',
    },
    rangeInput: {
      type: 'date',
      range: true,
      value: { from: '12.12.2012', to: '15.12.2012' },
    },
    otherDateSettings: {
      type: 'date',
      // More properties here: https://quasar.dev/vue-components/date#qdate-api
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


  // Form event handlers
  methods: {
    async onSubmit(formGlobal, component, values) {
      console.log(values);
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

  // Modal view config
  // __minimal
  modal: true,

  // __with settings
  modal: {
    // See more props: https://quasar.dev/vue-components/dialog#qdialog-api
    position: 'left',
    isOpen: false,
    persistent: true,
    "transition-hide": 'fade',
    maximized: false,

    // Optional trigger button
    // Trigger button properties. See more: https://quasar.dev/vue-components/button#qbtn-api
    triggerButton: {
      label: 'open',
      class: 'custom_button_class '
    }
  },

  // Tabs a.k.a. Wizard

  tabs: true,  // Thats enough

  // More verbose config
  tabs: {
    "header-nav": true
    // More properties: https://quasar.dev/vue-components/stepper#qstepper-api
  },

  // Tab fields indexes
  fields: {
    bio: {
      label: 'Tell us about yourself'
    },
    name: {
      tab: 2
    },
    city: {
      label: 'City',
      tab: 3,
    },
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