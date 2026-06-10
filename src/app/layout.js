import './globals.css'

export const metadata = {
  title: 'VB 2026 Predikció',
  description: 'World Cup 2026 Prediction Model',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <a href="/">Dashboard</a>
          <a href="/groups">Groups</a>
          <a href="/matches">Matches</a>
          <a href="/admin">Admin (Teams)</a>
        </nav>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  )
}
