#!/usr/bin/env bash
# Cattura le schermate dei siti dei lavori in public/lavori/<id>.jpg
# e aggiorna content/schermate.json, che dice alla scena quali carte hanno un'immagine.
# Usa Google Chrome già installato sul computer (nessun browser da scaricare).
# Uso, dalla cartella del progetto:  bash scripts/schermate.sh
set -u
cd "$(dirname "$0")/.."
mkdir -p public/lavori

lavori=(
  "shop https://shop.puntoluce.net/"
  "osservatorio https://osservatorioaccoglienza.org"
  "livellozero https://livellozero.games"
  "ndnluxury https://www.ndnluxury.com"
  "esh https://www.eshousing.com"
  "blog https://www.puntoluce.net/comefare/"
  "jointoyou https://jointoyou.it"
  "copystudio https://www.copystudio.it"
  "hetaweb https://hetaweb.it"
)

fatte=()
for riga in "${lavori[@]}"; do
  id="${riga%% *}"; url="${riga#* }"
  echo "→ $id  $url"
  if npx -y playwright@1.48.2 screenshot --channel=chrome --viewport-size=1440,900 \
       --wait-for-timeout=2500 "$url" "public/lavori/$id.jpg" >/dev/null 2>&1; then
    fatte+=("\"$id\"")
  else
    echo "  non riuscita, la carta resta col disegno"
  fi
done

( IFS=,; echo "[${fatte[*]}]" ) > content/schermate.json
echo "Fatte: ${#fatte[@]} — elenco in content/schermate.json"
