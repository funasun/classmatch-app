import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { getFirebase } from './firebase'
import { TURN_CREDENTIAL, TURN_URL, TURN_USERNAME } from './config'
import { debugLog } from './debug'

/** カメラ映像を配信端末→視聴端末へ直接送るためのWebRTC。
 *  信号（offer/answer/ICE候補）のやり取りだけ、いま使っているFirestoreを経由する。
 *  外部の配信サービスやアカウント資格は一切不要。
 *
 *  Firestore構成:
 *   webrtc/current                                  … 配信中かどうかの目印 { active, sessionId }
 *   webrtc_sessions/{sessionId}/viewers/{viewerId}  … 視聴者ごとの offer / answer
 *     .../viewerIce/{auto}                          … 視聴者側のICE候補
 *     .../hostIce/{auto}                            … 配信者側のICE候補
 */

function rtcConfig(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ]
  // 学校ネットワークがP2Pを遮断している場合の中継(TURN)。設定があれば追加する
  if (TURN_URL) {
    iceServers.push({ urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL })
  }
  return { iceServers }
}

/* ============================ 配信者側 ============================ */

export interface BroadcastHandle {
  stop: () => Promise<void>
}

/** カメラ映像の配信を開始する。視聴者が来るたびにP2P接続を1本張る（配信者→多） */
export async function startBroadcast(
  stream: MediaStream,
  onViewerCount: (n: number) => void,
): Promise<BroadcastHandle> {
  const { db } = getFirebase()
  const sessionId = crypto.randomUUID()
  const pointerRef = doc(db, 'webrtc', 'current')
  const viewersCol = collection(db, 'webrtc_sessions', sessionId, 'viewers')

  const peers = new Map<string, { pc: RTCPeerConnection; unsubs: Array<() => void> }>()
  const notify = () => onViewerCount(peers.size)

  const closePeer = (id: string) => {
    const entry = peers.get(id)
    if (!entry) return
    entry.unsubs.forEach((u) => u())
    entry.pc.close()
    peers.delete(id)
    notify()
  }

  const handleViewer = async (
    id: string,
    ref: ReturnType<typeof doc>,
    data: Record<string, unknown>,
  ) => {
    if (peers.has(id) || !data.offer) return
    const pc = new RTCPeerConnection(rtcConfig())
    const unsubs: Array<() => void> = []
    peers.set(id, { pc, unsubs })
    notify()

    stream.getTracks().forEach((t) => pc.addTrack(t, stream))
    // 上り帯域を絞る（1台から多数へ送るため。体育館の全景には十分な画質）
    for (const sender of pc.getSenders()) {
      if (sender.track?.kind !== 'video') continue
      const params = sender.getParameters()
      params.encodings = [{ maxBitrate: 600_000, maxFramerate: 20 }]
      sender.setParameters(params).catch(() => {})
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) addDoc(collection(ref, 'hostIce'), e.candidate.toJSON()).catch(() => {})
    }
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) closePeer(id)
    }

    await pc.setRemoteDescription(data.offer as RTCSessionDescriptionInit)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await updateDoc(ref, { answer: { type: answer.type, sdp: answer.sdp } })

    unsubs.push(
      onSnapshot(collection(ref, 'viewerIce'), (s) =>
        s.docChanges().forEach((c) => {
          if (c.type === 'added') pc.addIceCandidate(c.doc.data()).catch(() => {})
        }),
      ),
    )
  }

  const unsubViewers = onSnapshot(viewersCol, (snap) => {
    snap.docChanges().forEach((c) => {
      if (c.type === 'removed') closePeer(c.doc.id)
      else handleViewer(c.doc.id, c.doc.ref, c.doc.data())
    })
  })

  await setDoc(pointerRef, { active: true, sessionId, updatedAt: serverTimestamp() })
  debugLog(`配信: 開始 (session ${sessionId.slice(0, 8)})`)

  const stop = async () => {
    unsubViewers()
    peers.forEach((_, id) => closePeer(id))
    await setDoc(pointerRef, { active: false, sessionId: null, updatedAt: serverTimestamp() }).catch(
      () => {},
    )
    // 使い終わった視聴者ドキュメントを掃除（残っても次回は別sessionなので無害）
    try {
      const docs = await getDocs(viewersCol)
      await Promise.all(docs.docs.map((d) => deleteDoc(d.ref)))
    } catch {
      /* 権限や通信の都合で消せなくても致命的ではない */
    }
    debugLog('配信: 停止')
  }

  return { stop }
}

