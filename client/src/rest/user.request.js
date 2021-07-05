import { api } from "./config"

export const createUser = async (data) => {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },

    body: JSON.stringify({ ...data })
  }
  try {
    const response = await fetch(api + 'users/create/', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const getAllUsers = async () => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  }
  try {
    const response = await fetch(api + 'users/all', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const getUserInfo = async (id) => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  }
  try {
    const response = await fetch(api + 'users/fullInfo?id=' + id, options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const updateAnoterUser = async (id, data) => {
  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },

    body: JSON.stringify({ ...data, id })
  }
  try {
    const response = await fetch(api + 'users/updateAnoterUser', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const getUsersByQuery = async (creds) => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  }
  try {
    const response = await fetch(api + 'users/some?creds=' + creds, options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const getAvailibleUsers = async () => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  }
  try {
    const response = await fetch(api + 'users/availible', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}