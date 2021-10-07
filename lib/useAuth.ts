import auth0 from 'https://cdn.skypack.dev/auth0-js@9.16.4'
import decode from 'https://cdn.skypack.dev/jwt-decode@3.1.2'
import { redirect } from 'aleph/web'

import {
  CLIENT_ID,
  CLIENT_DOMAIN,
  REDIRECT,
  SCOPE,
  AUDIENCE,
} from '~/lib/constants.ts'

const ID_TOKEN_KEY = 'id_token'
const ACCESS_TOKEN_KEY = 'access_token'

const auth = new auth0.WebAuth({
  clientID: CLIENT_ID,
  domain: CLIENT_DOMAIN
})

function clearIdToken() {
  localStorage.removeItem(ID_TOKEN_KEY)
}

function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

// Helper function that will allow us to extract the access_token and id_token
function getParameterByName(name: string) {
  let match = RegExp('[#&]' + name + '=([^&]*)').exec(window.location.hash)
  if (match) {
    return decodeURIComponent(match[1].replace(/\+/g, ' '))
  }
  return ''
}

function getTokenExpirationDate(encodedToken: string) {
  const token = decode(encodedToken)
  if (!token.exp) {
    return new Date()
  }

  const date = new Date(0)
  date.setUTCSeconds(token.exp)

  return date
}

function isTokenExpired(token: string) {
  const expirationDate = getTokenExpirationDate(token)
  return expirationDate < new Date()
}

export function login() {
  auth.authorize({
    responseType: 'token id_token',
    redirectUri: REDIRECT,
    audience: AUDIENCE,
    scope: SCOPE
  })
}

export function logout() {
  clearIdToken()
  clearAccessToken()
  redirect('/')
}

export function getIdToken() {
  return localStorage.getItem(ID_TOKEN_KEY)
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken() {
  const accessToken = getParameterByName('access_token')
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
}

export function setIdToken() {
  const idToken = getParameterByName('id_token')
  localStorage.setItem(ID_TOKEN_KEY, idToken)
}

export function isLoggedIn() {
  const idToken = getIdToken()
  return !!idToken && !isTokenExpired(idToken)
}
