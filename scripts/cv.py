#!/usr/bin/env python3
"""
Il curriculum in tre lingue, da HTML a PDF con WeasyPrint (font Inter installato nel sistema).

    pip install weasyprint
    python3 scripts/cv.py            # scrive public/cv/GianlivioIemolo_CV_{IT,EN,ES}.pdf
"""
import html
import os
import sys

from weasyprint import HTML

QUI = os.path.dirname(os.path.abspath(__file__))
USCITA = os.path.join(QUI, "..", "public", "cv")

CSS = """
@page { size: A4; margin: 34pt 36.85pt 34pt;
  @bottom-right { content: counter(page) " / " counter(pages); font: 7pt Inter; color: #8A8B85; } }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Inter; color: #16171A; font-size: 8.1pt; line-height: 1.333; }
header { border-bottom: 1.2pt solid #16171A; padding-bottom: 7.5pt; margin-bottom: 8.7pt; }
h1 { font-size: 19pt; font-weight: 700; letter-spacing: .04em; line-height: 1.33; }
.titolo { font-size: 10pt; color: #1B3FD1; margin-top: 2.2pt; }
h2 { font-size: 7.6pt; font-weight: 700; color: #1B3FD1; text-transform: uppercase; letter-spacing: .12em;
  line-height: 1.2; padding-bottom: 3pt; border-bottom: .6pt solid #E2E0D8; margin-bottom: 4pt; }
aside { float: left; width: 151.2pt; font-size: 7.6pt; line-height: 1.33; }
aside section { margin-bottom: 12.8pt; }
.elenco { line-height: 1.6; margin-bottom: -3.3pt; }
aside dt { font-weight: 600; margin-top: 3.9pt; }
aside dt:first-child { margin-top: 0; }
aside dd { margin-top: 2pt; }
main { margin-left: 169.5pt; }
main h2 { margin-bottom: 4.6pt; }
main section { margin-bottom: 10.5pt; }
main > section > p { margin-bottom: 4pt; }
b { font-weight: 600; }
.voce { margin-bottom: 5.5pt; page-break-inside: avoid; }
.voce h3 { font-size: 8.8pt; font-weight: 700; line-height: 1.3; }
.meta { font-size: 7.6pt; color: #77786F; margin: 1.2pt 0 2pt; }
.voce ul { list-style: none; margin-top: 2pt; }
.voce li { padding-left: 10pt; text-indent: -6.8pt; margin-top: 1.5pt; }
.voce li::before { content: "•"; display: inline-block; width: 6.8pt; text-indent: 0; }
.voce.breve { margin-bottom: 4.2pt; }
"""


def e(s):
    """Il testo con **grassetto** in HTML."""
    s = html.escape(s, quote=False)
    parti = s.split("**")
    return "".join(f"<b>{p}</b>" if i % 2 else p for i, p in enumerate(parti))


def voce(v, breve=False):
    out = ['<div class="voce%s">' % (" breve" if breve else "")]
    out.append(f"<h3>{e(v['titolo'])}</h3>")
    out.append(f'<p class="meta">{e(v["meta"])}</p>')
    if v.get("testo"):
        out.append(f"<p>{e(v['testo'])}</p>")
    if v.get("punti"):
        out.append("<ul>" + "".join(f"<li>{e(p)}</li>" for p in v["punti"]) + "</ul>")
    out.append("</div>")
    return "".join(out)


def pagina(d):
    a = d["lato"]
    lato = [f"<section><h2>{a['contatti']}</h2>"]
    lato.append('<p class="elenco">' + "<br>".join(e(x) for x in a["recapiti"] + a["link"]) + "</p></section>")
    lato.append(f"<section><h2>{a['lingue']}</h2><p class=\"elenco\">" + "<br>".join(e(x) for x in a["idiomi"]) + "</p></section>")
    lato.append("<section><h2>Stack</h2><dl>" + "".join(f"<dt>{e(k)}</dt><dd>{e(v)}</dd>" for k, v in a["stack"]) + "</dl></section>")

    corpo = [f"<section><h2>{d['profilo'][0]}</h2>" + "".join(f"<p>{e(p)}</p>" for p in d["profilo"][1:]) + "</section>"]
    for i, (titolo, voci) in enumerate(d["sezioni"]):
        breve = i == len(d["sezioni"]) - 1  # la formazione: voci più fitte
        corpo.append(f"<section><h2>{titolo}</h2>" + "".join(voce(v, breve) for v in voci) + "</section>")

    return f"""<!doctype html><html lang="{d['lang']}"><head><meta charset="utf-8"><title>Gianlivio Iemolo — CV</title>
<style>{CSS}</style></head><body>
<header><h1>GIANLIVIO IEMOLO</h1><p class="titolo">Full Stack Web Developer · Freelance</p></header>
<aside>{''.join(lato)}</aside><main>{''.join(corpo)}</main></body></html>"""


