import { useEffect, useRef, useState } from 'react'
import { startBroadcast, type BroadcastHandle } from '../lib/live'

type Phase = 'idle' | 'preview' | 'live' | 'error'

function cameraError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError')
    return 'カメラの使用が許可されませんでした。ブラウザのアドレスバーのカメラ許可をオンにしてください。'
  if (name === 'NotFoundError') return 'カメラが見つかりませんでした。'
  if (name === 'NotReadableError')
    return 'カメラが他のアプリで使用中です。他のカメラアプリを閉じてください。'
  return `カメラを起動できませんでした（${String(e)}）`
}

/** 配信端末（ギガスクール端末など）でこのページを開き、カメラ映像を配信する。
 *  視聴側は「ライブ映像」スライドで自動的に受信する。 */
export function BroadcastPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const handleRef = useRef<BroadcastHandle | null>(null)
  const wakeRef = useRef<WakeLockSentinel | null>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [viewers, setViewers] = useState(0)
  const [error, setError] = useState('')

  const attach = (stream: MediaStream) => {
    streamRef.current = stream
    if (videoRef.current) videoRef.current.srcObject = stream
  }

  const openCamera = async (mode: 'environment' | 'user') => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: mode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 20, max: 24 },
      },
      audio: false,
    })
    attach(stream)
    return stream
  }

  const startPreview = async () => {
    setError('')
    try {
      await openCamera(facing)
      setPhase('preview')
    } catch (e) {
      setError(cameraError(e))
      setPhase('error')
    }
  }

  const flip = async () => {
    const next = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    try {
      await openCamera(next)
    } catch (e) {
      setError(cameraError(e))
    }
  }

  const goLive = async () => {
    if (!streamRef.current) return
    try {
      handleRef.current = await startBroadcast(streamRef.current, setViewers)
      setPhase('live')
      // 配信中は画面が消えないようにする（対応端末のみ）
      try {
        wakeRef.current = await navigator.wakeLock?.request('screen')
      } catch {
        /* 非対応・非表示時は無視 */
      }
    } catch (e) {
      setError(`配信を開始できませんでした（${String(e)}）`)
    }
  }

  const stop = async () => {
    await handleRef.current?.stop()
    handleRef.current = null
    wakeRef.current?.release().catch(() => {})
    wakeRef.current = null
    setViewers(0)
    setPhase('preview')
  }

  // 画面を離れるときは確実に後始末する
  useEffect(() => {
    return () => {
      handleRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      wakeRef.current?.release().catch(() => {})
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-900 px-4 py-6 text-white">
      <div className="w-full max-w-xl">
        <h1 className="mb-1 text-2xl font-extrabold">📹 会場カメラ配信</h1>
        <p className="mb-4 text-sm text-slate-300">
          この端末のカメラ映像を、観戦端末の「ライブ映像」スライドへ直接配信します。
        </p>

        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-slate-700 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-contain"
          />
          {phase === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              カメラは停止中です
            </div>
          )}
          {phase === 'live' && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-sm font-extrabold">
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
              配信中
            </div>
          )}
        </div>

        {phase === 'live' && (
          <div className="mt-3 rounded-xl bg-slate-800 px-4 py-3 text-center">
            <span className="text-lg font-bold">視聴中の端末: </span>
            <span className="text-2xl font-extrabold text-green-400">{viewers}</span>
            <span className="text-lg font-bold"> 台</span>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-xl border-2 border-red-400 bg-red-950 px-4 py-3 text-sm font-bold text-red-200">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {phase === 'idle' || phase === 'error' ? (
            <button
              onClick={startPreview}
              className="rounded-xl bg-blue-600 py-3 text-lg font-extrabold hover:bg-blue-700"
            >
              カメラを起動
            </button>
          ) : phase === 'preview' ? (
            <>
              <button
                onClick={goLive}
                className="rounded-xl bg-red-600 py-3 text-lg font-extrabold hover:bg-red-700"
              >
                ● 配信を開始
              </button>
              <button
                onClick={flip}
                className="rounded-xl border-2 border-slate-500 py-2.5 font-bold hover:bg-slate-800"
              >
                🔄 カメラを切り替え（{facing === 'environment' ? '外側→内側' : '内側→外側'}）
              </button>
            </>
          ) : (
            <button
              onClick={stop}
              className="rounded-xl bg-slate-200 py-3 text-lg font-extrabold text-slate-900 hover:bg-white"
            >
              ■ 配信を停止
            </button>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-xs leading-relaxed text-slate-300">
          <p className="mb-1 font-bold text-slate-200">つかいかた</p>
          <p>1.「カメラを起動」→ 映したい向きにして「配信を開始」</p>
          <p>2. 観戦端末で「ライブ映像」スライドを表示すると映像が届きます</p>
          <p className="mt-1 text-slate-400">
            ※ この端末はカメラを撮り続けるので、電源につないでおくと安心です。画面はできるだけ消さないでください。
          </p>
        </div>
      </div>
    </div>
  )
}
