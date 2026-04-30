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
  const parts = String(dateStr).split('-');
  if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return dateStr;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '';
  }
}

function normalizeText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  const eventDate = new Date(dateStr + 'T23:59:59');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
}

function getDaysLabel(dateStr) {
  const days = getDaysLeft(dateStr);
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

async function compressImage(file, options = {}) {
  const maxSize = options.maxSize || 1600;
  const quality = options.quality || 0.82;

  if (!file || !file.type || file.type.indexOf('image/') !== 0) {
    throw new Error('Archivo no válido');
  }

  let img;
  if (typeof createImageBitmap === 'function') {
    img = await createImageBitmap(file);
  } else {
    img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = URL.createObjectURL(file);
    });
  }

  let targetWidth = img.width;
  let targetHeight = img.height;

  if (img.width > maxSize || img.height > maxSize) {
    if (img.width > img.height) {
      targetWidth = maxSize;
      targetHeight = Math.round((img.height * maxSize) / img.width);
    } else {
      targetHeight = maxSize;
      targetWidth = Math.round((img.width * maxSize) / img.height);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const webpBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  if (webpBlob && webpBlob.size > 0) {
    return { blob: webpBlob, extension: 'webp', type: 'image/webp', originalSize: file.size, compressedSize: webpBlob.size };
  }

  const jpegBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (jpegBlob && jpegBlob.size > 0) {
    return { blob: jpegBlob, extension: 'jpg', type: 'image/jpeg', originalSize: file.size, compressedSize: jpegBlob.size };
  }

  return { blob: file, extension: file.name.split('.').pop() || 'jpg', type: file.type, originalSize: file.size, compressedSize: file.size };
}

function fallbackCopyText(text, showToast) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('✅ Enlace copiado', 'success');
  } catch (err) {
    showToast('No se pudo copiar', 'error');
  }
  document.body.removeChild(textarea);
}

function Toast({ toast }) {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const bg = isSuccess ? 'rgba(22, 163, 74, 0.96)' : isError ? 'rgba(220, 38, 38, 0.96)' : 'rgba(79, 70, 229, 0.96)';
  const Icon = isSuccess ? CheckCircle : isError ? XCircle : Info;

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

function Splash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(() => {
      if (onDone) onDone();
    }, 1000);
    return () => clearTimeout(t);
  }, [onDone]);

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

