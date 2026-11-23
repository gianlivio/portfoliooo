/**
 * Il testo dietro ogni lavoro: compare in filigrana sopra la carta
 * e si schiarisce quando ci si avvicina. Uno per lingua, codice compreso.
 * Dove c'è codice è una sintesi della logica reale, non una copia;
 * dove non c'è, è una nota di lavoro. Niente chiavi, token o indirizzi interni.
 */
type Frammenti = Record<string, string>;

const it: Frammenti = {
  shop: `// checkout — regole fra pagamento e spedizione
if (totale < 500) nascondi(SPEDIZIONE_GRATUITA)
if (spedizione === SPEDIZIONE_GRATUITA) mostraSolo(BONIFICO)
if (extraUE(cliente)) avvisa(messaggi[lingua].extraUE)
// feed: solo prodotti con giacenza > 0
feed = prodotti.filter(p => p.stock > 0).map(perKelkoo)`,

  bellelli: `Disponibile anche in →
schede collegate, catalogo intatto
JSON-LD · mobile
Merchant Center: 392 prodotti × 3 lingue`,

  "8fly": `660 disponibili → in cima
Home + 16 reparti · IT/EN · 60/160
JSON-LD: Product · OnlineStore
anteprima → tavole → template`,

  sanires: `titoli · metadati · JSON-LD
testi per Google
velocità · accessibilità
privacy e cookie: iubenda`,

  ghigomiranda: `feed → Google Shopping
prodotti di nuovo approvati
restyling · telefono · tablet
spedizioni per provincia`,

  osservatorio: `# 90 report ministeriali, 2016–2025
for pdf in report:
    serie += leggi_tabelle(pdfplumber.open(pdf), "MSNA")
archivio = unisci(anac_2015_2025)   # 18.058 contratti
diretti = archivio[archivio.procedura == "diretto"]`,

  livellozero: `// il committente scrive, il sito pubblica
salvaArticolo({ titolo, sezione, corpo, immagini })
pubblica("/articoli/" + slug)
// sito pubblico | pannello di amministrazione`,

  futuraauthor: `agente: redattore
fonte: Search Console
tono: quello del cliente
revisione: umana, sempre`,

  beautybroker: `22+ scenari end-to-end
OTP · inviti · IBAN · referral · checkout
502 · 409 · inviti duplicati silenti
regression test dopo ogni fix`,

  ndnluxury: `Search Console: il concorrente omonimo
Lighthouse 100 · accessibilità, SEO
JSON-LD, FAQ
correlati per punteggio`,

  esh: `ogni dato sulla sua fonte
IT · EN · ES
piani per città
Next.js, Neon, Vercel`,

  blog: `linea editoriale · piano degli articoli
SEO e GEO: Search Console, DataForSEO
indice → sezione, scorrimento dolce
articoli dentro lo shop`,

  allstudios: `nove pagine riscritte
vocabolario: Canvas, Node, Troupe
annuncio = copia del progetto
crediti prenotati, poi confermati`,

  jointoyou: `WordPress, da zero
articoli
caricamento e pulizia dei dati`,

  copystudio: `intervista → tono → pubblico
→ posizionamento → testo`,

  hetaweb: `titolo, attacco, H2, meta description
trenta redazioni, un tono ciascuna`,
};

