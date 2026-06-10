# VB 2026 – Predikciós Modell: Teljes Matematikai Szabályrendszer

---

## 0. Adatbázis struktúra

### Tábla 1: `fifa_rankings` (statikus, egyszer töltve)
```
team_name        TEXT  – csapat neve
fifa_points      REAL  – FIFA pontszám
fifa_rank        INT   – FIFA rangsorban elfoglalt hely
group_id         TEXT  – csoport betűjele (A–L)
```

### Tábla 2: `matches` (dinamikus, meccsenként bővül)
```
id               INT   – egyedi azonosító
team_home        TEXT  – hazai csapat neve
team_away        TEXT  – vendég csapat neve
goals_home       INT   – hazai gól
goals_away       INT   – vendég gól
stage            TEXT  – 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
group_id         TEXT  – csoport betűjele (csak csoportkörben)
match_date       DATE  – mérkőzés dátuma
yellow_home      INT   – sárga lapok (hazai)
yellow_away      INT   – sárga lapok (vendég)
red_home         INT   – piros lapok (hazai)
red_away         INT   – piros lapok (vendég)
aet              BOOL  – hosszabbításban dőlt el?
penalties        BOOL  – büntetőkkel dőlt el?
penalty_winner   TEXT  – ki nyert büntetőkkel (ha penalties = TRUE)
```

### Tábla 3: `team_state` (számított, minden meccs után újragenerálva)
```
team_name        TEXT
elo              REAL  – aktuális Elo érték
attack_strength  REAL  – Dixon-Coles alfa
defense_strength REAL  – Dixon-Coles béta
matches_played   INT   – lejátszott meccsek száma
eliminated       BOOL  – kiesett-e már
```

---

## 1. Inicializálás – FIFA → Elo konverzió

### Képlet
```
avg_fifa = az összes résztvevő csapat FIFA pontszámának számtani átlaga

Elo_init(csapat) = 1500 + (fifa_points(csapat) − avg_fifa) × K_init
```

### Paraméter
```
K_init = 0.15
```

### Magyarázat
- Az Elo skála középpontja 1500.
- A FIFA-pontkülönbséget 0.15-ös szorzóval vetítjük rá az Elo-skálára.
- Példa: ha avg_fifa = 1450, és Brazília = 1840 pont → Elo_init = 1500 + (1840−1450)×0.15 = 1500 + 58.5 = **1558.5**
- San Marino esetén (pl. 900 pont) → 1500 + (900−1450)×0.15 = 1500 − 82.5 = **1417.5**

---

## 2. Elo-rendszer – meccs utáni frissítés

### Várható eredmény (Win Expectancy)
```
E_home = 1 / (1 + 10^((Elo_away − Elo_home) / 400))
E_away = 1 − E_home
```

### Tényleges eredmény (S)
```
Ha hazai győz:           S_home = 1,    S_away = 0
Ha döntetlen:            S_home = 0.5,  S_away = 0.5
Ha vendég győz:          S_home = 0,    S_away = 1
Ha büntetőkkel dőlt el:  S_home = 0.75, S_away = 0.25 (vagy fordítva)
  → a büntetőkkel nyerő kap 0.75-öt, a vesztes 0.25-öt
  → indok: a büntetőpárbaj nem 100%-ban tükröz erőkülönbséget
```

### Gólkülönbség-szorzó (Goal Difference Multiplier)
```
GD = |goals_home − goals_away|

GDM = ln(GD + 1) + 1

Speciális eset: ha GD = 0 (döntetlen vagy büntetőkkel eldőlt)
  GDM = 1.0
```

### Elo frissítés
```
ΔElo_home = K × GDM × (S_home − E_home)
ΔElo_away = K × GDM × (S_away − E_away)

Elo_new_home = Elo_home + ΔElo_home
Elo_new_away = Elo_away + ΔElo_away
```

### K értékek
```
Csoportkör:          K = 40
Kiesési szakasz:     K = 50
  → a kiesési meccsek nagyobb súlyt kapnak, mert tétjesebbek
```

### FIFA prior fokozatos halványítása
```
prior_weight = 10  (egy beállítható konstans)

effektív_Elo(csapat) = (Elo_init × prior_weight + Elo_meccsalapú × matches_played)
                       / (prior_weight + matches_played)
```
> Amíg egy csapat nem játszott meccset, tisztán a FIFA-alapú Elo érvényes.
> 10 meccs után a prior súlya kb. 50%-ra csökkent.
> 20+ meccs után a prior szinte elhanyagolható.

