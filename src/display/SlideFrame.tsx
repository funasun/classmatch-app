import type { AppState } from '../types'
import type { Frame } from './frames'
import { CurrentMatchView } from './slides/CurrentMatchView'
import { WbgtView } from './slides/WbgtView'
import { MatchResultsView } from './slides/MatchResultsView'
import { CourtMapView } from './slides/CourtMapView'
import { TableView } from './slides/TableView'
import { NoticeView } from './slides/NoticeView'
import { LiveStreamView } from './slides/LiveStreamView'

/** スライド1コマの実体。表示画面と管理画面プレビューの両方で使う */
export function SlideFrame({ frame, state }: { frame: Frame; state: AppState }) {
  const { slide, page, pages } = frame
  switch (slide.type) {
    case 'current':
      return <CurrentMatchView courts={state.courts} />
    case 'wbgt':
      return <WbgtView slide={slide} />
    case 'matchResults':
      return <MatchResultsView slide={slide} courts={state.courts} page={page} pages={pages} />
    case 'courtMap':
      return <CourtMapView courts={state.courts} />
    case 'table':
      return <TableView slide={slide} page={page} pages={pages} />
    case 'notice':
      return <NoticeView slide={slide} />
    case 'liveStream':
      return <LiveStreamView slide={slide} />
  }
}
