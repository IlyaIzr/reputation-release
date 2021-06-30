// function isManager(groups) {
//   if (Object.keys(groups).length) for (const [key, value] of Object.entries(groups)) {
//     if (value === "owner" || value === "manager") return true
//   }
//   return false
// }

// class User {
//   id
//   role
//   login
//   email
//   discord
//   name
//   groups = []
//   children = []
//   password
//   constructor(id, role) {
//     this.id = id
//     this.role = role
//   }
//   get isManager() {
//     if (Object.keys(groups).length) for (const [key, value] of Object.entries(groups)) {
//       if (value === "owner" || value === "manager") return true
//     }
//     return false
//   }
// }


//abbb
// DEF.userClass = User

const cookieOptions = {
  name: CONF.cookie, 			   // A cookie name
  key: CONF.cookie_secret,  // A cookie secret key
  expire: '3 days'					// Optional, after read can be updated expiration
}
DEF.cookieOptions = cookieOptions
