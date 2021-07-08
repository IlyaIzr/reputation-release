if (window.location.hostname === 'localhost') {
  var api = window.location.protocol + '//' + "localhost:" + window.location.port + '/api/'
} else {
  var api = window.location.protocol + '//' + "reputation.vpluseteam.com" + '/api/'
}
export { api }

export const userRightsTranslation = {
  owner: 'владелец',
  manager: 'менеджер',
  user: 'обычный пользователь',
  readonly: 'только чтение'
}