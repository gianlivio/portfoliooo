# Portfolio — ristrutturazione contenuti

Repo: `~/Desktop/digital nomad/portfoliooo` · branch `main`
Nessuna modifica al sistema visivo: si cambiano i JSON dei dizionari e due righe in `WorkSlider.tsx`.

---

## 1. `hero.desc` — dictionaries/{it,en,es}.json

`hero.title` e `hero.sub` restano invariati.

**it.json**
```json
"desc": "Sviluppo piattaforme web, integro API, lavoro sui dati e sui contenuti. E-commerce, automazione, SEO/GEO. Laurea magistrale in semiotica — approccio analitico applicato alla struttura del codice e delle interfacce. Da remoto, in italiano, inglese e spagnolo."
```

**en.json**
```json
"desc": "I build web platforms, integrate APIs, and work with data and content. E-commerce, automation, SEO/GEO. Master's degree in semiotics — an analytical approach applied to the structure of code and interfaces. Remote, in Italian, English and Spanish."
```

**es.json**
```json
"desc": "Desarrollo plataformas web, integro API, trabajo con datos y contenidos. E-commerce, automatización, SEO/GEO. Máster en semiótica — enfoque analítico aplicado a la estructura del código y de las interfaces. En remoto, en italiano, inglés y español."
```

---

## 2. `stats` — dictionaries/{it,en,es}.json

Il blocco oggi espone il catalogo di un ex committente come cifra identitaria. Si sposta su un dato tuo, di un progetto autodiretto e verificabile.

**it.json**
```json
"stats": {
  "units": "RECORD PUBBLICI",
  "desc": "Archivio ANAC 2015-2025 sui contratti per l'accoglienza migranti. Tre dataset uniti ed elaborati in Python, pubblicati su osservatorioaccoglienza.org."
}
```

**en.json**
```json
"stats": {
  "units": "PUBLIC RECORDS",
  "desc": "ANAC archive 2015-2025 on migrant reception contracts. Three datasets merged and processed in Python, published on osservatorioaccoglienza.org."
}
```

**es.json**
```json
"stats": {
  "units": "REGISTROS PÚBLICOS",
  "desc": "Archivo ANAC 2015-2025 sobre los contratos de acogida de migrantes. Tres conjuntos de datos unidos y procesados en Python, publicados en osservatorioaccoglienza.org."
}
```

> **Da verificare prima di applicare:** la cifra grande (`51.240`) non è in `stats` nei dizionari — deve essere hardcoded in `WorkSlider.tsx`. Va trovata e sostituita con `18.000`. Vedi §6.

---

## 3. `cta.filesize`

I nuovi PDF pesano 65-67 KB contro i ~290 KB dei precedenti. Nei tre file sostituire `290KB` con `65KB` **mantenendo il resto della stringa invariato** (non conosco il formato esatto: potrebbe essere `~290KB` o `~290KB · PDF`).

---

## 4. `automations.items[]` — da 14 a 12 voci

Struttura nuova: 3 Osservatorio Accoglienza + 3 Futura Blog + 6 Punto Luce.
**L'ordine e la lunghezza dell'array devono essere identici nei tre file.**

**Escono** (buon lavoro, ma dettaglio interno di un cliente solo): Segmentazione clienti B2B/B2C · KPI logistica · Social login OAuth 2.0 · Feed Kelkoo e Trovaprezzi · Dark mode · Ricerca prodotti con filtri server-side.

**Restano invariate** (copiare la `desc` già presente in ciascuna lingua, nessuna riscrittura): Template e-commerce Open2B · Validazione fiscale europea · Ottimizzazione performance · Gestione 20+ integrazioni attive.

### Ordine finale

