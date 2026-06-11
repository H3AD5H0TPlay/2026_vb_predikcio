import './globals.css'
import SimulationIndicator from '@/components/SimulationIndicator'

export const metadata = {
  title: 'VB 2026 Predikció',
  description: 'World Cup 2026 Prediction Model',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <a href="/">Kezdőlap</a>
          <a href="/groups">Csoportok</a>
          <a href="/matches">Meccsek</a>
          <a href="/admin">Admin (Csapatok)</a>
          <a href="/calculations">Matek (Számítások)</a>
        </nav>
        <div className="container">
          {children}
        </div>
        <SimulationIndicator />
      </body>
    </html>
  )
}
