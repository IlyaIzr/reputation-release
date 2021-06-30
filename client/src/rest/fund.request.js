import { api } from "./config";

export async function insertFund(data = {}) {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ ...data })
  }

  try {
    const response = await fetch(api + 'funds/create', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const getFundMembers = async (id) => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  }
  try {
    const response = await fetch(api + 'funds/getMembers?id=' + id, options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const getFunds = async () => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  }
  try {
    const response = await fetch(api + 'funds/getFunds', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}


export const getFundFormated = async (id) => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  }
  try {
    const response = await fetch(api + 'funds/formatted?id=' + id, options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const updateFundOwner = async (fundId, ownerId, prevOwnerId) => {
  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },

    body: JSON.stringify({ fundId, ownerId, prevOwnerId })
  }
  try {
    const response = await fetch(api + 'funds/updateOwner', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const updateFundForm = async (fundId, data) => {
  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },

    body: JSON.stringify({ fundId, data })
  }
  try {
    const response = await fetch(api + 'funds/updateForm', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const addUserToFund = async (userId, role, fundId) => {
  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },

    body: JSON.stringify({ userId, role, fundId })
  }
  try {
    const response = await fetch(api + 'funds/addUser', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const updateUserRole = async (userId, role, prevRole, fundId) => {
  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },

    body: JSON.stringify({ userId, role, fundId, prevRole })
  }
  try {
    const response = await fetch(api + 'funds/updateUser', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const deleteFromFund = async (userId, fundId, prevRole) => {
  const options = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },

    body: JSON.stringify({ userId, fundId, prevRole })
  }
  try {
    const response = await fetch(api + 'funds/deleteUser', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}