STACK = {
    "it": ["Linguaggi", "Front-end", "Back-end / Dati", "Integrazioni", "Tracciamento / SEO", "Piattaforme", "Tooling", "AI"],
    "en": ["Languages", "Front-end", "Back-end / Data", "Integrations", "Tracking / SEO", "Platforms", "Tooling", "AI"],
    "es": ["Lenguajes", "Front-end", "Back-end / Datos", "Integraciones", "Seguimiento / SEO", "Plataformas", "Herramientas", "IA"],
}
STACK_VALORI = [
    "JavaScript ES6+ · TypeScript · PHP · SQL · Python",
    "HTML5 · CSS3 · SASS · Tailwind · Bootstrap · Twig · React · Next.js · Vue.js · jQuery",
    "Node.js · Laravel · MySQL · Supabase · Prisma · NeonDB · pdfplumber",
    "REST API · Webhook · cURL · OAuth 2.0 · SSE · Cron Job",
    "GTM · GA4 · Consent Mode v2 · Cookiebot · Schema.org/JSON-LD · Lighthouse · GSC",
    "Open2B/Scriggo · WordPress · Shopify · Doofinder · Brevo · Feedaty · Vercel · GitHub Actions",
    "Git · Postman · Figma · Cloudflare · Plesk · phpMyAdmin",
    "OpenAI API · Claude API · Prompt Engineering",
]
RECAPITI = ["gianlivioiemolo@gmail.com", "+39 331 946 2396"]
LINK = ["linkedin.com/in/gianlivio-iemolo", "github.com/gianlivio", "gianlivioiemolo.com"]
OSSERVATORIO_META = "2026 · osservatorioaccoglienza.org · github.com/gianlivio/osservatorio-accoglienza"

