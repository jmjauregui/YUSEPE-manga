import { useState } from 'react'
import type { MangaProject } from '../../shared/types'
import Overview from './screens/Overview'
import CreateProject from './screens/CreateProject'
import Editor from './screens/Editor'
import StoryBuilder from './screens/StoryBuilder'

export interface ProjectSession {
  project: MangaProject
  filePath: string
  folder: string
}

type View = { screen: 'overview' } | { screen: 'create' } | { screen: 'editor' } | { screen: 'story' }

export default function App() {
  const [view, setView] = useState<View>({ screen: 'overview' })
  const [session, setSession] = useState<ProjectSession | null>(null)
  /** Incrementa al volver del constructor de historia: fuerza remontar el editor con datos frescos */
  const [editorNonce, setEditorNonce] = useState(0)

  const openSession = (s: ProjectSession) => {
    setSession(s)
    setEditorNonce((n) => n + 1)
    setView({ screen: 'editor' })
  }

  const closeSession = () => {
    setSession(null)
    setView({ screen: 'overview' })
  }

  const returnFromStory = (project: MangaProject) => {
    if (session) setSession({ ...session, project })
    setEditorNonce((n) => n + 1)
    setView({ screen: 'editor' })
  }

  return (
    <div className="h-full select-none">
      {view.screen === 'overview' && (
        <Overview onNewProject={() => setView({ screen: 'create' })} onOpenProject={openSession} />
      )}
      {view.screen === 'create' && (
        <CreateProject onCancel={() => setView({ screen: 'overview' })} onCreated={openSession} />
      )}
      {view.screen === 'editor' && session && (
        <Editor
          key={`${session.filePath}:${editorNonce}`}
          session={session}
          onExit={closeSession}
          onOpenStory={() => setView({ screen: 'story' })}
        />
      )}
      {view.screen === 'story' && session && (
        <StoryBuilder session={session} onExit={returnFromStory} />
      )}
    </div>
  )
}
