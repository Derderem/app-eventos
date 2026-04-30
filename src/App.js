import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2,
  Map as MapIcon, Clock, LayoutList, ShieldCheck, Sparkles,
  Loader2, ArrowLeft, Search, Share2, Star, Download,
  CheckCircle, XCircle, Info, RefreshCw, Check, X, Edit3
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

const ADMIN_EMAILS = ['garverjacobo@gmail.com', 'jacobogarver@gmail.com'];
const APP_URL = 'https://app-eventos-pro-final.vercel.app';

const INITIAL_FORM = {
  title: '', city: '', localidad: '', address: '',
  time: '21:00', date: '', category: 'MUSICA', image_url: '', featured: false
};

const categoryEmojis = {
  MUSICA: '🎵', GASTRONOMIA: '🍽️', TAURINO: '🐂',
  'FIESTAS PATRONALES': '🎉', OTROS: '📌'
};

const darkTileUrl = 'https://mt1.google.com/vt/lyrs=r&hl=es&x={x}&y={y}&z={z}';
const lightTileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}';

const redPinIcon = L.divIcon({
  html: '<div style="width:22px;height:30px;position:relative;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><svg viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 13.3 23.5 14 24.4.3.4.7.4 1 0C16.7 38.5 30 26.2 30 15 30 6.7 23.3 0 15 0z" fill="#ef4444"/><circle cx="15" cy="14" r="5" fill="white"/></svg></div>',
  iconSize: [22, 30], iconAnchor: [11, 30], popupAnchor: [0, -30], className: ''
});

function formatDate(dateStr) {
  if (!dateStr) return '';
  var parts = String(dateStr).split('-');
  if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return dateStr;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  try {
    var d = new Date(dateStr);
    return d.toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return '';
  }
}

function normalizeText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  var eventDate = new Date(dateStr + 'T23:59:59');
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
}

