import { api } from "./config"

export const login = async (credential, password) => {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },

    body: JSON.stringify({ credential, password })
  }
  try {
    const response = await fetch(api + 'auth/login/', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const refresh = async () => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  }
  try {
    const response = await fetch(api + 'auth/refresh', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const logout = async () => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  }
  try {
    const response = await fetch(api + 'auth/logout', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const updateCreds = async (data) => {
  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },

    body: JSON.stringify({ ...data })
  }
  try {
    const response = await fetch(api + 'auth/updateCreds/', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}