// api/r/[slug].js — Trafficker Pro v2.1
// Enmascarador de URLs con: geo, UA, UTMs, blindaje bots, click tracking

const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_KEY = process.env.VITE_SUPABASE_KEY;

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
async function getLink(slug) {
  const r = await fetch(
    `${SUPA_URL}/rest/v1/links?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );
  const rows = await r.json();
  return rows?.[0] || null;
}

async function updateLink(id, data) {
  await fetch(`${SUPA_URL}/rest/v1/links?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(data)
  });
}

// ─── UTMs ─────────────────────────────────────────────────────────────────────
function extraerUtms(urlCompleto) {
  try {
    // req.url puede venir como /r/slug?utm_source=tp&...
    const queryString = urlCompleto.includes("?") ? urlCompleto.split("?")[1] : "";
    const params = new URLSearchParams(queryString);
    return {
      utm_source:   params.get("utm_source")   || null,
      utm_medium:   params.get("utm_medium")   || null,
      utm_campaign: params.get("utm_campaign") || null,
      utm_content:  params.get("utm_content")  || null,
      utm_term:     params.get("utm_term")     || null,
      utm_placement:params.get("utm_placement")|| null,
    };
  } catch { return {}; }
}

function agregarUtmsAUrl(destUrl, utmsDelLink) {
  // utmsDelLink: los UTMs configurados en el formulario de la app
  if (!destUrl) return destUrl;
  try {
    const params = Object.entries(utmsDelLink)
      .filter(([, v]) => v && v.trim())
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    if (!params) return destUrl;
    return destUrl + (destUrl.includes("?") ? "&" : "?") + params;
  } catch { return destUrl; }
}

// ─── UA / DEVICE ──────────────────────────────────────────────────────────────
function parseUserAgent(ua) {
  if (!ua) return { device: "Unknown", os: "Unknown", browser: "Unknown" };
  const device = /mobile|android|iphone|ipad/i.test(ua) ? "Mobile" : "Desktop";
  const os = /windows/i.test(ua) ? "Windows"
    : /mac os/i.test(ua) ? "macOS"
    : /android/i.test(ua) ? "Android"
    : /iphone|ipad/i.test(ua) ? "iOS"
    : /linux/i.test(ua) ? "Linux" : "Other";
  const browser = /chrome/i.test(ua) && !/edge/i.test(ua) ? "Chrome"
    : /firefox/i.test(ua) ? "Firefox"
    : /safari/i.test(ua) && !/chrome/i.test(ua) ? "Safari"
    : /edge/i.test(ua) ? "Edge"
    : /instagram/i.test(ua) ? "Instagram"
    : /fban|fbav/i.test(ua) ? "Facebook"
    : /tiktok/i.test(ua) ? "TikTok" : "Other";
  return { device, os, browser };
}

function detectPlatform(ua, referer) {
  if (/fban|fbav|facebook/i.test(ua) || /facebook\.com/i.test(referer)) return "Facebook";
  if (/tiktok/i.test(ua) || /tiktok\.com/i.test(referer)) return "TikTok";
  if (/instagram/i.test(ua) || /instagram\.com/i.test(referer)) return "Instagram";
  if (/whatsapp/i.test(ua)) return "WhatsApp";
  if (referer) {
    try {
      const host = new URL(referer).hostname;
      if (host.includes("google")) return "Google";
      if (host.includes("youtube")) return "YouTube";
      return host;
    } catch {}
  }
  return "Direct";
}

// ─── DETECCIÓN DE BOTS ────────────────────────────────────────────────────────
const BOT_PATTERNS = [
  // Crawlers de redes sociales (deben ver los meta tags, no redirigir)
  /facebookexternalhit|facebot/i,
  /twitterbot|tweetmemebot/i,
  /linkedinbot/i,
  /slackbot|slack-imgproxy/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  // Motores de búsqueda
  /googlebot|google-structured-data-testing/i,
  /bingbot|msnbot/i,
  /yandexbot/i,
  /duckduckbot/i,
  /baiduspider/i,
  // Herramientas de preview/seguridad
  /preview|crawler|spider|scraper|wget|curl|python-requests/i,
  /headlesschrome|phantomjs|selenium/i,
  // Verificadores de anuncios (Facebook/TikTok usan estos para revisar el destino)
  /adsbot|mediapartners/i,
  /facebookplatform|instagram/i,
];

