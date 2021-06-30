const formConfig = {
  title: 'Date input usage examples',

  fields: {
    inputDate: {
      type: 'date',
    },
    calendarDate: {
      type: 'date',
      // shows calendar interface only
      withInput: false,
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
  },

  methods: {
    onSubmit(formGlobal, component, values) {
      console.log(values);
    }
  },

}