---

## 3. Dixon-Coles modell – támadó és védekező erő

### Paraméterek
```
α(csapat) = támadóerő  (kezdeti érték: 1.0 minden csapatnak)
β(csapat) = védekezőerő (kezdeti érték: 1.0 minden csapatnak)
μ          = az összes mérkőzés átlagos gólszáma (folyamatosan frissül)
```

### Várható gólszám egy mérkőzésen
```
λ_home = α(home) × β(away) × μ
λ_away = α(away) × β(home) × μ
```

### Poisson valószínűség
```
P(k gól) = (λ^k × e^(−λ)) / k!

A modell 0–8 gól közötti összes kombinációt kiszámolja mindkét csapatnak.
```

### Dixon-Coles ρ-korrekció (alacsony gólszámokra)
```
Az alábbi négy eredményre a Poisson-eloszlás nem pontos, ezért korrekció kell:

τ(0,0) = 1 − λ_home × λ_away × ρ
τ(1,0) = 1 + λ_away × ρ
τ(0,1) = 1 + λ_home × ρ
τ(1,1) = 1 − ρ

ahol ρ = −0.1  (enyhén negatív korreláció a két csapat góljai között)

Minden más (i,j) esetén τ(i,j) = 1.0

A korrigált valószínűség:
P_corrected(i,j) = P_poisson(i, λ_home) × P_poisson(j, λ_away) × τ(i,j)
```

### α és β becslése (Maximum Likelihood)
```
Az összes lejátszott meccs adatából iteratív numerikus optimalizálással
(pl. gradient descent vagy Newton-Raphson) maximalizáljuk a log-likelihood-ot:

log L = Σ [ log P_corrected(goals_home_i, goals_away_i) ]
        az összes i meccsre

A modell minden meccs rögzítése után újrafut az összes eddigi meccs adatán.
```

### Meccsvalószínűségek összegzése
```
P(home_win)  = Σ P_corrected(i,j)  ahol i > j
P(draw)      = Σ P_corrected(i,i)
P(away_win)  = Σ P_corrected(i,j)  ahol j > i
```

---

## 4. Kiesési meccsek kezelése (nincs döntetlen)

### Normalizálás
```
Ha a mérkőzés kiesési fázisban van, a döntetlen valószínűségét elosztjuk:

P(home_win_adj)  = P(home_win) + P(draw) × P(home_win) / (P(home_win) + P(away_win))
P(away_win_adj)  = P(away_win) + P(draw) × P(away_win) / (P(home_win) + P(away_win))
```

### Hosszabbítás és büntetők szimulációban
```
Ha a szimuláció döntetlent generál kiesési meccsre:
  → Büntetőpárbaj valószínűségek:

  P(home_penalties) = 0.5 + Elo_diff_faktor
  P(away_penalties) = 1 − P(home_penalties)

  ahol:
  Elo_diff_faktor = (Elo_home − Elo_away) / 10000
  → maximálisan ±0.05 eltérés a 50/50-ről (az Elo különbség legfeljebb 500 pont esetén)
  → tehát az erősebb csapat legfeljebb 55%-os eséllyel nyeri a büntetőt
```

---

## 5. Csoportkör – állástábla és továbbjutás

### Pontszámítás
```
Győzelem:   3 pont
Döntetlen:  1 pont
Vereség:    0 pont
```

### Csoporton belüli rangsor (tiebreaker sorrend)
```
1. Pontok száma
2. Gólkülönbség (összes csoportmeccsből)
3. Szerzett gólok száma (összes csoportmeccsből)
4. Egymás elleni pontok (csak az érintett csapatok közötti meccsekből)
5. Egymás elleni gólkülönbség
6. Egymás elleni szerzett gólok
7. Fair play pontszám (alacsonyabb = jobb):
   sárga lap = −1 pont
   piros lap (direkt) = −3 pont
   sárga+piros = −3 pont
8. Sorsolás (szimulációban: véletlenszerű)
```

### Továbbjutók a csoportkörből
```
Automatikusan továbbjut:
  → minden csoport 1. helyezettje   (12 csapat)
  → minden csoport 2. helyezettje   (12 csapat)

Best third-place:
  → a 12 csoport 3. helyezettjei közül a legjobb 8 jut tovább
  → rangsor kritériumai:
    1. Pontok
    2. Gólkülönbség
    3. Szerzett gólok
    4. Fair play pontszám
    5. Sorsolás
```