| # | it.json | en.json | es.json |
|---|---|---|---|
| 1 | Pipeline dati ANAC — 18.000 record | ANAC data pipeline — 18,000 records | Pipeline de datos ANAC — 18.000 registros |
| 2 | Parser di 90 PDF ministeriali | Parser for 90 ministerial PDFs | Parser de 90 PDF ministeriales |
| 3 | Sito statico e automazione | Static site and automation | Sitio estático y automatización |
| 4 | Piattaforma editoriale Futura Blog | Futura Blog editorial platform | Plataforma editorial Futura Blog |
| 5 | Agenti AI per la redazione | AI agents for the newsroom | Agentes de IA para la redacción |
| 6 | SEO/GEO e piani editoriali | SEO/GEO and editorial planning | SEO/GEO y planes editoriales |
| 7 | Template e-commerce Open2B | *(esistente)* | *(esistente)* |
| 8 | Gestione 20+ integrazioni attive | *(esistente)* | *(esistente)* |
| 9 | Sincronizzazione Open2B ↔ Brevo | Open2B ↔ Brevo synchronisation | Sincronización Open2B ↔ Brevo |
| 10 | Validazione fiscale europea | *(esistente)* | *(esistente)* |
| 11 | Tracking GA4 / GTM e GDPR | GA4 / GTM tracking and GDPR | Tracking GA4 / GTM y GDPR |
| 12 | Ottimizzazione performance | *(esistente)* | *(esistente)* |

### Testi nuovi — it.json

```json
{ "title": "Pipeline dati ANAC — 18.000 record", "desc": "Ingestione di tre dataset pubblici ANAC in Python: download mensili, normalizzazione, filtro a due livelli con indice di confidenza. Archivio 2015-2025 su 18.000 righe, versionato nel repo." },
{ "title": "Parser di 90 PDF ministeriali", "desc": "Estrazione con pdfplumber delle serie sui minori stranieri non accompagnati dai report del Ministero: 84 report mensili dal 2016 al 2022, più i semestrali fino al 2025. Limiti della fonte dichiarati nella pagina di metodologia." },
{ "title": "Sito statico e automazione", "desc": "Next.js/TypeScript su Vercel, CSS a variabili scritto a mano, nessun framework UI. Workflow GitHub Actions per il promemoria mensile di aggiornamento dati. SEO tecnica e structured data. Codice e dati open source." },
{ "title": "Piattaforma editoriale Futura Blog", "desc": "Sviluppo in Next.js/TypeScript con Supabase: architettura, deploy, iterazione continua su funzionalità e UX. Progetto costruito in due, dalla definizione del prodotto al lancio." },
{ "title": "Agenti AI per la redazione", "desc": "Scrittura e messa a punto dei prompt per gli agenti che generano e revisionano i contenuti. Calibrazione del tono di voce per ciascun cliente, revisione umana su ogni articolo pubblicato." },
{ "title": "SEO/GEO e piani editoriali", "desc": "Analisi Google Search Console, piani editoriali mensili, ottimizzazione per motori di ricerca e risposte generative. Due clienti attivi: edilizia e alloggi per studenti." },
{ "title": "Sincronizzazione Open2B ↔ Brevo", "desc": "Flusso bidirezionale tra gestionale e piattaforma email: 58.000 contatti con segmentazione automatica B2B/B2C e 23.550 prodotti verso Brevo eCommerce. Batch da 100 SKU, webhook real-time, gestione del rate limiting 429." },
{ "title": "Tracking GA4 / GTM e GDPR", "desc": "Eventi e-commerce GA4 completi, Facebook Pixel con url_passthrough, Microsoft UET. Layer di consenso Cookiebot e Consent Mode v2, blocco dei cookie prima del consenso, audit trail su tutti i tag attivi." }
```

### Testi nuovi — en.json

