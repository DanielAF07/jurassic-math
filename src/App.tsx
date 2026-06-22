import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './presentation/Layout'
import { GeneratorContainer } from './presentation/generator/GeneratorContainer'
import { CallerContainer } from './presentation/caller/CallerContainer'
import { TvContainer } from './presentation/tv/TvContainer'
import { ControlContainer } from './presentation/remote/ControlContainer'
import './app.css'

export default function App() {
  return (
    <Routes>
      {/* Control remoto del celu: vista limpia, fuera del Layout con nav. */}
      <Route path="/control" element={<ControlContainer />} />
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/cartones" replace />} />
        <Route path="cartones" element={<GeneratorContainer />} />
        <Route path="cantor" element={<CallerContainer />} />
        <Route path="pantallon" element={<TvContainer />} />
        <Route path="*" element={<Navigate to="/cartones" replace />} />
      </Route>
    </Routes>
  )
}
