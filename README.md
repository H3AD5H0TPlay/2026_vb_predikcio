# VB 2026 Predikciós Modell

Szia! Ezt a projektet azért raktuk össze, hogy meg tudjuk jósolni a 2026-os foci világbajnokság kimenetelét egy saját matematikai modellel. A cél az volt, hogy ne csak tippújmikkel dolgozzunk, hanem egy kőkemény statisztikai motor fusson a háttérben, ami meccsről meccsre tanul és finomítja az esélyeket.

## Hogy működik a modell?

A dolog magja három fő elemből áll, amiket szorosan összekötöttünk:

1. Elo-rendszer
Alapból minden csapat a hivatalos FIFA pontszámával indul, amit elneveztünk az induló Elo pontjuknak. Amikor két csapat játszik, a modell kiszámolja a győzelmi esélyeiket ez alapján. Ha egy gyengébb csapat megver egy erősebbet, sokkal több pontot kap, mintha papírforma győzelem született volna. Ráadásul a gólkülönbséget is figyelembe vesszük (egy 4-0-ás győzelem sokkal többet ér a pontszámításnál, mint egy nyögvenyelős 1-0).

2. Dixon-Coles modell (Gépi tanulás)
Ez a rész egy fokkal durvább. Ahogy gyűlnek a lejátszott meccsek (tehát ahogy haladunk előre a bajnokságban), a rendszer egy Poisson-eloszlásra épülő modellt használ a gólok megjóslására. Ez figyelembe veszi minden csapat támadóerejét és védekezési képességét. Mivel a bajnokság elején még alig van lejátszott meccs, a modell úgy van megírva, hogy az első négy meccsig folyamatosan húzza át a súlyozást az Elo-ról a Dixon-Coles felé. Az ötödik meccstől kezdve már 100%-ban ez az okosított gépi tanulós modell számolja a gólvalószínűségeket.

3. Monte Carlo szimuláció
Amint rögzítesz egy új meccset, a háttérben lefut egy N=100 000 iterációs szimuláció. Vagyis a program százezerszer lejátssza a hátralévő teljes világbajnokságot a legfrissebb erőviszonyok alapján. Ebből számolja ki másodpercek alatt, hogy kinek mennyi esélye van megnyerni a VB-t, bejutni a döntőbe, vagy akár csak továbbjutni a csoportjából.

## Technikai háttér

A felület és az API egy Next.js alkalmazás, ami Reactet használ. Adatbázisnak nem akartam túlbonyolított dolgokat használni, így a legújabb Node.js beépített natív SQLite megoldását (node:sqlite) használtam, ami atomstabil és gyors, ráadásul minden adatod egyetlen prediction.db fájlban tárolódik lokálisan. Nincs felhő, nincs adatvesztés, minden nálad marad. Ezt a fájlt be is raktam a gitignore-ba, hogy ne kerüljön fel véletlenül se az internetre, ha megosztod a kódot.

A dizájnhoz egyedi, modern CSS-t írtunk, Tailwind nélkül, letisztult sötét móddal és egy kis üveghatással (glassmorphism), hogy jól is nézzen ki, miközben az adatokat bújod.

## Telepítés és használat

Ha leklónoztad a repót, először is telepítsd a függőségeket:

npm install

Utána indítsd el a fejlesztői szervert:

npm run dev

Ezután nyisd meg a localhost:3000-et a böngésződben. Első lépésként az Admin felületen tudod felvinni a csapatokat a hivatalos adataikkal. Amint ez megvan, a Meccsek fülön rögzítheted a lejátszott mérkőzéseket. A Kezdőlapon mindig a legfrissebb, szimulációk által kiköpött nyerési esélyeket fogod látni, a Csoportok fülön pedig átláthatod a csoportkör állását.

Ha bármelyik matekot hangolni akarod (például az Elo K-faktorát vagy az átmeneti zóna meccsszámát), a src/lib/config.js fájlban mindent egy helyen, egyszerűen megtehetsz.

Jó szórakozást és remélem bejönnek a jóslatok!
