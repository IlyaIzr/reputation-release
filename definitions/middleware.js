function getUserInfo(request) {
  let userInfo
  MAIN.session.getcookie(request, DEF.cookieOptions, async (err, data, sessionMeta) => {
    if (err) return request.json({ status: 'REAUTH', msg: 'no cookie/wrong cookie', data: err })
    userInfo = { ...data }
  });
  return userInfo
}
DEF.getUserInfo = getUserInfo
// TODO
DEF.getUserProps = async function getUserProps(userId) {
  const res = await NOSQL('userprops').one().id(userId).promise()
  return res
}