IT = {
    "lang": "it",
    "lato": {
        "contatti": "Contatti", "lingue": "Lingue",
        "recapiti": RECAPITI + ["Italia · lavoro da remoto"], "link": LINK,
        "idiomi": ["Italiano — madrelingua", "Inglese — B2", "Spagnolo — B2"],
        "stack": list(zip(STACK["it"], STACK_VALORI)),
    },
    "profilo": [
        "Profilo",
        "Sviluppatore full stack freelance con partita IVA. Lavoro da remoto per aziende e professionisti su e-commerce, siti e applicazioni web: sviluppo da zero, manutenzione, integrazioni con servizi esterni, tracciamento e SEO tecnica.",
        "Su Open2B/Scriggo ho costruito da zero il tema di **shop.puntoluce.net**, e-commerce di materiale elettrico da circa 20.000 € di fatturato al giorno, e per quasi due anni ne ho curato checkout, integrazioni e applicazioni interne. Per i progetti nuovi lavoro in Next.js e TypeScript.",
        "La formazione in filosofia e semiotica all'Università di Bologna mi porta a occuparmi anche dei testi: copy, struttura dei contenuti, SEO editoriale.",
    ],
    "sezioni": [
        ("Esperienza e-commerce", [
            {"titolo": "Punto Luce / EDIF — full stack developer",
             "meta": "ott 2024 – giu 2026 · Sasso Marconi (BO) · dipendente, tempo indeterminato",
             "testo": "Sviluppo e manutenzione di **shop.puntoluce.net**, e-commerce B2B/B2C di materiale elettrico e termoidraulico su Open2B, multilingua (IT/EN/ES/FR).",
             "punti": [
                 "Nuovo tema costruito da zero su Open2B/Scriggo: home, liste e schede prodotto, carrello, checkout in tre fasi, area cliente; mobile-first, dark mode, filtri dinamici",
                 "Checkout con regole condizionali fra pagamenti e spedizioni (soglia di spedizione gratuita, paesi extra-UE, fatturazione privati/aziende), autocompletamento CAP su 8.000 comuni",
                 "15+ applicazioni PHP sulle API Open2B: feed prodotti per Trovaprezzi e Kelkoo (Italia, Francia), assegnazione automatica di 50.000 clienti ai gruppi fiscali, archiviazione delle ricevute via cron, controllo dei codici fornitore duplicati su 25.000 prodotti, estrazione di 60.000 ordini, descrizioni prodotto generate con l'API OpenAI",
                 "20+ integrazioni REST/webhook: Brevo (sincronizzazione di 58.000 contatti e 23.550 prodotti, webhook in tempo reale), Feedaty con rich snippet Schema.org, Doofinder, DocFinance, Facebook Graph API, Google Identity Services",
                 "Tracciamento via GTM: GA4 e-commerce, Meta Pixel, Microsoft UET con enhanced conversions, Clarity; Cookiebot e Consent Mode v2 per la conformità GDPR",
                 "Validazione P.IVA (Cerved + VIES) su 28 paesi UE",
                 "Performance: LCP da 12 s a 4 s, TBT −40%, CSS ridotto da 15.000 a 10.000 righe; audit di accessibilità WAVE/axe",
             ]},
        ]),
        ("Lavori per clienti (freelance)", [
            {"titolo": "Bellelli Linea Ufficio — web developer",
             "meta": "ott 2026 – in corso · bellelliufficio.it",
             "testo": "E-commerce Open2B di sedie, sgabelli, tavoli e poltrone di design, in italiano, francese e tedesco.",
             "punti": [
                 "Collegamento fra le schede di prodotti affini («Disponibile anche in») senza modifiche al catalogo",
                 "Dati strutturati Schema.org/JSON-LD, revisione della versione mobile, nuovi blocchi in home",
                 "Google Merchant Center: categorie Google per 392 prodotti in tre lingue, controllo dei dati del feed per le campagne Shopping",
             ]},
            {"titolo": "8FLY — web developer, SEO e GEO",
             "meta": "nov 2026 – in corso · 8fly.it",
             "testo": "E-commerce Open2B (template 2018) di aeromodellismo dinamico: circa 1.300 prodotti in oltre 200 reparti.",
             "punti": [
                 "Prodotti disponibili in vista: 660 schede riordinate con un'importazione Excel, 129 reparti ordinati per posizione",
                 "SEO e GEO su Home e 16 reparti in italiano e inglese, scritti su suggerimenti di Google, Trends e concorrenti; JSON-LD Product e OnlineStore, test dei risultati avanzati superato",
                 "Rinnovo grafico: anteprima sulle pagine vere e tavole prima/dopo prima di toccare il template; nuova testata, pagine a tutta larghezza, griglia responsive, scheda prodotto con disponibilità da magazzino; collaudo su computer, tablet e telefono",
             ]},
            {"titolo": "Maxit Abbigliamento — web developer",
             "meta": "nov 2026 – in corso · maxitabbigliamento.it",
             "testo": "E-commerce Open2B di abbigliamento, per privati e rivenditori.",
             "punti": [
                 "Analisi del sito e piano di interventi in ordine di priorità",
                 "Checkout: codice fiscale richiesto solo alle aziende, soglia di spedizione gratuita, gestione degli indirizzi di spedizione",
             ]},
            {"titolo": "Ghigo Miranda — web developer",
             "meta": "nov 2026 – in corso · ghigomiranda.it",
             "testo": "Negozio WordPress di un'azienda agricola piemontese, prodotti a base di miele.",
             "punti": [
                 "Feed per Google Shopping e sblocco dei prodotti rifiutati nel Merchant Center",
                 "Restyling del sito, adattamento a telefono e tablet, velocità da mobile",
                 "Correzione delle tariffe di spedizione per provincia",
             ]},
            {"titolo": "Sanires — web developer",
             "meta": "nov 2026 · sanires.com",
             "testo": "E-commerce Open2B di guanti monouso e prodotti per l'igiene professionale.",
             "punti": [
                 "SEO tecnica: titoli, metadati, dati strutturati, testi per Google",
                 "Velocità e accessibilità, rinnovo grafico del layout esistente, privacy e cookie con iubenda",
             ]},
            {"titolo": "ALLSTUDIA (GOAT YOU S.R.L.) — full stack developer, copy e naming",
             "meta": "giu 2026 – in corso · remoto · allstudia.com",
             "testo": "Piattaforma web per produrre contenuti con l'AI: drive condiviso e canvas a nodi, con crediti, piani e marketplace.",
             "punti": [
                 "Integrazione dei modelli OpenAI GPT Image 2.6 nel nodo di generazione immagini (opzioni avanzate, GIF, modifica): costi misurati a token sulle API reali, tabella dei crediti, dashboard admin con costo e margine per voce, test di non regressione su Gemini",
                 "Marketplace dei progetti: schema e migrazioni Prisma/PostgreSQL, revisione admin, acquisto con crediti prenotati e rimborsati se la consegna fallisce, sette email transazionali, test end-to-end",
                 "Media da Cloudflare R2 in un'unica chiamata con cache sul client, nuove regole dei piani (ricarichi, storage, limiti dei team)",
                 "Riscrittura in inglese delle nove pagine del sito e vocabolario di prodotto preso dallo studio cinematografico, con verifica dei nomi già occupati",
             ]},
            {"titolo": "Livello Zero — full stack developer",
             "meta": "giu 2026 – in corso · livellozero.games",
             "testo": "Sito editoriale sui videogiochi, sviluppato da zero.",
             "punti": [
                 "Next.js (App Router) e TypeScript, deploy su Vercel",
                 "CMS su misura: il committente scrive e pubblica gli articoli, carica le immagini e gestisce le sezioni senza competenze tecniche",
                 "Manutenzione continuativa con canone annuale dopo la consegna",
             ]},
            {"titolo": "Futura Blog — full stack developer, editor, copywriter SEO/GEO",
             "meta": "2026 – in corso · remoto",
             "testo": "Piattaforma editoriale con agenti AI, progettata e sviluppata con un collega dall'idea al lancio.",
             "punti": [
                 "Sviluppo della piattaforma in Next.js/TypeScript",
                 "Scrittura dei prompt per gli agenti AI che generano i contenuti",
                 "Revisione editoriale, calibrazione del tono di voce, ottimizzazione SEO/GEO, analisi Google Search Console",
             ]},
            {"titolo": "NDN Luxury — web developer",
             "meta": "2026 · remoto",
             "testo": "Sito di un marchio di rivestimenti in resina e microcemento.",
             "punti": ["Nuove pagine, manutenzione e interventi di miglioramento sul sito esistente", "Animazioni 3D"]},
            {"titolo": "ESH – Erasmus Student Housing — web developer",
             "meta": "2026 · remoto",
             "testo": "Alloggi in affitto per studenti Erasmus.",
             "punti": ["Nuove pagine del sito e manutenzione"]},
            {"titolo": "Beauty Broker World — QA",
             "meta": "feb – apr 2026 · remoto",
             "punti": [
                 "22+ scenari di test end-to-end su flussi critici: OTP, inviti, IBAN, referral, checkout, account",
                 "Issue su GitHub con riproduzione degli errori server (502, 409, inviti duplicati silenti), regression testing dopo ogni fix",
                 "Lavoro con un team distribuito fra Italia, Brasile e USA via branch, PR e code review",
             ]},
            {"titolo": "Copystudio — copywriting e brand identity",
             "meta": "nov 2023 – lug 2024",
             "punti": [
                 "Copy e identità di brand per siti aziendali, incluse realtà con appalti pubblici in ambito sanitario",
                 "Interviste con la committenza per definire tono di voce, target e posizionamento prima della scrittura",
             ]},
            {"titolo": "Hetaweb — SEO copywriter",
             "meta": "mag – nov 2023 · Lucca",
             "punti": [
                 "Gestione editoriale dei blog di 30+ realtà, tra cui la Nazionale Italiana Rugby",
                 "Scrittura e ottimizzazione di articoli SEO, analisi delle performance su Google Search Console",
             ]},
        ]),
        ("Progetto personale", [
            {"titolo": "Osservatorio Accoglienza — open source",
             "meta": OSSERVATORIO_META,
             "testo": "Archivio pubblico sui contratti per l'accoglienza dei migranti in Italia, costruito da zero.",
             "punti": [
                 "Ingestione e pulizia in Python di 18.000 record da tre dataset ANAC",
                 "Parser di 90 PDF ministeriali con pdfplumber per i dati sui minori stranieri non accompagnati",
                 "Sito statico in Next.js/TypeScript su Vercel, aggiornamento dei dati automatizzato con GitHub Actions, SEO tecnica e structured data",
             ]},
        ]),
        ("Formazione", [
            {"titolo": "Laurea Magistrale in Semiotica", "meta": "Università di Bologna · 2020"},
            {"titolo": "Laurea Triennale in Filosofia", "meta": "Università di Bologna · 2017"},
            {"titolo": "Erasmus+", "meta": "Universidad de Granada · 2019"},
            {"titolo": "Master Full Stack Developer", "meta": "Boolean · feb – lug 2024 · 700 ore",
             "punti": [
                 "JavaScript, PHP, Laravel, Vue.js, MySQL, Git, REST API",
                 "Progetti: clone di WhatsApp in Vue.js con API Laravel, dashboard gestionale per appartamenti (CRUD, Bootstrap + SCSS), travel app multi-step in Laravel e jQuery",
             ]},
            {"titolo": "Certificazione Google Analytics", "meta": "Google Skillshop · 2025"},
            {"titolo": "Digital Copywriting", "meta": "corso · 2022"},
        ]),
    ],
}