```json
{ "title": "ANAC data pipeline — 18,000 records", "desc": "Ingestion of three public ANAC datasets in Python: monthly downloads, normalisation, two-level filtering with a confidence index. Archive spanning 2015-2025, 18,000 rows, versioned in the repo." },
{ "title": "Parser for 90 ministerial PDFs", "desc": "pdfplumber extraction of the series on unaccompanied foreign minors from ministry reports: 84 monthly reports from 2016 to 2022, plus half-yearly reports up to 2025. Source limitations stated on the methodology page." },
{ "title": "Static site and automation", "desc": "Next.js/TypeScript on Vercel, hand-written CSS with variables, no UI framework. GitHub Actions workflow for the monthly data-update reminder. Technical SEO and structured data. Code and data open source." },
{ "title": "Futura Blog editorial platform", "desc": "Development in Next.js/TypeScript with Supabase: architecture, deployment, continuous iteration on features and UX. Built by two people, from product definition to launch." },
{ "title": "AI agents for the newsroom", "desc": "Writing and tuning the prompts for the agents that generate and review content. Tone-of-voice calibration for each client, human review on every published article." },
{ "title": "SEO/GEO and editorial planning", "desc": "Google Search Console analysis, monthly editorial plans, optimisation for search engines and generative answers. Two active clients: construction and student housing." },
{ "title": "Open2B ↔ Brevo synchronisation", "desc": "Two-way flow between the management system and the email platform: 58,000 contacts with automatic B2B/B2C segmentation and 23,550 products pushed to Brevo eCommerce. Batches of 100 SKUs, real-time webhooks, 429 rate-limit handling." },
{ "title": "GA4 / GTM tracking and GDPR", "desc": "Full GA4 e-commerce events, Facebook Pixel with url_passthrough, Microsoft UET. Cookiebot consent layer and Consent Mode v2, cookies blocked before consent, audit trail across all active tags." }
```

### Testi nuovi — es.json

```json
{ "title": "Pipeline de datos ANAC — 18.000 registros", "desc": "Ingesta de tres conjuntos de datos públicos de ANAC en Python: descargas mensuales, normalización, filtrado en dos niveles con índice de confianza. Archivo 2015-2025, 18.000 filas, versionado en el repositorio." },
{ "title": "Parser de 90 PDF ministeriales", "desc": "Extracción con pdfplumber de las series sobre menores extranjeros no acompañados a partir de los informes del Ministerio: 84 informes mensuales de 2016 a 2022, más los semestrales hasta 2025. Límites de la fuente declarados en la página de metodología." },
{ "title": "Sitio estático y automatización", "desc": "Next.js/TypeScript en Vercel, CSS a mano con variables, sin framework de UI. Workflow de GitHub Actions para el recordatorio mensual de actualización de datos. SEO técnico y datos estructurados. Código y datos de código abierto." },
{ "title": "Plataforma editorial Futura Blog", "desc": "Desarrollo en Next.js/TypeScript con Supabase: arquitectura, despliegue, iteración continua sobre funcionalidades y UX. Construida entre dos personas, desde la definición del producto hasta el lanzamiento." },
{ "title": "Agentes de IA para la redacción", "desc": "Redacción y ajuste de los prompts para los agentes que generan y revisan los contenidos. Calibración del tono de voz para cada cliente, revisión humana en cada artículo publicado." },
{ "title": "SEO/GEO y planes editoriales", "desc": "Análisis de Google Search Console, planes editoriales mensuales, optimización para motores de búsqueda y respuestas generativas. Dos clientes activos: construcción y alojamiento para estudiantes." },
{ "title": "Sincronización Open2B ↔ Brevo", "desc": "Flujo bidireccional entre el gestor y la plataforma de email: 58.000 contactos con segmentación automática B2B/B2C y 23.550 productos hacia Brevo eCommerce. Lotes de 100 SKU, webhooks en tiempo real, gestión del rate limiting 429." },
{ "title": "Tracking GA4 / GTM y GDPR", "desc": "Eventos de e-commerce GA4 completos, Facebook Pixel con url_passthrough, Microsoft UET. Capa de consentimiento Cookiebot y Consent Mode v2, bloqueo de cookies antes del consentimiento, audit trail en todas las etiquetas activas." }
```

---

## 5. `timeline.items[]` — voce Futura Blog

Sostituire la voce 2026 esistente. Le altre sette restano.

