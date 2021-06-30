const formConfig = {
  title: 'Multiple fields',
  fields: {
    simpleMultiple: {
      type: 'multiple',
      label: "Multiple with simpleinputs",
      value: [
        { firstName: 'Peter', lastName: '' },
        { firstName: 'Lois', lastName: 'Puttershmidt' }
      ],
      settings: {
        firstName: {
          label: 'First name',
        },
        lastName: {
          label: 'Last name'
        },
      },
    },
    reacivity: {
      label: 'Focus on me',
      onFocus(formGlobal) {
        const fb = formGlobal

        // Change one property on rendered field
        fb.fields.simpleMultiple.fields[0].firstName.hint = 'First rendered "firstname" hint'

        // Assign config
        // TBD
        // fb.fields.simpleMultiple.fields[0].firstName = {
        //   hint: 'First rendered "firstname" hint',
        //   label: 'First name first'
        // }

        // Rewrite fields settings
        // __ Rewrite whole field config
        fb.fields.simpleMultiple.settings.lastName = {
          label: 'Family name',
          hint: 'a.k.a second name'
        }
        // __ Rewrite whole setting - To Be Tested
        fb.fields.simpleMultiple.settings = {
          firstName: {
            label: 'New setting field',
          }
        }

        // __ Update single property (without rewriting)
        fb.fields.simpleMultiple.settings.lastName.hint = 'family name'
      }
    },
  },

  // Control buttons

  buttons: {
    // See more button props: https://quasar.dev/vue-components/button#qbtn-api
    multipleAdd: {
      label: '+1 field',
      tooltip: 'Add another group of fields'
    },
    multipleRemove: {
      label: '-',
      tooltip: 'delete this group of fields'
    },
  },

  methods: {
    onSubmit(formGlobal, component, values) {
      console.log(values);
    }
  },

}


export const values = {
  simpleMultiple: {
    // Define highest priority values
    // __ For all fields with key
    lastName: 'Griffin',

    // __ or just for the specific row
    1: {
      lastName: 'Griffin-Puttersmidt'
    }
  }
}


// Config to test form reset() bug
// relevant only for settings reactivity
const bugcase = {
  fields: {
    simpleMultiple: {
      type: 'multiple',
      label: "Multiple with simpleinputs",
      value: [
        { firstName: 'Peter', lastName: '' },
        { firstName: 'Lois', lastName: 'Puttershmidt' }
      ],
      settings: {
        firstName: {
          label: 'First name',
        },
        lastName: {
          label: 'Last name'
        },
      },
    },
    p: {
      onFocus(fb, some, val) {
        fb.fields.simpleMultiple.fields[0].firstName.onFocus = () => { console.log('just checking') }
        console.log(fb.fields.simpleMultiple.settings.firstName);
      }
    }
  },

  buttons: {
    reset: 'resme'
  }


}