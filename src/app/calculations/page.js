export const metadata = {
  title: 'Matematikai Számítások - VB 2026',
}

export default function Calculations() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '4rem' }}>
      <h1>A Predikciós Modell Matematikája</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
        Ez az oldal részletesen bemutatja, milyen statisztikai és matematikai alapokon nyugszik a 2026-os Világbajnokság szimulációs rendszere. 
        A modell három fő pillérre épül: a klasszikus <strong>Elo-rendszerre</strong> (a kezdeti erőviszonyok és meccsalapú frissítések miatt), 
        a <strong>Dixon-Coles modellre</strong> (a pontos gólvalószínűségek és támadó/védekező erők szétválasztása érdekében), 
        valamint a <strong>Monte Carlo módszerre</strong> (a jövő szimulálására).
      </p>

      {/* 1. Elo Inicializálás */}
      <div className="card">
        <h2>1. Inicializálás: FIFA → Elo Konverzió</h2>
        <p>Amíg egy csapat nem játszott egyetlen meccset sem, a hivatalos FIFA ranglista pontszámából számítjuk a kezdő Elo értékét.</p>
        
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', margin: '1.5rem 0', fontFamily: 'monospace', fontSize: '1.1rem' }}>
          Elo<sub>init</sub>(csapat) = 1500 + (FIFA<sub>csapat</sub> - FIFA<sub>átlag</sub>) × K<sub>init</sub>
        </div>
        
        <ul style={{ color: 'var(--text-muted)' }}>
          <li><strong>1500:</strong> Az Elo skála fix középpontja.</li>
          <li><strong>K<sub>init</sub> (0.15):</strong> A konverziós szorzó. Célja, hogy a hatalmas FIFA-pontkülönbségeket egy kiegyenlítettebb, a sakkból és fociból ismert hagyományos Elo skálára húzza össze.</li>
        </ul>
      </div>

      {/* 2. Elo Frissítés */}
      <div className="card">
        <h2>2. Elo-rendszer és Meccs Frissítések</h2>
        <p>Minden lejátszott mérkőzés után mindkét csapat Elo pontszáma frissül. Először kiszámítjuk a várható eredményt (Win Expectancy).</p>
        
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', margin: '1.5rem 0', fontFamily: 'monospace', fontSize: '1.1rem' }}>
          E<sub>home</sub> = 1 / (1 + 10<sup>(Elo<sub>away</sub> - Elo<sub>home</sub>) / 400</sup>) <br /><br />
          E<sub>away</sub> = 1 - E<sub>home</sub>
        </div>

        <p>A frissítésnél nemcsak a győzelem tényét, hanem a <strong>gólkülönbséget (GD)</strong> is figyelembe vesszük egy logaritmikus szorzóval (GDM), hogy egy 4-0-ás győzelem többet érjen, mint egy 1-0-ás.</p>
        
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', margin: '1.5rem 0', fontFamily: 'monospace', fontSize: '1.1rem' }}>
          GDM = ln(|Goals<sub>home</sub> - Goals<sub>away</sub>| + 1) + 1 <br /><br />
          ΔElo = K × GDM × (S - E)<br /><br />
          Elo<sub>új</sub> = Elo<sub>régi</sub> + ΔElo
        </div>

        <ul style={{ color: 'var(--text-muted)' }}>
          <li><strong>S:</strong> A tényleges eredmény (1 győzelem, 0.5 döntetlen, 0 vereség). Büntetőpárbaj esetén a nyertes 0.75-öt, a vesztes 0.25-öt kap.</li>
          <li><strong>K (K-faktor):</strong> Csoportkörben 40, kiesési szakaszban 50. A kiesési meccsek tétje nagyobb, ezért ott a pontmozgás is erőteljesebb.</li>
        </ul>
      </div>

      {/* 3. Dixon Coles */}
      <div className="card">
        <h2>3. A Dixon-Coles Modell (Poisson-eloszlás)</h2>
        <p>Míg az Elo csak azt mondja meg, ki nyer, a Dixon-Coles modell a pontos <strong>gólszámok</strong> valószínűségét adja meg, elkülönítve a támadó (α) és védekező (β) erőket.</p>

        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', margin: '1.5rem 0', fontFamily: 'monospace', fontSize: '1.1rem' }}>
          λ<sub>home</sub> = α<sub>home</sub> × β<sub>away</sub> × μ <br /><br />
          λ<sub>away</sub> = α<sub>away</sub> × β<sub>home</sub> × μ <br /><br />
          P(x, y) = [ (λ<sub>home</sub><sup>x</sup> e<sup>-λ<sub>home</sub></sup>) / x! ] × [ (λ<sub>away</sub><sup>y</sup> e<sup>-λ<sub>away</sub></sup>) / y! ] × τ(x,y)
        </div>

        <ul style={{ color: 'var(--text-muted)' }}>
          <li><strong>μ:</strong> A meccsenkénti átlagos gólszám a bajnokságban.</li>
          <li><strong>λ (Lambda):</strong> A várható gólszám az adott csapat részéről.</li>
          <li><strong>τ (Tau):</strong> A Dixon-Coles féle <em>ρ-korrekció</em> alacsony gólszámok (0-0, 1-0, 0-1, 1-1) esetén, mivel a sima Poisson eloszlás alulbecsüli a döntetlenek esélyét az 1-1 alatti tartományban. (Itt ρ = -0.1).</li>
        </ul>
      </div>

      {/* 4. Átmenet */}
      <div className="card">
        <h2>4. Súlyozott Átmenet (Warmup)</h2>
        <p>Mivel a Dixon-Coles (ML) optimalizáció 0-1 meccsből még hatalmas fals kiugrásokat generálhatna (pl. ha Szaúd-Arábia nyer 1-0-ra az 1. meccsen, a modell szerint ők a világ legjobbjai lennének), ezért egy okos súlyozást alkalmazunk az 1-4. mérkőzés között:</p>

        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', margin: '1.5rem 0', fontFamily: 'monospace', fontSize: '1.1rem' }}>
          Súly<sub>DC</sub> = min(1.0, Lejátszott_Meccsek / 5) <br /><br />
          Súly<sub>Elo</sub> = 1.0 - Súly<sub>DC</sub> <br /><br />
          P<sub>végleges</sub>(esemény) = (P<sub>DC</sub> × Súly<sub>DC</sub>) + (P<sub>Elo</sub> × Súly<sub>Elo</sub>)
        </div>
      </div>

      {/* 5. Monte Carlo */}
      <div className="card">
        <h2>5. Monte Carlo Szimuláció</h2>
        <p>Minden egyes meccsrögzítés után a rendszer <strong>N = 100 000 alkalommal</strong> "lejátssza" a világbajnokság összes hátralévő mérkőzését a fenti képletek által generált valószínűségek (P_home, P_draw, P_away) alapján.</p>
        
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', margin: '1.5rem 0', fontFamily: 'monospace', fontSize: '1.1rem' }}>
          Esély(Bajnok) = Σ (Győzelmek a szimulációkban) / 100 000
        </div>

        <p style={{ color: 'var(--text-muted)' }}>
          A csoportkörös döntetleneknél véletlenszerű gólokat sorsol a Poisson eloszlásból. Kiesési szakaszban, ha a szimuláció döntetlent dobna, azonnal "büntetőpárbajt" szimulál, ahol a magasabb Elo értékkel rendelkező csapat minimális, maximum 55%-os előnyben van.
        </p>
      </div>

    </div>
  )
}
