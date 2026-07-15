import { useEffect, useRef } from 'react'
import type { LiveStreamSlide } from '../../types'
import { useLiveViewer } from '../../lib/live'

/** YouTubeのいろいろな形式のURLから 11桁の動画IDを取り出す。
 *  取れなければ null（チャンネルのライブなど、ID不明のときは live_stream 埋め込みで代替） */
function parseYouTube(raw: string): { videoId?: string; channelId?: string } | null {
  const url = raw.trim()
  if (!url) return null

  // 生の11桁ID（英数・-・_）がそのまま貼られたケース
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return { videoId: url }

  let u: URL
  try {
    u = new URL(url.startsWith('http') ? url : `https://${url}`)
  } catch {
    return null
  }

  const host = u.hostname.replace(/^www\./, '')
  const parts = u.pathname.split('/').filter(Boolean)

  // youtu.be/<id>
  if (host === 'youtu.be' && parts[0]) return { videoId: parts[0] }

  if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    // watch?v=<id>
    const v = u.searchParams.get('v')
    if (v) return { videoId: v }
    // /live/<id> ・ /embed/<id> ・ /shorts/<id>
    if (['live', 'embed', 'shorts', 'v'].includes(parts[0]) && parts[1]) {
      return { videoId: parts[1] }
    }
    // /channel/<channelId>/live → チャンネルの現在のライブ
    if (parts[0] === 'channel' && parts[1]) return { channelId: parts[1] }
  }
  return null
}

/** 埋め込み用のsrcを組み立てる。自動再生・ミュート・インライン再生で
 *  観戦端末でも操作なしに流れ始めるようにする */
export function youtubeEmbedSrc(raw: string): string | null {
  const parsed = parseYouTube(raw)
  if (!parsed) return null
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
  })
  if (parsed.videoId) {
    return `https://www.youtube.com/embed/${parsed.videoId}?${params}`
  }
  if (parsed.channelId) {
    params.set('channel', parsed.channelId)
    return `https://www.youtube.com/embed/live_stream?${params}`
  }
  return null
}

/** 配信端末のカメラ映像をアプリ内で受信して表示する（WebRTC） */
export function InAppLiveVideo({ muted = true }: { muted?: boolean }) {
  const { stream, status } = useLiveViewer()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (el && el.srcObject !== stream) el.srcObject = stream
  }, [stream])

  if (stream) {
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="absolute inset-0 h-full w-full bg-black object-contain"
      />
    )
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-300">
      <span className="text-4xl font-extrabold">
        {status === 'connecting' ? '接続中…' : '配信を待っています'}
      </span>
      <span className="text-xl text-slate-400">配信端末で「配信ページ」を開いて開始してください</span>
    </div>
  )
}

export function LiveStreamView({ slide }: { slide: LiveStreamSlide }) {
  const isInApp = slide.source === 'inApp'
  const src = youtubeEmbedSrc(slide.url)

  return (
    <div className="flex h-full w-full flex-col bg-black">
      <div className="flex items-center gap-4 bg-[#c00] px-8 py-3 text-white">
        <span className="flex items-center gap-2 text-[34px] font-extrabold tracking-wider">
          <span className="inline-block h-4 w-4 animate-pulse rounded-full bg-white" />
          LIVE
        </span>
        <span className="text-[30px] font-extrabold">{slide.title}</span>
      </div>
      <div className="relative min-h-0 flex-1">
        {isInApp ? (
          <InAppLiveVideo />
        ) : src ? (
          <iframe
            key={src}
            src={src}
            title={slide.title}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-300">
            <span className="text-4xl font-extrabold">配信の準備中です</span>
            <span className="text-xl text-slate-400">
              管理画面でYouTubeライブのURLを入力してください
            </span>
          </div>
        )}
      </div>
      {slide.caption?.trim() && (
        <div className="bg-black px-8 py-2 text-center text-[22px] font-bold text-white">
          {slide.caption}
        </div>
      )}
    </div>
  )
}
