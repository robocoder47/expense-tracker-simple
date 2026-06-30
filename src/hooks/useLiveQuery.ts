import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

export function useLiveQuery<T>(
  queryFn: () => Promise<T> | T,
  deps: unknown[],
  initial: T,
): T {
  const [data, setData] = useState<T>(initial)

  useEffect(() => {
    const subscription = liveQuery(() => queryFn()).subscribe({
      next: (result) => setData(result),
      error: (err) => console.error('[liveQuery]', err),
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return data
}
