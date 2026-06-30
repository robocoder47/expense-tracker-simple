import { useEffect, useState } from 'react'

export function useLiveQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[],
  initial: T,
): T {
  const [data, setData] = useState<T>(initial)

  useEffect(() => {
    let active = true
    queryFn().then((result) => {
      if (active) setData(result)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return data
}
