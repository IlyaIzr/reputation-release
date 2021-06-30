import { api } from "./config"

export const getTable = async (query = undefined, order = 'desc') => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  }
  try {
    const response = query ? await fetch(api + 'table?id=' + query + '&order=' + order, options) : await fetch(api + 'table', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const getNote = async (id) => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  }
  try {
    const response = await fetch(api + 'table/note?id=' + id, options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}
export async function createNote(data) {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ ...data })
  }

  try {
    const response = await fetch(api + 'table/create', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export const deleteNote = async (id) => {
  const options = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  }
  try {
    const response = await fetch(api + 'table/note?id=' + id, options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}

export async function updateNote(data, id) {
  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ data, id })
  }

  try {
    const response = await fetch(api + 'table/update', options)
    const res = response.json()
    return res
  } catch (error) {
    return error
  }
}