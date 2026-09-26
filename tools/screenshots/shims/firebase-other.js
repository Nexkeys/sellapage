// tools/screenshots/shims/firebase-other.js
//
// Stands in for 'firebase/app', 'firebase/auth' and 'firebase/messaging'
// inside the screenshot sandbox. Nothing here signs in, registers a device or
// opens a connection: the sandbox has no network identity at all.

export const initializeApp = () => ({ __fake: true })

// A signed-in vendor, as far as the components can tell. getIdToken returns a
// dummy string that only the sandbox's own fake /api responds to.
const demoUser = {
  uid: 'demo',
  email: 'ada@adaskincare.ng',
  getIdToken: async () => 'demo-token',
}

export const getAuth = () => ({ currentUser: demoUser })
export const onAuthStateChanged = (_auth, cb) => {
  Promise.resolve().then(() => cb(demoUser))
  return () => {}
}
export const signInWithEmailAndPassword = async () => ({ user: demoUser })
export const signInWithCustomToken = async () => ({ user: demoUser })
export const signOut = async () => {}
export const deleteUser = async () => {}
export const confirmPasswordReset = async () => {}
export const reauthenticateWithCredential = async () => {}
export const EmailAuthProvider = { credential: () => ({}) }

export const getMessaging = () => ({})
export const getToken = async () => null
export const onMessage = () => () => {}
