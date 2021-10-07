import React from 'react'
import Logo from '~/components/logo.tsx'
import { login } from '~/lib/useAuth.ts'

export default function Login() {
  return (
    <div className="page">
      <head>
        <title>Login - Aleph.js</title>
        <link rel="stylesheet" href="../style/index.css" />
      </head>
      <p className="logo"><Logo /></p>
      <h1><strong>Please login to continue</strong></h1>
      <div className="login">
        <button onClick={() => login()}>Login</button>
      </div>
    </div>
  )
}