const en: Frammenti = {
  shop: `// checkout — rules between payment and shipping
if (total < 500) hide(FREE_SHIPPING)
if (shipping === FREE_SHIPPING) showOnly(BANK_TRANSFER)
if (outsideEU(customer)) warn(messages[lang].outsideEU)
// feed: only products with stock > 0
feed = products.filter(p => p.stock > 0).map(toKelkoo)`,

  bellelli: `Also available in →
linked pages, catalogue untouched
JSON-LD · mobile
Merchant Center: 392 products × 3 languages`,

  "8fly": `660 in stock → first
home + 16 departments · IT/EN · 60/160
JSON-LD: Product · OnlineStore
preview → boards → template`,

  sanires: `titles · metadata · JSON-LD
texts for Google
speed · accessibility
privacy and cookies: iubenda`,

  ghigomiranda: `feed → Google Shopping
products approved again
restyling · phone · tablet
shipping by province`,

  osservatorio: `# 90 ministry reports, 2016–2025
for pdf in reports:
    series += read_tables(pdfplumber.open(pdf), "MSNA")
archive = merge(anac_2015_2025)   # 18,058 contracts
direct = archive[archive.procedure == "direct"]`,

  livellozero: `// the client writes, the site publishes
saveArticle({ title, section, body, images })
publish("/articles/" + slug)
// public site | admin panel`,

  futuraauthor: `agent: copywriter
source: Search Console
tone: the client's own
review: human, always`,

  beautybroker: `22+ end-to-end scenarios
OTP · invites · IBAN · referral · checkout
502 · 409 · silent duplicate invites
regression testing after every fix`,

  ndnluxury: `Search Console: the namesake competitor
Lighthouse 100 · accessibility, SEO
JSON-LD, FAQ
related by score`,

  esh: `every figure to its source
IT · EN · ES
city-by-city plans
Next.js, Neon, Vercel`,

  blog: `editorial line · article plan
SEO and GEO: Search Console, DataForSEO
table of contents → section, smooth scroll
articles inside the shop`,

  allstudios: `nine pages rewritten
vocabulary: Canvas, Node, Troupe
listing = copy of the project
credits held, then confirmed`,

  jointoyou: `WordPress, from scratch
articles
data upload and cleaning`,

  copystudio: `interview → tone → audience
→ positioning → copy`,

  hetaweb: `title, lead, H2, meta description
thirty newsrooms, a tone for each`,
};

const es: Frammenti = {
  shop: `// checkout — reglas entre pago y envío
if (total < 500) ocultar(ENVIO_GRATUITO)
if (envio === ENVIO_GRATUITO) mostrarSolo(TRANSFERENCIA)
if (fueraUE(cliente)) avisar(mensajes[idioma].fueraUE)
// feed: solo productos con stock > 0
feed = productos.filter(p => p.stock > 0).map(paraKelkoo)`,

  bellelli: `Disponible también en →
fichas enlazadas, catálogo intacto
JSON-LD · móvil
Merchant Center: 392 productos × 3 idiomas`,

  "8fly": `660 disponibles → arriba
home + 16 secciones · IT/EN · 60/160
JSON-LD: Product · OnlineStore
vista previa → láminas → plantilla`,

  sanires: `títulos · metadatos · JSON-LD
textos para Google
velocidad · accesibilidad
privacidad y cookies: iubenda`,

  ghigomiranda: `feed → Google Shopping
productos aprobados de nuevo
rediseño · móvil · tablet
envíos por provincia`,

  osservatorio: `# 90 informes ministeriales, 2016–2025
for pdf in informes:
    series += leer_tablas(pdfplumber.open(pdf), "MSNA")
archivo = unir(anac_2015_2025)   # 18.058 contratos
directos = archivo[archivo.procedimiento == "directo"]`,

  livellozero: `// el cliente escribe, el sitio publica
guardarArticulo({ titulo, seccion, cuerpo, imagenes })
publicar("/articulos/" + slug)
// sitio público | panel de administración`,

  futuraauthor: `agente: redactor
fuente: Search Console
tono: el del cliente
revisión: humana, siempre`,

  beautybroker: `22+ escenarios end-to-end
OTP · invitaciones · IBAN · referral · checkout
502 · 409 · invitaciones duplicadas silenciosas
regression testing tras cada corrección`,

  ndnluxury: `Search Console: el competidor homónimo
Lighthouse 100 · accesibilidad, SEO
JSON-LD, FAQ
relacionados por puntuación`,

  esh: `cada dato a su fuente
IT · EN · ES
planes por ciudad
Next.js, Neon, Vercel`,

  blog: `línea editorial · plan de artículos
SEO y GEO: Search Console, DataForSEO
índice → sección, desplazamiento suave
artículos dentro de la tienda`,

  allstudios: `nueve páginas reescritas
vocabulario: Canvas, Node, Troupe
anuncio = copia del proyecto
créditos reservados, luego confirmados`,

  jointoyou: `WordPress, desde cero
artículos
carga y limpieza de datos`,

  copystudio: `entrevista → tono → público
→ posicionamiento → texto`,

  hetaweb: `título, entradilla, H2, meta description
treinta redacciones, un tono para cada una`,
};

export const frammenti: Record<"it" | "en" | "es", Frammenti> = { it, en, es };
