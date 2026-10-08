/**
 * Il testo dietro ogni lavoro: compare in filigrana sopra la carta
 * e si schiarisce quando ci si avvicina.
 * Dove c'è codice è una sintesi della logica reale, non una copia;
 * dove non c'è, è una nota di lavoro. Niente chiavi, token o indirizzi interni.
 */
export const frammenti: Record<string, string> = {
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

  futura: `agente: redattore
fonte: Search Console
tono: quello del cliente
revisione: umana, sempre`,

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

  jointoyou: `blog
articoli`,

  copystudio: `intervista → tono → pubblico
→ posizionamento → testo`,

  hetaweb: `titolo, attacco, H2, meta description
trenta redazioni, un tono ciascuna`,
};
