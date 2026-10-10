import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
)

function firebaseAuth() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return getAuth(app)
}

export function prepareFirebase(): void {
  if (firebaseConfigured) firebaseAuth()
}

export async function signInWithGoogle(): Promise<string> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(firebaseAuth(), provider)
  return result.user.getIdToken()
}

export async function signOutOfFirebase(): Promise<void> {
  if (!firebaseConfigured) return
  await signOut(firebaseAuth())
}
