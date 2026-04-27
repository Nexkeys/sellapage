import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, auth } from '../firebase/auth'
import { getSellerStore } from '../firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [store, setStore]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        try {
          const storeData = await getSellerStore(firebaseUser.uid)
          setStore(storeData)
        } catch {
          setStore(null)
        }
      } else {
        setStore(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, store, setStore, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}