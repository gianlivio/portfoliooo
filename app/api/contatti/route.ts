/**
 * Riceve il modulo di contatto e lo inoltra per email via Resend.
 *
 * Variabili d'ambiente (su Vercel: Settings → Environment Variables):
 *   RESEND_API_KEY          obbligatoria; senza, il modulo risponde 503
 *   CONTATTI_MITTENTE       es. "Sito Gianlivio Iemolo <sito@gianlivioiemolo.com>"
 *                           (prima della verifica del dominio: onboarding@resend.dev,
 *                           che consegna solo all'indirizzo dell'account Resend)
 *   CONTATTI_DESTINATARIO   dove arrivano i messaggi
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function testo(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(richiesta: Request) {
  let corpo: Record<string, unknown>;
  try {
    corpo = await richiesta.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  // campo trappola compilato: è un bot, si finge che sia andato tutto bene
  if (testo(corpo.sito, 200)) return Response.json({ ok: true });

  const nome = testo(corpo.nome, 100);
  const email = testo(corpo.email, 200);
  const messaggio = testo(corpo.messaggio, 5000);
  const lingua = testo(corpo.lingua, 5);
  const servizi = Array.isArray(corpo.servizi)
    ? corpo.servizi.slice(0, 12).map((v) => testo(v, 60)).filter(Boolean)
    : [];

  if (!nome || !EMAIL.test(email) || messaggio.length < 10) {
    return Response.json({ ok: false, errore: "dati" }, { status: 422 });
  }

  const chiave = process.env.RESEND_API_KEY;
  if (!chiave) return Response.json({ ok: false, errore: "configurazione" }, { status: 503 });

  const risposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chiave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTATTI_MITTENTE ?? "Sito <onboarding@resend.dev>",
      to: [process.env.CONTATTI_DESTINATARIO ?? "gianlivioiemolo@gmail.com"],
      reply_to: email,
      subject: `Dal sito: ${nome}`,
      text:
        (servizi.length ? `Di cosa si tratta: ${servizi.join(", ")}\n\n` : "") +
        `${messaggio}\n\n— ${nome} <${email}>\nLingua del sito: ${lingua || "?"}`,
    }),
  });

  if (!risposta.ok) return Response.json({ ok: false, errore: "invio" }, { status: 502 });
  return Response.json({ ok: true });
}
