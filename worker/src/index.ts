import { DurableObject } from 'cloudflare:workers'

/** 環境変数（ADMIN_PASSCODE は `wrangler secret put ADMIN_PASSCODE` で設定する秘密） */
export interface Env {
  ROOM: DurableObjectNamespace<ClassmatchRoom>
  ADMIN_PASSCODE?: string
}

/** 保存する状態。json はアプリの AppState をそのまま JSON 文字列にしたもの（Firestore 時代と同じ形） */
interface Stored {
  version: number
  updatedAt: string
  json: string
}

const MAX_JSON_BYTES = 900_000

const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,authorization',
  'access-control-max-age': '86400',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function text(body: string, status: number): Response {
  return new Response(body, { status, headers: CORS })
}

/** 合言葉の比較（長さが違っても時間差が出ないようにする） */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  if (x.byteLength !== y.byteLength) return false
  return crypto.subtle.timingSafeEqual(x, y)
}

/** 大会1つぶんの部屋。状態を保持し、つながっている全端末へ更新を配る */
export class ClassmatchRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // 端末からの keepalive（"ping"）には Durable Object を起こさずに自動で "pong" を返す
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const path = url.pathname

    // 表示・管理端末の購読（WebSocket）。接続直後に現在の状態を1回送る
    if (path === '/ws') {
      if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
        return text('expected websocket', 426)
      }
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)
      this.ctx.acceptWebSocket(server)
      const stored = await this.ctx.storage.get<Stored>('state')
      server.send(JSON.stringify({ type: 'state', ...(stored ?? { version: 0, updatedAt: '', json: null }) }))
      return new Response(null, { status: 101, webSocket: client })
    }

    // 現在の状態（WebSocket が使えない環境のポーリング用・確認用）
    if (path === '/state' && req.method === 'GET') {
      const stored = await this.ctx.storage.get<Stored>('state')
      return json(stored ?? { version: 0, updatedAt: '', json: null })
    }

    // 管理画面のログイン（合言葉の確認だけ）
    if (path === '/login' && req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as { passcode?: unknown }
      const ok = this.authorized(body.passcode)
      return json({ ok }, ok ? 200 : 401)
    }

    // 管理画面からの保存。合言葉が合えば保存して全端末へ配信
    if (path === '/state' && req.method === 'POST') {
      // 先に本文を読み切る（未読のまま応答すると workerd がエラーを出す）
      const body = (await req.json().catch(() => null)) as Partial<Stored> | null
      const auth = req.headers.get('authorization') ?? ''
      const pass = auth.startsWith('Bearer ') ? auth.slice(7) : ''
      if (!this.authorized(pass)) return json({ ok: false, error: 'unauthorized' }, 401)
      if (!body || typeof body.json !== 'string' || body.json.length > MAX_JSON_BYTES) {
        return json({ ok: false, error: 'bad request' }, 400)
      }
      const stored: Stored = {
        version: Number(body.version) || 0,
        updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : new Date().toISOString(),
        json: body.json,
      }
      await this.ctx.storage.put('state', stored)
      this.broadcast(JSON.stringify({ type: 'state', ...stored }))
      return json({ ok: true, version: stored.version, clients: this.ctx.getWebSockets().length })
    }

    return text('not found', 404)
  }

  private authorized(pass: unknown): boolean {
    const expected = this.env.ADMIN_PASSCODE ?? ''
    return typeof pass === 'string' && expected !== '' && safeEqual(pass, expected)
  }

  private broadcast(message: string) {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(message)
      } catch {
        /* 切れた接続は無視（close で片付く） */
      }
    }
  }

  // 端末からのメッセージは keepalive 以外受け付けない（"ping" は自動応答で処理済み）
  async webSocketMessage(): Promise<void> {}

  async webSocketClose(ws: WebSocket): Promise<void> {
    try {
      ws.close()
    } catch {
      /* already closed */
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try {
      ws.close()
    } catch {
      /* already closed */
    }
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
    const url = new URL(req.url)
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: 'classmatch-sync' })
    }
    // 大会は1つなので部屋も1つ（名前固定）。冬・夏で分けたければ名前を変える
    const stub = env.ROOM.get(env.ROOM.idFromName('classmatch'))
    return stub.fetch(req)
  },
} satisfies ExportedHandler<Env>