---

## 6. Monte Carlo szimuláció

### Paraméter
```
N = 100 000 szimuláció futtatása minden meccsrögzítés után
```

### Egy szimuláció menete
```
1. Csoportkör hátralévő meccseinek szimulálása
   → minden meccsre Poisson alapú valószínűségekkel véletlenszerű eredmény
   → csoporttábla frissítése meccsről meccsre
   → továbbjutók meghatározása (top 2 + best 8 third)

2. Round of 32 szimulálása
   → bracket alapján párosítások
   → minden meccsre: P(home_win_adj) és P(away_win_adj)
   → véletlenszerű döntés súlyozott valószínűséggel

3. Round of 16 → Negyeddöntő → Elődöntő → Döntő
   → ugyanaz a logika, bracket frissítése

4. A szimuláció végén feljegyezzük a bajnokot
```

### Valószínűségek kiszámítása
```
P(bajnok, csapat_X) = (csapat_X nyerte a szimulációt hányszor) / N

Ugyanígy:
P(döntős)           = (hányszor jutott döntőbe) / N
P(elődöntős)        = (hányszor jutott elődöntőbe) / N
P(továbbjut csoportból) = (hányszor jutott ki a csoportból) / N
```

### Kiesett csapatok kezelése
```
Ha egy csapat már kiesett (eliminated = TRUE):
  → P(bajnok) = 0%
  → A csapat adatai megmaradnak az adatbázisban (historikus célból)
  → A megjelenítésből kikerül, de lekérdezhető
```

---

## 7. A modell teljes futási sorrendje (minden meccsrögzítés után)

```
1. Meccs mentése az adatbázisba

2. Elo frissítés
   → E_home, E_away kiszámítása
   → GDM kiszámítása
   → ΔElo kiszámítása és alkalmazása mindkét csapatra
   → effektív Elo frissítése (prior halványítással)

3. Dixon-Coles újrafuttatás
   → μ (átlag gólszám) frissítése
   → α és β értékek újraoptimalizálása az ÖSSZES eddigi meccs alapján
   → P(home_win), P(draw), P(away_win) kiszámítása minden jövőbeli párosításra

4. Csoportállás frissítése (ha csoportkör)
   → pontok, gólkülönbség, fair play
   → tiebreaker sorrend alkalmazása

5. Kiesési státusz frissítése
   → ha egy csapat kiesett: eliminated = TRUE

6. Monte Carlo szimuláció
   → N = 100 000 futtatás
   → bajnok-valószínűségek kiszámítása minden még aktív csapatra

7. Eredmények mentése / megjelenítés frissítése
```

---

## 8. Kimeneti adatok (amit a UI megjelenít)

### Fő rangsor (csak aktív csapatok)
```
Sorrend | Csapat | Bajnok % | Döntős % | Elődöntős % | Elo | Csoport
```

### Csoporttáblák
```
Csapat | Meccses | Győzelem | Döntetlen | Vereség | GF | GA | GD | Pontok
```

### Historikus adatok (kiesett csapatokkal együtt)
```
Minden csapat minden meccse, Elo-görbéje, és utolsó bajnoki valószínűsége
```

---

## 9. Konstansok összefoglalója

```
K_init        = 0.15      – FIFA→Elo konverziós szorzó
K_group       = 40        – Elo K-faktor csoportkörben
K_knockout    = 50        – Elo K-faktor kiesési fázisban
prior_weight  = 10        – FIFA prior halványítási súly
ρ             = −0.1      – Dixon-Coles korrekciós paraméter
N             = 100 000   – Monte Carlo szimulációk száma
max_goals     = 8         – Poisson számítás felső határa
penalty_max   = 0.05      – Maximum Elo-torzítás büntetőknél
```

---

## 10. Megjegyzések az implementációhoz

- A Dixon-Coles α/β optimalizáció az első 3-4 meccs előtt **nem megbízható** – ilyenkor az Elo-alapú valószínűségek kapjanak nagyobb súlyt.
- A modell **determinisztikus**: ugyanazok az inputok mindig ugyanazt az outputot adják (a Monte Carlo véletlenszám-generátorának seedjétől eltekintve).
- Ha egy korábbi meccs adata módosul, a **teljes modell az elejétől újrafut** az összes meccs adatán.
- A csoportkörben a best third-place csapatok bracket-beosztása az **összes csoport lezárulása után** dől el, nem előtte – a szimulációnak ezt respektálnia kell.
