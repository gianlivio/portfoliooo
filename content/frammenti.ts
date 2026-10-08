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

  osservatorio: `# 90 report ministeriali, 2016–2025
for pdf in report:
    serie += leggi_tabelle(pdfplumber.open(pdf), "MSNA")
archivio = unisci(anac_2015_2025)   # 18.104 contratti
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

  ndnluxury: `pagine nuove
resina, microcemento
animazioni 3D
manutenzione`,

  esh: `alloggi, città, date
pagine nuove
manutenzione`,

  blog: `WordPress
indice → sezione, scorrimento dolce
articoli dentro lo shop`,

  allstudios: `struttura del sito e dell'app
pagine, sezioni, contenuti
copy
test prima del lancio`,

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

  osservatorio: `# 90 ministry reports, 2016–2025
for pdf in reports:
    series += read_tables(pdfplumber.open(pdf), "MSNA")
archive = merge(anac_2015_2025)   # 18,104 contracts
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

  ndnluxury: `new pages
resin, microcement
3D animation
maintenance`,

  esh: `homes, cities, dates
new pages
maintenance`,

  blog: `WordPress
table of contents → section, smooth scroll
articles inside the shop`,

  allstudios: `site and app structure
pages, sections, content
copy
testing before launch`,

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

  osservatorio: `# 90 informes ministeriales, 2016–2025
for pdf in informes:
    series += leer_tablas(pdfplumber.open(pdf), "MSNA")
archivo = unir(anac_2015_2025)   # 18.104 contratos
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

  ndnluxury: `páginas nuevas
resina, microcemento
animación 3D
mantenimiento`,

  esh: `alojamientos, ciudades, fechas
páginas nuevas
mantenimiento`,

  blog: `WordPress
índice → sección, desplazamiento suave
artículos dentro de la tienda`,

  allstudios: `estructura del sitio y de la app
páginas, secciones, contenidos
copy
pruebas antes del lanzamiento`,

  jointoyou: `WordPress, desde cero
artículos
carga y limpieza de datos`,

  copystudio: `entrevista → tono → público
→ posicionamiento → texto`,

  hetaweb: `título, entradilla, H2, meta description
treinta redacciones, un tono para cada una`,
};

export const frammenti: Record<"it" | "en" | "es", Frammenti> = { it, en, es };
