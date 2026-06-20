import { useState } from 'react'
import { GeneratorContainer } from './presentation/generator/GeneratorContainer'
import { CallerContainer } from './presentation/caller/CallerContainer'
import './app.css'

type Tab = 'generator' | 'caller'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('generator')

  return (
    <div className="app">
      <header className="app-header no-print">
        <div className="app-header__brand">
          <span className="app-header__mark" aria-hidden="true">
            🦖
          </span>
          <span className="app-header__title">Jurassic Math</span>
        </div>

        <nav className="app-nav" aria-label="Secciones">
          <button
            className={
              activeTab === 'generator'
                ? 'app-nav__tab app-nav__tab--active'
                : 'app-nav__tab'
            }
            onClick={() => setActiveTab('generator')}
          >
            Cartones
          </button>
          <button
            className={
              activeTab === 'caller'
                ? 'app-nav__tab app-nav__tab--active'
                : 'app-nav__tab'
            }
            onClick={() => setActiveTab('caller')}
          >
            El cantor
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'generator' && <GeneratorContainer />}
        {activeTab === 'caller' && <CallerContainer />}
      </main>
    </div>
  )
}