EN = {
    "lang": "en",
    "lato": {
        "contatti": "Contact", "lingue": "Languages",
        "recapiti": RECAPITI + ["Based in Italy · working remotely"], "link": LINK,
        "idiomi": ["Italian — native", "English — B2", "Spanish — B2"],
        "stack": list(zip(STACK["en"], STACK_VALORI)),
    },
    "profilo": [
        "Profile",
        "Freelance full stack developer, registered as self-employed in Italy (P.IVA). I work remotely for companies and professionals on e-commerce, websites and web applications: builds from scratch, maintenance, third-party integrations, tracking and technical SEO.",
        "On Open2B/Scriggo I built from scratch the theme of **shop.puntoluce.net**, an electrical supplies e-commerce turning over around €20,000 a day, and for almost two years I looked after its checkout, integrations and internal applications. For new projects I work in Next.js and TypeScript.",
        "My background in philosophy and semiotics at the University of Bologna means I also handle the text: copy, content structure, editorial SEO.",
    ],
    "sezioni": [
        ("E-commerce experience", [
            {"titolo": "Punto Luce / EDIF — full stack developer",
             "meta": "Oct 2024 – Jun 2026 · Sasso Marconi (BO) · employee, permanent contract",
             "testo": "Development and maintenance of **shop.puntoluce.net**, a B2B/B2C e-commerce for electrical and plumbing/HVAC supplies on Open2B, in four languages (IT/EN/ES/FR).",
             "punti": [
                 "New theme built from scratch on Open2B/Scriggo: home, product lists and pages, cart, three-step checkout, customer area; mobile-first, dark mode, dynamic filters",
                 "Checkout with conditional rules between payment and shipping methods (free-shipping threshold, non-EU countries, private/business invoicing), postcode autocomplete across 8,000 municipalities",
                 "15+ PHP applications on the Open2B API: product feeds for Trovaprezzi and Kelkoo (Italy, France), automatic assignment of 50,000 customers to tax groups, cron-based receipt archiving, duplicate supplier-code check across 25,000 products, export of 60,000 orders, product descriptions generated with the OpenAI API",
                 "20+ REST/webhook integrations: Brevo (sync of 58,000 contacts and 23,550 products, real-time webhooks), Feedaty with Schema.org rich snippets, Doofinder, DocFinance, Facebook Graph API, Google Identity Services",
                 "Tracking via GTM: GA4 e-commerce, Meta Pixel, Microsoft UET with enhanced conversions, Clarity; Cookiebot and Consent Mode v2 for GDPR compliance",
                 "VAT number validation (Cerved + VIES) across 28 EU countries",
                 "Performance: LCP from 12 s to 4 s, TBT −40%, CSS cut from 15,000 to 10,000 lines; WAVE/axe accessibility audit",
             ]},
        ]),
        ("Client work (freelance)", [
            {"titolo": "Bellelli Linea Ufficio — web developer",
             "meta": "Oct 2026 – present · bellelliufficio.it",
             "testo": "Open2B e-commerce of design chairs, stools, tables and armchairs, in Italian, French and German.",
             "punti": [
                 "Links between the pages of related products (“Also available in”) with no changes to the catalogue",
                 "Schema.org/JSON-LD structured data, mobile version review, new home page blocks",
                 "Google Merchant Center: Google categories for 392 products in three languages, feed data checks for Shopping campaigns",
             ]},
            {"titolo": "8FLY — web developer, SEO and GEO",
             "meta": "Nov 2026 – present · 8fly.it",
             "testo": "Open2B e-commerce (2018 template) of radio-controlled model aircraft: about 1,300 products in over 200 departments.",
             "punti": [
                 "Products in stock up front: 660 product pages reordered with an Excel import, 129 departments sorted by position",
                 "SEO and GEO for the home page and 16 departments in Italian and English, written on Google suggestions, Trends and competitors; JSON-LD Product and OnlineStore, Rich Results Test passed",
                 "Redesign: a preview on the real pages and before/after boards before touching the template; new header, full-width pages, responsive grid, product page with availability from stock; testing on desktop, tablet and phone",
             ]},
            {"titolo": "Maxit Abbigliamento — web developer",
             "meta": "Nov 2026 – present · maxitabbigliamento.it",
             "testo": "Open2B clothing e-commerce, for consumers and resellers.",
             "punti": [
                 "Site analysis and a plan of interventions in order of priority",
                 "Checkout: tax code required only from businesses, free-shipping threshold, shipping address management",
             ]},
            {"titolo": "Ghigo Miranda — web developer",
             "meta": "Nov 2026 – present · ghigomiranda.it",
             "testo": "WordPress shop of a farm in Piedmont, honey-based products.",
             "punti": [
                 "Google Shopping feed and unblocking of rejected products in Merchant Center",
                 "Site restyling, phone and tablet layout, mobile speed",
                 "Fix of shipping rates by province",
             ]},
            {"titolo": "Sanires — web developer",
             "meta": "Nov 2026 · sanires.com",
             "testo": "Open2B e-commerce of disposable gloves and professional hygiene products.",
             "punti": [
                 "Technical SEO: titles, metadata, structured data, texts for Google",
                 "Speed and accessibility, graphic renewal of the existing layout, privacy and cookies with iubenda",
             ]},
            {"titolo": "ALLSTUDIA (GOAT YOU S.R.L.) — full stack developer, copy and naming",
             "meta": "Jun 2026 – present · remote · allstudia.com",
             "testo": "Web platform for producing AI content: a shared drive and a node-based canvas, with credits, plans and a marketplace.",
             "punti": [
                 "Integrated OpenAI's GPT Image 2.6 models into the image generation node (advanced options, GIFs, editing): per-token costs measured on the real APIs, credit table, admin dashboard with cost and margin per item, regression tests on Gemini",
                 "Project marketplace: Prisma/PostgreSQL schema and migrations, admin review, purchase with credits held and refunded if delivery fails, seven transactional emails, end-to-end tests",
                 "Media from Cloudflare R2 in a single call with client-side caching, new plan rules (top-ups, storage, team limits)",
                 "Rewrote the site's nine pages in English and built a product vocabulary drawn from film studios, checking for names already taken",
             ]},
            {"titolo": "Livello Zero — full stack developer",
             "meta": "Jun 2026 – present · livellozero.games",
             "testo": "Editorial website about video games, built from scratch.",
             "punti": [
                 "Next.js (App Router) and TypeScript, deployed on Vercel",
                 "Custom CMS: the client writes and publishes articles, uploads images and manages sections without technical skills",
                 "Ongoing maintenance on an annual fee after delivery",
             ]},
            {"titolo": "Futura Blog — full stack developer, editor, SEO/GEO copywriter",
             "meta": "2026 – present · remote",
             "testo": "Editorial platform with AI agents, designed and built with a colleague from idea to launch.",
             "punti": [
                 "Platform development in Next.js/TypeScript",
                 "Writing the prompts for the AI agents that generate the content",
                 "Editorial review, tone-of-voice calibration, SEO/GEO optimisation, Google Search Console analysis",
             ]},
            {"titolo": "NDN Luxury — web developer",
             "meta": "2026 · remote",
             "testo": "Website of a resin and microcement finishes brand.",
             "punti": ["New pages, maintenance and improvements to the existing site", "3D animations"]},
            {"titolo": "ESH – Erasmus Student Housing — web developer",
             "meta": "2026 · remote",
             "testo": "Rental housing for Erasmus students.",
             "punti": ["New site pages and maintenance"]},
            {"titolo": "Beauty Broker World — QA",
             "meta": "Feb – Apr 2026 · remote",
             "punti": [
                 "22+ end-to-end test scenarios on critical flows: OTP, invites, IBAN, referral, checkout, account",
                 "GitHub issues reproducing server errors (502, 409, silent duplicate invites), regression testing after every fix",
                 "Work with a team distributed across Italy, Brazil and the USA via branches, PRs and code reviews",
             ]},
            {"titolo": "Copystudio — copywriting and brand identity",
             "meta": "Nov 2023 – Jul 2024",
             "punti": [
                 "Copy and brand identity for corporate websites, including organisations with public healthcare contracts",
                 "Client interviews to define tone of voice, target and positioning before writing",
             ]},
            {"titolo": "Hetaweb — SEO copywriter",
             "meta": "May – Nov 2023 · Lucca",
             "punti": [
                 "Editorial management of the blogs of 30+ organisations, including the Italian National Rugby Team",
                 "Writing and optimising SEO articles, performance analysis on Google Search Console",
             ]},
        ]),
        ("Personal project", [
            {"titolo": "Osservatorio Accoglienza — open source",
             "meta": OSSERVATORIO_META,
             "testo": "Public archive of migrant reception contracts in Italy, built from scratch.",
             "punti": [
                 "Ingestion and cleaning in Python of 18,000 records from three ANAC datasets",
                 "Parser for 90 ministerial PDFs with pdfplumber, for data on unaccompanied foreign minors",
                 "Static site in Next.js/TypeScript on Vercel, automated data updates with GitHub Actions, technical SEO and structured data",
             ]},
        ]),
        ("Education", [
            {"titolo": "Master's Degree in Semiotics", "meta": "University of Bologna · 2020"},
            {"titolo": "Bachelor's Degree in Philosophy", "meta": "University of Bologna · 2017"},
            {"titolo": "Erasmus+", "meta": "University of Granada · 2019"},
            {"titolo": "Full Stack Web Development programme", "meta": "Boolean · Feb – Jul 2024 · 700 hours",
             "punti": [
                 "JavaScript, PHP, Laravel, Vue.js, MySQL, Git, REST API",
                 "Projects: WhatsApp clone in Vue.js with a Laravel API, apartment management dashboard (CRUD, Bootstrap + SCSS), multi-step travel app in Laravel and jQuery",
             ]},
            {"titolo": "Google Analytics Certification", "meta": "Google Skillshop · 2025"},
            {"titolo": "Digital Copywriting", "meta": "course · 2022"},
        ]),
    ],
}

