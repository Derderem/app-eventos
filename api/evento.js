const APP_URL = 'https://app-eventos-pro-final.vercel.app';
const FALLBACK_IMAGE = APP_URL + '/icon-512.png';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';

  const parts = String(dateStr).split('-');

  if (parts.length === 3) {
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  return dateStr;
}

function replaceMeta(html, attr, value) {
  const safeValue = escapeHtml(value);

  const regex = new RegExp(
    '<meta\\s+' + attr + '\\s+content="[^"]*"\\s*\\/?>',
    'i'
  );

  const newTag = '<meta ' + attr + ' content="' + safeValue + '" />';

  if (regex.test(html)) {
    return html.replace(regex, newTag);
  }

  return html.replace('</head>', newTag + '\n</head>');
}

export default async function handler(req, res) {
  const id = req.query.id;

  let html = '';

  try {
    const htmlResponse = await fetch(APP_URL + '/');
    html = await htmlResponse.text();
  } catch (error) {
    html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Eventora</title>
      </head>
      <body>
        <div id="root"></div>
      </body>
      </html>
    `;
  }

  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || !id) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    const eventUrl =
      supabaseUrl +
      '/rest/v1/events?select=id,title,city,localidad,address,date,time,image_url,category,status' +
      '&id=eq.' +
      encodeURIComponent(id) +
      '&status=eq.approved' +
      '&limit=1';

    const eventResponse = await fetch(eventUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: 'Bearer ' + supabaseKey
      }
    });

    const events = await eventResponse.json();

    if (Array.isArray(events) && events.length > 0) {
      const event = events[0];

      const title = event.title || 'Evento en Eventora';
      const city = event.city || '';
      const localidad = event.localidad || '';
      const date = formatDate(event.date);
      const time = event.time || '';
      const image = event.image_url || FALLBACK_IMAGE;

      const description =
        '📍 ' +
        city +
        (localidad ? ' - ' + localidad : '') +
        ' · 📅 ' +
        date +
        (time ? ' · ⏰ ' + time + 'H' : '');

      const eventUrlFinal = APP_URL + '/evento/' + event.id;

      html = html.replace(
        /<title>.*?<\/title>/i,
        '<title>' + escapeHtml(title) + ' | Eventora</title>'
      );

      html = replaceMeta(html, 'name="description"', description);

      html = replaceMeta(html, 'property="og:title"', title + ' | Eventora');
      html = replaceMeta(html, 'property="og:description"', description);
      html = replaceMeta(html, 'property="og:image"', image);
      html = replaceMeta(html, 'property="og:url"', eventUrlFinal);
      html = replaceMeta(html, 'property="og:type"', 'website');
      html = replaceMeta(html, 'property="og:site_name"', 'Eventora');

      html = replaceMeta(html, 'name="twitter:card"', 'summary_large_image');
      html = replaceMeta(html, 'name="twitter:title"', title + ' | Eventora');
      html = replaceMeta(html, 'name="twitter:description"', description);
      html = replaceMeta(html, 'name="twitter:image"', image);
    }
  } catch (error) {
    console.error('Error generando OpenGraph del evento:', error);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');

  return res.status(200).send(html);
}
