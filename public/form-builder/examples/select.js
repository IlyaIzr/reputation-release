const formConfig = {
  title: 'Select example',

  fields: {
    trigger: {
      label: 'Click me',
      onFocus(fb) {
        // Example of reactivity usage
        fb.fields.select.value = '2aaaZ'
        fb.fields.select.options = [...fb.fields.select.options, { name: 'New ops', id: 'sass' }]
      }
    },
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
    }
  },

  methods: {
    onSubmit(formGlobal, component, values) {
      console.log(values);
    }
  },

}
