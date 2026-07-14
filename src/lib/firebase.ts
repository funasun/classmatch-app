import { initializeApp, type FirebaseApp } from 'firebase/app'
import { initializeFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'
import { FIREBASE_API_KEY, FIREBASE_PROJECT_ID } from './config'

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null

/** Firebase を遅延初期化して返す。
 *  学校のプロキシで WebSocket が塞がれていても通るよう、
 *  HTTP ロングポーリングへの自動切り替えを有効にする */
export function getFirebase(): { db: Firestore; auth: Auth } {
  if (!app) {
    app = initializeApp({
      apiKey: FIREBASE_API_KEY,
      projectId: FIREBASE_PROJECT_ID,
      authDomain: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
    })
    db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true })
    auth = getAuth(app)
  }
  return { db: db!, auth: auth! }
}
