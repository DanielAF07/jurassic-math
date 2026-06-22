import { NavLink, Outlet } from 'react-router-dom'

/** Clase del tab según si la ruta está activa. */
function tabClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'app-nav__tab app-nav__tab--active' : 'app-nav__tab'
}

/**
 * Cascarón común a todas las pantallas: marca, navegación y contenedor.
 * Las vistas se montan en el <Outlet/> según la ruta.
 */
export function Layout() {
  return (
    <div className="app">
      <header className="app-header no-print">
        <div className="app-header__brand">
          <img
            className="app-header__mark"
            src="/logo.png"
            alt=""
            aria-hidden="true"
          />
          <span className="app-header__title">Jurassic Math</span>
        </div>

        <nav className="app-nav" aria-label="Secciones">
          <NavLink to="/cartones" className={tabClass}>
            Cartones
          </NavLink>
          <NavLink to="/cantor" className={tabClass}>
            El cantor
          </NavLink>
          <NavLink to="/pantallon" className={tabClass}>
            Pantallón
          </NavLink>
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
