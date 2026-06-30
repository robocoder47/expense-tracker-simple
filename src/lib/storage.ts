const PERSIST_KEY = 'storage-persist-requested'

export async function requestPersistentStorage(): Promise<void> {
  if (localStorage.getItem(PERSIST_KEY)) return
  localStorage.setItem(PERSIST_KEY, '1')

  if (!navigator.storage?.persist) {
    console.info('[storage] persist() not supported')
    return
  }

  try {
    const granted = await navigator.storage.persist()
    console.info('[storage] persist() result:', granted)
  } catch (err) {
    console.warn('[storage] persist() failed:', err)
  }
}
