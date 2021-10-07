import { useCallback, useEffect, useState } from 'react'
import { getAccessToken } from './useAuth.ts'

export default function useCounter(): [number, boolean, boolean, () => void, () => void] {
  const [count, setCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(true)

  const [error, setError] = useState(false)

  const handleError = (_e: any) => {
    //console.error(e)
    setError(true)
  }

  const increase = useCallback(() => {
    setCount((n: number) => n + 1);
    fetch('/api/counter/increase', {
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    }).catch(handleError)
  }, [])

  const decrease = useCallback(() => {
    setCount((n: number) => n - 1);
    fetch('/api/counter/decrease', {
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    }).catch(handleError)
  }, [])

  useEffect(() => {
    fetch('/api/counter', {
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    })
    .then(resp => resp.json())
    .then(({ count }) => {
        if (typeof count === 'number' && !Number.isNaN(count)) {
          setCount(count)
        }
      })
      .catch(handleError)
      .finally(() => {
        setIsSyncing(false)
      })
  }, [])

  return [count, isSyncing, error, increase, decrease]
}
