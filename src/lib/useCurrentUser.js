import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'

// Replaces the old localStorage.getItem('userName')/('userRole') pattern —
// those were only ever populated by the pre-Firebase login.php flow and have
// been dead reads since Module 1 moved auth state onto Firebase Auth itself.
export function useCurrentUser() {
  const [user, setUser] = useState(null) // { uid, name, email, role } | null
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setIsLoading(false)
        return
      }
      const tokenResult = await firebaseUser.getIdTokenResult()
      setUser({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email,
        role: tokenResult.claims.role || null,
      })
      setIsLoading(false)
    })
    return unsubscribe
  }, [])

  return { user, isLoading }
}
