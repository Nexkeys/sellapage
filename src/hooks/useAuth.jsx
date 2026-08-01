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
          const ownStore = await getSellerStore(firebaseUser.uid)
          if (ownStore) {
            setStore(ownStore)
          } else {
            // Not an owner — check if this uid is an active staff member of
            // some store. Routed through a server handler (firebase-admin,
            // bypasses rules) rather than a direct client query, since no
            // Firestore rule permits querying staffMemberships by uid and
            // one can't be added/verified from this repo.
            const token = await firebaseUser.getIdToken()
            const idRes = await fetch('/api/staff-identity', { headers: { Authorization: `Bearer ${token}` } })
            const idData = await idRes.json().catch(() => ({}))
            if (idData.isStaff) {
              const linkedStore = await getSellerStore(idData.storeId)
              setStore(linkedStore ? {
                ...linkedStore,
                _isStaff: true,
                _staffMembershipId: idData.membershipId,
                _staffRoleId: idData.roleId,
                _staffRoleName: idData.roleName,
                _staffTabs: idData.tabs || [],
                _staffName: idData.staffName,
                _staffEmail: idData.staffEmail,
              } : null)
            } else {
              setStore(null)
            }
          }
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