function esBot(ua) {
  return BOT_PATTERNS.some(p => p.test(ua));
}

// ─── GEO ──────────────────────────────────────────────────────────────────────
async function getCountryFromIp(ip) {
  // Ignorar IPs privadas/locales
  if (!ip || ip === "0.0.0.0" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip === "::1") {
    return { country: "Local", countryCode: "LC", city: "", region: "" };
  }
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { "User-Agent": "TraffickerPro/1.0" }
    });
    const d = await r.json();
    return {
      country: d.country_name || "Unknown",
      countryCode: d.country_code || "XX",
      city: d.city || "",
      region: d.region || ""
    };
  } catch {
    return { country: "Unknown", countryCode: "XX", city: "", region: "" };
  }
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function buildLandingPage(link, destino) {
  const titulo      = link.landing_titulo      || "Únete al grupo";
  const descripcion = link.landing_descripcion || "Haz clic para continuar";
  const imagen      = link.landing_imagen      || "";
  const pixelFb     = link.pixel_fb            || "";
  const pixelTt     = link.pixel_tiktok        || "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
  <meta property="og:title" content="${titulo}">
  <meta property="og:description" content="${descripcion}">
  ${imagen ? `<meta property="og:image" content="${imagen}">` : ""}
  <meta property="og:type" content="website">
  <meta name="robots" content="noindex,nofollow">
  ${pixelFb ? `
  <script>
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelFb}');
    fbq('track', 'Lead');
  </script>` : ""}
  ${pixelTt ? `
  <script>
    !function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._l=ttq._l||{},ttq.load=function(){},ttq.push=ttq._s||[];var o=document.createElement("script"),a=document.createElement("script"),r=document.getElementsByTagName("script")[0];a.type="text/javascript",a.async=!0,a.src=i+"?sdkid="+e+"&lib="+t,r.parentNode.insertBefore(a,r)};
    ttq.load('${pixelTt}');
    ttq.page();
    ttq.track('ClickButton');
  </script>` : ""}
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0f1e;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:#111827;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:40px;max-width:420px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)}
    ${imagen ? `.img{width:100%;border-radius:12px;margin-bottom:24px;max-height:200px;object-fit:cover}` : ""}
    h1{font-size:22px;font-weight:700;margin-bottom:12px;line-height:1.3}
    p{font-size:15px;color:#9ca3af;margin-bottom:32px;line-height:1.6}
    .btn{display:inline-flex;align-items:center;gap:10px;background:#25D366;color:#fff;text-decoration:none;padding:16px 32px;border-radius:50px;font-size:16px;font-weight:700;transition:all .2s;width:100%;justify-content:center}
    .btn:hover{background:#20b85a;transform:translateY(-2px);box-shadow:0 8px 24px rgba(37,211,102,.3)}
    .btn svg{width:22px;height:22px}
    .footer{margin-top:20px;font-size:12px;color:#4b5563}
    .branding{margin-top:12px;font-size:11px;color:#374151;letter-spacing:.04em;display:flex;align-items:center;justify-content:center;gap:5px}
    .branding-icon{width:14px;height:14px;background:linear-gradient(135deg,#4d9fff,#a855f7);border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-size:8px}
    .branding strong{color:#4b5563}
  </style>
</head>
<body>
  <div class="card">
    ${imagen ? `<img class="img" src="${imagen}" alt="${titulo}">` : ""}
    <h1>${titulo}</h1>
    <p>${descripcion}</p>
    <a class="btn" href="${destino}" id="cta">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Unirse ahora
    </a>
    <div class="footer">Enlace seguro · verificado</div>
    <div class="branding">
      <span class="branding-icon">📊</span>
      <strong>TP</strong>
    </div>
  </div>
  <script>
    setTimeout(() => { document.getElementById('cta')?.click(); }, 1500);
  </script>
</body>
</html>`;
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const { slug } = req.query;
  if (!slug) return res.status(400).send("Bad request");

  const ua      = req.headers["user-agent"] || "";
  const referer = req.headers["referer"] || req.headers["referrer"] || "";

  // ── Blindaje: mostrar landing limpia a bots y crawlers ───────────────────
  if (esBot(ua)) {
    const link = await getLink(slug);
    if (!link || !link.active) return res.status(404).send("Not found");
    const primerDestino = (link.destinos || [])[0]?.url || "https://wa.me";
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buildLandingPage(link, primerDestino));
  }

  const link = await getLink(slug);
  if (!link || !link.active) return res.status(404).send("Link no encontrado");

  // ── Capturar UTMs del URL entrante (los de Facebook {{adset.name}} etc.) ──
  const utmsEntrantes = extraerUtms(req.url || "");

  // ── Geo + UA ──────────────────────────────────────────────────────────────
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.headers["x-real-ip"]
    || req.socket?.remoteAddress
    || "0.0.0.0";

  const [geo, uaInfo] = await Promise.all([
    getCountryFromIp(ip),
    Promise.resolve(parseUserAgent(ua))
  ]);
  const { device, os, browser } = uaInfo;
  const platform = detectPlatform(ua, referer);
  const ts = new Date().toISOString();

  // ── Elegir destino ────────────────────────────────────────────────────────
  const destinos     = link.destinos || [];
  const usarRotacion = link.rotacion_automatica === true;
  let destinoElegido = null;

  if (usarRotacion) {
    // 1. País específico
    destinoElegido = destinos.find(d =>
      d.activo !== false &&
      d.paises?.some(p => p.toLowerCase() === geo.countryCode.toLowerCase())
    ) || null;

    // 2. Rotación por cupo
    if (!destinoElegido) {
      const activos = destinos.filter(d => d.activo !== false);
      destinoElegido = activos.find(d => (d.clicks || 0) < (d.limite_clicks || 99999))
        || activos[activos.length - 1]
        || null;
    }
  } else {
    destinoElegido = destinos.find(d => d.activo !== false) || destinos[0] || null;
  }

  if (!destinoElegido) return res.status(404).send("Sin destinos disponibles");

  // ── Agregar UTMs del link al URL de destino ───────────────────────────────
  const utmsDelLink = {
    ...(link.utm_source   ? { utm_source:    link.utm_source   } : {}),
    ...(link.utm_medium   ? { utm_medium:    link.utm_medium   } : {}),
    ...(link.utm_campaign ? { utm_campaign:  link.utm_campaign } : {}),
    ...(link.utm_content  ? { utm_content:   link.utm_content  } : {}),
    ...(link.utm_term     ? { utm_term:      link.utm_term     } : {}),
  };
  const urlFinal = agregarUtmsAUrl(destinoElegido.url, utmsDelLink);

  // ── Registrar click ───────────────────────────────────────────────────────
  const click = {
    ts, ip: ip.slice(0, 15),
    country: geo.country, countryCode: geo.countryCode,
    city: geo.city, region: geo.region,
    device, os, browser, platform,
    referer: referer.slice(0, 200),
    destino_id:  destinoElegido.id,
    destino_url: destinoElegido.url,
    // UTMs del click entrante (de Facebook Ads, TikTok, etc.)
    utm_source:    utmsEntrantes.utm_source,
    utm_medium:    utmsEntrantes.utm_medium,
    utm_campaign:  utmsEntrantes.utm_campaign,
    utm_content:   utmsEntrantes.utm_content,
    utm_term:      utmsEntrantes.utm_term,
    utm_placement: utmsEntrantes.utm_placement,
  };

  const clicks       = link.clicks || [];
  const nuevosDestinos = destinos.map(d =>
    d.id === destinoElegido.id
      ? { ...d, clicks: (d.clicks || 0) + 1, ultimo_click: ts }
      : d
  );

  // Fire-and-forget — no bloquear la redirección
  updateLink(link.id, {
    destinos:     nuevosDestinos,
    clicks:       [...clicks, click].slice(-5000),
    total_clicks: (link.total_clicks || 0) + 1,
    ultimo_click: ts
  }).catch(() => {});

  // ── Redirigir ─────────────────────────────────────────────────────────────
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (link.usar_landing) {
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(buildLandingPage(link, urlFinal));
  } else {
    res.setHeader("Location", urlFinal);
    return res.status(302).end();
  }
}
