# Aleph.js Auth0

An example of how to authenticate [Aleph.js](https://alephjs.org/) using [Auth0](https://auth0.com/).

Aleph.js is a JavaScript framework for building SSR React applications similar to Next.js, except Aleph is built using Deno, the new JavaScript runtime. Aleph offers TypeScript, React hooks, ES Modules, WebCrypto, ultra-fast HMR, and much more.

## Introduction

Aleph.js bills itself as a "Full-stack framework for Deno," but that really sells itself short. Aleph can be thought of as being similar to Next.js, the Node.js framework for SSR React apps, but Aleph is built using Deno. That may sound simple, but Aleph brings all the benefits of Deno to the table:

* TypeScript
* ES Modules
* WebCrypto
* WHATWG Fetch API
* No `package.json` or `node_modules` folder.

Deno aims to become a "programmable web browser," and that goal clearly has some benefits: it allows us to use the same APIs on the server-end as well. For server-side rendering web apps, the line between what is client-side and what is server-side has been made very thin indeed.

But Aleph also brings its own benefits:

* Server-side rendering (SSR) and static site generation (SSG)
* Fast Refresh HMR
* Zero-configuration
* Fully React-compatible
* File-system routing
* Markdown
* Backend APIs
* `useDeno` hook
* Dynamic importing

## Getting Started

The first thing we need to do is install Deno. If you have not already done so, please visit [deno.land](https://deno.land/#installation) and install the latest version. You will need Deno 1.13 or later to run this tutorial.

Next, install the Aleph.js server:

```bash
$ deno run -A https://deno.land/x/aleph@v0.3.0-beta.19/install.ts
```

> Note: We are using version 0.3.0-beta.19 for this tutorial. Although you can
> install the latest version by using https://deno.land/x/aleph/install.ts, I
> make no promises that this tutorial will still work with that.

That's it. That's all there is. No running `npm install` ever either.

## Creating Your App

You can clone this repository if you want, but we will also show you how to modify the basic Aleph.js template.

Start by running:

```bash
$ aleph init
```

You can pick any name you want, but when it asks if you are using VS Code, we recommend saying yes.

## Setting Up Auth0

The first thing you need to is create a new application in your Auth0 dashboard. Make note of the following:

* The Client ID
* The Domain

Make sure you add `http://localhost:8080/callback` to "Allowed Callback URLs." Then create a new API. We are using "HS256" as the signing algorithm in this tutorial. Add "set:counter" and "read:counter" to the Permissions. Make note of the following:

* The Signing Algorithm
* The Signing Secret
* The Identifier

Now that you have everything you need, it's time to add your first file to the Aleph web app.

```typescript
// lib/constants.ts

export const CLIENT_ID = '{YOUR-CLIENT-ID}'
export const CLIENT_DOMAIN = '{YOUR-CLIENT-DOMAIN}'
export const REDIRECT = 'http://localhost:8080/callback'
export const SCOPE = 'set:counter'
export const AUDIENCE = '{YOUR-AUDIENCE}'
export const API_SECRET = '{YOUR-API-SECRET}'
export const API_ALGORITHM = 'HS256'
```

Replace the values above and create a new file called `lib/constants.ts`. Make sure to never share the contents of this file with anyone.

## Adding the Middleware

Aleph has built-in support for backend APIs. Any file in `api/` is treated as an API endpoint. It supports both static and dynamic API routes. The basic Aleph template includes a basic counter API which we will be extending to add authentication.

We can add authorization to our backend by using a middleware. In Aleph, middlewares are an array of functions exported from `api/_middlewares.ts`.

Create `api/_middlewares.ts` and paste the following:

```typescript
import { API_ALGORITHM, API_SECRET, AUDIENCE, CLIENT_DOMAIN } from '~/lib/constants.ts'
import { verify } from 'https://deno.land/x/djwt@v2.2/mod.ts'
import type { APIMiddleware } from 'aleph/types'

async function verifyJwt(jwt: string) {
  try {
    const payload = await verify(jwt, API_SECRET, API_ALGORITHM)
    const { hostname } = new URL(payload.iss || '')
    if (hostname !== CLIENT_DOMAIN) {
      return false
    } else if (payload.aud !== AUDIENCE) {
      return false
    }
  } catch (err) {
    return false
  }

  return true
}

const auth: APIMiddleware = async ({ response, request }, next) => {
  const header = request.headers.get('Authorization')
  if (!header) {
    response.status = 401
    response.body = 'Unauthorized'
    return
  }

  const bearer = /^[Bb]earer (.+)$/
  if (!bearer.test(header)) {
    response.status = 401
    response.body = 'Invalid Authorization header'
    return
  }

  const [ _, jwt ] = bearer.exec(header)!

  const isValid = await verifyJwt(jwt)
  if (!isValid) {
    response.status = 401
    response.body = 'Invalid JWT'
    return
  }

  next()
}

export default [auth]
```

This middleware intercepts all API requests and verifies they are authorized by:

1. Retreiving the 'Authorization' header.
2. Obtaining the JSON Web Token (JWT).
3. Verifying the token has been signed and is valid.

If any of those steps fail, then the request is not authenticated.

> Note: At this time, the Deno WebCrypto implementation does not support `importKey('jwt')`,
> meaning that we cannot use the more widespread JOSE library for verifying the tokens.
> We are forced to use djwt and verify some headers ourselves.

## Adding Auth0

It's finally time to add the magic of Auth0 to our app. Create `lib/useAuth.ts` and paste the following:

```typescript
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
```

We import the Auth0 JavaScript library, just as we would do for any app in Node. Except here, we import it from a URL. No downloads needed.

--------------------------------------------------------------------------------

**NOTE: I plan on finishing this tutorial later, but I would actually prefer to write it as a post on their blog. I'm waiting to hear back from them.**