ES = {
    "lang": "es",
    "lato": {
        "contatti": "Contacto", "lingue": "Idiomas",
        "recapiti": RECAPITI + ["Con base en Italia · trabajo en remoto"], "link": LINK,
        "idiomi": ["Italiano — lengua materna", "Inglés — B2", "Español — B2"],
        "stack": list(zip(STACK["es"], STACK_VALORI)),
    },
    "profilo": [
        "Perfil",
        "Desarrollador full stack freelance (autónomo, P.IVA italiana). Trabajo en remoto para empresas y profesionales en e-commerce, sitios y aplicaciones web: desarrollo desde cero, mantenimiento, integraciones con servicios externos, seguimiento y SEO técnico.",
        "En Open2B/Scriggo construí desde cero el tema de **shop.puntoluce.net**, un e-commerce de material eléctrico que factura unos 20.000 € al día, y durante casi dos años me ocupé de su checkout, sus integraciones y sus aplicaciones internas. En los proyectos nuevos trabajo con Next.js y TypeScript.",
        "Por mi formación en filosofía y semiótica (Universidad de Bolonia) me ocupo también de los textos: copy, estructura de contenidos, SEO editorial.",
    ],
    "sezioni": [
        ("Experiencia en e-commerce", [
            {"titolo": "Punto Luce / EDIF — full stack developer",
             "meta": "oct 2024 – jun 2026 · Sasso Marconi (BO) · empleado, contrato indefinido",
             "testo": "Desarrollo y mantenimiento de **shop.puntoluce.net**, e-commerce B2B/B2C de material eléctrico y de fontanería/climatización en Open2B, en cuatro idiomas (IT/EN/ES/FR).",
             "punti": [
                 "Nuevo tema construido desde cero en Open2B/Scriggo: home, listados y fichas de producto, carrito, checkout en tres pasos, área de cliente; mobile-first, dark mode, filtros dinámicos",
                 "Checkout con reglas condicionales entre métodos de pago y de envío (umbral de envío gratuito, países no UE, facturación a particulares/empresas), autocompletado del código postal en 8.000 municipios",
                 "15+ aplicaciones PHP sobre la API de Open2B: feeds de productos para Trovaprezzi y Kelkoo (Italia, Francia), asignación automática de 50.000 clientes a grupos fiscales, archivo de recibos mediante cron, control de códigos de proveedor duplicados en 25.000 productos, extracción de 60.000 pedidos, descripciones de producto generadas con la API de OpenAI",
                 "20+ integraciones REST/webhook: Brevo (sincronización de 58.000 contactos y 23.550 productos, webhooks en tiempo real), Feedaty con rich snippets Schema.org, Doofinder, DocFinance, Facebook Graph API, Google Identity Services",
                 "Seguimiento mediante GTM: GA4 e-commerce, Meta Pixel, Microsoft UET con conversiones mejoradas, Clarity; Cookiebot y Consent Mode v2 para la conformidad con el RGPD",
                 "Validación de números de IVA (Cerved + VIES) en 28 países de la UE",
                 "Rendimiento: LCP de 12 s a 4 s, TBT −40%, CSS reducido de 15.000 a 10.000 líneas; auditoría de accesibilidad WAVE/axe",
             ]},
        ]),
        ("Trabajos para clientes (freelance)", [
            {"titolo": "Bellelli Linea Ufficio — web developer",
             "meta": "oct 2026 – actualidad · bellelliufficio.it",
             "testo": "E-commerce Open2B de sillas, taburetes, mesas y sillones de diseño, en italiano, francés y alemán.",
             "punti": [
                 "Enlace entre las fichas de productos afines («Disponible también en») sin cambios en el catálogo",
                 "Datos estructurados Schema.org/JSON-LD, revisión de la versión móvil, nuevos bloques en la home",
                 "Google Merchant Center: categorías de Google para 392 productos en tres idiomas, control de los datos del feed para las campañas de Shopping",
             ]},
            {"titolo": "8FLY — web developer, SEO y GEO",
             "meta": "nov 2026 – actualidad · 8fly.it",
             "testo": "E-commerce Open2B (plantilla 2018) de aeromodelismo radiocontrolado: unos 1.300 productos en más de 200 secciones.",
             "punti": [
                 "Productos disponibles a la vista: 660 fichas reordenadas con una importación de Excel, 129 secciones ordenadas por posición",
                 "SEO y GEO de la home y de 16 secciones en italiano e inglés, escritos a partir de sugerencias de Google, Trends y competencia; JSON-LD Product y OnlineStore, prueba de resultados enriquecidos superada",
                 "Rediseño: vista previa sobre las páginas reales y láminas antes/después antes de tocar la plantilla; nueva cabecera, páginas a ancho completo, cuadrícula responsive, ficha de producto con disponibilidad del almacén; pruebas en ordenador, tableta y móvil",
             ]},
            {"titolo": "Maxit Abbigliamento — web developer",
             "meta": "nov 2026 – actualidad · maxitabbigliamento.it",
             "testo": "E-commerce Open2B de ropa, para particulares y revendedores.",
             "punti": [
                 "Análisis del sitio y plan de intervenciones por orden de prioridad",
                 "Checkout: código fiscal solicitado solo a empresas, umbral de envío gratuito, gestión de las direcciones de envío",
             ]},
            {"titolo": "Ghigo Miranda — web developer",
             "meta": "nov 2026 – actualidad · ghigomiranda.it",
             "testo": "Tienda WordPress de una empresa agrícola del Piamonte, productos a base de miel.",
             "punti": [
                 "Feed para Google Shopping y desbloqueo de los productos rechazados en Merchant Center",
                 "Rediseño del sitio, adaptación a móvil y tablet, velocidad en móvil",
                 "Corrección de las tarifas de envío por provincia",
             ]},
            {"titolo": "Sanires — web developer",
             "meta": "nov 2026 · sanires.com",
             "testo": "E-commerce Open2B de guantes desechables y productos de higiene profesional.",
             "punti": [
                 "SEO técnico: títulos, metadatos, datos estructurados, textos para Google",
                 "Velocidad y accesibilidad, renovación gráfica del diseño existente, privacidad y cookies con iubenda",
             ]},
            {"titolo": "ALLSTUDIA (GOAT YOU S.R.L.) — full stack developer, copy y naming",
             "meta": "jun 2026 – actualidad · remoto · allstudia.com",
             "testo": "Plataforma web para producir contenidos con IA: drive compartido y canvas de nodos, con créditos, planes y marketplace.",
             "punti": [
                 "Integración de los modelos OpenAI GPT Image 2.6 en el nodo de generación de imágenes (opciones avanzadas, GIF, edición): costes medidos por token sobre las API reales, tabla de créditos, panel admin con coste y margen por concepto, pruebas de no regresión sobre Gemini",
                 "Marketplace de proyectos: esquema y migraciones Prisma/PostgreSQL, revisión admin, compra con créditos reservados y devueltos si la entrega falla, siete emails transaccionales, pruebas end-to-end",
                 "Medios desde Cloudflare R2 con una sola llamada y caché en el cliente, nuevas reglas de los planes (recargas, almacenamiento, límites de los equipos)",
                 "Reescritura en inglés de las nueve páginas del sitio y vocabulario de producto tomado del estudio cinematográfico, comprobando los nombres ya ocupados",
             ]},
            {"titolo": "Livello Zero — full stack developer",
             "meta": "jun 2026 – actualidad · livellozero.games",
             "testo": "Sitio editorial sobre videojuegos, desarrollado desde cero.",
             "punti": [
                 "Next.js (App Router) y TypeScript, despliegue en Vercel",
                 "CMS a medida: el cliente escribe y publica los artículos, sube las imágenes y gestiona las secciones sin conocimientos técnicos",
                 "Mantenimiento continuo con cuota anual tras la entrega",
             ]},
            {"titolo": "Futura Blog — full stack developer, editor, copywriter SEO/GEO",
             "meta": "2026 – actualidad · remoto",
             "testo": "Plataforma editorial con agentes de IA, diseñada y desarrollada con un colega desde la idea hasta el lanzamiento.",
             "punti": [
                 "Desarrollo de la plataforma en Next.js/TypeScript",
                 "Redacción de los prompts para los agentes de IA que generan los contenidos",
                 "Revisión editorial, calibración del tono de voz, optimización SEO/GEO, análisis de Google Search Console",
             ]},
            {"titolo": "NDN Luxury — web developer",
             "meta": "2026 · remoto",
             "testo": "Sitio de una marca de revestimientos de resina y microcemento.",
             "punti": ["Nuevas páginas, mantenimiento y mejoras del sitio existente", "Animaciones 3D"]},
            {"titolo": "ESH – Erasmus Student Housing — web developer",
             "meta": "2026 · remoto",
             "testo": "Alquiler de alojamientos para estudiantes Erasmus.",
             "punti": ["Nuevas páginas del sitio y mantenimiento"]},
            {"titolo": "Beauty Broker World — QA",
             "meta": "feb – abr 2026 · remoto",
             "punti": [
                 "22+ escenarios de prueba end-to-end en flujos críticos: OTP, invitaciones, IBAN, referral, checkout, cuenta",
                 "Issues en GitHub con reproducción de errores de servidor (502, 409, invitaciones duplicadas silenciosas), regression testing tras cada fix",
                 "Trabajo con un equipo distribuido entre Italia, Brasil y EE. UU. mediante branches, PR y code review",
             ]},
            {"titolo": "Copystudio — copywriting e identidad de marca",
             "meta": "nov 2023 – jul 2024",
             "punti": [
                 "Copy e identidad de marca para sitios corporativos, incluidas entidades con contratos públicos en el ámbito sanitario",
                 "Entrevistas con el cliente sobre tono de voz, público y posicionamiento antes de escribir",
             ]},
            {"titolo": "Hetaweb — copywriter SEO",
             "meta": "may – nov 2023 · Lucca",
             "punti": [
                 "Gestión editorial de los blogs de más de 30 entidades, entre ellas la Selección Italiana de Rugby",
                 "Artículos SEO y análisis del rendimiento en Google Search Console",
             ]},
        ]),
        ("Proyecto personal", [
            {"titolo": "Osservatorio Accoglienza — código abierto",
             "meta": OSSERVATORIO_META,
             "testo": "Archivo público sobre los contratos de acogida de migrantes en Italia, construido desde cero.",
             "punti": [
                 "Ingesta y limpieza en Python de 18.000 registros de tres datasets de ANAC",
                 "Parser de 90 PDF ministeriales con pdfplumber, para los datos sobre menores extranjeros no acompañados",
                 "Sitio estático en Next.js/TypeScript en Vercel, actualización de datos automatizada con GitHub Actions, SEO técnico y datos estructurados",
             ]},
        ]),
        ("Formación", [
            {"titolo": "Máster Universitario en Semiótica", "meta": "Universidad de Bolonia · 2020"},
            {"titolo": "Grado en Filosofía", "meta": "Universidad de Bolonia · 2017"},
            {"titolo": "Erasmus+", "meta": "Universidad de Granada · 2019"},
            {"titolo": "Curso Full Stack Developer", "meta": "Boolean · feb – jul 2024 · 700 horas",
             "punti": [
                 "JavaScript, PHP, Laravel, Vue.js, MySQL, Git, REST API",
                 "Proyectos: clon de WhatsApp en Vue.js con API Laravel, panel de gestión de apartamentos (CRUD, Bootstrap + SCSS), app de viajes multipaso en Laravel y jQuery",
             ]},
            {"titolo": "Certificación Google Analytics", "meta": "Google Skillshop · 2025"},
            {"titolo": "Digital Copywriting", "meta": "curso · 2022"},
        ]),
    ],
}

if __name__ == "__main__":
    dove = sys.argv[1] if len(sys.argv) > 1 else USCITA
    os.makedirs(dove, exist_ok=True)
    for sigla, d in (("IT", IT), ("EN", EN), ("ES", ES)):
        f = os.path.join(dove, f"GianlivioIemolo_CV_{sigla}.pdf")
        HTML(string=pagina(d)).write_pdf(f)
        print(f)
