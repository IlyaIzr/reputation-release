import { writable } from 'svelte/store';


// export const isLogged = writable(false);
export const user = writable({
  id: null,
  role: null,
  login: null,
  email: null,
  discord: null,
  username: null,
  children: []
});
// Routing
export const location = writable('/')
export function goTo(where = "/", param = "id", value) { //TODO
  const name = where.substring(1) || 'table'
  window.history.pushState(name, name, where);
  if (value) window.location.search = "?" + param + "=" + value
  location.set(where)
}
export const fundRights = writable({})
export function isManager() {
  let funds
  let res = false
  fundRights.subscribe(f => funds = f)
  for (const fundId in funds) {
    if (funds[fundId] === 'manager') {
      res = true
      break;
    }
  }
  return res
}
export function isWriter() {
  let funds
  let res = false
  fundRights.subscribe(f => funds = f)
  for (const fundId in funds) {
    if (funds[fundId] === 'manager' || funds[fundId] === 'user') {
      res = true
      break;
    }
  }
  return res
}
export const fundNames = writable({
  init: 'test'
});