import { getAllUsers } from '../rest/user.request'
import { getFundMembers } from '../rest/fund.request'


export async function getUsers(user, funds) {
  let userInfo


  // Root case
  if (user.role === "root") {
    const res = await getAllUsers();
    if (res.status === "OK") {
      userInfo = res.data;
      return [userInfo];
    }
    return [userInfo, res.msg || res]
  }

  // Manager case

  const controledGroups = [];
  Object.entries(funds).forEach((keyRolePair) => {
    if (keyRolePair[1] === "owner" || keyRolePair[1] === "manager")
      controledGroups.push(keyRolePair[0]);
  });

  if (controledGroups.length) {
    await Promise.all(
      controledGroups.map(async (id) => {
        const res = await getFundMembers(id);
        if (res.status === "OK") {
          userInfo = res.data || []
        }

        else return [userInfo, res.msg || res]
      })
    );
  }

  const children = user.children;
  if (children?.length) {
    const res = await getChildren(app.state.token);
    if (res.status === "OK" && res.data.length) {
      userInfo = [...userInfo, ...res.data]
    } 
    if (res.status !== "OK") return [null, res.msg || res]
  }

  // Filter dublicats
  const f = userInfo.filter(
    (v, i, a) => a.findIndex((t) => t.id === v.id) === i
  );
  const restricted = f.filter((val) => val.role !== "root");
  return [restricted]
}