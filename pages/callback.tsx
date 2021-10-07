import React, { useEffect } from 'react'
import { setAccessToken, setIdToken } from '~/lib/useAuth.ts'
import { redirect } from 'aleph/web'

export default function Callback() {
  useEffect(() => {
    setAccessToken()
    setIdToken()
    redirect('/')
  }, [])

  return (
    <div></div>
  )
}
