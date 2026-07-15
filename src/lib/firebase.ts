import { initializeApp, type FirebaseApp } from 'firebase/app'
import { initializeFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'
import { FIREBASE_API_KEY, FIREBASE_PROJECT_ID } from './config'

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null

/** Firebase を遅延初期化して返す。
 *  学校のプロキシは Firestore の常時接続（WebChannel/ストリーミング）を
 *  遮断することがあり、自動判定では繋がらないまま保留になりがち。
 *  HTTP ロングポーリングを「強制」して、プロキシを通れる方式に固定する。 */
export function getFirebase(): { db: Firestore; auth: Auth } {
  if (!app) {
    app = initializeApp({
      apiKey: FIREBASE_API_KEY,
      projectId: FIREBASE_PROJECT_ID,
      authDomain: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
    })
    db = initializeFirestore(app, { experimentalForceLongPolling: true })
    auth = getAuth(app)
  }
  return { db: db!, auth: auth! }
}
