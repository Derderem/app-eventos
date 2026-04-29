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
    const t = setTimeout(onDone, 1000);
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
      {/* ... (sin cambios) ... */}
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

  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [photoScale, setPhotoScale] = useState(1);
  const [photoPos, setPhotoPos] = useState({ x: 0, y: 0 });

  const listRef = useRef(null);
  const toastTimerRef = useRef(null);
  const mapSearchTimerRef = useRef(null);
  
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

  // ... (todas las funciones fetchEvents, handleSubmitEvent, shareEvent, etc. se mantienen exactamente igual) ...

  function goHome() {
    setView('home');
    setSelectedEvent(null);
    setSelectedPendingEvent(null);
    setEditingEvent(null);
    setIsPhotoZoomed(false);
    setSearchQuery('');
    window.history.pushState({}, '', '/');
  }

  // ==================== ZOOM DE FOTO ====================
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

  const getDistance = (touches) => {
    if (!touches || touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

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
    } 
    else if (e.touches.length === 1 && photoScale > 1) {
      e.preventDefault();
      const sensitivity = 0.62; // ← Valor ajustado (más bajo = más lento)
      const dx = (e.touches[0].clientX - photoTouchRef.current.lastX) * sensitivity;
      const dy = (e.touches[0].clientY - photoTouchRef.current.lastY) * sensitivity;
      
      setPhotoPos(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));

      photoTouchRef.current.lastX = e.touches[0].clientX;
      photoTouchRef.current.lastY = e.touches[0].clientY;
    }
  }

  function handlePhotoTouchEnd() {
    if (photoScale <= 1.08) {
      exitPhotoZoom();
    }
    photoTouchRef.current.isDragging = false;
  }
  // =====================================================

  // ... (el resto del código de filtros, admin, etc. se mantiene igual) ...

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter((e) => e.status === 'approved' && e.date >= today);
  const searchedEvents = searchQuery ? publicEvents.filter((e) => {
    const q = normalizeText(searchQuery).trim();
    const terms = q.split(/\s+/).filter(Boolean);
    const haystack = normalizeText([e.title, e.city, e.localidad, e.address, e.category, e.date].join(' '));
    return terms.every((term) => haystack.indexOf(term) !== -1);
  }) : publicEvents;

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
  const pendingEvents = rawPendingEvents.filter((e) => {
    const cityOk = adminCityFilter === 'TODAS' || e.city === adminCityFilter;
    if (!cityOk) return false;
    const q = normalizeText(adminSearch).trim();
    if (!q) return true;
    const haystack = normalizeText([e.title, e.city, e.localidad, e.address, e.category, e.status, e.date, e.time].join(' '));
    const terms = q.split(/\s+/).filter(Boolean);
    return terms.every((term) => haystack.indexOf(term) !== -1);
  });
  const approvedEvents = rawApprovedEvents.filter((e) => {
    const cityOk = adminCityFilter === 'TODAS' || e.city === adminCityFilter;
    if (!cityOk) return false;
    const q = normalizeText(adminSearch).trim();
    if (!q) return true;
    const haystack = normalizeText([e.title, e.city, e.localidad, e.address, e.category, e.status, e.date, e.time].join(' '));
    const terms = q.split(/\s+/).filter(Boolean);
    return terms.every((term) => haystack.indexOf(term) !== -1);
  });

  const adminCitiesList = [...new Set(events.map(e => e.city).filter(Boolean))].sort();

  const sortedFiltered = filteredEvents.slice().sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  const featuredEvent = sortedFiltered[0] || null;
  const restEvents = sortedFiltered.slice(1);
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
      `}</style>

      {/* Navbar, Home, Admin, Create, etc. se mantienen iguales... */}

      {/* ====================== VISTA DE DETALLES CON ZOOM ====================== */}
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
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: `scale(${photoScale}) translate(${photoPos.x}px, ${photoPos.y}px)`,
                  transition: 'transform 0.08s ease-out',
                  willChange: 'transform'
                }}
              />

              <button 
                onClick={exitPhotoZoom}
                style={{
                  position: 'absolute', top: 40, right: 20, background: 'rgba(0,0,0,0.7)',
                  color: 'white', border: 'none', padding: '10px 18px', borderRadius: 30,
                  fontWeight: 900, fontSize: 13, cursor: 'pointer', zIndex: 100000
                }}
              >
                ✕ CERRAR
              </button>
            </div>
          ) : (
            <div className="no-scrollbar" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '6px 10px 0', flexShrink: 0 }}>
                <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 4, cursor: 'pointer', fontSize: 11 }}>
                  <ArrowLeft size={14} /> VOLVER
                </button>
              </div>

              <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: '15px 15px 0 0', overflow: 'hidden', padding: 0, flex: 1, display: 'flex', flexDirection: 'column', margin: '0 8px', overflowY: 'auto' }}>
                
                <div onClick={enterPhotoZoom} style={{ position: 'relative', width: '100%', height: 220, cursor: 'zoom-in', overflow: 'hidden', flexShrink: 0 }}>
                  <img 
                    src={selectedEvent.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} 
                    alt="" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.65)', color: 'white', padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                    🔍 Zoom con dos dedos
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

      {/* El resto del código (create, admin, favorites, profile, bottom nav) se mantiene exactamente igual que antes */}

      {/* ... (el resto del return se mantiene sin cambios) ... */}
    </div>
  );
}