/* ============================ 視聴者側 ============================ */

export type ViewerStatus = 'offline' | 'connecting' | 'live'

interface Shared {
  stream: MediaStream | null
  status: ViewerStatus
  listeners: Set<() => void>
  session: string | null
  pc: RTCPeerConnection | null
  viewerUnsubs: Array<() => void>
  pointerUnsub: () => void
}

// 同じ端末内では接続を1本だけ共有する（スライド・サムネイル・プレビューが
// 同時にマウントされても配信者への負荷を増やさない）
let shared: Shared | null = null

function emit() {
  shared?.listeners.forEach((l) => l())
}

function setState(stream: MediaStream | null, status: ViewerStatus) {
  if (!shared) return
  shared.stream = stream
  shared.status = status
  emit()
}

function disconnectPeer() {
  if (!shared) return
  shared.viewerUnsubs.forEach((u) => u())
  shared.viewerUnsubs = []
  shared.pc?.close()
  shared.pc = null
}

async function connect(sessionId: string) {
  if (!shared) return
  disconnectPeer()
  setState(null, 'connecting')

  const { db } = getFirebase()
  const pc = new RTCPeerConnection(rtcConfig())
  shared.pc = pc
  pc.addTransceiver('video', { direction: 'recvonly' })
  pc.addTransceiver('audio', { direction: 'recvonly' })

  const remote = new MediaStream()
  pc.ontrack = (e) => {
    e.streams[0]?.getTracks().forEach((t) => remote.addTrack(t))
    setState(remote, 'live')
  }
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') setState(remote, 'live')
  }

  const viewerRef = doc(collection(db, 'webrtc_sessions', sessionId, 'viewers'))
  pc.onicecandidate = (e) => {
    if (e.candidate) addDoc(collection(viewerRef, 'viewerIce'), e.candidate.toJSON()).catch(() => {})
  }

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  await setDoc(viewerRef, {
    offer: { type: offer.type, sdp: offer.sdp },
    createdAt: serverTimestamp(),
  })

  shared.viewerUnsubs.push(
    onSnapshot(viewerRef, (snap) => {
      const d = snap.data()
      if (d?.answer && !pc.currentRemoteDescription) {
        pc.setRemoteDescription(d.answer as RTCSessionDescriptionInit).catch(() => {})
      }
    }),
    onSnapshot(collection(viewerRef, 'hostIce'), (s) =>
      s.docChanges().forEach((c) => {
        if (c.type === 'added') pc.addIceCandidate(c.doc.data()).catch(() => {})
      }),
    ),
    () => deleteDoc(viewerRef).catch(() => {}),
  )
}

function ensureShared(): Shared {
  if (shared) return shared
  const s: Shared = {
    stream: null,
    status: 'offline',
    listeners: new Set(),
    session: null,
    pc: null,
    viewerUnsubs: [],
    pointerUnsub: () => {},
  }
  shared = s
  // Firebase未設定・未到達でも表示側を落とさない（「配信を待っています」のまま）
  try {
    const { db } = getFirebase()
    s.pointerUnsub = onSnapshot(
      doc(db, 'webrtc', 'current'),
      (snap) => {
        const d = snap.data()
        if (d?.active && d.sessionId) {
          if (s.session !== d.sessionId) {
            s.session = d.sessionId as string
            connect(s.session).catch(() => setState(null, 'offline'))
          }
        } else {
          s.session = null
          disconnectPeer()
          setState(null, 'offline')
        }
      },
      () => setState(null, 'offline'),
    )
  } catch {
    /* getFirebase 失敗時は offline のまま */
  }
  return s
}

/** 視聴を購読する。参照が0になったら接続を完全に閉じる（参照カウント式） */
function subscribeViewer(listener: () => void): () => void {
  const s = ensureShared()
  s.listeners.add(listener)
  listener()
  return () => {
    s.listeners.delete(listener)
    if (s.listeners.size === 0) {
      s.pointerUnsub()
      disconnectPeer()
      shared = null
    }
  }
}

/** 視聴用フック。配信中なら映像ストリーム、配信していなければ null を返す */
export function useLiveViewer(): { stream: MediaStream | null; status: ViewerStatus } {
  const [, force] = useState(0)
  useEffect(() => subscribeViewer(() => force((n) => n + 1)), [])
  return { stream: shared?.stream ?? null, status: shared?.status ?? 'offline' }
}
