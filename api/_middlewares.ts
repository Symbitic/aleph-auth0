import { API_ALGORITHM, API_SECRET, AUDIENCE, CLIENT_DOMAIN } from '~/lib/constants.ts'
import { verify } from 'https://deno.land/x/djwt@v2.2/mod.ts'
import type { APIMiddleware } from 'aleph/types'

/**
 * Deno WebCrypto does not support importKey('jwt') at this time, so JOSE won't work.
 * That means we need to verify manually.
 */
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