function MapResizer({ center }) {
  const map = useMap();
  const prevCenter = useRef(null);

  useEffect(() => {
    map.invalidateSize();
    if (center) {
      const isNew = !prevCenter.current || prevCenter.current[0] !== center[0] || prevCenter.current[1] !== center[1];
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
  const headers = ['Titulo', 'Ciudad', 'Localidad', 'Direccion', 'Fecha', 'Hora', 'Categoria', 'Estado', 'Lat', 'Lng'];
  const rows = events.map((e) => {
    return [e.title || '', e.city || '', e.localidad || '', e.address || '', formatDate(e.date), e.time || '', e.category || '', e.status || '', e.lat || '', e.lng || '']
      .map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(';');
  });
  const csv = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'eventora_eventos_' + new Date().toISOString().split('T')[0] + '.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function EventCard({ ev, featured, isDark, favorites, animHeart, toggleFavorite, setSelectedEvent }) {
  const dl = getDaysLabel(ev.date);
  const isReallyFeatured = ev.featured === true;

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
          <button onClick={() => toggleFavorite(ev.id)} style={{
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
              <span style={{
                display: 'inline-block',
                marginLeft: 8,
                background: dl.bg,
                color: dl.color,
                padding: '2px 8px',
                borderRadius: 8,
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: 0
              }}>
                {dl.text}
              </span>
            )}
          </p>

          <h3 style={{ fontWeight: 900, fontSize: featured ? 17 : 15, marginBottom: 10 }}>{ev.title}</h3>
          <button onClick={() => setSelectedEvent(ev)} style={{
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

function AdminMiniCard({ ev, isDark, onClick, onApprove, onReject, onDelete, onView, onEdit, mode }) {
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
          <button onClick={(e) => { e.stopPropagation(); onApprove(); }} style={{ padding: 8, background: '#22c55e', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Check size={12} /> APROBAR
          </button>
          <button onClick={(e) => { e.stopPropagation(); onReject(); }} style={{ padding: 8, background: '#f59e0b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <X size={12} /> RECHAZAR
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ padding: 8, background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Trash2 size={12} /> BORRAR
          </button>
        </div>
      )}

      {mode === 'approved' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 10 }}>
          <button onClick={(e) => { e.stopPropagation(); onView(); }} style={{ padding: 8, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 9, cursor: 'pointer' }}>VER</button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ padding: 8, background: '#f59e0b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Edit3 size={12} /> EDITAR
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ padding: 8, background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Trash2 size={12} /> BORRAR
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('eventora_favs_v5');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapSearch, setMapSearch] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [userEmail, setUserEmail] = useState('');
  const [selectedPendingEvent, setSelectedPendingEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState(INITIAL_FORM);
  const [adminTab, setAdminTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [animHeart, setAnimHeart] = useState(null);
  const [toast, setToast] = useState(null);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCityFilter, setAdminCityFilter] = useState('TODAS');
  const [currentPath, setCurrentPath] = useState(() => {
    try {
      return window.location.pathname || '/';
    } catch {
      return '/';
    }
  });

  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [photoScale, setPhotoScale] = useState(1);
  const [photoPos, setPhotoPos] = useState({ x: 0, y: 0 });

  const listRef = useRef(null);
  const toastTimerRef = useRef(null);
  const mapSearchTimerRef = useRef(null);
  const lastNonEventPathRef = useRef(
    (() => {
      try {
        const p = window.location.pathname || '/';
        return p.startsWith('/evento/') ? '/' : p;
      } catch {
        return '/';
      }
    })()
  );
  const routeEventLookupRef = useRef('');
  const photoTouchRef = useRef({
    initialDistance: 0,
    initialScale: 1,
    lastX: 0,
    lastY: 0,
    isDragging: false
  });

  const hasAdmin = profile && profile.role === 'admin';

  function showToast(message, type = 'info') {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3600);
  }

  function navigateTo(path, replace = false) {
    const target = path || '/';
    try {
      if (!target.startsWith('/evento/')) {
        lastNonEventPathRef.current = target;
      }

      if (window.location.pathname !== target) {
        if (replace) {
          window.history.replaceState({}, '', target);
        } else {
          window.history.pushState({}, '', target);
        }
      }
      setCurrentPath(target);
    } catch {
      setCurrentPath(target);
    }
  }

  function resetDetailUi() {
    setIsPhotoZoomed(false);
    setPhotoScale(1);
    setPhotoPos({ x: 0, y: 0 });
  }

  function clearSelections() {
    setSelectedEvent(null);
    setSelectedPendingEvent(null);
    setEditingEvent(null);
    resetDetailUi();
  }

  function openEvent(ev) {
    if (!currentPath.startsWith('/evento/')) {
      lastNonEventPathRef.current = currentPath || '/';
    }
    setSelectedPendingEvent(null);
    setEditingEvent(null);
    resetDetailUi();
    setSelectedEvent(ev);
    navigateTo('/evento/' + ev.id);
  }

  function closeSelectedEvent() {
    const backPath = lastNonEventPathRef.current || '/';
    setSelectedEvent(null);
    resetDetailUi();
    navigateTo(backPath);
  }

  function goHome() {
    setView('home');
    clearSelections();
    setSearchQuery('');
    navigateTo('/');
  }

  function goFavorites() {
    setView('favorites');
    clearSelections();
    navigateTo('/favoritos');
  }

  function goCreate() {
    setView('create');
    clearSelections();
    navigateTo('/crear');
  }

  function goMap() {
    setView('map');
    clearSelections();
    navigateTo('/mapa');
  }

  function goProfile() {
    setView('profile');
    clearSelections();
    navigateTo('/perfil');
  }

  function goAdmin() {
    if (!hasAdmin) return;
    setView('admin');
    clearSelections();
    setAdminTab('pending');
    fetchEvents();
    navigateTo('/admin');
  }

  useEffect(() => {
    fetchEvents();
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (mapSearchTimerRef.current) clearTimeout(mapSearchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('eventora_favs_v5', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    function isAdminUser(user) { return !!(user && user.email && ADMIN_EMAILS.indexOf(user.email) !== -1); }
    function handleSession(session) {
      const user = session && session.user;
      setUserEmail(user ? user.email : '');
      setProfile(isAdminUser(user) ? { role: 'admin', email: user.email } : null);
      fetchEvents();
    }

    supabase.auth.getSession().then((res) => handleSession(res.data && res.data.session));
    const sub = supabase.auth.onAuthStateChange((event, session) => handleSession(session));

    return () => {
      if (sub && sub.data && sub.data.subscription) sub.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handlePopState() {
      const path = window.location.pathname || '/';
      setCurrentPath(path);
      if (!path.startsWith('/evento/')) {
        lastNonEventPathRef.current = path;
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (currentPath.startsWith('/evento/')) return;

    routeEventLookupRef.current = '';

    if (currentPath === '/') {
      setView('home');
      setSelectedEvent(null);
      setSelectedPendingEvent(null);
      setEditingEvent(null);
      resetDetailUi();
      return;
    }

    if (currentPath === '/favoritos') {
      setView('favorites');
      setSelectedEvent(null);
      setSelectedPendingEvent(null);
      setEditingEvent(null);
      resetDetailUi();
      return;
    }

    if (currentPath === '/crear') {
      setView('create');
      setSelectedEvent(null);
      setSelectedPendingEvent(null);
      setEditingEvent(null);
      resetDetailUi();
      return;
    }

    if (currentPath === '/mapa') {
      setView('map');
      setSelectedEvent(null);
      setSelectedPendingEvent(null);
      setEditingEvent(null);
      resetDetailUi();
      return;
    }

    if (currentPath === '/perfil') {
      setView('profile');
      setSelectedEvent(null);
      setSelectedPendingEvent(null);
      setEditingEvent(null);
      resetDetailUi();
      return;
    }

    if (currentPath === '/admin') {
      if (hasAdmin) {
        setView('admin');
        setSelectedEvent(null);
        setSelectedPendingEvent(null);
        setEditingEvent(null);
        resetDetailUi();
      } else {
        navigateTo('/', true);
      }
      return;
    }

    navigateTo('/', true);
  }, [currentPath, hasAdmin]);

  useEffect(() => {
    if (!currentPath.startsWith('/evento/')) return;

    const idFromUrl = currentPath.replace('/evento/', '').split('/')[0];
    if (!idFromUrl) {
      navigateTo('/', true);
      return;
    }

    const foundInState = events.find((e) =>
      String(e.id) === String(idFromUrl) && (e.status === 'approved' || hasAdmin)
    );

    if (foundInState) {
      setSelectedPendingEvent(null);
      setEditingEvent(null);
      resetDetailUi();
      setSelectedEvent(foundInState);
      routeEventLookupRef.current = idFromUrl;
      return;
    }

    if (routeEventLookupRef.current === idFromUrl) return;
    routeEventLookupRef.current = idFromUrl;

    supabase.from('events')
      .select('*')
      .eq('id', idFromUrl)
      .single()
      .then((res) => {
        if (res.error || !res.data || (res.data.status !== 'approved' && !hasAdmin)) {
          showToast('Evento no encontrado', 'error');
          setSelectedEvent(null);
          routeEventLookupRef.current = '';
          navigateTo('/', true);
          return;
        }

        setSelectedPendingEvent(null);
        setEditingEvent(null);
        resetDetailUi();
        setSelectedEvent(res.data);
      })
      .catch(() => {
        showToast('Evento no encontrado', 'error');
        setSelectedEvent(null);
        routeEventLookupRef.current = '';
        navigateTo('/', true);
      });
  }, [currentPath, events, hasAdmin]);

  function fetchEvents() {
    try {
      const cached = localStorage.getItem('eventora_cache_events_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        setEvents(parsed);
      }
    } catch {}

    supabase.from('events').select('*').order('date', { ascending: true }).then((res) => {
      if (res.error) {
        console.error('Error cargando eventos:', res.error);
        return;
      }
      const data = res.data || [];
      setEvents(data);
      try { localStorage.setItem('eventora_cache_events_v1', JSON.stringify(data)); } catch {}

      const validIds = data.map((e) => e.id);
      setFavorites((prev) => prev.filter((id) => validIds.indexOf(id) !== -1));
    });
  }

  function handleInputChange(e) {
    const name = e.target.name;
    let value = e.target.value;
    if (['title', 'city', 'localidad'].indexOf(name) !== -1) value = value.toUpperCase();
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleEditInputChange(e) {
    const name = e.target.name;
    let value = e.target.value;
    if (['title', 'city', 'localidad'].indexOf(name) !== -1) value = value.toUpperCase();
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleFavorite(id) {
    setFavorites((prev) => {
      if (prev.indexOf(id) !== -1) {
        showToast('Evento quitado de guardados', 'info');
        return prev.filter((x) => x !== id);
      }
      showToast('Evento guardado en favoritos', 'success');
      return prev.concat([id]);
    });
    setAnimHeart(id);
    setTimeout(() => setAnimHeart(null), 700);
  }

  async function uploadImageToStorage(file) {
    if (!file) throw new Error('No hay imagen');
    if (!file.type || file.type.indexOf('image/') !== 0) throw new Error('Selecciona una imagen válida');
    if (file.size > 12 * 1024 * 1024) throw new Error('La imagen es demasiado grande. Máximo 12MB');

    const optimized = await compressImage(file, { maxSize: 1600, quality: 0.82 });
    const safeName = Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + optimized.extension;
    const path = 'uploads/' + safeName;

    const upload = await supabase.storage.from('event-images').upload(path, optimized.blob, {
      cacheControl: '3600', upsert: false, contentType: optimized.type
    });

    if (upload.error) throw upload.error;

    const publicUrlData = supabase.storage.from('event-images').getPublicUrl(path);
    return { url: publicUrlData.data.publicUrl, originalSize: optimized.originalSize, compressedSize: optimized.compressedSize };
  }

  async function handleGalleryUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setIsGenerating(true);
    showToast('Optimizando imagen...', 'info');
    try {
      const result = await uploadImageToStorage(file);
      setForm((prev) => ({ ...prev, image_url: result.url }));
      const finalKb = Math.round(result.compressedSize / 1024);
      showToast(`Imagen subida (${finalKb}KB)`, 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error subiendo imagen', 'error');
    } finally {
      setIsGenerating(false);
      e.target.value = '';
    }
  }

  async function handleEditGalleryUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setIsGenerating(true);
    showToast('Optimizando nueva imagen...', 'info');
    try {
      const result = await uploadImageToStorage(file);
      setEditForm((prev) => ({ ...prev, image_url: result.url }));
      const finalKb = Math.round(result.compressedSize / 1024);
      showToast(`Nueva imagen subida (${finalKb}KB)`, 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error subiendo imagen', 'error');
    } finally {
      setIsGenerating(false);
      e.target.value = '';
    }
  }

  // ==================== MEJORA DE IA ====================
  function generateAIImage() {
    if (!form.title) {
      showToast('Escribe un título primero', 'error');
      return;
    }

    setIsGenerating(true);
    showToast('Generando imagen con IA...', 'info');

    const seed = Math.floor(Math.random() * 999999);

    // Prompt mejorado y contextual según la categoría
    let context = '';
    switch (form.category) {
      case 'MUSICA':
        context = 'live music concert, stage lights, crowd, energetic atmosphere';
        break;
      case 'GASTRONOMIA':
        context = 'delicious food festival, gourmet dishes, restaurant ambiance, culinary event';
        break;
      case 'TAURINO':
        context = 'bullfighting festival, traditional Spanish event, bullring, dramatic atmosphere';
        break;
      case 'FIESTAS PATRONALES':
        context = 'traditional Spanish festival, colorful decorations, parade, fireworks, celebration';
        break;
      default:
        context = 'vibrant community event, festive atmosphere, people celebrating';
    }

    const prompt = `professional high quality photograph of ${form.title}, ${context}, sharp focus, cinematic lighting, vibrant colors, event photography style, 8k`;

    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=600&seed=${seed}&nologo=true&t=${Date.now()}`;

    setForm((prev) => ({ ...prev, image_url: url }));
    setTimeout(() => {
      setIsGenerating(false);
      showToast('Imagen generada con IA', 'success');
    }, 1500);
  }

  function generateAIImageEdit() {
    if (!editForm.title) {
      showToast('Escribe un título primero', 'error');
      return;
    }

    setIsGenerating(true);
    showToast('Generando imagen con IA...', 'info');

    const seed = Math.floor(Math.random() * 999999);

    let context = '';
    switch (editForm.category) {
      case 'MUSICA': context = 'live music concert, stage lights, energetic atmosphere'; break;
      case 'GASTRONOMIA': context = 'gourmet food festival, culinary presentation'; break;
      case 'TAURINO': context = 'traditional bullfighting event, dramatic spanish festival'; break;
      case 'FIESTAS PATRONALES': context = 'colorful traditional festival, spanish celebration, fireworks'; break;
      default: context = 'festive community event, vibrant celebration';
    }

    const prompt = `professional high quality photograph of ${editForm.title}, ${context}, sharp focus, cinematic lighting, vibrant colors, event photography style, 8k`;

    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=600&seed=${seed}&nologo=true&t=${Date.now()}`;

    setEditForm((prev) => ({ ...prev, image_url: url }));
    setTimeout(() => {
      setIsGenerating(false);
      showToast('Imagen generada con IA', 'success');
    }, 1500);
  }
  // ==================== FIN MEJORA IA ====================

  function geocodeAddress(address, localidad, city) {
    const fullAddress = [address, localidad, city, 'España'].filter(Boolean).join(', ');
    return fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' + encodeURIComponent(fullAddress))
      .then((r) => r.json())
      .then((data) => {
        if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        return fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' + encodeURIComponent(city + ', España'))
          .then((r2) => r2.json())
          .then((data2) => {
            if (data2 && data2[0]) return { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) };
            return { lat: null, lng: null };
          });
      })
      .catch(() => ({ lat: null, lng: null }));
  }

  function handleSubmitEvent() {
    if (!form.title || !form.date || !form.city || !form.address) {
      showToast('Faltan campos: título, ciudad, fecha y dirección', 'error');
      return;
    }
    setIsSubmitting(true);
    showToast('Enviando evento a revisión...', 'info');

    geocodeAddress(form.address, form.localidad, form.city)
      .then((coords) => {
        const eventToInsert = {
          title: form.title.trim(), category: form.category, city: form.city.trim(),
          localidad: form.localidad ? form.localidad.trim() : null, address: form.address.trim(),
          date: form.date, time: form.time || '21:00', image_url: cleanImageUrl(form.image_url),
          status: 'pending', lat: coords.lat, lng: coords.lng, featured: false
        };
        return supabase.from('events').insert([eventToInsert]);
      })
      .then((res) => {
        if (res.error) {
          console.error(res.error);
          showToast('Error: ' + (res.error.message || 'No se pudo guardar'), 'error');
          return;
        }
        showToast('Evento enviado a revisión correctamente', 'success');
        setForm(INITIAL_FORM);
        goHome();
        fetchEvents();
      })
      .catch((err) => { console.error(err); showToast('Error al enviar', 'error'); })
      .finally(() => setIsSubmitting(false));
  }

  function startEditEvent(ev) {
    setEditingEvent(ev);
    setSelectedEvent(null);
    setSelectedPendingEvent(null);
    setEditForm({
      title: ev.title || '',
      city: ev.city || '',
      localidad: ev.localidad || '',
      address: ev.address || '',
      date: ev.date || '',
      time: ev.time ? String(ev.time).slice(0, 5) : '21:00',
      category: ev.category || 'MUSICA',
      image_url: ev.image_url || '',
      featured: ev.featured === true
    });
  }

  function cancelEditEvent() {
    setEditingEvent(null);
    setEditForm(INITIAL_FORM);
  }

  function handleSaveEditEvent() {
    if (!editingEvent) return;
    if (!editForm.title || !editForm.date || !editForm.city || !editForm.address) {
      showToast('Faltan campos obligatorios', 'error');
      return;
    }

    setIsSubmitting(true);
    showToast('Guardando cambios...', 'info');

    const addressChanged = editForm.address !== (editingEvent.address || '') ||
      editForm.city !== (editingEvent.city || '') ||
      editForm.localidad !== (editingEvent.localidad || '');

    const coordsPromise = addressChanged
      ? geocodeAddress(editForm.address, editForm.localidad, editForm.city)
      : Promise.resolve({ lat: editingEvent.lat || null, lng: editingEvent.lng || null });

    coordsPromise
      .then((coords) => {
        const updateData = {
          title: editForm.title.trim(), category: editForm.category, city: editForm.city.trim(),
          localidad: editForm.localidad ? editForm.localidad.trim() : null, address: editForm.address.trim(),
          date: editForm.date, time: editForm.time || '21:00',
          image_url: cleanImageUrl(editForm.image_url),
          lat: coords.lat, lng: coords.lng,
          featured: editForm.featured === true
        };
        return supabase.from('events').update(updateData).eq('id', editingEvent.id);
      })
      .then((res) => {
        if (res.error) { console.error(res.error); showToast('Error guardando', 'error'); return; }
        showToast('Evento actualizado correctamente', 'success');
        setEditingEvent(null);
        setEditForm(INITIAL_FORM);
        fetchEvents();
        setAdminTab('approved');
      })
      .catch((err) => { console.error(err); showToast('Error guardando', 'error'); })
      .finally(() => setIsSubmitting(false));
  }

  function handleApproveEvent(id) {
    supabase.from('events').update({ status: 'approved' }).eq('id', id).then((res) => {
      if (res.error) { showToast('Error aprobando', 'error'); return; }
      showToast('Evento aprobado', 'success');
      setSelectedPendingEvent(null);
      fetchEvents();
    });
  }

  function handleRejectEvent(id) {
    supabase.from('events').update({ status: 'rejected' }).eq('id', id).then((res) => {
      if (res.error) { showToast('Error rechazando', 'error'); return; }
      showToast('Evento rechazado', 'info');
      setSelectedPendingEvent(null);
      fetchEvents();
    });
  }

  function handleDeleteEvent(id) {
    if (!window.confirm('¿Seguro que quieres borrar este evento?')) return;
    const wasSelected = selectedEvent && selectedEvent.id === id;

    supabase.from('events').delete().eq('id', id).then((res) => {
      if (res.error) { showToast('Error borrando', 'error'); return; }
      showToast('Evento borrado', 'success');
      setSelectedPendingEvent(null);
      setEditingEvent(null);
      if (wasSelected) {
        closeSelectedEvent();
      }
      fetchEvents();
    });
  }

  function handleLogin() {
    const email = prompt('Escribe tu email:');
    if (!email) return;

    const redirectUrl = APP_URL + (currentPath || '/');

    supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectUrl } }).then((res) => {
      if (res.error) { console.error(res.error); showToast('Error enviando login', 'error'); return; }
      showToast('Revisa tu email y pulsa el enlace', 'success');
    });
  }

  function handleLogout() {
    supabase.auth.signOut().then(() => {
      setUserEmail('');
      setProfile(null);
      fetchEvents();
      goHome();
      setEditingEvent(null);
      showToast('Sesión cerrada', 'success');
    });
  }

  function handleMapSearchChange(e) {
    const value = e.target.value;
    setMapSearch(value);

    if (mapSearchTimerRef.current) clearTimeout(mapSearchTimerRef.current);

    if (!value || value.length < 3) return;

    mapSearchTimerRef.current = setTimeout(() => {
      fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&countrycodes=es&q=' + encodeURIComponent(value))
        .then((r) => r.json())
        .then((data) => {
          if (data && data[0]) {
            setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          } else {
            showToast('No se encontró el lugar', 'error');
          }
        })
        .catch(() => showToast('Error buscando lugar', 'error'));
    }, 600);
  }

  function shareEvent(ev) {
    const shareUrl = `${APP_URL}/evento/${ev.id}`;
    const shareText = `¡No te pierdas ${ev.title}! ${shareUrl}`;

    const shareOptions = [
      { name: 'WhatsApp', icon: '📱', url: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
      { name: 'Facebook', icon: '📘', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
      { name: 'Twitter/X', icon: '🐦', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}` },
      { name: 'Copiar en portapapeles', icon: '📋', action: 'copy' }
    ];

    const shareModal = document.createElement('div');
    shareModal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 99999; display: flex; align-items: center; justify-content: center;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: ${isDark ? '#0f172a' : '#fff'}; border-radius: 20px; padding: 25px; width: 90%; max-width: 360px; color: ${isDark ? '#fff' : '#0f172a'};
    `;

    modalContent.innerHTML = `
      <h3 style="margin:0 0 20px; font-weight:900; text-align:center; font-size:16px;">Compartir evento</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
        ${shareOptions.map(opt => `
          <button class="share-btn" data-action="${opt.action || 'link'}" data-url="${opt.url}" style="
            padding:14px; border:none; border-radius:12px; font-weight:900; font-size:11px; cursor:pointer;
            background: ${isDark ? '#1e293b' : '#f1f5f9'}; color: ${isDark ? '#fff' : '#0f172a'};
            display:flex; align-items:center; justify-content:center; gap:8px;
          ">
            ${opt.icon} ${opt.name}
          </button>
        `).join('')}
      </div>
      <button id="close-share-modal" style="
        width:100%; padding:12px; border:none; border-radius:12px; background:#64748b; color:white;
        font-weight:900; font-size:12px; cursor:pointer;
      ">CERRAR</button>
    `;

    shareModal.appendChild(modalContent);
    document.body.appendChild(shareModal);

    function closeModal() {
      shareModal.remove();
    }

    shareModal.addEventListener('click', (e) => {
      if (e.target === shareModal) closeModal();
    });

    document.getElementById('close-share-modal').addEventListener('click', closeModal);

    document.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        const url = e.currentTarget.dataset.url;

        if (action === 'copy') {
          navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('✅ Enlace copiado al portapapeles', 'success');
          }).catch(() => {
            showToast('❌ No se pudo copiar el enlace', 'error');
          });
        } else {
          window.open(url, '_blank');
        }
        closeModal();
      });
    });
  }

  function handleCategoryChange(cat) {
    setSelectedCategory(cat);
    if (listRef.current) listRef.current.scrollTop = 0;
  }

  function enterPhotoZoom() {
    setIsPhotoZoomed(true);
    setPhotoScale(1);
    setPhotoPos({ x: 0, y: 0 });
  }

  function exitPhotoZoom() {
    setIsPhotoZoomed(false);
    setPhotoScale(1);
    setPhotoPos({ x: 0, y: 0 });
  }

  function getDistance(touches) {
    if (!touches || touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handlePhotoTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getDistance(e.touches);
      photoTouchRef.current.initialDistance = dist;
      photoTouchRef.current.initialScale = photoScale;
    } else if (e.touches.length === 1) {
      photoTouchRef.current.lastX = e.touches[0].clientX;
      photoTouchRef.current.lastY = e.touches[0].clientY;
      photoTouchRef.current.isDragging = true;
    }
  }

  function handlePhotoTouchMove(e) {
    if (!isPhotoZoomed) return;

    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getDistance(e.touches);
      const scale = dist / photoTouchRef.current.initialDistance;
      const newScale = Math.min(Math.max(photoTouchRef.current.initialScale * scale, 1), 5);
      setPhotoScale(newScale);
    } else if (e.touches.length === 1 && photoScale > 1) {
      e.preventDefault();

      const slowFactor = 0.55;

      const dx = e.touches[0].clientX - photoTouchRef.current.lastX;
      const dy = e.touches[0].clientY - photoTouchRef.current.lastY;

      setPhotoPos(prev => ({
        x: prev.x + (dx * slowFactor),
        y: prev.y + (dy * slowFactor)
      }));

      photoTouchRef.current.lastX = e.touches[0].clientX;
      photoTouchRef.current.lastY = e.touches[0].clientY;
    }
  }

  function handlePhotoTouchEnd() {
    if (photoScale <= 1.05) {
      exitPhotoZoom();
    }
    photoTouchRef.current.isDragging = false;
  }

  function eventMatchesAdminFilters(e) {
    const cityOk = adminCityFilter === 'TODAS' || e.city === adminCityFilter;
    if (!cityOk) return false;
    const q = normalizeText(adminSearch).trim();
    if (!q) return true;
    const haystack = normalizeText([e.title, e.city, e.localidad, e.address, e.category, e.status, e.date, e.time].join(' '));
    const terms = q.split(/\s+/).filter(Boolean);
    return terms.every((term) => haystack.indexOf(term) !== -1);
  }

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter((e) => e.status === 'approved' && e.date >= today);

  const searchedEvents = searchQuery
    ? publicEvents.filter((e) => {
        const q = normalizeText(searchQuery).trim();
        const terms = q.split(/\s+/).filter(Boolean);
        const haystack = normalizeText([e.title, e.city, e.localidad, e.address, e.category, e.date].join(' '));
        return terms.every((term) => haystack.indexOf(term) !== -1);
      })
    : publicEvents;

  const categoryEvents = searchedEvents.filter((e) => selectedCategory === 'TODOS' || e.category === selectedCategory);

  const filteredEvents = categoryEvents.filter((e) => {
    if (dateFilter === 'today') return e.date === today;
    if (dateFilter === 'week') {
      const eventDate = new Date(e.date);
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return eventDate >= now && eventDate <= weekEnd;
    }
    return true;
  });

  const favoriteEvents = publicEvents.filter((e) => favorites.indexOf(e.id) !== -1);
  const rawPendingEvents = hasAdmin ? events.filter((e) => e.status === 'pending') : [];
  const rawApprovedEvents = hasAdmin ? events.filter((e) => e.status === 'approved') : [];
  const pendingEvents = rawPendingEvents.filter(eventMatchesAdminFilters);
  const approvedEvents = rawApprovedEvents.filter(eventMatchesAdminFilters);

  const adminCitiesList = [];
  events.forEach((e) => { if (e.city && adminCitiesList.indexOf(e.city) === -1) adminCitiesList.push(e.city); });
  adminCitiesList.sort();

  const sortedFiltered = filteredEvents.slice().sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  const featuredEvent = sortedFiltered.length ? sortedFiltered[0] : null;
  const restEvents = sortedFiltered.length ? sortedFiltered.slice(1) : [];
  const adminFiltersActive = adminSearch.trim() || adminCityFilter !== 'TODAS';

  const INPUT_STYLE = {
    width: '100%', padding: 12, borderRadius: 10, border: 'none',
    background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700
  };

  if (showSplash) return <Splash onDone={() => setShowSplash(false)} />;

  return (
    <div className={isDark ? 'dark-theme' : 'light-theme'} style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Toast toast={toast} />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; transition: background-color .25s, color .25s; }
        html, body, #root { width: 100%; height: 100%; overflow: hidden; }
        .dark-theme { background:#020617; color:white; }
        .light-theme { background:#f8fafc; color:#0f172a; }
        .card-dark { background:#0f172a; border:1px solid #1e293b; color:white; }
        .card-light { background:white; border:1px solid #e2e8f0; color:#0f172a; box-shadow:0 4px 12px rgba(0,0,0,.05); }
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        .leaflet-container img { max-width:none!important; max-height:none!important; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .animate-spin { animation:spin 1s linear infinite; }
        @keyframes admin-pulse { 0%{transform:scale(1);color:#818cf8;} 50%{transform:scale(1.2);color:#ef4444;} 100%{transform:scale(1);color:#818cf8;} }
        .pulse-admin { animation:admin-pulse 1.4s infinite; }
        @keyframes heartPop { 0%{transform:scale(1);} 30%{transform:scale(1.5);} 60%{transform:scale(.9);} 100%{transform:scale(1);} }
        .heart-pop { animation:heartPop .6s ease-out; }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .share-btn:hover { background: ${isDark ? '#334155' : '#e2e8f0'} !important; }
        @media (max-width: 320px) {
          .share-btn { font-size: 10px !important; padding: 12px !important; }
        }
      `}</style>

      <nav style={{ height: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,.2)', background: isDark ? '#0f172a' : '#fff', flexShrink: 0 }}>
        <div style={{ cursor: 'pointer' }} onClick={goHome}>
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" alt="Eventora" style={{ height: 18, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasAdmin && (
            <button onClick={goAdmin} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <ShieldCheck size={21} className={rawPendingEvents.length > 0 ? 'pulse-admin' : ''} style={{ color: '#6366f1' }} />
              {rawPendingEvents.length > 0 && (
                <span style={{ position: 'absolute', top: -8, right: -10, background: '#ef4444', color: 'white', fontSize: 8, fontWeight: 900, borderRadius: 999, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid ' + (isDark ? '#0f172a' : '#fff') }}>
                  {rawPendingEvents.length}
                </span>
              )}
            </button>
          )}
          {!userEmail && (
            <button onClick={handleLogin} style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 8, fontWeight: 900, cursor: 'pointer' }}>LOGIN</button>
          )}
          <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
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
                <input
                  type="text"
                  value={mapSearch}
                  onChange={handleMapSearchChange}
                  placeholder="Buscar ciudad, pueblo o lugar..."
                  style={{ width: '100%', padding: 10, border: 'none', outline: 'none', fontWeight: 700, fontSize: 12, color: '#0f172a', background: 'transparent' }}
                />
                {mapSearch && (
                  <button onClick={() => { setMapSearch(''); setMapCenter(null); }} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 900 }}>X</button>
                )}
              </div>
            </div>

            <MapContainer center={[40.41, -3.70]} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <MapResizer center={mapCenter} />
              <TileLayer url={isDark ? darkTileUrl : lightTileUrl} attribution="Google Maps" maxZoom={20} />
              {publicEvents.map((ev) => {
                if (!ev.lat || !ev.lng) return null;
                return (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]} icon={redPinIcon}>
                    <Popup>
                      <b>{ev.title}</b><br />
                      {ev.address}, {ev.localidad || ''} - {ev.city}<br />
                      {formatDate(ev.date)}
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        )}

        {view === 'home' && !selectedEvent && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 12px', flexShrink: 0, background: isDark ? '#020617' : '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isDark ? '#1e293b' : '#e2e8f0', borderRadius: 12, padding: '6px 12px' }}>
                <Search size={16} color="#6366f1" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar evento, ciudad, localidad..." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: 11, color: 'inherit' }} />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer' }}>X</button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, padding: '6px 12px', flexShrink: 0 }}>
              {[{ k: 'all', l: 'TODOS' }, { k: 'today', l: 'HOY' }, { k: 'week', l: 'ESTA SEMANA' }].map((f) => (
                <button key={f.k} onClick={() => setDateFilter(f.k)} style={{ padding: '5px 10px', borderRadius: 10, border: 'none', background: dateFilter === f.k ? '#22c55e' : 'transparent', color: dateFilter === f.k ? 'white' : '#6366f1', fontSize: 8, fontWeight: 900, cursor: 'pointer' }}>{f.l}</button>
              ))}
            </div>

            <div className="no-scrollbar" style={{ display: 'flex', gap: 8, padding: '8px 12px', overflowX: 'auto', flexShrink: 0 }}>
              {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map((cat) => (
                <button key={cat} onClick={() => handleCategoryChange(cat)} style={{ padding: '7px 15px', borderRadius: 25, border: 'none', background: selectedCategory === cat ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: selectedCategory === cat ? 'white' : 'inherit', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 }}>{cat}</button>
              ))}
            </div>

            <div style={{ padding: '4px 12px', fontSize: 9, color: '#6366f1', fontWeight: 800, flexShrink: 0 }}>
              {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''}
            </div>

            <div ref={listRef} className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 15, paddingBottom: 120 }}>
              {filteredEvents.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: 60, opacity: 0.5 }}>
                  <Search size={40} style={{ margin: '0 auto 15px' }} />
                  <p style={{ fontWeight: 900, fontSize: 14 }}>NO SE ENCONTRARON EVENTOS</p>
                  <p style={{ fontSize: 10, marginTop: 8 }}>Prueba con otra búsqueda o categoría</p>
                </div>
              )}

              {featuredEvent && <EventCard ev={featuredEvent} featured={true} isDark={isDark} favorites={favorites} animHeart={animHeart} toggleFavorite={toggleFavorite} setSelectedEvent={openEvent} />}
              {restEvents.map((ev) => <EventCard key={ev.id} ev={ev} featured={false} isDark={isDark} favorites={favorites} animHeart={animHeart} toggleFavorite={toggleFavorite} setSelectedEvent={openEvent} />)}
            </div>
          </div>
        )}

        {selectedEvent && !selectedPendingEvent && !editingEvent && (
          <>
            {isPhotoZoomed ? (
              <div
                style={{
                  position: 'fixed', inset: 0, zIndex: 99999, background: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', touchAction: 'none'
                }}
                onTouchStart={handlePhotoTouchStart}
                onTouchMove={handlePhotoTouchMove}
                onTouchEnd={handlePhotoTouchEnd}
              >
                <img
                  src={selectedEvent.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'}
                  alt=""
                  draggable={false}
                  style={{
                    width: '100%', height: '100%', objectFit: 'contain',
                    transform: 'scale(' + photoScale + ') translate(' + photoPos.x + 'px, ' + photoPos.y + 'px)',
                    transition: 'transform 0.1s ease-out'
                  }}
                />
                <button
                  onClick={exitPhotoZoom}
                  style={{
                    position: 'absolute', top: 40, right: 20,
                    background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                    color: 'white', border: 'none', padding: '10px 20px', borderRadius: 999,
                    fontWeight: 900, fontSize: 12, cursor: 'pointer', zIndex: 100000,
                    display: 'flex', alignItems: 'center', gap: 6
                  }}
                >
                  <X size={16}/> CERRAR
                </button>
                <div style={{
                  position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
                  color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700,
                  pointerEvents: 'none', textAlign: 'center'
                }}>
                  Usa dos dedos para zoom · Pellizca hacia afuera para volver
                </div>
              </div>
            ) : (
              <div className="no-scrollbar" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '6px 10px 0', flexShrink: 0 }}>
                  <button onClick={closeSelectedEvent} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 4, cursor: 'pointer', fontSize: 11 }}>
                    <ArrowLeft size={14} /> VOLVER
                  </button>
                </div>

                <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: '15px 15px 0 0', overflow: 'hidden', padding: 0, flex: 1, display: 'flex', flexDirection: 'column', margin: '0 8px', overflowY: 'auto' }}>
                  <div
                    onClick={enterPhotoZoom}
                    style={{
                      position: 'relative', width: '100%', height: 220, cursor: 'zoom-in',
                      overflow: 'hidden', flexShrink: 0,
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9'
                    }}
                  >
                    {!selectedEvent.image_url || !selectedEvent.image_url.includes('http') ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        height: '100%', width: '100%'
                      }}>
                        <Loader2 className="animate-spin" size={32} color="#6366f1" />
                      </div>
                    ) : (
                      <img
                        src={selectedEvent.image_url}
                        alt={selectedEvent.title}
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                          opacity: 0, transition: 'opacity 0.3s ease'
                        }}
                        loading="lazy"
                        onLoad={(e) => { e.target.style.opacity = '1'; }}
                      />
                    )}
                    <div style={{
                      position: 'absolute', bottom: 8, right: 8,
                      background: 'rgba(0,0,0,0.6)', color: 'white',
                      padding: '4px 8px', borderRadius: 8, fontSize: 9, fontWeight: 900, pointerEvents: 'none'
                    }}>
                      🔍 Pulsa para zoom
                    </div>
                  </div>

                  <div style={{ padding: 12, flex: 1 }}>
                    <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>
                      {categoryEmojis[selectedEvent.category] || '📌'}
                    </p>
                    <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 8 }}>{selectedEvent.title}</h2>

                    <div style={{ display: 'flex', gap: 15, marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 4, fontSize: 11, alignItems: 'center' }}>
                        <Calendar color="#6366f1" size={13} /> <b>{formatDate(selectedEvent.date)}</b>
                      </div>
                      <div style={{ display: 'flex', gap: 4, fontSize: 11, alignItems: 'center' }}>
                        <Clock color="#6366f1" size={13} /> <b>{selectedEvent.time}H</b>
                      </div>
                    </div>

                    {getDaysLabel(selectedEvent.date) && (
                      <div style={{ display: 'inline-block', background: getDaysLabel(selectedEvent.date).bg, color: getDaysLabel(selectedEvent.date).color, padding: '3px 10px', borderRadius: 8, fontSize: 9, fontWeight: 900, marginBottom: 8 }}>
                        {getDaysLabel(selectedEvent.date).text}
                      </div>
                    )}

                    <div onClick={() => window.open('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(selectedEvent.address + ' ' + (selectedEvent.localidad || '') + ' ' + selectedEvent.city))} style={{ background: 'rgba(99,102,241,.1)', padding: 10, borderRadius: 8, cursor: 'pointer', textAlign: 'center', border: '1px dashed #6366f1', marginBottom: 8 }}>
                      <MapPin color="#6366f1" size={14} style={{ margin: '0 auto 2px' }} />
                      <b style={{ fontSize: 10 }}>{selectedEvent.address}, {selectedEvent.localidad || ''} - {selectedEvent.city}</b><br />
                      <span style={{ fontSize: 8, color: '#2563eb', fontWeight: 900 }}>GPS GOOGLE MAPS</span>
                    </div>

                    <button onClick={() => shareEvent(selectedEvent)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 12, background: 'rgba(34,197,94,.1)', border: '1px dashed #22c55e', borderRadius: 8, color: '#22c55e', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>
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
                <input name="date" type="date" style={{ ...INPUT_STYLE, padding: 8 }} value={form.date} onChange={handleInputChange} />
                <input name="time" type="time" style={{ ...INPUT_STYLE, padding: 8 }} value={form.time} onChange={handleInputChange} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button onClick={generateAIImage} disabled={isGenerating} style={{ padding: 10, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
                  {isGenerating ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} IA FOTO
                </button>
                <label style={{ padding: 10, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>
                  GALERÍA
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleGalleryUpload} />
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
            <button onClick={cancelEditEvent} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}>
              <ArrowLeft size={16} /> CANCELAR EDICIÓN
            </button>

            <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 15, borderRadius: 20, gap: 8, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 15 }}>EDITAR EVENTO</h2>
              <input name="title" placeholder="TÍTULO" style={INPUT_STYLE} value={editForm.title} onChange={handleEditInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 6 }}>
                <input name="city" placeholder="CIUDAD" style={INPUT_STYLE} value={editForm.city} onChange={handleEditInputChange} />
                <select name="category" style={INPUT_STYLE} value={editForm.category} onChange={handleEditInputChange}>
                  <option value="MUSICA">MUSICA</option>
                  <option value="GASTRONOMIA">GASTRONOMIA</option>
                  <option value="TAURINO">TAURINO</option>
                  <option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option>
                  <option value="OTROS">OTROS</option>
                </select>
              </div>
              <input name="localidad" placeholder="LOCALIDAD" style={INPUT_STYLE} value={editForm.localidad} onChange={handleEditInputChange} />
              <input name="address" placeholder="DIRECCIÓN" style={INPUT_STYLE} value={editForm.address} onChange={handleEditInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <input name="date" type="date" style={{ ...INPUT_STYLE, padding: 8 }} value={editForm.date} onChange={handleEditInputChange} />
                <input name="time" type="time" style={{ ...INPUT_STYLE, padding: 8 }} value={editForm.time} onChange={handleEditInputChange} />
              </div>

              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                background: editForm.featured ? 'rgba(34,197,94,.15)' : 'rgba(128,128,128,0.1)',
                borderRadius: 10, cursor: 'pointer',
                border: editForm.featured ? '2px solid #22c55e' : '2px solid transparent'
              }}>
                <input
                  type="checkbox"
                  checked={editForm.featured === true}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, featured: e.target.checked }))}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <Star size={16} fill={editForm.featured ? '#22c55e' : 'none'} color={editForm.featured ? '#22c55e' : '#6366f1'} />
                <span style={{ fontSize: 12, fontWeight: 900, color: editForm.featured ? '#22c55e' : 'inherit' }}>
                  MARCAR COMO DESTACADO
                </span>
              </label>

              <input name="image_url" placeholder="URL DE IMAGEN" style={INPUT_STYLE} value={editForm.image_url} onChange={handleEditInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button onClick={generateAIImageEdit} disabled={isGenerating} style={{ padding: 10, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
                  {isGenerating ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} NUEVA IA
                </button>
                <label style={{ padding: 10, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>
                  NUEVA GALERÍA
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditGalleryUpload} />
                </label>
              </div>
              {editForm.image_url && <img src={editForm.image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12 }} />}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                <button onClick={cancelEditEvent} disabled={isSubmitting} style={{ width: '100%', background: '#64748b', color: 'white', padding: 13, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 11, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  CANCELAR
                </button>
                <button onClick={handleSaveEditEvent} disabled={isSubmitting} style={{ width: '100%', background: '#22c55e', color: 'white', padding: 13, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 11, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Guardando...' : 'GUARDAR'}
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'admin' && !selectedPendingEvent && !editingEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <button onClick={goHome} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}>
              <ArrowLeft size={16} /> VOLVER
            </button>

            <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 18, padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 900 }}>PANEL ADMIN</p>
                  <p style={{ fontSize: 9, opacity: 0.65 }}>{userEmail || 'No conectado'}</p>
                </div>
                <button onClick={() => { fetchEvents(); showToast('Eventos actualizados', 'success'); }} style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: 'rgba(99,102,241,.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <RefreshCw size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ background: 'rgba(239,68,68,.12)', color: '#ef4444', borderRadius: 14, padding: 10, textAlign: 'center', fontWeight: 900, fontSize: 11 }}>
                  {rawPendingEvents.length}<br /><span style={{ fontSize: 8 }}>PENDIENTES</span>
                </div>
                <div style={{ background: 'rgba(34,197,94,.12)', color: '#22c55e', borderRadius: 14, padding: 10, textAlign: 'center', fontWeight: 900, fontSize: 11 }}>
                  {rawApprovedEvents.length}<br /><span style={{ fontSize: 8 }}>APROBADOS</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isDark ? '#1e293b' : '#e2e8f0', borderRadius: 12, padding: '6px 10px', marginBottom: 8 }}>
                <Search size={15} color="#6366f1" />
                <input value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} placeholder="Buscar por título, ciudad, dirección..." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'inherit', fontWeight: 800, fontSize: 10 }} />
                {adminSearch && <button onClick={() => setAdminSearch('')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 900 }}>X</button>}
              </div>

              <select value={adminCityFilter} onChange={(e) => setAdminCityFilter(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 12, border: 'none', outline: 'none', background: isDark ? '#1e293b' : '#e2e8f0', color: 'inherit', fontWeight: 900, fontSize: 10 }}>
                <option value="TODAS">TODAS LAS CIUDADES</option>
                {adminCitiesList.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>

              {adminFiltersActive && (
                <button onClick={() => { setAdminSearch(''); setAdminCityFilter('TODAS'); }} style={{ width: '100%', marginTop: 8, padding: 8, borderRadius: 10, border: 'none', background: 'rgba(99,102,241,.12)', color: '#6366f1', fontWeight: 900, fontSize: 9, cursor: 'pointer' }}>
                  LIMPIAR FILTROS
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <button onClick={() => { setAdminTab('pending'); fetchEvents(); }} style={{ padding: 10, borderRadius: 12, border: 'none', background: adminTab === 'pending' ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: adminTab === 'pending' ? 'white' : 'inherit', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>
                PENDIENTES ({pendingEvents.length}{adminFiltersActive ? '/' + rawPendingEvents.length : ''})
              </button>
              <button onClick={() => { setAdminTab('approved'); fetchEvents(); }} style={{ padding: 10, borderRadius: 12, border: 'none', background: adminTab === 'approved' ? '#22c55e' : (isDark ? '#1e293b' : '#e2e8f0'), color: adminTab === 'approved' ? 'white' : 'inherit', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>
                APROBADOS ({approvedEvents.length}{adminFiltersActive ? '/' + rawApprovedEvents.length : ''})
              </button>
            </div>

            {adminTab === 'approved' && approvedEvents.length > 0 && (
              <button onClick={() => exportToCSV(approvedEvents)} style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'rgba(99,102,241,.1)', color: '#6366f1', fontWeight: 900, fontSize: 10, cursor: 'pointer', marginBottom: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Download size={14} /> EXPORTAR RESULTADOS A CSV
              </button>
            )}

            {adminTab === 'pending' && pendingEvents.length === 0 && <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS PENDIENTES</p>}
            {adminTab === 'pending' && pendingEvents.map((ev) => (
              <AdminMiniCard key={ev.id} ev={ev} isDark={isDark} mode="pending"
                onClick={() => setSelectedPendingEvent(ev)}
                onApprove={() => handleApproveEvent(ev.id)}
                onReject={() => handleRejectEvent(ev.id)}
                onDelete={() => handleDeleteEvent(ev.id)} />
            ))}

            {adminTab === 'approved' && approvedEvents.length === 0 && <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS APROBADOS</p>}
            {adminTab === 'approved' && approvedEvents.map((ev) => (
              <AdminMiniCard key={ev.id} ev={ev} isDark={isDark} mode="approved"
                onClick={() => openEvent(ev)}
                onView={() => openEvent(ev)}
                onEdit={() => startEditEvent(ev)}
                onDelete={() => handleDeleteEvent(ev.id)} />
            ))}
          </div>
        )}

        {view === 'admin' && selectedPendingEvent && !editingEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <button onClick={() => setSelectedPendingEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}>
              <ArrowLeft size={16} /> VOLVER A LISTA
            </button>

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
                  <button onClick={() => handleApproveEvent(selectedPendingEvent.id)} style={{ padding: 12, background: '#22c55e', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>APROBAR</button>
                  <button onClick={() => handleRejectEvent(selectedPendingEvent.id)} style={{ padding: 12, background: '#f59e0b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>RECHAZAR</button>
                  <button onClick={() => handleDeleteEvent(selectedPendingEvent.id)} style={{ padding: 12, background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>BORRAR</button>
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
            ) : favoriteEvents.map((ev) => {
              const dl = getDaysLabel(ev.date);
              return (
                <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ display: 'flex', gap: 10, padding: 10, borderRadius: 18, marginBottom: 8, alignItems: 'center', cursor: 'pointer' }} onClick={() => openEvent(ev)}>
                  <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" style={{ width: 45, height: 45, borderRadius: 10, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 900, fontSize: 13 }}>{ev.title}</p>
                    <p style={{ fontSize: 9, color: '#6366f1' }}>{ev.city}</p>
                    {dl && <span style={{ fontSize: 8, color: dl.color, fontWeight: 900, background: dl.bg, padding: '2px 6px', borderRadius: 6 }}>{dl.text}</span>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={18} />
                  </button>
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
                <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 14, borderRadius: 12, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>
                  ☕ INVITAR A UN CAFÉ (KO-FI)
                </a>
                <a href="https://paypal.me/EVENTORA" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 14, borderRadius: 12, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>
                  💙 APOYAR EN PAYPAL
                </a>
              </div>
              {!userEmail ? (
                <button onClick={handleLogin} style={{ background: '#4f46e5', color: 'white', fontSize: 10, padding: '8px 15px', borderRadius: 8, border: 'none', fontWeight: 900, cursor: 'pointer' }}>LOGIN</button>
              ) : (
                <button onClick={handleLogout} style={{ background: '#ef4444', color: 'white', fontSize: 10, padding: '8px 15px', borderRadius: 8, border: 'none', fontWeight: 900, cursor: 'pointer' }}>CERRAR SESIÓN</button>
              )}
            </div>
          </div>
        )}
      </main>

      <nav style={{ position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)', width: '88%', maxWidth: 360, height: 55, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 8px 25px rgba(0,0,0,.4)', zIndex: 3000, background: isDark ? 'rgba(15,23,42,.95)' : 'rgba(255,255,255,.95)' }}>
        <button onClick={goHome} style={{ background: 'none', border: 'none', color: (view === 'home' || currentPath.startsWith('/evento/')) ? '#4f46e5' : '#64748b', cursor: 'pointer' }}>
          <LayoutList size={22} />
        </button>
        <button onClick={goFavorites} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b', cursor: 'pointer', position: 'relative' }}>
          <Heart size={22} fill={view === 'favorites' ? '#ef4444' : 'none'} />
          {favoriteEvents.length > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -8, background: '#ef4444', color: 'white', fontSize: 8, fontWeight: 900, borderRadius: 10, padding: '1px 5px', minWidth: 14, textAlign: 'center' }}>{favoriteEvents.length}</span>
          )}
        </button>
        <button onClick={goCreate} style={{ background: 'none', border: 'none', color: view === 'create' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}>
          <PlusCircle size={22} />
        </button>
        <button onClick={goMap} style={{ background: 'none', border: 'none', color: view === 'map' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}>
          <MapIcon size={22} />
        </button>
      </nav>
    </div>
  );
}
