const formConfig = {  
  title: 'Reactive editing', 

  fields: {
    name: {
      label: 'Ваше имя',
      value: 'Anton',
      // value: function (formGlobal, component) { return component._uid },
      onFocus(fb) {
        // Simple field config assignment
        fb.fields.lastName = {
          label: 'Фамилия',
          // row: 2,
          order: 1,
          value: 'Петрофф',
          hint: 'new prop added'
        }
        // Simple field single key assignment
        fb.fields.thirdName.label = 'Отчество'

        
        // __ Multiple assignment

        // ____Rendered multiples with multiple index
        // ______Single key assignment
        fb.fields.members.fields[0].firstName.hint = 'Check checko'
        // ______Config assignment
        // - TBD -

        // ____Field settings edition
         
        // fb.fields.members.settings.lastName = {  // redifene inside multiple
        //   label: 'New labelc'
        // }
        // fb.fields.chil.hint = 'somebody'
      }
    },
    lastName: {
      label: 'и фамилия'
    },
    thirdName: {},
    members: {
      type: 'multiple',
      row: 1,
      label: "Membas",
      value: [
        { firstName: 'Peter', lastName: 'Bonnington' },
        { firstName: 'Lois', lastName: 'Puttershmidt' }
      ],
      settings: {
        firstName: {
          label: 'firstName',
        },
        lastName: {
          label: 'lastName'
        },
      }

    }
  },
  methods: {
    onSubmit(formGlobal, component, values) {
      console.log(formGlobal);
      console.log(values);
    }
  },


}


export const values = {
  // Works too
  // members: [
  //   { lastName: 'Griffin' }
  // ]
  members: {
    lastName: 'Griffin',
    1: {
      lastName: 'Griffin-Puttersmidt'
    }
  }
}