function getDaysLabel(dateStr) {
  var days = getDaysLeft(dateStr);
  if (days === null) return null;
  if (days === 0) return { text: 'HOY', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (days === 1) return { text: 'MAÑANA', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  if (days <= 3) return { text: 'EN ' + days + ' DÍAS', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (days <= 7) return { text: 'EN ' + days + ' DÍAS', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' };
  return { text: 'EN ' + days + ' DÍAS', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' };
}

function cleanImageUrl(url) {
  if (!url) return null;
  if (String(url).indexOf('data:image') === 0) return null;
  if (String(url).length > 1900) return null;
  return url;
}

async function compressImage(file, options) {
  var maxSize = (options && options.maxSize) || 1600;
  var quality = (options && options.quality) || 0.82;

  if (!file || !file.type || file.type.indexOf('image/') !== 0) {
    throw new Error('Archivo no válido');
  }

  var img;
  if (typeof createImageBitmap === 'function') {
    img = await createImageBitmap(file);
  } else {
    img = await new Promise(function(resolve, reject) {
      var image = new Image();
      image.onload = function() { resolve(image); };
      image.onerror = reject;
      image.src = URL.createObjectURL(file);
    });
  }

  var targetWidth = img.width;
  var targetHeight = img.height;

  if (img.width > maxSize || img.height > maxSize) {
    if (img.width > img.height) {
      targetWidth = maxSize;
      targetHeight = Math.round((img.height * maxSize) / img.width);
    } else {
      targetHeight = maxSize;
      targetWidth = Math.round((img.width * maxSize) / img.height);
    }
  }

  var canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  var webpBlob = await new Promise(function(resolve) { canvas.toBlob(resolve, 'image/webp', quality); });
  if (webpBlob && webpBlob.size > 0) {
    return { blob: webpBlob, extension: 'webp', type: 'image/webp', originalSize: file.size, compressedSize: webpBlob.size };
  }

  var jpegBlob = await new Promise(function(resolve) { canvas.toBlob(resolve, 'image/jpeg', quality); });
  if (jpegBlob && jpegBlob.size > 0) {
    return { blob: jpegBlob, extension: 'jpg', type: 'image/jpeg', originalSize: file.size, compressedSize: jpegBlob.size };
  }

  return { blob: file, extension: file.name.split('.').pop() || 'jpg', type: file.type, originalSize: file.size, compressedSize: file.size };
}

function fallbackCopyText(text, showToastFn) {
  var textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    showToastFn('Enlace copiado', 'success');
  } catch (err) {
    showToastFn('No se pudo copiar', 'error');
  }
  document.body.removeChild(textarea);
}

function Toast(props) {
  var toast = props.toast;
  if (!toast) return null;
  var isSuccess = toast.type === 'success';
  var isError = toast.type === 'error';
  var bg = isSuccess ? 'rgba(22, 163, 74, 0.96)' : isError ? 'rgba(220, 38, 38, 0.96)' : 'rgba(79, 70, 229, 0.96)';
  var Icon = isSuccess ? CheckCircle : isError ? XCircle : Info;

  return (
    <div style={{
      position: 'fixed', top: 62, left: '50%', transform: 'translateX(-50%)',
      zIndex: 999999, width: '90%', maxWidth: 420, background: bg, color: 'white',
      borderRadius: 16, padding: '12px 14px', boxShadow: '0 12px 35px rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 900,
      lineHeight: 1.35, border: '1px solid rgba(255,255,255,0.22)', animation: 'toastIn 0.25s ease-out'
    }}>
      <Icon size={20} />
      <span style={{ flex: 1 }}>{toast.message}</span>
    </div>
  );
}

function Splash(props) {
  useEffect(function() {
    var t = setTimeout(function() {
      if (props.onDone) props.onDone();
    }, 1000);
    return function() { clearTimeout(t); };
  }, [props.onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, background: '#020617',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20
    }}>
      <img src="/icon-512.png" alt="Eventora" style={{ height: 74, width: 74, borderRadius: 18, objectFit: 'cover' }} />
      <p style={{ color: '#6366f1', fontSize: 11, fontWeight: 700 }}>Cargando eventos...</p>
      <Loader2 className="animate-spin" size={24} color="#4f46e5" />
    </div>
  );
}

function MapResizer(props) {
  var center = props.center;
  var map = useMap();
  var prevCenter = useRef(null);

  useEffect(function() {
    map.invalidateSize();
    if (center) {
      var isNew = !prevCenter.current || prevCenter.current[0] !== center[0] || prevCenter.current[1] !== center[1];
      if (isNew) {
        map.flyTo(center, 11, { animate: true, duration: 1.5 });
        prevCenter.current = center;
      }
    } else {
      map.setView([40.4167, -3.7037], 6);
      prevCenter.current = null;
    }
  }, [center, map]);

  return null;
}

function exportToCSV(events) {
  if (!events.length) return alert('No hay eventos para exportar.');
  var headers = ['Titulo', 'Ciudad', 'Localidad', 'Direccion', 'Fecha', 'Hora', 'Categoria', 'Estado', 'Lat', 'Lng'];
  var rows = events.map(function(e) {
    return [e.title || '', e.city || '', e.localidad || '', e.address || '', formatDate(e.date), e.time || '', e.category || '', e.status || '', e.lat || '', e.lng || '']
      .map(function(x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(';');
  });
  var csv = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'eventora_eventos_' + new Date().toISOString().split('T')[0] + '.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

// ============================================
// FUNCIONES IA MEJORADAS
// ============================================
function buildIAPrompt(title, category, city) {
  var cleanTitle = String(title || '').trim();
  var cleanCity = String(city || '').trim();
  var cat = String(category || 'OTROS');

  var categoryDescription = '';
  if (cat === 'MUSICA') {
    categoryDescription = 'evento de musica en vivo, concierto, escenario con luces, publico, ambiente festivo musical';
  } else if (cat === 'GASTRONOMIA') {
    categoryDescription = 'evento gastronomico, comida tipica, tapas, platos deliciosos, mercado gastronomico, ambiente culinario';
  } else if (cat === 'TAURINO') {
    categoryDescription = 'evento taurino tradicional, plaza de toros, corrida de toros, feria taurina, ambiente de feria española';
  } else if (cat === 'FIESTAS PATRONALES') {
    categoryDescription = 'fiestas patronales de un pueblo de España, procesion religiosa, decoraciones en la calle, fuegos artificiales, banda de musica, ambiente tradicional español';
  } else {
    categoryDescription = 'evento comunitario, reunion de gente, celebracion local, ambiente festivo';
  }

  var locationPart = cleanCity ? (cleanCity + ', España') : 'España';

  var prompt = 'professional photograph of a real event called "' + cleanTitle + '". ' +
    'The scene must match the event name. ' +
    'Context: ' + categoryDescription + '. ' +
    'Location: ' + locationPart + '. ' +
    'Style: realistic event photography, natural lighting, vibrant colors, high quality, no text, no watermarks, no logos, no letters, no signs.';

  return prompt;
}

function EventCard(props) {
  var ev = props.ev;
  var featured = props.featured;
  var isDark = props.isDark;
  var favorites = props.favorites;
  var animHeart = props.animHeart;
  var toggleFavorite = props.toggleFavorite;
  var setSelectedEvent = props.setSelectedEvent;
  var dl = getDaysLabel(ev.date);
  var isReallyFeatured = ev.featured === true;

  return (
    <div className={isDark ? 'card-dark' : 'card-light'} style={{
      borderRadius: 25, overflow: 'hidden', marginBottom: 15,
      border: (featured || isReallyFeatured) ? '2px solid #22c55e' : undefined
    }}>
      <div style={{ position: 'relative' }}>
        {(featured || isReallyFeatured) && (
          <div style={{
            position: 'absolute', top: 10, left: 10, zIndex: 5, background: '#22c55e', color: 'white',
            padding: '4px 10px', borderRadius: 8, fontSize: 9, fontWeight: 900,
            display: 'flex', alignItems: 'center', gap: 4
          }}>
            <Star size={12} fill="white" /> DESTACADO
          </div>
        )}
        <div style={{ position: 'relative', height: featured ? 200 : 160 }}>
          <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button onClick={function() { toggleFavorite(ev.id); }} style={{
            position: 'absolute', top: 10, right: 10, padding: featured ? 8 : 7,
            background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444', display: 'flex', cursor: 'pointer'
          }}>
            <Heart size={featured ? 18 : 16} className={animHeart === ev.id ? 'heart-pop' : ''} fill={favorites.indexOf(ev.id) !== -1 ? 'red' : 'none'} />
          </button>
        </div>
        <div style={{ padding: 15, textAlign: 'center' }}>
          <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 5 }}>
            {categoryEmojis[ev.category] || '📌'} {ev.city} | {formatDate(ev.date)}
            {dl && (
              <span style={{ display: 'inline-block', marginLeft: 8, background: dl.bg, color: dl.color, padding: '2px 8px', borderRadius: 8, fontSize: 9, fontWeight: 900, letterSpacing: 0 }}>
                {dl.text}
              </span>
            )}
          </p>
          <h3 style={{ fontWeight: 900, fontSize: featured ? 17 : 15, marginBottom: 10 }}>{ev.title}</h3>
          <button onClick={function() { setSelectedEvent(ev); }} style={{
            width: '100%', padding: featured ? 12 : 11, borderRadius: 14,
            background: '#4f46e5', color: 'white', border: 'none',
            fontWeight: 900, fontSize: featured ? 11 : 10, cursor: 'pointer'
          }}>
            {featured ? 'VER DETALLES' : 'DETALLES'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminMiniCard(props) {
  var ev = props.ev;
  var isDark = props.isDark;
  var onClick = props.onClick;
  var onApprove = props.onApprove;
  var onReject = props.onReject;
  var onDelete = props.onDelete;
  var onView = props.onView;
  var onEdit = props.onEdit;
  var mode = props.mode;

  return (
    <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 16, padding: 10, marginBottom: 10, cursor: 'pointer' }} onClick={onClick}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 900, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ev.featured && <Star size={11} fill="#22c55e" color="#22c55e" style={{ marginRight: 4, verticalAlign: 'middle' }} />}
            {ev.title}
          </p>
          <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 800 }}>
            {ev.city} | {formatDate(ev.date)} | {ev.time}
          </p>
          <p style={{ fontSize: 8, opacity: 0.65, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ev.address}, {ev.localidad || ''}
          </p>
          {ev.created_at && mode === 'pending' && (
            <p style={{ fontSize: 8, opacity: 0.45, marginTop: 3 }}>Enviado: {formatDateTime(ev.created_at)}</p>
          )}
        </div>
      </div>
      {mode === 'pending' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 10 }}>
          <button onClick={function(e) { e.stopPropagation(); onApprove(); }} style={{ padding: 8, background: '#22c55e', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Check size={12} /> APROBAR
          </button>
          <button onClick={function(e) { e.stopPropagation(); onReject(); }} style={{ padding: 8, background: '#f59e0b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <X size={12} /> RECHAZAR
          </button>
          <button onClick={function(e) { e.stopPropagation(); onDelete(); }} style={{ padding: 8, background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Trash2 size={12} /> BORRAR
          </button>
        </div>
      )}
      {mode === 'approved' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 10 }}>
          <button onClick={function(e) { e.stopPropagation(); onView(); }} style={{ padding: 8, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 9, cursor: 'pointer' }}>VER</button>
          <button onClick={function(e) { e.stopPropagation(); onEdit(); }} style={{ padding: 8, background: '#f59e0b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Edit3 size={12} /> EDITAR
          </button>
          <button onClick={function(e) { e.stopPropagation(); onDelete(); }} style={{ padding: 8, background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Trash2 size={12} /> BORRAR
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL APP
// ============================================
export default function App() {
  var _s = useState(true);
  var showSplash = _s[0]; var setShowSplash = _s[1];

  var _ev = useState([]);
  var events = _ev[0]; var setEvents = _ev[1];

  var _fav = useState(function() {
    try { var saved = localStorage.getItem('eventora_favs_v5'); return saved ? JSON.parse(saved) : []; } catch(e) { return []; }
  });
  var favorites = _fav[0]; var setFavorites = _fav[1];

  var _prof = useState(null);
  var profile = _prof[0]; var setProfile = _prof[1];

  var _view = useState('home');
  var view = _view[0]; var setView = _view[1];

  var _dark = useState(true);
  var isDark = _dark[0]; var setIsDark = _dark[1];

  var _cat = useState('TODOS');
  var selectedCategory = _cat[0]; var setSelectedCategory = _cat[1];

  var _sel = useState(null);
  var selectedEvent = _sel[0]; var setSelectedEvent = _sel[1];

  var _mc = useState(null);
  var mapCenter = _mc[0]; var setMapCenter = _mc[1];

  var _ms = useState('');
  var mapSearch = _ms[0]; var setMapSearch = _ms[1];

  var _gen = useState(false);
  var isGenerating = _gen[0]; var setIsGenerating = _gen[1];

  var _sub = useState(false);
  var isSubmitting = _sub[0]; var setIsSubmitting = _sub[1];

  var _form = useState(INITIAL_FORM);
  var form = _form[0]; var setForm = _form[1];

  var _ue = useState('');
  var userEmail = _ue[0]; var setUserEmail = _ue[1];

  var _pe = useState(null);
  var selectedPendingEvent = _pe[0]; var setSelectedPendingEvent = _pe[1];

  var _ee = useState(null);
  var editingEvent = _ee[0]; var setEditingEvent = _ee[1];

  var _ef = useState(INITIAL_FORM);
  var editForm = _ef[0]; var setEditForm = _ef[1];

  var _at = useState('pending');
  var adminTab = _at[0]; var setAdminTab = _at[1];

  var _sq = useState('');
  var searchQuery = _sq[0]; var setSearchQuery = _sq[1];

  var _df = useState('all');
  var dateFilter = _df[0]; var setDateFilter = _df[1];

  var _ah = useState(null);
  var animHeart = _ah[0]; var setAnimHeart = _ah[1];

  var _toast = useState(null);
  var toast = _toast[0]; var setToast = _toast[1];

  var _as = useState('');
  var adminSearch = _as[0]; var setAdminSearch = _as[1];

  var _acf = useState('TODAS');
  var adminCityFilter = _acf[0]; var setAdminCityFilter = _acf[1];

  var _cp = useState(function() { try { return window.location.pathname || '/'; } catch(e) { return '/'; } });
  var currentPath = _cp[0]; var setCurrentPath = _cp[1];

  var _pz = useState(false);
  var isPhotoZoomed = _pz[0]; var setIsPhotoZoomed = _pz[1];

  var _ps = useState(1);
  var photoScale = _ps[0]; var setPhotoScale = _ps[1];

  var _pp = useState({ x: 0, y: 0 });
  var photoPos = _pp[0]; var setPhotoPos = _pp[1];

  var listRef = useRef(null);
  var toastTimerRef = useRef(null);
  var mapSearchTimerRef = useRef(null);

  var lastNonEventPathRef = useRef(function() {
    try { var p = window.location.pathname || '/'; return p.startsWith('/evento/') ? '/' : p; } catch(e) { return '/'; }
  }());

  var routeEventLookupRef = useRef('');

  var photoTouchRef = useRef({ initialDistance: 0, initialScale: 1, lastX: 0, lastY: 0, isDragging: false });

  var hasAdmin = profile && profile.role === 'admin';

  function showToast(message, type) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message: message, type: type || 'info' });
    toastTimerRef.current = setTimeout(function() { setToast(null); }, 3600);
  }

  function navigateTo(path, replace) {
    var target = path || '/';
    try {
      if (!target.startsWith('/evento/')) { lastNonEventPathRef.current = target; }
      if (window.location.pathname !== target) {
        if (replace) { window.history.replaceState({}, '', target); }
        else { window.history.pushState({}, '', target); }
      }
      setCurrentPath(target);
    } catch(e) { setCurrentPath(target); }
  }

  function resetDetailUi() { setIsPhotoZoomed(false); setPhotoScale(1); setPhotoPos({ x: 0, y: 0 }); }

  function clearSelections() { setSelectedEvent(null); setSelectedPendingEvent(null); setEditingEvent(null); resetDetailUi(); }

  function openEvent(ev) {
    if (!currentPath.startsWith('/evento/')) { lastNonEventPathRef.current = currentPath || '/'; }
    setSelectedPendingEvent(null);
    setEditingEvent(null);
    resetDetailUi();
    setSelectedEvent(ev);
    navigateTo('/evento/' + ev.id);
  }

  function closeSelectedEvent() {
    var backPath = lastNonEventPathRef.current || '/';
    setSelectedEvent(null);
    resetDetailUi();
    navigateTo(backPath);
  }

  function goHome() { setView('home'); clearSelections(); setSearchQuery(''); navigateTo('/'); }
  function goFavorites() { setView('favorites'); clearSelections(); navigateTo('/favoritos'); }
  function goCreate() { setView('create'); clearSelections(); navigateTo('/crear'); }
  function goMap() { setView('map'); clearSelections(); navigateTo('/mapa'); }
  function goProfile() { setView('profile'); clearSelections(); navigateTo('/perfil'); }

  function goAdmin() {
    if (!hasAdmin) return;
    setView('admin'); clearSelections(); setAdminTab('pending'); fetchEvents(); navigateTo('/admin');
  }

  useEffect(function() {
    fetchEvents();
    return function() {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (mapSearchTimerRef.current) clearTimeout(mapSearchTimerRef.current);
    };
  }, []);

  useEffect(function() { localStorage.setItem('eventora_favs_v5', JSON.stringify(favorites)); }, [favorites]);

  useEffect(function() {
    function isAdminUser(user) { return !!(user && user.email && ADMIN_EMAILS.indexOf(user.email) !== -1); }
    function handleSession(session) {
      var user = session && session.user;
      setUserEmail(user ? user.email : '');
      setProfile(isAdminUser(user) ? { role: 'admin', email: user.email } : null);
      fetchEvents();
    }
    supabase.auth.getSession().then(function(res) { handleSession(res.data && res.data.session); });
    var sub = supabase.auth.onAuthStateChange(function(event, session) { handleSession(session); });
    return function() { if (sub && sub.data && sub.data.subscription) sub.data.subscription.unsubscribe(); };
  }, []);

  useEffect(function() {
    function handlePopState() {
      var path = window.location.pathname || '/';
      setCurrentPath(path);
      if (!path.startsWith('/evento/')) { lastNonEventPathRef.current = path; }
    }
    window.addEventListener('popstate', handlePopState);
    return function() { window.removeEventListener('popstate', handlePopState); };
  }, []);

  useEffect(function() {
    if (currentPath.startsWith('/evento/')) return;
    routeEventLookupRef.current = '';

    var routes = {
      '/': 'home', '/favoritos': 'favorites', '/crear': 'create',
      '/mapa': 'map', '/perfil': 'profile'
    };

    var routeView = routes[currentPath];
    if (routeView) {
      setView(routeView);
      setSelectedEvent(null); setSelectedPendingEvent(null); setEditingEvent(null); resetDetailUi();
      return;
    }

    if (currentPath === '/admin') {
      if (hasAdmin) { setView('admin'); setSelectedEvent(null); setSelectedPendingEvent(null); setEditingEvent(null); resetDetailUi(); }
      else { navigateTo('/', true); }
      return;
    }

    navigateTo('/', true);
  }, [currentPath, hasAdmin]);

  useEffect(function() {
    if (!currentPath.startsWith('/evento/')) return;
    var idFromUrl = currentPath.replace('/evento/', '').split('/')[0];
    if (!idFromUrl) { navigateTo('/', true); return; }

    var foundInState = events.find(function(e) { return String(e.id) === String(idFromUrl) && (e.status === 'approved' || hasAdmin); });

    if (foundInState) {
      setSelectedPendingEvent(null); setEditingEvent(null); resetDetailUi();
      setSelectedEvent(foundInState);
      routeEventLookupRef.current = idFromUrl;
      return;
    }

    if (routeEventLookupRef.current === idFromUrl) return;
    routeEventLookupRef.current = idFromUrl;

    supabase.from('events').select('*').eq('id', idFromUrl).single().then(function(res) {
      if (res.error || !res.data || (res.data.status !== 'approved' && !hasAdmin)) {
        showToast('Evento no encontrado', 'error');
        setSelectedEvent(null); routeEventLookupRef.current = ''; navigateTo('/', true);
        return;
      }
      setSelectedPendingEvent(null); setEditingEvent(null); resetDetailUi(); setSelectedEvent(res.data);
    }).catch(function() {
      showToast('Evento no encontrado', 'error');
      setSelectedEvent(null); routeEventLookupRef.current = ''; navigateTo('/', true);
    });
  }, [currentPath, events, hasAdmin]);

  function fetchEvents() {
    try { var cached = localStorage.getItem('eventora_cache_events_v1'); if (cached) { setEvents(JSON.parse(cached)); } } catch(e) {}
    supabase.from('events').select('*').order('date', { ascending: true }).then(function(res) {
      if (res.error) { console.error('Error cargando eventos:', res.error); return; }
      var data = res.data || [];
      setEvents(data);
      try { localStorage.setItem('eventora_cache_events_v1', JSON.stringify(data)); } catch(e) {}
      var validIds = data.map(function(e) { return e.id; });
      setFavorites(function(prev) { return prev.filter(function(id) { return validIds.indexOf(id) !== -1; }); });
    });
  }

  function handleInputChange(e) {
    var name = e.target.name;
    var value = e.target.value;
    if (['title', 'city', 'localidad'].indexOf(name) !== -1) value = value.toUpperCase();
    setForm(function(prev) { var next = {}; for (var k in prev) next[k] = prev[k]; next[name] = value; return next; });
  }

  function handleEditInputChange(e) {
    var name = e.target.name;
    var value = e.target.value;
    if (['title', 'city', 'localidad'].indexOf(name) !== -1) value = value.toUpperCase();
    setEditForm(function(prev) { var next = {}; for (var k in prev) next[k] = prev[k]; next[name] = value; return next; });
  }

  function toggleFavorite(id) {
    setFavorites(function(prev) {
      if (prev.indexOf(id) !== -1) { showToast('Evento quitado de guardados', 'info'); return prev.filter(function(x) { return x !== id; }); }
      showToast('Evento guardado en favoritos', 'success'); return prev.concat([id]);
    });
    setAnimHeart(id);
    setTimeout(function() { setAnimHeart(null); }, 700);
  }

  async function uploadImageToStorage(file) {
    if (!file) throw new Error('No hay imagen');
    if (!file.type || file.type.indexOf('image/') !== 0) throw new Error('Selecciona una imagen válida');
    if (file.size > 12 * 1024 * 1024) throw new Error('La imagen es demasiado grande. Máximo 12MB');
    var optimized = await compressImage(file, { maxSize: 1600, quality: 0.82 });
    var safeName = Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + optimized.extension;
    var path = 'uploads/' + safeName;
    var upload = await supabase.storage.from('event-images').upload(path, optimized.blob, { cacheControl: '3600', upsert: false, contentType: optimized.type });
    if (upload.error) throw upload.error;
    var publicUrlData = supabase.storage.from('event-images').getPublicUrl(path);
    return { url: publicUrlData.data.publicUrl, originalSize: optimized.originalSize, compressedSize: optimized.compressedSize };
  }

  async function handleGalleryUpload(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    setIsGenerating(true); showToast('Optimizando imagen...', 'info');
    try {
      var result = await uploadImageToStorage(file);
      setForm(function(prev) { return { title: prev.title, city: prev.city, localidad: prev.localidad, address: prev.address, time: prev.time, date: prev.date, category: prev.category, image_url: result.url, featured: prev.featured }; });
      showToast('Imagen subida (' + Math.round(result.compressedSize / 1024) + 'KB)', 'success');
    } catch (err) { console.error(err); showToast(err.message || 'Error subiendo imagen', 'error'); }
    finally { setIsGenerating(false); e.target.value = ''; }
  }

  async function handleEditGalleryUpload(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    setIsGenerating(true); showToast('Optimizando nueva imagen...', 'info');
    try {
      var result = await uploadImageToStorage(file);
      setEditForm(function(prev) { return { title: prev.title, city: prev.city, localidad: prev.localidad, address: prev.address, time: prev.time, date: prev.date, category: prev.category, image_url: result.url, featured: prev.featured }; });
      showToast('Nueva imagen subida (' + Math.round(result.compressedSize / 1024) + 'KB)', 'success');
    } catch (err) { console.error(err); showToast(err.message || 'Error subiendo imagen', 'error'); }
    finally { setIsGenerating(false); e.target.value = ''; }
  }

  // ============================================
  // FUNCIONES IA MEJORADAS
  // ============================================
  function generateAIImage() {
    if (!form.title) { showToast('Escribe un título primero', 'error'); return; }
    setIsGenerating(true);
    showToast('Generando imagen con IA...', 'info');
    var seed = Math.floor(Math.random() * 999999);
    var prompt = buildIAPrompt(form.title, form.category, form.city);
    var url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + '?width=800&height=600&seed=' + seed + '&nologo=true&t=' + Date.now();
    setForm(function(prev) { return { title: prev.title, city: prev.city, localidad: prev.localidad, address: prev.address, time: prev.time, date: prev.date, category: prev.category, image_url: url, featured: prev.featured }; });
    setTimeout(function() { setIsGenerating(false); showToast('Imagen generada', 'success'); }, 1500);
  }

  function generateAIImageEdit() {
    if (!editForm.title) { showToast('Escribe un título primero', 'error'); return; }
    setIsGenerating(true);
    showToast('Generando imagen con IA...', 'info');
    var seed = Math.floor(Math.random() * 999999);
    var prompt = buildIAPrompt(editForm.title, editForm.category, editForm.city);
    var url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + '?width=800&height=600&seed=' + seed + '&nologo=true&t=' + Date.now();
    setEditForm(function(prev) { return { title: prev.title, city: prev.city, localidad: prev.localidad, address: prev.address, time: prev.time, date: prev.date, category: prev.category, image_url: url, featured: prev.featured }; });
    setTimeout(function() { setIsGenerating(false); showToast('Imagen generada', 'success'); }, 1500);
  }

  function geocodeAddress(address, localidad, city) {
    var fullAddress = [address, localidad, city, 'España'].filter(Boolean).join(', ');
    return fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' + encodeURIComponent(fullAddress))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        return fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' + encodeURIComponent(city + ', España'))
          .then(function(r2) { return r2.json(); })
          .then(function(data2) {
            if (data2 && data2[0]) return { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) };
            return { lat: null, lng: null };
          });
      })
      .catch(function() { return { lat: null, lng: null }; });
  }

  function handleSubmitEvent() {
    if (!form.title || !form.date || !form.city || !form.address) { showToast('Faltan campos: título, ciudad, fecha y dirección', 'error'); return; }
    setIsSubmitting(true); showToast('Enviando evento a revisión...', 'info');
    geocodeAddress(form.address, form.localidad, form.city)
      .then(function(coords) {
        var eventToInsert = {
          title: form.title.trim(), category: form.category, city: form.city.trim(),
          localidad: form.localidad ? form.localidad.trim() : null, address: form.address.trim(),
          date: form.date, time: form.time || '21:00', image_url: cleanImageUrl(form.image_url),
          status: 'pending', lat: coords.lat, lng: coords.lng, featured: false
        };
        return supabase.from('events').insert([eventToInsert]);
      })
      .then(function(res) {
        if (res.error) { console.error(res.error); showToast('Error: ' + (res.error.message || 'No se pudo guardar'), 'error'); return; }
        showToast('Evento enviado a revisión correctamente', 'success'); setForm(INITIAL_FORM); goHome(); fetchEvents();
      })
      .catch(function(err) { console.error(err); showToast('Error al enviar', 'error'); })
      .finally(function() { setIsSubmitting(false); });
  }

  function startEditEvent(ev) {
    setEditingEvent(ev); setSelectedEvent(null); setSelectedPendingEvent(null);
    setEditForm({ title: ev.title || '', city: ev.city || '', localidad: ev.localidad || '', address: ev.address || '', date: ev.date || '', time: ev.time ? String(ev.time).slice(0, 5) : '21:00', category: ev.category || 'MUSICA', image_url: ev.image_url || '', featured: ev.featured === true });
  }

  function cancelEditEvent() { setEditingEvent(null); setEditForm(INITIAL_FORM); }

  function handleSaveEditEvent() {
    if (!editingEvent) return;
    if (!editForm.title || !editForm.date || !editForm.city || !editForm.address) { showToast('Faltan campos obligatorios', 'error'); return; }
    setIsSubmitting(true); showToast('Guardando cambios...', 'info');
    var addressChanged = editForm.address !== (editingEvent.address || '') || editForm.city !== (editingEvent.city || '') || editForm.localidad !== (editingEvent.localidad || '');
    var coordsPromise = addressChanged ? geocodeAddress(editForm.address, editForm.localidad, editForm.city) : Promise.resolve({ lat: editingEvent.lat || null, lng: editingEvent.lng || null });
    coordsPromise.then(function(coords) {
      var updateData = { title: editForm.title.trim(), category: editForm.category, city: editForm.city.trim(), localidad: editForm.localidad ? editForm.localidad.trim() : null, address: editForm.address.trim(), date: editForm.date, time: editForm.time || '21:00', image_url: cleanImageUrl(editForm.image_url), lat: coords.lat, lng: coords.lng, featured: editForm.featured === true };
      return supabase.from('events').update(updateData).eq('id', editingEvent.id);
    }).then(function(res) {
      if (res.error) { console.error(res.error); showToast('Error guardando', 'error'); return; }
      showToast('Evento actualizado correctamente', 'success'); setEditingEvent(null); setEditForm(INITIAL_FORM); fetchEvents(); setAdminTab('approved');
    }).catch(function(err) { console.error(err); showToast('Error guardando', 'error'); })
    .finally(function() { setIsSubmitting(false); });
  }

  function handleApproveEvent(id) { supabase.from('events').update({ status: 'approved' }).eq('id', id).then(function(res) { if (res.error) { showToast('Error aprobando', 'error'); return; } showToast('Evento aprobado', 'success'); setSelectedPendingEvent(null); fetchEvents(); }); }
  function handleRejectEvent(id) { supabase.from('events').update({ status: 'rejected' }).eq('id', id).then(function(res) { if (res.error) { showToast('Error rechazando', 'error'); return; } showToast('Evento rechazado', 'info'); setSelectedPendingEvent(null); fetchEvents(); }); }

  function handleDeleteEvent(id) {
    if (!window.confirm('¿Seguro que quieres borrar este evento?')) return;
    var wasSelected = selectedEvent && selectedEvent.id === id;
    supabase.from('events').delete().eq('id', id).then(function(res) {
      if (res.error) { showToast('Error borrando', 'error'); return; }
      showToast('Evento borrado', 'success'); setSelectedPendingEvent(null); setEditingEvent(null);
      if (wasSelected) closeSelectedEvent();
      fetchEvents();
    });
  }

  function handleLogin() {
    var email = prompt('Escribe tu email:');
    if (!email) return;
    supabase.auth.signInWithOtp({ email: email, options: { emailRedirectTo: APP_URL + (currentPath || '/') } }).then(function(res) {
      if (res.error) { console.error(res.error); showToast('Error enviando login', 'error'); return; }
      showToast('Revisa tu email y pulsa el enlace', 'success');
    });
  }

  function handleLogout() { supabase.auth.signOut().then(function() { setUserEmail(''); setProfile(null); fetchEvents(); goHome(); setEditingEvent(null); showToast('Sesión cerrada', 'success'); }); }

  function handleMapSearchChange(e) {
    var value = e.target.value;
    setMapSearch(value);
    if (mapSearchTimerRef.current) clearTimeout(mapSearchTimerRef.current);
    if (!value || value.length < 3) return;
    mapSearchTimerRef.current = setTimeout(function() {
      fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&countrycodes=es&q=' + encodeURIComponent(value))
        .then(function(r) { return r.json(); })
        .then(function(data) { if (data && data[0]) { setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]); } else { showToast('No se encontró el lugar', 'error'); } })
        .catch(function() { showToast('Error buscando lugar', 'error'); });
    }, 600);
  }

  // ============================================
  // FUNCION COMPARTIR
  // ============================================
  function shareEvent(ev) {
    var shareUrl = APP_URL + '/evento/' + ev.id;
    var shareText = '¡No te pierdas ' + ev.title + '! ' + shareUrl;

    var shareOptions = [
      { name: 'WhatsApp', icon: '📱', url: 'https://wa.me/?text=' + encodeURIComponent(shareText) },
      { name: 'Facebook', icon: '📘', url: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl) },
      { name: 'Twitter/X', icon: '🐦', url: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent(shareText) },
      { name: 'Copiar enlace', icon: '📋', action: 'copy' }
    ];

    var shareModal = document.createElement('div');
    shareModal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';

    var modalContent = document.createElement('div');
    modalContent.style.cssText = 'background:' + (isDark ? '#0f172a' : '#fff') + ';border-radius:20px;padding:25px;width:90%;max-width:360px;color:' + (isDark ? '#fff' : '#0f172a') + ';font-family:system-ui,sans-serif;';

    var buttonsHTML = '';
    for (var i = 0; i < shareOptions.length; i++) {
      var opt = shareOptions[i];
      buttonsHTML += '<button class="share-btn-item" data-action="' + (opt.action || 'link') + '" data-url="' + (opt.url || '') + '" style="padding:14px;border:none;border-radius:12px;font-weight:900;font-size:11px;cursor:pointer;background:' + (isDark ? '#1e293b' : '#f1f5f9') + ';color:' + (isDark ? '#fff' : '#0f172a') + ';display:flex;align-items:center;justify-content:center;gap:8px;">' + opt.icon + ' ' + opt.name + '</button>';
    }

    modalContent.innerHTML = '<h3 style="margin:0 0 20px;font-weight:900;text-align:center;font-size:16px;">🔗 Compartir evento</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">' + buttonsHTML + '</div>' +
      '<button id="close-share-modal-btn" style="width:100%;padding:12px;border:none;border-radius:12px;background:#64748b;color:white;font-weight:900;font-size:12px;cursor:pointer;">CERRAR</button>';

    shareModal.appendChild(modalContent);
    document.body.appendChild(shareModal);

    function closeModal() { if (shareModal.parentNode) shareModal.parentNode.removeChild(shareModal); }

    shareModal.addEventListener('click', function(e) { if (e.target === shareModal) closeModal(); });

    var closeBtn = document.getElementById('close-share-modal-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    var btns = shareModal.querySelectorAll('.share-btn-item');
    for (var j = 0; j < btns.length; j++) {
      btns[j].addEventListener('click', function(e) {
        var action = this.getAttribute('data-action');
        var url = this.getAttribute('data-url');
        if (action === 'copy') {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(function() { showToast('✅ Enlace copiado', 'success'); }).catch(function() { fallbackCopyText(shareUrl, showToast); });
          } else { fallbackCopyText(shareUrl, showToast); }
        } else if (url) { window.open(url, '_blank'); }
        closeModal();
      });
    }
  }

  function handleCategoryChange(cat) { setSelectedCategory(cat); if (listRef.current) listRef.current.scrollTop = 0; }

  function enterPhotoZoom() { setIsPhotoZoomed(true); setPhotoScale(1); setPhotoPos({ x: 0, y: 0 }); }
  function exitPhotoZoom() { setIsPhotoZoomed(false); setPhotoScale(1); setPhotoPos({ x: 0, y: 0 }); }

  function getDistance(touches) {
    if (!touches || touches.length < 2) return 0;
    var dx = touches[0].clientX - touches[1].clientX;
    var dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handlePhotoTouchStart(e) {
    if (e.touches.length === 2) { e.preventDefault(); photoTouchRef.current.initialDistance = getDistance(e.touches); photoTouchRef.current.initialScale = photoScale; }
    else if (e.touches.length === 1) { photoTouchRef.current.lastX = e.touches[0].clientX; photoTouchRef.current.lastY = e.touches[0].clientY; photoTouchRef.current.isDragging = true; }
  }

  function handlePhotoTouchMove(e) {
    if (!isPhotoZoomed) return;
    if (e.touches.length === 2) { e.preventDefault(); var dist = getDistance(e.touches); var scale = dist / photoTouchRef.current.initialDistance; setPhotoScale(Math.min(Math.max(photoTouchRef.current.initialScale * scale, 1), 5)); }
    else if (e.touches.length === 1 && photoScale > 1) { e.preventDefault(); var dx = e.touches[0].clientX - photoTouchRef.current.lastX; var dy = e.touches[0].clientY - photoTouchRef.current.lastY; setPhotoPos(function(prev) { return { x: prev.x + dx * 0.55, y: prev.y + dy * 0.55 }; }); photoTouchRef.current.lastX = e.touches[0].clientX; photoTouchRef.current.lastY = e.touches[0].clientY; }
  }

  function handlePhotoTouchEnd() { if (photoScale <= 1.05) exitPhotoZoom(); photoTouchRef.current.isDragging = false; }

  function eventMatchesAdminFilters(e) {
    if (adminCityFilter !== 'TODAS' && e.city !== adminCityFilter) return false;
    var q = normalizeText(adminSearch).trim();
    if (!q) return true;
    var haystack = normalizeText([e.title, e.city, e.localidad, e.address, e.category, e.status, e.date, e.time].join(' '));
    return q.split(/\s+/).filter(Boolean).every(function(term) { return haystack.indexOf(term) !== -1; });
  }

  var today = new Date().toISOString().split('T')[0];
  var publicEvents = events.filter(function(e) { return e.status === 'approved' && e.date >= today; });
  var searchedEvents = searchQuery ? publicEvents.filter(function(e) { var q = normalizeText(searchQuery).trim(); var terms = q.split(/\s+/).filter(Boolean); var haystack = normalizeText([e.title, e.city, e.localidad, e.address, e.category, e.date].join(' ')); return terms.every(function(term) { return haystack.indexOf(term) !== -1; }); }) : publicEvents;
  var categoryEvents = searchedEvents.filter(function(e) { return selectedCategory === 'TODOS' || e.category === selectedCategory; });
  var filteredEvents = categoryEvents.filter(function(e) {
    if (dateFilter === 'today') return e.date === today;
    if (dateFilter === 'week') { var ed = new Date(e.date); var now = new Date(); var we = new Date(now); we.setDate(we.getDate() + 7); return ed >= now && ed <= we; }
    return true;
  });

  var favoriteEvents = publicEvents.filter(function(e) { return favorites.indexOf(e.id) !== -1; });
  var rawPendingEvents = hasAdmin ? events.filter(function(e) { return e.status === 'pending'; }) : [];
  var rawApprovedEvents = hasAdmin ? events.filter(function(e) { return e.status === 'approved'; }) : [];
  var pendingEvents = rawPendingEvents.filter(eventMatchesAdminFilters);
  var approvedEvents = rawApprovedEvents.filter(eventMatchesAdminFilters);

  var adminCitiesList = [];
  events.forEach(function(e) { if (e.city && adminCitiesList.indexOf(e.city) === -1) adminCitiesList.push(e.city); });
  adminCitiesList.sort();

  var sortedFiltered = filteredEvents.slice().sort(function(a, b) { if (a.featured && !b.featured) return -1; if (!a.featured && b.featured) return 1; return 0; });
  var featuredEvent = sortedFiltered.length ? sortedFiltered[0] : null;
  var restEvents = sortedFiltered.length ? sortedFiltered.slice(1) : [];
  var adminFiltersActive = adminSearch.trim() || adminCityFilter !== 'TODAS';

  var INPUT_STYLE = { width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 };

  if (showSplash) return <Splash onDone={function() { setShowSplash(false); }} />;

  return (
    <div className={isDark ? 'dark-theme' : 'light-theme'} style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Toast toast={toast} />

      <style>{'*{margin:0;padding:0;box-sizing:border-box;transition:background-color .25s,color .25s}html,body,#root{width:100%;height:100%;overflow:hidden}.dark-theme{background:#020617;color:white}.light-theme{background:#f8fafc;color:#0f172a}.card-dark{background:#0f172a;border:1px solid #1e293b;color:white}.card-light{background:white;border:1px solid #e2e8f0;color:#0f172a;box-shadow:0 4px 12px rgba(0,0,0,.05)}.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}.leaflet-container img{max-width:none!important;max-height:none!important}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.animate-spin{animation:spin 1s linear infinite}@keyframes admin-pulse{0%{transform:scale(1);color:#818cf8}50%{transform:scale(1.2);color:#ef4444}100%{transform:scale(1);color:#818cf8}}.pulse-admin{animation:admin-pulse 1.4s infinite}@keyframes heartPop{0%{transform:scale(1)}30%{transform:scale(1.5)}60%{transform:scale(.9)}100%{transform:scale(1)}}.heart-pop{animation:heartPop .6s ease-out}@keyframes toastIn{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}.share-btn-item:hover{opacity:.85}'}</style>

      <nav style={{ height: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,.2)', background: isDark ? '#0f172a' : '#fff', flexShrink: 0 }}>
        <div style={{ cursor: 'pointer' }} onClick={goHome}>
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" alt="Eventora" style={{ height: 18, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasAdmin && (
            <button onClick={goAdmin} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <ShieldCheck size={21} className={rawPendingEvents.length > 0 ? 'pulse-admin' : ''} style={{ color: '#6366f1' }} />
              {rawPendingEvents.length > 0 && <span style={{ position: 'absolute', top: -8, right: -10, background: '#ef4444', color: 'white', fontSize: 8, fontWeight: 900, borderRadius: 999, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid ' + (isDark ? '#0f172a' : '#fff') }}>{rawPendingEvents.length}</span>}
            </button>
          )}
          {!userEmail && <button onClick={handleLogin} style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 8, fontWeight: 900, cursor: 'pointer' }}>LOGIN</button>}
          <button onClick={function() { setIsDark(!isDark); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
            {isDark ? <Sun size={18} color="#facc15" /> : <Moon size={18} color="#4f46e5" />}
          </button>
          <Sparkles size={18} color="#6366f1" style={{ cursor: 'pointer' }} onClick={goProfile} />
        </div>
      </nav>

      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>

        {view === 'map' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <div style={{ position: 'absolute', top: 15, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '85%', maxWidth: 320 }}>
              <div style={{ background: '#fff', borderRadius: 15, padding: '4px 12px', display: 'flex', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,.2)' }}>
                <Search size={16} color="#6366f1" />
                <input type="text" value={mapSearch} onChange={handleMapSearchChange} placeholder="Buscar ciudad, pueblo o lugar..." style={{ width: '100%', padding: 10, border: 'none', outline: 'none', fontWeight: 700, fontSize: 12, color: '#0f172a', background: 'transparent' }} />
                {mapSearch && <button onClick={function() { setMapSearch(''); setMapCenter(null); }} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 900 }}>X</button>}
              </div>
            </div>
            <MapContainer center={[40.41, -3.70]} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <MapResizer center={mapCenter} />
              <TileLayer url={isDark ? darkTileUrl : lightTileUrl} attribution="Google Maps" maxZoom={20} />
              {publicEvents.map(function(ev) {
                if (!ev.lat || !ev.lng) return null;
                return <Marker key={ev.id} position={[ev.lat, ev.lng]} icon={redPinIcon}><Popup><b>{ev.title}</b><br />{ev.address}, {ev.localidad || ''} - {ev.city}<br />{formatDate(ev.date)}</Popup></Marker>;
              })}
            </MapContainer>
          </div>
        )}

        {view === 'home' && !selectedEvent && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 12px', flexShrink: 0, background: isDark ? '#020617' : '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isDark ? '#1e293b' : '#e2e8f0', borderRadius: 12, padding: '6px 12px' }}>
                <Search size={16} color="#6366f1" />
                <input value={searchQuery} onChange={function(e) { setSearchQuery(e.target.value); }} placeholder="Buscar evento, ciudad, localidad..." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: 11, color: 'inherit' }} />
                {searchQuery && <button onClick={function() { setSearchQuery(''); }} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer' }}>X</button>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, padding: '6px 12px', flexShrink: 0 }}>
              {[{ k: 'all', l: 'TODOS' }, { k: 'today', l: 'HOY' }, { k: 'week', l: 'ESTA SEMANA' }].map(function(f) {
                return <button key={f.k} onClick={function() { setDateFilter(f.k); }} style={{ padding: '5px 10px', borderRadius: 10, border: 'none', background: dateFilter === f.k ? '#22c55e' : 'transparent', color: dateFilter === f.k ? 'white' : '#6366f1', fontSize: 8, fontWeight: 900, cursor: 'pointer' }}>{f.l}</button>;
              })}
            </div>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 8, padding: '8px 12px', overflowX: 'auto', flexShrink: 0 }}>
              {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map(function(cat) {
                return <button key={cat} onClick={function() { handleCategoryChange(cat); }} style={{ padding: '7px 15px', borderRadius: 25, border: 'none', background: selectedCategory === cat ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: selectedCategory === cat ? 'white' : 'inherit', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 }}>{cat}</button>;
              })}
            </div>
            <div style={{ padding: '4px 12px', fontSize: 9, color: '#6366f1', fontWeight: 800, flexShrink: 0 }}>{filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''}</div>
            <div ref={listRef} className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 15, paddingBottom: 120 }}>
              {filteredEvents.length === 0 && <div style={{ textAlign: 'center', marginTop: 60, opacity: 0.5 }}><Search size={40} style={{ margin: '0 auto 15px' }} /><p style={{ fontWeight: 900, fontSize: 14 }}>NO SE ENCONTRARON EVENTOS</p><p style={{ fontSize: 10, marginTop: 8 }}>Prueba con otra búsqueda o categoría</p></div>}
              {featuredEvent && <EventCard ev={featuredEvent} featured={true} isDark={isDark} favorites={favorites} animHeart={animHeart} toggleFavorite={toggleFavorite} setSelectedEvent={openEvent} />}
              {restEvents.map(function(ev) { return <EventCard key={ev.id} ev={ev} featured={false} isDark={isDark} favorites={favorites} animHeart={animHeart} toggleFavorite={toggleFavorite} setSelectedEvent={openEvent} />; })}
            </div>
          </div>
        )}

        {selectedEvent && !selectedPendingEvent && !editingEvent && (
          <>
            {isPhotoZoomed ? (
              <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', touchAction: 'none' }} onTouchStart={handlePhotoTouchStart} onTouchMove={handlePhotoTouchMove} onTouchEnd={handlePhotoTouchEnd}>
                <img src={selectedEvent.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(' + photoScale + ') translate(' + photoPos.x + 'px, ' + photoPos.y + 'px)', transition: 'transform 0.1s ease-out' }} />
                <button onClick={exitPhotoZoom} style={{ position: 'absolute', top: 40, right: 20, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 999, fontWeight: 900, fontSize: 12, cursor: 'pointer', zIndex: 100000, display: 'flex', alignItems: 'center', gap: 6 }}><X size={16}/> CERRAR</button>
                <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, pointerEvents: 'none', textAlign: 'center' }}>Usa dos dedos para zoom · Pellizca hacia afuera para volver</div>
              </div>
            ) : (
              <div className="no-scrollbar" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '6px 10px 0', flexShrink: 0 }}><button onClick={closeSelectedEvent} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 4, cursor: 'pointer', fontSize: 11 }}><ArrowLeft size={14} /> VOLVER</button></div>
                <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: '15px 15px 0 0', overflow: 'hidden', padding: 0, flex: 1, display: 'flex', flexDirection: 'column', margin: '0 8px', overflowY: 'auto' }}>
                  <div onClick={enterPhotoZoom} style={{ position: 'relative', width: '100%', height: 220, cursor: 'zoom-in', overflow: 'hidden', flexShrink: 0, backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>
                    {!selectedEvent.image_url || !selectedEvent.image_url.includes('http') ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}><Loader2 className="animate-spin" size={32} color="#6366f1" /></div>
                    ) : (
                      <img src={selectedEvent.image_url} alt={selectedEvent.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0, transition: 'opacity 0.3s ease' }} loading="lazy" onLoad={function(e) { e.target.style.opacity = '1'; }} />
                    )}
                    <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: 8, fontSize: 9, fontWeight: 900, pointerEvents: 'none' }}>🔍 Pulsa para zoom</div>
                  </div>
                  <div style={{ padding: 12, flex: 1 }}>
                    <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>{categoryEmojis[selectedEvent.category] || '📌'}</p>
                    <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 8 }}>{selectedEvent.title}</h2>
                    <div style={{ display: 'flex', gap: 15, marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 4, fontSize: 11, alignItems: 'center' }}><Calendar color="#6366f1" size={13} /> <b>{formatDate(selectedEvent.date)}</b></div>
                      <div style={{ display: 'flex', gap: 4, fontSize: 11, alignItems: 'center' }}><Clock color="#6366f1" size={13} /> <b>{selectedEvent.time}H</b></div>
                    </div>
                    {getDaysLabel(selectedEvent.date) && <div style={{ display: 'inline-block', background: getDaysLabel(selectedEvent.date).bg, color: getDaysLabel(selectedEvent.date).color, padding: '3px 10px', borderRadius: 8, fontSize: 9, fontWeight: 900, marginBottom: 8 }}>{getDaysLabel(selectedEvent.date).text}</div>}
                    <div onClick={function() { window.open('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(selectedEvent.address + ' ' + (selectedEvent.localidad || '') + ' ' + selectedEvent.city)); }} style={{ background: 'rgba(99,102,241,.1)', padding: 10, borderRadius: 8, cursor: 'pointer', textAlign: 'center', border: '1px dashed #6366f1', marginBottom: 8 }}>
                      <MapPin color="#6366f1" size={14} style={{ margin: '0 auto 2px' }} />
                      <b style={{ fontSize: 10 }}>{selectedEvent.address}, {selectedEvent.localidad || ''} - {selectedEvent.city}</b><br />
                      <span style={{ fontSize: 8, color: '#2563eb', fontWeight: 900 }}>GPS GOOGLE MAPS</span>
                    </div>
                    <button onClick={function() { shareEvent(selectedEvent); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 12, background: 'rgba(34,197,94,.1)', border: '1px dashed #22c55e', borderRadius: 8, color: '#22c55e', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>
                      <Share2 size={14} /> COMPARTIR EVENTO
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {view === 'create' && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 15, borderRadius: 20, gap: 8, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 14 }}>AÑADIR EVENTO</h2>
              <input name="title" placeholder="TÍTULO" style={INPUT_STYLE} value={form.title} onChange={handleInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 6 }}>
                <input name="city" placeholder="CIUDAD" style={INPUT_STYLE} value={form.city} onChange={handleInputChange} />
                <select name="category" style={INPUT_STYLE} value={form.category} onChange={handleInputChange}>
                  <option value="MUSICA">MUSICA</option>
                  <option value="GASTRONOMIA">GASTRONOMIA</option>
                  <option value="TAURINO">TAURINO</option>
                  <option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option>
                  <option value="OTROS">OTROS</option>
                </select>
              </div>
              <input name="localidad" placeholder="LOCALIDAD" style={INPUT_STYLE} value={form.localidad} onChange={handleInputChange} />
              <input name="address" placeholder="DIRECCIÓN" style={INPUT_STYLE} value={form.address} onChange={handleInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <input name="date" type="date" style={{ padding: 8, width: '100%', borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.date} onChange={handleInputChange} />
                <input name="time" type="time" style={{ padding: 8, width: '100%', borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.time} onChange={handleInputChange} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button onClick={generateAIImage} disabled={isGenerating} style={{ padding: 10, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
                  {isGenerating ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} IA FOTO
                </button>
                <label style={{ padding: 10, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>
                  GALERÍA<input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleGalleryUpload} />
                </label>
              </div>
              {form.image_url && <img src={form.image_url} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 10 }} />}
              <button onClick={handleSubmitEvent} disabled={isSubmitting} style={{ width: '100%', background: '#4f46e5', color: 'white', padding: 13, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 11, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? 'Enviando...' : 'ENVIAR REVISIÓN'}
              </button>
            </div>
          </div>
        )}

        {view === 'admin' && editingEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <button onClick={cancelEditEvent} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}><ArrowLeft size={16} /> CANCELAR EDICIÓN</button>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 15, borderRadius: 20, gap: 8, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 15 }}>EDITAR EVENTO</h2>
              <input name="title" placeholder="TÍTULO" style={INPUT_STYLE} value={editForm.title} onChange={handleEditInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 6 }}>
                <input name="city" placeholder="CIUDAD" style={INPUT_STYLE} value={editForm.city} onChange={handleEditInputChange} />
                <select name="category" style={INPUT_STYLE} value={editForm.category} onChange={handleEditInputChange}>
                  <option value="MUSICA">MUSICA</option><option value="GASTRONOMIA">GASTRONOMIA</option><option value="TAURINO">TAURINO</option><option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option><option value="OTROS">OTROS</option>
                </select>
              </div>
              <input name="localidad" placeholder="LOCALIDAD" style={INPUT_STYLE} value={editForm.localidad} onChange={handleEditInputChange} />
              <input name="address" placeholder="DIRECCIÓN" style={INPUT_STYLE} value={editForm.address} onChange={handleEditInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <input name="date" type="date" style={{ padding: 8, width: '100%', borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={editForm.date} onChange={handleEditInputChange} />
                <input name="time" type="time" style={{ padding: 8, width: '100%', borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={editForm.time} onChange={handleEditInputChange} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: editForm.featured ? 'rgba(34,197,94,.15)' : 'rgba(128,128,128,0.1)', borderRadius: 10, cursor: 'pointer', border: editForm.featured ? '2px solid #22c55e' : '2px solid transparent' }}>
                <input type="checkbox" checked={editForm.featured === true} onChange={function(e) { setEditForm(function(prev) { return { title: prev.title, city: prev.city, localidad: prev.localidad, address: prev.address, time: prev.time, date: prev.date, category: prev.category, image_url: prev.image_url, featured: e.target.checked }; }); }} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                <Star size={16} fill={editForm.featured ? '#22c55e' : 'none'} color={editForm.featured ? '#22c55e' : '#6366f1'} />
                <span style={{ fontSize: 12, fontWeight: 900, color: editForm.featured ? '#22c55e' : 'inherit' }}>MARCAR COMO DESTACADO</span>
              </label>
              <input name="image_url" placeholder="URL DE IMAGEN" style={INPUT_STYLE} value={editForm.image_url} onChange={handleEditInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button onClick={generateAIImageEdit} disabled={isGenerating} style={{ padding: 10, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
                  {isGenerating ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} NUEVA IA
                </button>
                <label style={{ padding: 10, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>
                  NUEVA GALERÍA<input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditGalleryUpload} />
                </label>
              </div>
              {editForm.image_url && <img src={editForm.image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12 }} />}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                <button onClick={cancelEditEvent} disabled={isSubmitting} style={{ width: '100%', background: '#64748b', color: 'white', padding: 13, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 11, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>CANCELAR</button>
                <button onClick={handleSaveEditEvent} disabled={isSubmitting} style={{ width: '100%', background: '#22c55e', color: 'white', padding: 13, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 11, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? 'Guardando...' : 'GUARDAR'}</button>
              </div>
            </div>
          </div>
        )}

        {view === 'admin' && !selectedPendingEvent && !editingEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <button onClick={goHome} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}><ArrowLeft size={16} /> VOLVER</button>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 18, padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div><p style={{ fontSize: 15, fontWeight: 900 }}>PANEL ADMIN</p><p style={{ fontSize: 9, opacity: 0.65 }}>{userEmail || 'No conectado'}</p></div>
                <button onClick={function() { fetchEvents(); showToast('Eventos actualizados', 'success'); }} style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: 'rgba(99,102,241,.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><RefreshCw size={16} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ background: 'rgba(239,68,68,.12)', color: '#ef4444', borderRadius: 14, padding: 10, textAlign: 'center', fontWeight: 900, fontSize: 11 }}>{rawPendingEvents.length}<br /><span style={{ fontSize: 8 }}>PENDIENTES</span></div>
                <div style={{ background: 'rgba(34,197,94,.12)', color: '#22c55e', borderRadius: 14, padding: 10, textAlign: 'center', fontWeight: 900, fontSize: 11 }}>{rawApprovedEvents.length}<br /><span style={{ fontSize: 8 }}>APROBADOS</span></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isDark ? '#1e293b' : '#e2e8f0', borderRadius: 12, padding: '6px 10px', marginBottom: 8 }}>
                <Search size={15} color="#6366f1" />
                <input value={adminSearch} onChange={function(e) { setAdminSearch(e.target.value); }} placeholder="Buscar por título, ciudad, dirección..." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'inherit', fontWeight: 800, fontSize: 10 }} />
                {adminSearch && <button onClick={function() { setAdminSearch(''); }} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 900 }}>X</button>}
              </div>
              <select value={adminCityFilter} onChange={function(e) { setAdminCityFilter(e.target.value); }} style={{ width: '100%', padding: 10, borderRadius: 12, border: 'none', outline: 'none', background: isDark ? '#1e293b' : '#e2e8f0', color: 'inherit', fontWeight: 900, fontSize: 10 }}>
                <option value="TODAS">TODAS LAS CIUDADES</option>
                {adminCitiesList.map(function(city) { return <option key={city} value={city}>{city}</option>; })}
              </select>
              {adminFiltersActive && <button onClick={function() { setAdminSearch(''); setAdminCityFilter('TODAS'); }} style={{ width: '100%', marginTop: 8, padding: 8, borderRadius: 10, border: 'none', background: 'rgba(99,102,241,.12)', color: '#6366f1', fontWeight: 900, fontSize: 9, cursor: 'pointer' }}>LIMPIAR FILTROS</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <button onClick={function() { setAdminTab('pending'); fetchEvents(); }} style={{ padding: 10, borderRadius: 12, border: 'none', background: adminTab === 'pending' ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: adminTab === 'pending' ? 'white' : 'inherit', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>PENDIENTES ({pendingEvents.length}{adminFiltersActive ? '/' + rawPendingEvents.length : ''})</button>
              <button onClick={function() { setAdminTab('approved'); fetchEvents(); }} style={{ padding: 10, borderRadius: 12, border: 'none', background: adminTab === 'approved' ? '#22c55e' : (isDark ? '#1e293b' : '#e2e8f0'), color: adminTab === 'approved' ? 'white' : 'inherit', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>APROBADOS ({approvedEvents.length}{adminFiltersActive ? '/' + rawApprovedEvents.length : ''})</button>
            </div>
            {adminTab === 'approved' && approvedEvents.length > 0 && <button onClick={function() { exportToCSV(approvedEvents); }} style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'rgba(99,102,241,.1)', color: '#6366f1', fontWeight: 900, fontSize: 10, cursor: 'pointer', marginBottom: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Download size={14} /> EXPORTAR RESULTADOS A CSV</button>}
            {adminTab === 'pending' && pendingEvents.length === 0 && <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS PENDIENTES</p>}
            {adminTab === 'pending' && pendingEvents.map(function(ev) { return <AdminMiniCard key={ev.id} ev={ev} isDark={isDark} mode="pending" onClick={function() { setSelectedPendingEvent(ev); }} onApprove={function() { handleApproveEvent(ev.id); }} onReject={function() { handleRejectEvent(ev.id); }} onDelete={function() { handleDeleteEvent(ev.id); }} />; })}
            {adminTab === 'approved' && approvedEvents.length === 0 && <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS APROBADOS</p>}
            {adminTab === 'approved' && approvedEvents.map(function(ev) { return <AdminMiniCard key={ev.id} ev={ev} isDark={isDark} mode="approved" onClick={function() { openEvent(ev); }} onView={function() { openEvent(ev); }} onEdit={function() { startEditEvent(ev); }} onDelete={function() { handleDeleteEvent(ev.id); }} />; })}
          </div>
        )}

        {view === 'admin' && selectedPendingEvent && !editingEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <button onClick={function() { setSelectedPendingEvent(null); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}><ArrowLeft size={16} /> VOLVER A LISTA</button>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 20, overflow: 'hidden', padding: 0 }}>
              <img src={selectedPendingEvent.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" style={{ width: '100%', height: 220, objectFit: 'cover' }} />
              <div style={{ padding: 18 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 15 }}>{selectedPendingEvent.title}</h2>
                <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Calendar color="#6366f1" size={16} /><b>{formatDate(selectedPendingEvent.date)}</b></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Clock color="#6366f1" size={16} /><b>{selectedPendingEvent.time}H</b></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><MapPin color="#6366f1" size={16} /><b>{selectedPendingEvent.address}, {selectedPendingEvent.localidad || ''} - {selectedPendingEvent.city}</b></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><span style={{ fontWeight: 900, color: '#6366f1' }}>CAT:</span><b>{selectedPendingEvent.category}</b></div>
                  {selectedPendingEvent.created_at && <div style={{ fontSize: 11, opacity: 0.65 }}>Enviado: {formatDateTime(selectedPendingEvent.created_at)}</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <button onClick={function() { handleApproveEvent(selectedPendingEvent.id); }} style={{ padding: 12, background: '#22c55e', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>APROBAR</button>
                  <button onClick={function() { handleRejectEvent(selectedPendingEvent.id); }} style={{ padding: 12, background: '#f59e0b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>RECHAZAR</button>
                  <button onClick={function() { handleDeleteEvent(selectedPendingEvent.id); }} style={{ padding: 12, background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>BORRAR</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'favorites' && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 12, fontSize: 16 }}>MIS GUARDADOS ({favoriteEvents.length})</h2>
            {favoriteEvents.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS GUARDADOS</p>
            ) : favoriteEvents.map(function(ev) {
              var dl = getDaysLabel(ev.date);
              return (
                <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ display: 'flex', gap: 10, padding: 10, borderRadius: 18, marginBottom: 8, alignItems: 'center', cursor: 'pointer' }} onClick={function() { openEvent(ev); }}>
                  <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" style={{ width: 45, height: 45, borderRadius: 10, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 900, fontSize: 13 }}>{ev.title}</p>
                    <p style={{ fontSize: 9, color: '#6366f1' }}>{ev.city}</p>
                    {dl && <span style={{ fontSize: 8, color: dl.color, fontWeight: 900, background: dl.bg, padding: '2px 6px', borderRadius: 6 }}>{dl.text}</span>}
                  </div>
                  <button onClick={function(e) { e.stopPropagation(); toggleFavorite(ev.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                </div>
              );
            })}
          </div>
        )}

        {view === 'profile' && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 22, borderRadius: 35, width: '100%', maxWidth: 300, textAlign: 'center' }}>
              <h2 style={{ fontWeight: 900, marginBottom: 12, fontSize: 16 }}>SOPORTE</h2>
              {userEmail && <p style={{ fontSize: 9, opacity: 0.6, marginBottom: 8 }}>Conectado: {userEmail}</p>}
              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 14, borderRadius: 12, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>☕ INVITAR A UN CAFÉ (KO-FI)</a>
                <a href="https://paypal.me/EVENTORA" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 14, borderRadius: 12, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>💙 APOYAR EN PAYPAL</a>
              </div>
              {!userEmail ? <button onClick={handleLogin} style={{ background: '#4f46e5', color: 'white', fontSize: 10, padding: '8px 15px', borderRadius: 8, border: 'none', fontWeight: 900, cursor: 'pointer' }}>LOGIN</button> : <button onClick={handleLogout} style={{ background: '#ef4444', color: 'white', fontSize: 10, padding: '8px 15px', borderRadius: 8, border: 'none', fontWeight: 900, cursor: 'pointer' }}>CERRAR SESIÓN</button>}
            </div>
          </div>
        )}
      </main>

      <nav style={{ position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)', width: '88%', maxWidth: 360, height: 55, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 8px 25px rgba(0,0,0,.4)', zIndex: 3000, background: isDark ? 'rgba(15,23,42,.95)' : 'rgba(255,255,255,.95)' }}>
        <button onClick={goHome} style={{ background: 'none', border: 'none', color: (view === 'home' || currentPath.startsWith('/evento/')) ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><LayoutList size={22} /></button>
        <button onClick={goFavorites} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b', cursor: 'pointer', position: 'relative' }}>
          <Heart size={22} fill={view === 'favorites' ? '#ef4444' : 'none'} />
          {favoriteEvents.length > 0 && <span style={{ position: 'absolute', top: -4, right: -8, background: '#ef4444', color: 'white', fontSize: 8, fontWeight: 900, borderRadius: 10, padding: '1px 5px', minWidth: 14, textAlign: 'center' }}>{favoriteEvents.length}</span>}
        </button>
        <button onClick={goCreate} style={{ background: 'none', border: 'none', color: view === 'create' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><PlusCircle size={22} /></button>
        <button onClick={goMap} style={{ background: 'none', border: 'none', color: view === 'map' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><MapIcon size={22} /></button>
      </nav>
    </div>
  );
}