**it.json**
```json
{
  "year": "2026",
  "role": "FULL STACK DEVELOPER · EDITORE · SEO/GEO",
  "company": "Futura Blog",
  "location": "Remoto",
  "highlights": [
    "Sviluppo della piattaforma in Next.js/TypeScript",
    "Prompt per gli agenti AI che generano i contenuti",
    "Revisione editoriale, calibrazione del tono di voce, ottimizzazione SEO/GEO",
    "Piani editoriali e analisi Google Search Console",
    "Due clienti attivi: NDN Luxury (edilizia) ed ESH Housing (alloggi per studenti Erasmus)"
  ]
}
```

**en.json**
```json
{
  "year": "2026",
  "role": "FULL STACK DEVELOPER · EDITOR · SEO/GEO",
  "company": "Futura Blog",
  "location": "Remote",
  "highlights": [
    "Platform development in Next.js/TypeScript",
    "Prompts for the AI agents that generate content",
    "Editorial review, tone-of-voice calibration, SEO/GEO optimisation",
    "Editorial plans and Google Search Console analysis",
    "Two active clients: NDN Luxury (construction) and ESH Housing (housing for Erasmus students)"
  ]
}
```

**es.json**
```json
{
  "year": "2026",
  "role": "FULL STACK DEVELOPER · EDITOR · SEO/GEO",
  "company": "Futura Blog",
  "location": "Remoto",
  "highlights": [
    "Desarrollo de la plataforma en Next.js/TypeScript",
    "Prompts para los agentes de IA que generan los contenidos",
    "Revisión editorial, calibración del tono de voz, optimización SEO/GEO",
    "Planes editoriales y análisis de Google Search Console",
    "Dos clientes activos: NDN Luxury (construcción) y ESH Housing (alojamiento para estudiantes Erasmus)"
  ]
}
```

---

## 6. Modifiche a `components/WorkSlider.tsx`

Le stringhe qui sotto sono hardcoded e condivise dalle tre lingue: vanno tenute in termini che funzionano in IT/EN/ES senza traduzione.

**Riga 12 — marquee.** Oggi mette "51.240 SKU" al centro dell'identità.
```js
const MARQUEE = "FULL STACK · DATA · E-COMMERCE · AI · SEO/GEO · API · AUTOMATION ·  ";
```

**Righe 432-433 — link esterni.** Oggi puntano entrambi a Punto Luce.
```js
{ label: "SHOP", sub: "shop.puntoluce.net", href: "https://shop.puntoluce.net/" },
{ label: "OSSERVATORIO", sub: "osservatorioaccoglienza.org", href: "https://osservatorioaccoglienza.org/" },
{ label: "GITHUB", sub: "github.com/gianlivio", href: "https://github.com/gianlivio/osservatorio-accoglienza" },
```
Il link al blog `puntoluce.net/comefare` esce: è contenuto scritto per un committente, non un tuo progetto. Se lo vuoi tenere come prova di lavoro editoriale, va aggiunto come quarta voce — da verificare che il layout regga quattro link invece di due.

**Cifra grande della sezione stats.** Non è nei dizionari: va cercata in `WorkSlider.tsx` (probabilmente `51.240` o `51240` come stringa o come target di un contatore animato) e portata a `18.000`. Se è un contatore numerico, il valore va cambiato a `18000` e va controllato il formato di stampa (separatore delle migliaia: `18.000` in IT/ES, `18,000` in EN — oggi la cifra non è localizzata, quindi si sceglie un formato unico).

---

## 7. Punti aperti, non risolti qui

1. **`automations.title` / `automations.subtitle` sono chiavi morte:** esistono nei dizionari ma `page.tsx` non le passa a `WorkSlider`, che non renderizza alcun titolo di sezione. Due strade: cablarle (modifica a `page.tsx` + `WorkSlider`, la sezione acquista un titolo — utile ora che non è più solo "automazioni") oppure rimuoverle dai tre JSON. Non decisa: dipende da quanto vuoi toccare i componenti.
2. **`DownloadTerminal` in `DownloadCV.tsx`** è definito ma mai renderizzato, con la logica di download duplicata rispetto a `handleDownload`. Codice morto probabile. Da valutare in un intervento separato, non mescolarlo a questo.
3. **README desueto:** dichiara i18n IT/EN, le lingue sono tre. Riga da correggere.
