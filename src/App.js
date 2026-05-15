import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2,
  Map as MapIcon, Clock, Copy, LayoutList, ShieldCheck, Sparkles,
  Loader2, ArrowLeft, Search, Share2, Star, Download,
  CheckCircle, XCircle, Info, RefreshCw, Check, X, Edit3, Image as ImageIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ReactCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

delete L.Icon.Default.prototype._getIconUrl;

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

const ADMIN_EMAILS = ['garverjacobo@gmail.com', 'jacobogarver@gmail.com'];
const APP_URL = 'https://app-eventos-pro-final.vercel.app';
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800';
const NEARBY_RADIUS_KM = 50;

const INITIAL_FORM = {
  title: '', city: '', localidad: '', address: '',
  time: '21:00', date: '', category: 'MUSICA', image_url: '', featured: false
};

const EVENT_CATEGORIES = [
  { value: 'MUSICA', label: 'MÚSICA' },
  { value: 'GASTRONOMIA', label: 'GASTRONOMÍA' },
  { value: 'TAURINO', label: 'TAURINO' },
  { value: 'FIESTAS PATRONALES', label: 'FIESTAS PATRONALES' },
  { value: 'OTROS', label: 'OTROS' }
];

function getCategoryLabel(value) {
  const found = EVENT_CATEGORIES.find(function(cat) {
    return cat.value === value;
  });
  return found ? found.label : (value || 'TIPO DE EVENTO');
}

const categoryEmojis = {
  MUSICA: '🎵', GASTRONOMIA: '🍽️', TAURINO: '🐂',
  'FIESTAS PATRONALES': '🎉', OTROS: '📌'
};

const darkTileUrl = 'https://mt1.google.com/vt/lyrs=r&hl=es&x={x}&y={y}&z={z}';
const lightTileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}';

const redPinIcon = L.divIcon({
  html: `
    <div style="
      width:28px;
      height:28px;
      background:#ef4444;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 8px 20px rgba(0,0,0,0.4);
      border:3px solid white;
      animation: pulsePin 2s infinite;
    ">
      <div style="
        width:10px;
        height:10px;
        background:white;
        border-radius:50%;
      "></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
  className: ''
});

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return dateStr;
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
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
  const eventDate = parseLocalDate(dateStr);
  if (!eventDate) return null;
  eventDate.setHours(23, 59, 59);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));
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

function getDistanceKm(lat1, lng1, lat2, lng2) {
 const nLat1 = Number(lat1);
 const nLng1 = Number(lng1);
 const nLat2 = Number(lat2);
 const nLng2 = Number(lng2);

 if ([nLat1, nLng1, nLat2, nLng2].some(function(v) { return Number.isNaN(v); })) {
  return Infinity;
 }

 const R = 6371;

 const toRad = function(value) {
  return (value * Math.PI) / 180;
 };

 const dLat = toRad(nLat2 - nLat1);
 const dLng = toRad(nLng2 - nLng1);

 const a =
  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  Math.cos(toRad(nLat1)) *
  Math.cos(toRad(nLat2)) *
  Math.sin(dLng / 2) *
  Math.sin(dLng / 2);

 const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

 return R * c;
}

function cleanImageUrl(url) {
  if (!url) return null;
  if (String(url).indexOf('data:image') === 0) return null;
  if (String(url).length > 1900) return null;
  return url;
}

async function compressImage(file, options = {}) {
  const maxSize = options.maxSize || 1080;      // ✅ Mejor para web
  const quality = options.quality || 0.75;      // ✅ Balance perfecto
  const maxSizeKB = options.maxSizeKB || 400;   // ✅ NUEVO: Límite en KB

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

  // Reducir tamaño si es muy grande
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

  // ✅ MEJORADO: Intentar WebP primero (mejor compresión)
  let blob = null;
  let extension = 'webp';
  let type = 'image/webp';
  let currentQuality = quality;

  // Intentar WebP
  blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', currentQuality));
  
  // Si WebP es demasiado grande o no funciona, usar JPEG
  if (!blob || blob.size > maxSizeKB * 1024) {
    extension = 'jpg';
    type = 'image/jpeg';
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', currentQuality));
  }

  // ✅ NUEVO: Si sigue siendo muy grande, reducir calidad progresivamente
  let attempts = 0;
  while (blob && blob.size > maxSizeKB * 1024 && attempts < 5) {
    currentQuality -= 0.1;
    if (currentQuality < 0.4) break;
    
    blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, type, currentQuality);
    });
    
    attempts++;
  }

  // Si aún es grande, usar PNG como último recurso
  if (!blob || blob.size === 0) {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  return {
    blob: blob || file,
    extension: extension,
    type: type,
    originalSize: file.size,
    compressedSize: blob ? blob.size : file.size,
    quality: currentQuality,
    dimensions: { width: targetWidth, height: targetHeight }
  };
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

function SafeImg({ src, alt, style, onClick }) {
  const [imgSrc, setImgSrc] = useState(src || FALLBACK_IMG);
  const tried = useRef(false);

  useEffect(() => {
    setImgSrc(src || FALLBACK_IMG);
    tried.current = false;
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt || ''}
      style={style}
      onClick={onClick}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (!tried.current) {
          tried.current = true;
          setImgSrc(FALLBACK_IMG);
        }
      }}
    />
  );
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
          <SafeImg src={ev.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                display: 'inline-block', marginLeft: 8, background: dl.bg, color: dl.color,
                padding: '2px 8px', borderRadius: 8, fontSize: 9, fontWeight: 900, letterSpacing: 0
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
        <SafeImg src={ev.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
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
  const [nearbyMode, setNearbyMode] = useState(false);
const [userCoords, setUserCoords] = useState(null); // { lat, lng }
const [isLocating, setIsLocating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pickerConfig, setPickerConfig] = useState({ show: false, images: [], loading: false, isEdit: false });
  const [selectedPickerImage, setSelectedPickerImage] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
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
    try { return window.location.pathname || '/'; } catch { return '/'; }
  });

const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
const [showCalendar, setShowCalendar] = useState(false);
const [showCategoryPicker, setShowCategoryPicker] = useState(false);
const [showFormCategoryPicker, setShowFormCategoryPicker] = useState(false);
const [showEditCategoryPicker, setShowEditCategoryPicker] = useState(false);
const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
const [photoPos, setPhotoPos] = useState({ x: 0, y: 0 });
const [photoScale, setPhotoScale] = useState(1);

const listRef = useRef(null);
const toastTimerRef = useRef(null);
const mapSearchTimerRef = useRef(null);
const lastNonEventPathRef = useRef(
    (() => {
      try {
        const p = window.location.pathname || '/';
        return p.startsWith('/evento/') ? '/' : p;
      } catch { return '/'; }
    })()
  );
  const routeEventLookupRef = useRef('');
  const photoTouchRef = useRef({
    initialDistance: 0, initialScale: 1,
    lastX: 0, lastY: 0, isDragging: false
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
      if (!target.startsWith('/evento/')) lastNonEventPathRef.current = target;
      if (window.location.pathname !== target) {
        if (replace) window.history.replaceState({}, '', target);
        else window.history.pushState({}, '', target);
      }
      setCurrentPath(target);
    } catch { setCurrentPath(target); }
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
    if (!currentPath.startsWith('/evento/')) lastNonEventPathRef.current = currentPath || '/';
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

  function goHome() { setView('home'); clearSelections(); setSearchQuery(''); navigateTo('/'); }
  function goFavorites() { setView('favorites'); clearSelections(); navigateTo('/favoritos'); }
  function goCreate() { setView('create'); clearSelections(); navigateTo('/crear'); }
  function goMap() { setView('map'); clearSelections(); navigateTo('/mapa'); }
  function goProfile() { setView('profile'); clearSelections(); navigateTo('/perfil'); }
  function goAdmin() {
    if (!hasAdmin) return;
    setView('admin'); clearSelections(); setAdminTab('pending'); fetchEvents(); navigateTo('/admin');
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
    return () => { if (sub && sub.data && sub.data.subscription) sub.data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    function handlePopState() {
      const path = window.location.pathname || '/';
      setCurrentPath(path);
      if (!path.startsWith('/evento/')) lastNonEventPathRef.current = path;
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (currentPath.startsWith('/evento/')) return;
    routeEventLookupRef.current = '';
    if (currentPath === '/') { setView('home'); setSelectedEvent(null); setSelectedPendingEvent(null); setEditingEvent(null); resetDetailUi(); return; }
    if (currentPath === '/favoritos') { setView('favorites'); clearSelections(); return; }
    if (currentPath === '/crear') { setView('create'); clearSelections(); return; }
    if (currentPath === '/mapa') { setView('map'); clearSelections(); return; }
    if (currentPath === '/perfil') { setView('profile'); clearSelections(); return; }
    if (currentPath === '/admin') {
      if (hasAdmin) { setView('admin'); setSelectedEvent(null); setSelectedPendingEvent(null); setEditingEvent(null); resetDetailUi(); }
      else navigateTo('/', true);
      return;
    }
    navigateTo('/', true);
  }, [currentPath, hasAdmin]);

  useEffect(() => {
    if (!currentPath.startsWith('/evento/')) return;
    const idFromUrl = currentPath.replace('/evento/', '').split('/')[0];
    if (!idFromUrl) { navigateTo('/', true); return; }

    const foundInState = events.find((e) => String(e.id) === String(idFromUrl) && (e.status === 'approved' || hasAdmin));
    if (foundInState) {
      setSelectedPendingEvent(null); setEditingEvent(null); resetDetailUi();
      setSelectedEvent(foundInState);
      routeEventLookupRef.current = idFromUrl;
      return;
    }
    if (routeEventLookupRef.current === idFromUrl) return;
    routeEventLookupRef.current = idFromUrl;

    supabase.from('events').select('*').eq('id', idFromUrl).single().then((res) => {
      if (res.error || !res.data || (res.data.status !== 'approved' && !hasAdmin)) {
        showToast('Evento no encontrado', 'error');
        setSelectedEvent(null); routeEventLookupRef.current = '';
        navigateTo('/', true); return;
      }
      setSelectedPendingEvent(null); setEditingEvent(null); resetDetailUi();
      setSelectedEvent(res.data);
    }).catch(() => {
      showToast('Evento no encontrado', 'error');
      setSelectedEvent(null); routeEventLookupRef.current = '';
      navigateTo('/', true);
    });
  }, [currentPath, events, hasAdmin]);

  function fetchEvents() {
    try {
      const cached = localStorage.getItem('eventora_cache_events_v1');
      if (cached) setEvents(JSON.parse(cached));
    } catch {}

    if (!navigator.onLine) {
      showToast('Sin conexión. Mostrando eventos guardados', 'warning');
      return;
    }

    supabase.from('events').select('*').order('date', { ascending: true }).then((res) => {
      if (res.error) { console.error('Error cargando eventos:', res.error); return; }
      const data = res.data || [];
      setEvents(data);

      // Comprobar eventos cercanos tras cargar
setTimeout(function() {
  checkNearbyEventsNotification();
}, 2000);
      
      try { localStorage.setItem('eventora_cache_events_v1', JSON.stringify(data)); } catch {}
      const validIds = data.map((e) => e.id);
      setFavorites((prev) => prev.filter((id) => validIds.indexOf(id) !== -1));
    }).catch((err) => {
      console.error('Error de red:', err);
      showToast('Problemas de conexión. Usando datos guardados', 'warning');
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

 async function geocodeAddress(address, localidad, city) {
 const intentos = [
 [address, localidad, city, 'España'].filter(Boolean).join(', '),
 [address, localidad, 'España'].filter(Boolean).join(', '),
 [localidad, city, 'España'].filter(Boolean).join(', '),
 [city, 'España'].filter(Boolean).join(', ')
 ].filter(function(item, index, arr) {
 return item && arr.indexOf(item) === index;
 });

 for (const direccion of intentos) {
 try {
 console.log('Buscando coordenadas para:', direccion);

 const url =
 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&accept-language=es&q=' +
 encodeURIComponent(direccion);

 const respuesta = await fetch(url, {
 headers: {
 Accept: 'application/json'
 }
 });

 if (!respuesta.ok) {
 console.warn('Respuesta no válida buscando:', direccion);
 continue;
 }

 const datos = await respuesta.json();

 if (datos && datos.length > 0 && datos[0].lat && datos[0].lon) {
 const lat = parseFloat(datos[0].lat);
 const lng = parseFloat(datos[0].lon);

 console.log('Coordenadas encontradas:', lat, lng);

 return { lat: lat, lng: lng };
 }

 await new Promise(function(resolve) {
 setTimeout(resolve, 1000);
 });

 } catch (error) {
 console.warn('No se pudo buscar:', direccion, error);
 }
 }

 throw new Error('No se pudieron obtener coordenadas para esta dirección');
}

async function uploadImageToStorage(file) {
  if (!file) throw new Error('No hay imagen');
  if (!file.type || file.type.indexOf('image/') !== 0) throw new Error('Selecciona una imagen válida');

  // Mantenemos el límite de seguridad profundo, aunque avisaremos antes en el handler
  if (file.size > 12 * 1024 * 1024) throw new Error('La imagen es demasiado grande. Máximo 12MB');

  // AQUÍ ESTÁ LA MAGIA: 
  // maxSize: 1080 (resolución estándar de Instagram)
  // quality: 0.70 (excelente balance entre peso y calidad)
  const optimized = await compressImage(file, { maxSize: 1080, quality: 0.70 });

  const safeName = Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + optimized.extension;
  const path = 'uploads/' + safeName;

  const upload = await supabase.storage.from('event-images').upload(path, optimized.blob, {
    cacheControl: '3600', upsert: false, contentType: optimized.type
  });

  if (upload.error) throw upload.error;

  const publicUrlData = supabase.storage.from('event-images').getPublicUrl(path);
  return { 
    url: publicUrlData.data.publicUrl, 
    originalSize: optimized.originalSize, 
    compressedSize: optimized.compressedSize 
  };
}

  async function handleEditGalleryUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  // Mismas validaciones previas para la pantalla de edición
  if (!file.type.startsWith('image/')) {
    showToast('El archivo seleccionado no es una imagen.', 'error');
    e.target.value = '';
    return;
  }

  const MAX_MB = 8;
  if (file.size > MAX_MB * 1024 * 1024) {
    showToast(`La foto pesa demasiado (${(file.size / 1024 / 1024).toFixed(1)}MB). El máximo es ${MAX_MB}MB.`, 'error');
    e.target.value = '';
    return;
  }

  setIsUploading(true);
  showToast('Reduciendo y optimizando foto...', 'info');

  try {
    const result = await uploadImageToStorage(file);
    setEditForm((prev) => ({ ...prev, image_url: result.url }));
    showToast('Nueva imagen subida (' + Math.round(result.compressedSize / 1024) + 'KB)', 'success');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Error subiendo imagen', 'error');
  } finally {
    setIsUploading(false);
    e.target.value = '';
  }
}

  async function handleOpenPicker(isEdit) {
    const category = isEdit ? editForm.category : form.category;
    const title = isEdit ? editForm.title : form.title;

    if (!title) {
      showToast('Escribe un título primero', 'error');
      return;
    }

    setPickerConfig({ show: true, images: [], loading: true, isEdit });

    try {
      const { data, error } = await supabase.storage
        .from('event-images')
        .list(category, {
          limit: 30,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      const urls = (data || [])
        .filter(file => file.name.match(/\.(jpg|jpeg|png|webp)$/i))
        .map(file => {
          const { data: publicUrlData } = supabase.storage
            .from('event-images')
            .getPublicUrl(`${category}/${file.name}`);
          return publicUrlData.publicUrl;
        });

      setPickerConfig({ show: true, images: urls, loading: false, isEdit });
    } catch (err) {
      console.error(err);
      showToast('Error al cargar catálogo', 'error');
      setPickerConfig({ show: false, images: [], loading: false, isEdit: false });
    }
  }

  function handleSelectPickerImage(url) {
    if (pickerConfig.isEdit) {
      setEditForm(prev => ({ ...prev, image_url: url }));
    } else {
      setForm(prev => ({ ...prev, image_url: url }));
    }
    setSelectedPickerImage(null);
    setPickerConfig({ show: false, images: [], loading: false, isEdit: false });
    showToast('Foto seleccionada del catálogo', 'success');
  }

  function handleSubmitEvent() {
  if (isSubmitting) return;

  if (!form.title || !form.date || !form.city || !form.address) {
    showToast('Faltan campos: título, ciudad, fecha y dirección', 'error');
    return;
  }

  if (!form.image_url) {
    showToast('Debes añadir una foto: elige del catálogo o sube una tuya', 'error');
    return;
  }

  setShowSubmitConfirm(true);
}

async function confirmSubmitEvent() {
  if (isSubmitting) return;

  setShowSubmitConfirm(false);
  setIsSubmitting(true);
  showToast('Enviando evento a revisión...', 'info');

  try {
    let coords = { lat: null, lng: null };

    // Intentar obtener coordenadas con timeout de seguridad
    try {
      showToast('Obteniendo ubicación...', 'info');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 8000);
      });

      const result = await Promise.race([
        geocodeAddress(form.address, form.localidad, form.city),
        timeoutPromise
      ]);
      
      coords = result;
      showToast('✓ Ubicación obtenida', 'success');
      
    } catch (gpsError) {
      // Si falla la geo, continuamos sin coordenadas
      console.warn('Geocodificación fallida:', gpsError.message);
      showToast('Se guardará sin ubicación exacta', 'warning');
    }

    // Preparar datos del evento
    const eventToInsert = {
      title: (form.title || '').trim(),
      category: form.category || 'MUSICA',
      city: (form.city || '').trim(),
      localidad: form.localidad ? (form.localidad || '').trim() : null,
      address: (form.address || '').trim(),
      date: form.date || '',
      time: form.time || '21:00',
      image_url: cleanImageUrl(form.image_url),
      status: 'pending',
      lat: coords.lat,
      lng: coords.lng,
      featured: false
    };

    // Validar datos antes de enviar
    if (!eventToInsert.title || !eventToInsert.city || !eventToInsert.address || !eventToInsert.date) {
      showToast('❌ Faltan campos obligatorios', 'error');
      setIsSubmitting(false);
      return;
    }

    // Enviar a Supabase
    const { error, data } = await supabase.from('events').insert([eventToInsert]);

    if (error) {
      console.error('Error Supabase:', error);
      showToast(`❌ ${error.message || 'Error al guardar'}`, 'error');
      setIsSubmitting(false);
      return;
    }

    // ✅ Éxito
    showToast('✅ Evento enviado correctamente', 'success');
    setForm(INITIAL_FORM);
    goHome();
    fetchEvents();

  } catch (err) {
    console.error('Error general:', err);
    showToast('❌ Error inesperado. Revisa tu conexión.', 'error');
  } finally {
    setIsSubmitting(false);
  }
}
  function startEditEvent(ev) {
  if (!ev) return;
  setSelectedEvent(null);
  setSelectedPendingEvent(null);
  setEditingEvent(ev);
  setEditForm({
    title: ev.title || '',
    city: ev.city || '',
    localidad: ev.localidad || '',
    address: ev.address || '',
    time: ev.time || '21:00',
    date: ev.date || '',
    category: ev.category || 'MUSICA',
    image_url: ev.image_url || '',
    featured: ev.featured === true
  });
  showToast('Editando: ' + ev.title, 'info');
}

  function cancelEditEvent() { setEditingEvent(null); setEditForm(INITIAL_FORM); }

  function handleSaveEditEvent() {
    if (!editingEvent) return;
    if (!editForm.title || !editForm.date || !editForm.city || !editForm.address) {
      showToast('Faltan campos obligatorios', 'error'); return;
    }
    setIsSubmitting(true);
    showToast('Guardando cambios...', 'info');

    const coordsPromise = geocodeAddress(
  editForm.address,
  editForm.localidad,
  editForm.city
).catch(() => ({
  lat: editingEvent.lat || null,
  lng: editingEvent.lng || null
}));

    coordsPromise.then((coords) => {
      const updateData = {
        title: editForm.title.trim(), category: editForm.category, city: editForm.city.trim(),
        localidad: editForm.localidad ? editForm.localidad.trim() : null, address: editForm.address.trim(),
        date: editForm.date, time: editForm.time || '21:00',
        image_url: cleanImageUrl(editForm.image_url),
        lat: coords.lat, lng: coords.lng, featured: editForm.featured === true
      };
      return supabase.from('events').update(updateData).eq('id', editingEvent.id);
    }).then((res) => {
      if (res.error) { console.error(res.error); showToast('Error guardando', 'error'); return; }
      showToast('Evento actualizado correctamente', 'success');
      setEditingEvent(null); setEditForm(INITIAL_FORM); fetchEvents(); setAdminTab('approved');
    }).catch((err) => { console.error(err); showToast('Error guardando', 'error'); })
    .finally(() => setIsSubmitting(false));
  }

  function handleApproveEvent(id) {
    supabase.from('events').update({ status: 'approved' }).eq('id', id).then((res) => {
      if (res.error) { showToast('Error aprobando', 'error'); return; }
      showToast('Evento aprobado', 'success'); setSelectedPendingEvent(null); fetchEvents();
    });
  }

  function handleRejectEvent(id) {
    supabase.from('events').update({ status: 'rejected' }).eq('id', id).then((res) => {
      if (res.error) { showToast('Error rechazando', 'error'); return; }
      showToast('Evento rechazado', 'info'); setSelectedPendingEvent(null); fetchEvents();
    });
  }

  function handleDeleteEvent(id) {
    if (!window.confirm('¿Seguro que quieres borrar este evento?')) return;
    const wasSelected = selectedEvent && selectedEvent.id === id;
    supabase.from('events').delete().eq('id', id).then((res) => {
      if (res.error) { showToast('Error borrando', 'error'); return; }
      showToast('Evento borrado', 'success');
      setSelectedPendingEvent(null); setEditingEvent(null);
      if (wasSelected) closeSelectedEvent();
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

  function requestUserLocation() {
  if (!navigator.geolocation) {
    showToast('Tu navegador no soporta geolocalización', 'error');
    return;
  }

  // ✅ NUEVO: Verificar si hay coords en caché
  const cached = localStorage.getItem('eventora_user_coords');
  if (cached) {
    try {
      const { coords, timestamp } = JSON.parse(cached);
      // Si el caché tiene menos de 24 horas, usarlo
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        setUserCoords(coords);
        setNearbyMode(true);
        showToast('✓ Usando ubicación guardada', 'success');
        return;
      }
    } catch {
      // Si hay error al parsear, ignorar y pedir coords nuevas
    }
  }

  // Si no hay caché o expiró, pedir coords nuevas
  setIsLocating(true);
  showToast('Obteniendo tu ubicación...', 'info');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      // ✅ NUEVO: Guardar en caché con timestamp
      localStorage.setItem('eventora_user_coords', JSON.stringify({
        coords: coords,
        timestamp: Date.now()
      }));

      setUserCoords(coords);
      setNearbyMode(true);
      showToast('✓ Ubicación detectada. Mostrando eventos cercanos', 'success');
      setIsLocating(false);
    },
    (error) => {
      console.error(error);
      showToast('No se pudo obtener tu ubicación (permiso denegado o GPS apagado)', 'error');
      setIsLocating(false);
    },
    { 
      enableHighAccuracy: true, 
      timeout: 10000, 
      maximumAge: 30000
    }
  );
}

  function checkNearbyEventsNotification() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const in3Days = new Date(today);
      in3Days.setDate(in3Days.getDate() + 3);

      const nearbyUpcoming = events.filter(function(ev) {
        if (ev.status !== 'approved') return false;
        if (!ev.lat || !ev.lng) return false;

        var eventDate = parseLocalDate(ev.date);
        if (!eventDate) return false;
        if (eventDate < today || eventDate > in3Days) return false;

        var dist = getDistanceKm(userLat, userLng, ev.lat, ev.lng);
        return dist <= NEARBY_RADIUS_KM;
      });

      if (nearbyUpcoming.length > 0) {
        var closest = nearbyUpcoming[0];
        var dist = Math.round(getDistanceKm(userLat, userLng, closest.lat, closest.lng));

        if (nearbyUpcoming.length === 1) {
          showToast(
            '📍 "' + closest.title + '" está a ' + dist + 'km de ti (' + formatDate(closest.date) + ')',
            'success'
          );
        } else {
          showToast(
            '📍 ' + nearbyUpcoming.length + ' eventos cerca de ti en los próximos 3 días. ¡El más cercano a ' + dist + 'km!',
            'success'
          );
        }
      }
    },
    () => {}, // Si falla silenciosamente no hacemos nada
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
  );
}

  function handleLogout() {
    supabase.auth.signOut().then(() => {
      setUserEmail(''); setProfile(null); fetchEvents(); goHome(); setEditingEvent(null);
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
          if (data && data[0]) setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          else showToast('No se encontró el lugar', 'error');
        })
        .catch(() => showToast('Error buscando lugar', 'error'));
    }, 600);
  }

  async function shareEvent(ev) {
    const shareUrl = APP_URL + '/evento/' + ev.id;
    const shareText = '¡No te pierdas ' + ev.title + '! ' + shareUrl;

    if (navigator.share) {
      try {
        await navigator.share({
          title: ev.title,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.log('Error en share nativo:', err);
        }
      }
    }

    const shareModal = document.createElement('div');
    shareModal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';

    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background:' + (isDark ? '#0f172a' : '#fff') + ';border-radius:20px;padding:25px;width:90%;max-width:360px;color:' + (isDark ? '#fff' : '#0f172a') + ';';

    const btnStyle = 'padding:14px;border:none;border-radius:12px;font-weight:900;font-size:11px;cursor:pointer;background:' + (isDark ? '#1e293b' : '#f1f5f9') + ';color:' + (isDark ? '#fff' : '#0f172a') + ';display:flex;align-items:center;justify-content:center;gap:8px;';

    modalContent.innerHTML = '<h3 style="margin:0 0 20px;font-weight:900;text-align:center;font-size:16px;">Compartir evento</h3>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">'
      + '<button class="share-btn" data-action="link" data-url="https://wa.me/?text=' + encodeURIComponent(shareText) + '" style="' + btnStyle + '">📱 WhatsApp</button>'
      + '<button class="share-btn" data-action="link" data-url="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl) + '" style="' + btnStyle + '">📘 Facebook</button>'
      + '<button class="share-btn" data-action="link" data-url="https://twitter.com/intent/tweet?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent(shareText) + '" style="' + btnStyle + '">🐦 Twitter/X</button>'
      + '<button class="share-btn" data-action="copy" style="' + btnStyle + '">📋 Copiar enlace</button>'
      + '</div>'
      + '<button id="close-share-modal" style="width:100%;padding:12px;border:none;border-radius:12px;background:#64748b;color:white;font-weight:900;font-size:12px;cursor:pointer;">CERRAR</button>';

    shareModal.appendChild(modalContent);
    document.body.appendChild(shareModal);

    function closeModal() { shareModal.remove(); }
    shareModal.addEventListener('click', function(e) { if (e.target === shareModal) closeModal(); });
    document.getElementById('close-share-modal').addEventListener('click', closeModal);

    document.querySelectorAll('.share-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        var action = e.currentTarget.dataset.action;
        var url = e.currentTarget.dataset.url;
        if (action === 'copy') {
          navigator.clipboard.writeText(shareUrl).then(function() {
            showToast('✅ Enlace copiado', 'success');
          }).catch(function() { showToast('No se pudo copiar', 'error'); });
        } else {
          window.open(url, '_blank');
        }
        closeModal();
      });
    });
  }

  function handleCategoryChange(cat) {
 setSelectedCategory(cat);

 if (cat === 'TODOS') {
  setDateFilter('all');
 }

 if (listRef.current) listRef.current.scrollTop = 0;
}

  function enterPhotoZoom() { setIsPhotoZoomed(true); setPhotoScale(1); setPhotoPos({ x: 0, y: 0 }); }
  function exitPhotoZoom() { setIsPhotoZoomed(false); setPhotoScale(1); setPhotoPos({ x: 0, y: 0 }); }

  function getDistance(touches) {
    if (!touches || touches.length < 2) return 0;
    var dx = touches[0].clientX - touches[1].clientX;
    var dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handlePhotoTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      photoTouchRef.current.initialDistance = getDistance(e.touches);
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
      var dist = getDistance(e.touches);
      var scale = dist / photoTouchRef.current.initialDistance;
      setPhotoScale(Math.min(Math.max(photoTouchRef.current.initialScale * scale, 1), 5));
    } else if (e.touches.length === 1 && photoScale > 1) {
      e.preventDefault();
      var dx = e.touches[0].clientX - photoTouchRef.current.lastX;
      var dy = e.touches[0].clientY - photoTouchRef.current.lastY;
      setPhotoPos(function(prev) { return { x: prev.x + dx * 0.55, y: prev.y + dy * 0.55 }; });
      photoTouchRef.current.lastX = e.touches[0].clientX;
      photoTouchRef.current.lastY = e.touches[0].clientY;
    }
  }

  function handlePhotoTouchEnd() {
    if (photoScale <= 1.05) exitPhotoZoom();
    photoTouchRef.current.isDragging = false;
  }

  function eventMatchesAdminFilters(e) {
    var cityOk = adminCityFilter === 'TODAS' || e.city === adminCityFilter;
    if (!cityOk) return false;
    var q = normalizeText(adminSearch).trim();
    if (!q) return true;
    var haystack = normalizeText([e.title, e.city, e.localidad, e.address, e.category, e.status, e.date, e.time].join(' '));
    return q.split(/\s+/).filter(Boolean).every(function(term) { return haystack.indexOf(term) !== -1; });
  }

  var today = new Date().toISOString().split('T')[0];
  var publicEvents = events.filter(function(e) { return e.status === 'approved' && e.date >= today; });

  var searchedEvents = searchQuery
    ? publicEvents.filter(function(e) {
        var q = normalizeText(searchQuery).trim();
        var terms = q.split(/\s+/).filter(Boolean);
        var haystack = normalizeText([e.title, e.city, e.localidad, e.address, e.category, e.date].join(' '));
        return terms.every(function(term) { return haystack.indexOf(term) !== -1; });
      })
    : publicEvents;

  var categoryEvents = searchedEvents.filter(function(e) { return selectedCategory === 'TODOS' || e.category === selectedCategory; });

  var filteredEvents = categoryEvents.filter(function(e) {
 if (dateFilter === 'today') return e.date === today;
 if (dateFilter === 'week') {
 var eventDate = parseLocalDate(e.date);
 var now = new Date();
 var weekEnd = new Date(now);
 weekEnd.setDate(weekEnd.getDate() + 7);
 return eventDate >= now && eventDate <= weekEnd;
 }
 if (dateFilter === 'weekend') {
 var eventDate = parseLocalDate(e.date);
 var now = new Date();
 now.setHours(0,0,0,0);
 var dayOfWeek = now.getDay();
 var daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
 var thisSunday = new Date(now);
 thisSunday.setDate(now.getDate() + daysToSunday);
 var day = eventDate.getDay();
 return eventDate >= now && eventDate <= thisSunday && (day === 5 || day === 6 || day === 0);
 }
 return true;
 });

  // Filtro de eventos cercanos
if (nearbyMode && userCoords) {
  filteredEvents = filteredEvents.filter(function(e) {
    if (!e.lat || !e.lng) return false;
    return getDistanceKm(userCoords.lat, userCoords.lng, e.lat, e.lng) <= NEARBY_RADIUS_KM;
  }).sort(function(a, b) {
    return getDistanceKm(userCoords.lat, userCoords.lng, a.lat, a.lng) - 
           getDistanceKm(userCoords.lat, userCoords.lng, b.lat, b.lng);
  });
}

  var favoriteEvents = publicEvents.filter(function(e) { return favorites.indexOf(e.id) !== -1; });
  var rawPendingEvents = hasAdmin ? events.filter(function(e) { return e.status === 'pending'; }) : [];
  var rawApprovedEvents = hasAdmin ? events.filter(function(e) { return e.status === 'approved'; }) : [];
  var pendingEvents = rawPendingEvents.filter(eventMatchesAdminFilters);
  var approvedEvents = rawApprovedEvents.filter(eventMatchesAdminFilters);

  var adminCitiesList = [];
  events.forEach(function(e) { if (e.city && adminCitiesList.indexOf(e.city) === -1) adminCitiesList.push(e.city); });
  adminCitiesList.sort();

  var sortedFiltered = filteredEvents.slice().sort(function(a, b) {
    var dateA = new Date(a.date).getTime();
    var dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });

  var featuredEvent = sortedFiltered.length ? sortedFiltered[0] : null;
  var restEvents = sortedFiltered.length ? sortedFiltered.slice(1) : [];
  var adminFiltersActive = adminSearch.trim() || adminCityFilter !== 'TODAS';

  var INPUT_STYLE = {
    width: '100%', padding: 12, borderRadius: 10, border: 'none',
    background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700
  };

  if (showSplash) return <Splash onDone={function() { setShowSplash(false); }} />;

  return (
    <div className={isDark ? 'dark-theme' : 'light-theme'} style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Toast toast={toast} />
  {showSubmitConfirm && (
 <div style={{
 position: 'fixed',
 inset: 0,
 zIndex: 999999,
 background: 'rgba(0,0,0,0.82)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 padding: 15
 }}>
 <div className={isDark ? 'card-dark' : 'card-light'} style={{
 width: '100%',
 maxWidth: 420,
 maxHeight: '90vh',
 overflowY: 'auto',
 borderRadius: 22,
 padding: 18,
 boxShadow: '0 20px 60px rgba(0,0,0,0.45)'
 }}>
 <h3 style={{
 textAlign: 'center',
 fontSize: 16,
 fontWeight: 900,
 marginBottom: 6
 }}>
 CONFIRMAR ENVÍO
 </h3>

 <p style={{
 textAlign: 'center',
 fontSize: 11,
 opacity: 0.7,
 marginBottom: 15,
 lineHeight: 1.4
 }}>
 Revisa que todos los datos sean correctos antes de enviar el evento a revisión.
 </p>

 {form.image_url && (
  <div style={{ position: 'relative', marginTop: 4 }}>
    <img
      key={form.image_url}
      src={form.image_url}
      alt=""
      style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 10, display: 'block' }}
    />
    <button
      onClick={() => {
        setForm((prev) => ({ ...prev, image_url: '' }));
        showToast('Foto eliminada', 'info');
      }}
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        background: 'rgba(239,68,68,0.95)',
        color: 'white',
        border: '2px solid white',
        borderRadius: '50%',
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        padding: 0
      }}
      title="Quitar foto"
    >
      <X size={16} strokeWidth={3} />
    </button>
    <div style={{
      position: 'absolute',
      bottom: 8,
      left: 8,
      background: 'rgba(34,197,94,0.95)',
      color: 'white',
      padding: '3px 8px',
      borderRadius: 6,
      fontSize: 9,
      fontWeight: 900,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }}>
      <CheckCircle size={11} /> FOTO LISTA
    </div>
  </div>
)}

 <div style={{ display: 'grid', gap: 10, marginBottom: 15 }}>
 <div style={{ background: 'rgba(99,102,241,.1)', padding: 10, borderRadius: 12 }}>
 <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 900 }}>TÍTULO</p>
 <p style={{ fontSize: 13, fontWeight: 900 }}>{form.title || '-'}</p>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
 <div style={{ background: 'rgba(99,102,241,.1)', padding: 10, borderRadius: 12 }}>
 <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 900 }}>CIUDAD</p>
 <p style={{ fontSize: 12, fontWeight: 800 }}>{form.city || '-'}</p>
 </div>

 <div style={{ background: 'rgba(99,102,241,.1)', padding: 10, borderRadius: 12 }}>
 <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 900 }}>CATEGORÍA</p>
 <p style={{ fontSize: 12, fontWeight: 800 }}>{form.category || '-'}</p>
 </div>
 </div>

 <div style={{ background: 'rgba(99,102,241,.1)', padding: 10, borderRadius: 12 }}>
 <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 900 }}>LOCALIDAD</p>
 <p style={{ fontSize: 12, fontWeight: 800 }}>{form.localidad || '-'}</p>
 </div>

 <div style={{ background: 'rgba(99,102,241,.1)', padding: 10, borderRadius: 12 }}>
 <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 900 }}>DIRECCIÓN</p>
 <p style={{ fontSize: 12, fontWeight: 800 }}>{form.address || '-'}</p>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
 <div style={{ background: 'rgba(99,102,241,.1)', padding: 10, borderRadius: 12 }}>
 <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 900 }}>FECHA</p>
 <p style={{ fontSize: 12, fontWeight: 800 }}>{formatDate(form.date) || '-'}</p>
 </div>

 <div style={{ background: 'rgba(99,102,241,.1)', padding: 10, borderRadius: 12 }}>
 <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 900 }}>HORA</p>
 <p style={{ fontSize: 12, fontWeight: 800 }}>{form.time || '-'}</p>
 </div>
 </div>
 </div>

 <div style={{
 background: 'rgba(245,158,11,.12)',
 color: '#f59e0b',
 padding: 10,
 borderRadius: 12,
 fontSize: 10,
 fontWeight: 800,
 lineHeight: 1.4,
 marginBottom: 15
 }}>
 El evento se enviará a revisión. No aparecerá públicamente hasta que sea aprobado.
 </div>

 <div style={{
 display: 'grid',
 gridTemplateColumns: '1fr 1fr',
 gap: 8
 }}>
 <button
 onClick={() => setShowSubmitConfirm(false)}
 disabled={isSubmitting}
 style={{
 padding: 13,
 background: '#64748b',
 color: 'white',
 border: 'none',
 borderRadius: 12,
 fontWeight: 900,
 fontSize: 11,
 cursor: isSubmitting ? 'not-allowed' : 'pointer',
 opacity: isSubmitting ? 0.7 : 1
 }}
 >
 EDITAR
 </button>

 <button
 onClick={confirmSubmitEvent}
 disabled={isSubmitting}
 style={{
 padding: 13,
 background: '#22c55e',
 color: 'white',
 border: 'none',
 borderRadius: 12,
 fontWeight: 900,
 fontSize: 11,
 cursor: isSubmitting ? 'not-allowed' : 'pointer',
 opacity: isSubmitting ? 0.7 : 1
 }}
 >
 {isSubmitting ? 'ENVIANDO...' : 'CONFIRMAR ENVÍO'}
 </button>
 </div>
 </div>
 </div>
)}

      {pickerConfig.show && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 15
        }}>
          <div style={{
            background: '#0f172a', width: '100%', maxWidth: 420, maxHeight: '85vh',
            borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column'
          }}>
            <h3 style={{ color: 'white', textAlign: 'center', marginBottom: 15, fontSize: 15, fontWeight: 900 }}>
              CATÁLOGO ({pickerConfig.isEdit ? editForm.category : form.category})
            </h3>

            {pickerConfig.loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6366f1' }}>
                <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Cargando fotos...</p>
              </div>
            ) : pickerConfig.images.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'white' }}>
                <p style={{ fontSize: 12, opacity: 0.7 }}>Aún no hay fotos en esta categoría.</p>
                <p style={{ fontSize: 10, opacity: 0.5, marginTop: 10 }}>Añade fotos desde tu panel de Supabase Storage.</p>
              </div>
            ) : (
              <div className="no-scrollbar" style={{
                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
                overflowY: 'auto', flex: 1, paddingBottom: 10
              }}>
                {pickerConfig.images.map((url, i) => {
  const isSelected = selectedPickerImage === url;
  return (
    <div
      key={i}
      onClick={() => {
        setSelectedPickerImage(url);
        setTimeout(() => handleSelectPickerImage(url), 200);
      }}
      style={{
 position: 'relative',
 borderRadius: 14,
 overflow: 'hidden',
 cursor: 'pointer',
 border: isSelected ? '4px solid #bef264' : '3px solid transparent',
 boxShadow: isSelected
 ? '0 0 0 4px rgba(190,242,100,0.35), 0 8px 20px rgba(0,0,0,0.4)'
 : '0 4px 12px rgba(0,0,0,0.3)',
 transform: isSelected ? 'scale(0.96)' : 'scale(1)',
 transition: 'all 0.25s ease',
 aspectRatio: '1 / 1',
 background: '#020617',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 padding: 6
}}
    >
      <img
 src={url}
 alt=""
 style={{
 width: '100%',
 height: '100%',
 objectFit: 'contain',
 display: 'block'
 }}
/>
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: 6,
          right: 6,
          background: '#bef264',
          color: '#0f172a',
          borderRadius: '50%',
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
          animation: 'popIn 0.25s ease-out'
        }}>
          <CheckCircle size={20} strokeWidth={3} />
        </div>
      )}
    </div>
  );
})}
              </div>
            )}

            <button
              onClick={() => {
    setPickerConfig({ show: false, images: [], loading: false, isEdit: false });
    setSelectedPickerImage(null);
  }}
              style={{ width: '100%', padding: 12, background: '#ef4444', color: 'white', border: 'none', borderRadius: 12, fontWeight: 900, marginTop: 15, cursor: 'pointer' }}
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}

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

.leaflet-container {
  background: #aadaff !important;
  outline: none !important;
  border: none !important;
}

.leaflet-tile {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .animate-spin { animation:spin 1s linear infinite; }
        @keyframes admin-pulse { 0%{transform:scale(1);color:#818cf8;} 50%{transform:scale(1.2);color:#ef4444;} 100%{transform:scale(1);color:#818cf8;} }
        .pulse-admin { animation:admin-pulse 1.4s infinite; }
        @keyframes heartPop { 0%{transform:scale(1);} 30%{transform:scale(1.5);} 60%{transform:scale(.9);} 100%{transform:scale(1);} }
        @keyframes popIn {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
        .heart-pop { animation:heartPop .6s ease-out; }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes pulsePin {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
      .react-calendar {
 width: 100% !important;
 max-width: 100%;
 border: none;
 border-radius: 16px;
 padding: 6px;
 background: transparent;
 font-family: inherit;
 color: inherit;
 overflow: hidden;
}

.react-calendar abbr {
 text-decoration: none;
}

.react-calendar--doubleView {
 width: 100% !important;
}

.react-calendar--doubleView .react-calendar__viewContainer {
 display: flex;
 gap: 8px;
 margin: 0;
}

.react-calendar--doubleView .react-calendar__viewContainer > * {
 width: calc(50% - 4px);
 margin: 0;
}

.react-calendar__navigation {
 height: auto;
 margin-bottom: 10px;
}

.react-calendar__navigation__label {
 white-space: nowrap;
 font-size: 13px;
 font-weight: 900;
 color: #6366f1 !important;
}

.react-calendar__navigation button {
 font-weight: 900;
 color: #6366f1 !important;
 background: transparent !important;
 min-width: 26px;
 padding: 4px;
}

.react-calendar__month-view__weekdays {
 color: inherit;
 font-weight: 900;
 font-size: 9px;
}

.react-calendar__month-view__weekdays__weekday {
 padding: 4px 1px;
 text-align: center;
}

.react-calendar__tile {
 border-radius: 10px;
 background: transparent !important;
 color: inherit !important;
 padding: 7px 2px !important;
 font-size: 11px;
}

.react-calendar__tile:enabled:hover,
.react-calendar__tile:enabled:focus {
 background: rgba(99,102,241,.18) !important;
}

.react-calendar__tile--now {
 background: rgba(250,204,21,.18) !important;
 color: inherit !important;
}

.react-calendar__tile--active {
 background: #4f46e5 !important;
 color: white !important;
}

.react-calendar__month-view__days__day--neighboringMonth {
 visibility: hidden !important;
}

.dark-theme .react-calendar {
 color: white;
}

.dark-theme .react-calendar__tile {
 color: white !important;
}

.dark-theme .react-calendar__month-view__weekdays {
 color: white;
}

.dark-theme .react-calendar__month-view__days__day--weekend {
 color: #f87171 !important;
}

.dark-theme .react-calendar__navigation button {
 color: #818cf8 !important;
}

.light-theme .react-calendar {
 color: #0f172a;
}

.light-theme .react-calendar__tile {
 color: #0f172a !important;
}

.light-theme .react-calendar__month-view__days__day--weekend {
 color: #be123c !important;
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
                <span style={{ position: 'absolute', top: -8, right: -10, background: '#ef4444', color: 'white', fontSize: 8, fontWeight: 900, borderRadius: 999, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid ' + (isDark ? '#0f172a' : '#fff') }}>{rawPendingEvents.length}</span>
              )}
            </button>
          )}
          {!userEmail && (
            <button onClick={handleLogin} style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 8, fontWeight: 900, cursor: 'pointer' }}>LOGIN</button>
          )}
          <button onClick={function() { setIsDark(!isDark); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
            {isDark ? <Sun size={18} color="#facc15" /> : <Moon size={18} color="#4f46e5" />}
          </button>
          <Sparkles size={18} color="#6366f1" style={{ cursor: 'pointer' }} onClick={goProfile} />
        </div>
      </nav>

      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>

        {view === 'map' && (
  <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>

    {/* Barra de búsqueda */}
    <div style={{
      position: 'absolute',
      top: 15,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      width: '85%',
      maxWidth: 320,
      background: 'white',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
    }}>

      <Search size={16} color="#6366f1" />

      <input
        type="text"
        value={mapSearch}
        onChange={handleMapSearchChange}
        placeholder="Buscar ciudad, pueblo o lugar..."
        style={{
          width: '100%',
          padding: 10,
          border: 'none',
          outline: 'none',
          fontWeight: 700,
          fontSize: 12,
          color: '#0f172a',
          background: 'transparent'
        }}
      />

      {mapSearch && (
        <button
          onClick={() => {
            setMapSearch('');
            setMapCenter(null);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#6366f1',
            cursor: 'pointer',
            fontWeight: 900
          }}
        >
          X
        </button>
      )}

    </div>

    {/* MAPA */}
    <MapContainer
      center={[40.41, -3.70]}
      zoom={6}
      style={{
        height: '100%',
        width: '100%'
      }}
      scrollWheelZoom={true}
      zoomControl={false}
    >

      <MapResizer center={mapCenter} />

      <TileLayer
        url={isDark ? darkTileUrl : lightTileUrl}
        attribution="OpenStreetMap"
        maxZoom={20}
      />

      {publicEvents.map(function(ev) {

        if (!ev.lat || !ev.lng) return null;

        return (
          <Marker
            key={ev.id}
            position={[ev.lat, ev.lng]}
            icon={redPinIcon}
          >

            <Popup>
              <div style={{
                minWidth: 200,
                padding: 5
              }}>

                <p style={{
                  fontWeight: 900,
                  fontSize: 14,
                  marginBottom: 6,
                  color: '#0f172a'
                }}>
                  {ev.title}
                </p>

                <p style={{
                  fontSize: 11,
                  marginBottom: 4,
                  color: '#334155'
                }}>
                  {ev.city}
                </p>

                <p style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#6366f1'
                }}>
                  {formatDate(ev.date)}
                </p>

              </div>
            </Popup>

          </Marker>
        );

      })}

    </MapContainer>

    {/* Botón centrar mapa */}
    <button
      onClick={() => setMapCenter([40.41, -3.70])}
      style={{
        position: 'absolute',
        bottom: 90,
        right: 20,
        zIndex: 1000,
        background: '#4f46e5',
        color: 'white',
        border: 'none',
        width: 45,
        height: 45,
        borderRadius: '50%',
        boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        fontWeight: 900
      }}
    >
      ⌂
    </button>

  </div>
)}

        {showCalendar && (
  <div style={{
    position: 'fixed',
    inset: 0,
    zIndex: 999999,
    background: 'rgba(0,0,0,0.82)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12
  }}>

    <div
      className={isDark ? 'card-dark' : 'card-light'}
      style={{
        width: '100%',
        maxWidth: 430,
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: 20,
        padding: 15
      }}
    >

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15
      }}>

        <h2 style={{
          fontSize: 15,
          fontWeight: 900
        }}>
          CALENDARIO EVENTOS
        </h2>

        <button
          onClick={() => {
            setShowCalendar(false);
            setSelectedCalendarDate(null);
          }}
          style={{
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            padding: '6px 10px',
            fontWeight: 900,
            cursor: 'pointer'
          }}
        >
          X
        </button>

      </div>

      <ReactCalendar
  locale="es-ES"
  showDoubleView={true}
  showNeighboringMonth={false}
  prev2Label={null}
  next2Label={null}
  formatShortWeekday={(locale, date) => {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    return days[date.getDay()];
  }}
  formatMonthYear={(locale, date) => {
    const text = date
      .toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric'
      })
      .replace(' de ', ' ');

    return text.charAt(0).toUpperCase() + text.slice(1);
  }}
  onClickDay={(date) => {
    setSelectedCalendarDate(date);
  }}
  tileContent={({ date, view }) => {
  if (view !== 'month') return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const formatted = y + '-' + m + '-' + d;
  const hasEvents = publicEvents.some(ev => ev.date === formatted);
  if (!hasEvents) return null;
    return (
      <div style={{
        marginTop: 2,
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#22c55e',
        marginLeft: 'auto',
        marginRight: 'auto'
      }} />
    );
  }}
/>

      {selectedCalendarDate && (() => {
  const y = selectedCalendarDate.getFullYear();
  const m = String(selectedCalendarDate.getMonth() + 1).padStart(2, '0');
  const d = String(selectedCalendarDate.getDate()).padStart(2, '0');
  const selectedStr = y + '-' + m + '-' + d;
  const eventosDelDia = publicEvents.filter(ev => ev.date === selectedStr);

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{
        fontSize: 13,
        fontWeight: 900,
        marginBottom: 12,
        letterSpacing: 1
      }}>
        EVENTOS DEL DÍA ({eventosDelDia.length})
      </h3>

      {eventosDelDia.length === 0 ? (
        <div style={{
          padding: 20,
          borderRadius: 12,
          background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
          textAlign: 'center',
          fontSize: 11,
          opacity: 0.6,
          fontWeight: 700
        }}>
          No hay eventos este día
        </div>
      ) : (
        eventosDelDia.map(ev => (
          <div
            key={ev.id}
            onClick={() => {
              setShowCalendar(false);
              setSelectedCalendarDate(null);
              openEvent(ev);
            }}
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              marginBottom: 10,
              background: isDark 
                ? 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(59,130,246,0.18))'
                : 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(59,130,246,0.15))',
              border: isDark 
                ? '1px solid rgba(34,211,238,0.35)' 
                : '1px solid rgba(34,211,238,0.4)',
              cursor: 'pointer',
              boxShadow: isDark 
                ? '0 4px 12px rgba(0,0,0,0.3)' 
                : '0 4px 12px rgba(34,211,238,0.15)',
              transition: 'transform 0.15s ease'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
              flexWrap: 'wrap'
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 900,
                color: isDark ? '#22d3ee' : '#0891b2',
                letterSpacing: 1
              }}>
                {ev.city}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 900,
                color: isDark ? '#22d3ee' : '#0891b2',
                letterSpacing: 1
              }}>
                {formatDate(ev.date)} · {ev.time}H
              </span>
            </div>

            <p style={{
              fontWeight: 900,
              fontSize: 14,
              color: isDark ? '#ffffff' : '#0f172a',
              marginBottom: ev.localidad ? 4 : 0,
              letterSpacing: 0.5
            }}>
              {ev.title}
            </p>

            {ev.localidad && (
              <p style={{
                fontSize: 10,
                color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(15,23,42,0.65)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                📍 {ev.localidad}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
})()}

</div>
</div>
)}

 {showFormCategoryPicker && (
  <div
    onClick={() => setShowFormCategoryPicker(false)}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999998,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center'
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%',
        maxWidth: 480,
        background: isDark ? '#0f172a' : '#ffffff',
        borderRadius: '24px 24px 0 0',
        padding: '8px 0 20px',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.4)'
      }}
    >
      <div
        style={{
          width: 40,
          height: 4,
          background: isDark ? '#334155' : '#cbd5e1',
          borderRadius: 4,
          margin: '8px auto 16px'
        }}
      />
      <p
        style={{
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 900,
          marginBottom: 14,
          letterSpacing: 1,
          color: isDark ? '#94a3b8' : '#64748b'
        }}
      >
        SELECCIONA CATEGORÍA
      </p>
      {EVENT_CATEGORIES.map(function(cat) {
        var isActive = form.category === cat.value;
        return (
          <button
            key={cat.value}
            onClick={function() {
              setForm(function(prev) {
                return { ...prev, category: cat.value };
              });
              setShowFormCategoryPicker(false);
            }}
            style={{
              width: '100%',
              padding: '16px 22px',
              border: 'none',
              cursor: 'pointer',
              background: isActive
                ? (isDark ? 'rgba(79,70,229,0.15)' : 'rgba(79,70,229,0.08)')
                : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid ' + (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
              borderLeft: isActive ? '4px solid #4f46e5' : '4px solid transparent'
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: isActive ? 900 : 700,
                color: isActive ? '#4f46e5' : (isDark ? '#94a3b8' : '#64748b'),
                letterSpacing: 0.5
              }}
            >
              {cat.label}
            </span>

            {isActive && (
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Check size={14} color="white" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
      <div style={{ padding: '16px 22px 0' }}>
        <button
          onClick={() => setShowFormCategoryPicker(false)}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 16,
            border: 'none',
            background: isDark ? '#1e293b' : '#f1f5f9',
            color: isDark ? '#94a3b8' : '#64748b',
            fontWeight: 900,
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          CERRAR
        </button>
      </div>
    </div>
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

  <div style={{ flexShrink: 0 }}>
 <div
 className="no-scrollbar"
 style={{
 display: 'flex',
 gap: 8,
 padding: '8px 12px 4px',
 overflowX: 'auto',
 alignItems: 'center'
 }}
>
 {[
 { k: 'today', l: 'HOY' },
 { k: 'week', l: 'SEMANA' },
 { k: 'weekend', l: 'FINDE' }
 ].map(function(f) {
 const active = dateFilter === f.k;

 return (
 <button
 key={f.k}
 onClick={function() {
 setDateFilter(f.k);
 }}
 style={{
 height: 34,
 padding: '0 14px',
 borderRadius: 999,
 border: active ? 'none' : '1px solid rgba(99,102,241,0.35)',
 background: active
 ? '#4f46e5'
 : (isDark ? 'rgba(30,41,59,0.9)' : '#e2e8f0'),
 color: active ? 'white' : '#818cf8',
 fontSize: 10,
 fontWeight: 900,
 cursor: 'pointer',
 whiteSpace: 'nowrap',
 flexShrink: 0,
 boxShadow: active ? '0 6px 16px rgba(79,70,229,0.35)' : 'none'
 }}
 >
 {f.l}
 </button>
 );
 })}

 <button
 onClick={() => setShowCalendar(true)}
 style={{
 height: 34,
 padding: '0 14px',
 borderRadius: 999,
 border: '1px solid rgba(99,102,241,0.35)',
 background: isDark ? 'rgba(30,41,59,0.9)' : '#e2e8f0',
 color: '#818cf8',
 fontSize: 10,
 fontWeight: 900,
 cursor: 'pointer',
 whiteSpace: 'nowrap',
 flexShrink: 0
 }}
 >
 CALENDARIO
 </button>
</div>

 <div
 className="no-scrollbar"
 style={{
 display: 'flex',
 gap: 8,
 padding: '4px 12px 8px',
 overflowX: 'auto',
 alignItems: 'center'
 }}
>
 <button
 onClick={function() {
 handleCategoryChange('TODOS');
 setShowCategoryPicker(false);
 }}
 style={{
 height: 34,
 padding: '0 16px',
 borderRadius: 999,
 border: selectedCategory === 'TODOS' ? 'none' : '1px solid rgba(99,102,241,0.35)',
 background: selectedCategory === 'TODOS'
 ? '#4f46e5'
 : (isDark ? 'rgba(30,41,59,0.9)' : '#e2e8f0'),
 color: selectedCategory === 'TODOS' ? 'white' : '#818cf8',
 fontSize: 10,
 fontWeight: 900,
 whiteSpace: 'nowrap',
 cursor: 'pointer',
 flexShrink: 0,
 boxShadow: selectedCategory === 'TODOS' ? '0 6px 16px rgba(79,70,229,0.35)' : 'none'
 }}
 >
 TODOS
 </button>

 <button
 onClick={function() {
 setShowCategoryPicker(true);
 }}
 style={{
 height: 34,
 padding: '0 16px',
 borderRadius: 999,
 border: selectedCategory !== 'TODOS' ? 'none' : '1px solid rgba(99,102,241,0.35)',
 background: selectedCategory !== 'TODOS'
 ? '#4f46e5'
 : (isDark ? 'rgba(30,41,59,0.9)' : '#e2e8f0'),
 color: selectedCategory !== 'TODOS' ? 'white' : '#818cf8',
 fontSize: 10,
 fontWeight: 900,
 whiteSpace: 'nowrap',
 cursor: 'pointer',
 flexShrink: 0,
 display: 'flex',
 alignItems: 'center',
 gap: 6,
 boxShadow: selectedCategory !== 'TODOS' ? '0 6px 16px rgba(79,70,229,0.35)' : 'none'
 }}
 >
 {selectedCategory !== 'TODOS' ? getCategoryLabel(selectedCategory) : 'TIPO DE EVENTO'}
 <span style={{ fontSize: 8 }}>▼</span>
 </button>

 <button
 onClick={() => {
 if (!nearbyMode) {
 requestUserLocation();
 } else {
 setNearbyMode(false);
 setUserCoords(null);
 showToast('Filtro "Cerca de mí" desactivado', 'info');
 }
 }}
 disabled={isLocating}
 style={{
 height: 34,
 padding: '0 16px',
 borderRadius: 999,
 border: nearbyMode ? 'none' : '1px solid rgba(34,197,94,0.35)',
 background: nearbyMode
 ? '#22c55e'
 : (isDark ? 'rgba(30,41,59,0.9)' : '#e2e8f0'),
 color: nearbyMode ? 'white' : '#22c55e',
 fontSize: 10,
 fontWeight: 900,
 cursor: isLocating ? 'not-allowed' : 'pointer',
 opacity: isLocating ? 0.6 : 1,
 whiteSpace: 'nowrap',
 flexShrink: 0,
 boxShadow: nearbyMode ? '0 6px 16px rgba(34,197,94,0.35)' : 'none'
 }}
 >
 {isLocating ? 'BUSCANDO...' : 'CERCA DE MÍ'}
 </button>
</div>
</div>

 {showCategoryPicker && (
 <div onClick={function() { setShowCategoryPicker(false); }} style={{
 position: 'fixed', inset: 0, zIndex: 999998, background: 'rgba(0,0,0,0.6)',
 display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
 }}>
 <div onClick={function(e) { e.stopPropagation(); }} style={{
 width: '100%', maxWidth: 480,
 background: isDark ? '#0f172a' : '#ffffff',
 borderRadius: '24px 24px 0 0',
 padding: '8px 0 20px',
 boxShadow: '0 -10px 40px rgba(0,0,0,0.4)'
 }}>
 <div style={{ width: 40, height: 4, background: isDark ? '#334155' : '#cbd5e1', borderRadius: 4, margin: '8px auto 16px' }} />
 <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 900, marginBottom: 14, letterSpacing: 1, color: isDark ? '#94a3b8' : '#64748b' }}>
 SELECCIONA CATEGORÍA
 </p>
 {[
 { value: 'MUSICA', label: 'MÚSICA' },
 { value: 'GASTRONOMIA', label: 'GASTRONOMÍA' },
 { value: 'TAURINO', label: 'TAURINO' },
 { value: 'FIESTAS PATRONALES', label: 'FIESTAS PATRONALES' },
 { value: 'OTROS', label: 'OTROS' }
 ].map(function(cat) {
 var isActive = selectedCategory === cat.value;
 return (
 <button key={cat.value} onClick={function() { handleCategoryChange(cat.value); setShowCategoryPicker(false); }} style={{
 width: '100%', padding: '16px 22px', border: 'none', cursor: 'pointer',
 background: isActive ? (isDark ? 'rgba(79,70,229,0.15)' : 'rgba(79,70,229,0.08)') : 'transparent',
 display: 'flex', alignItems: 'center', justifyContent: 'space-between',
 borderBottom: '1px solid ' + (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
 borderLeft: isActive ? '4px solid #4f46e5' : '4px solid transparent'
 }}>
 <span style={{
 fontSize: 14, fontWeight: isActive ? 900 : 700,
 color: isActive ? '#4f46e5' : (isDark ? '#94a3b8' : '#64748b'),
 letterSpacing: 0.5
 }}>
 {cat.label}
 </span>
 {isActive && (
 <span style={{
 width: 24, height: 24, borderRadius: '50%', background: '#4f46e5',
 display: 'flex', alignItems: 'center', justifyContent: 'center'
 }}>
 <Check size={14} color="white" strokeWidth={3} />
 </span>
 )}
 </button>
 );
 })}
 <div style={{ padding: '16px 22px 0' }}>
 <button onClick={function() { setShowCategoryPicker(false); }} style={{
 width: '100%', padding: 14, borderRadius: 16, border: 'none',
 background: isDark ? '#1e293b' : '#f1f5f9',
 color: isDark ? '#94a3b8' : '#64748b',
 fontWeight: 900, fontSize: 12, cursor: 'pointer'
 }}>
 CERRAR
 </button>
 </div>
 </div>
 </div>
 )}

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
              {restEvents.map(function(ev) { return <EventCard key={ev.id} ev={ev} featured={false} isDark={isDark} favorites={favorites} animHeart={animHeart} toggleFavorite={toggleFavorite} setSelectedEvent={openEvent} />; })}
            </div>
          </div>
        )}

        {selectedEvent && !selectedPendingEvent && !editingEvent && (
          <>
            {isPhotoZoomed ? (
              <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', touchAction: 'none' }}
                onTouchStart={handlePhotoTouchStart} onTouchMove={handlePhotoTouchMove} onTouchEnd={handlePhotoTouchEnd}>
                <SafeImg src={selectedEvent.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(' + photoScale + ') translate(' + photoPos.x + 'px, ' + photoPos.y + 'px)', transition: 'transform 0.1s ease-out' }} />
                <button onClick={exitPhotoZoom} style={{ position: 'absolute', top: 40, right: 20, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 999, fontWeight: 900, fontSize: 12, cursor: 'pointer', zIndex: 100000, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <X size={16}/> CERRAR
                </button>
                <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, pointerEvents: 'none', textAlign: 'center' }}>
                  Usa dos dedos para zoom
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
                  <div onClick={enterPhotoZoom} style={{ position: 'relative', width: '100%', height: 220, cursor: 'zoom-in', overflow: 'hidden', flexShrink: 0 }}>
                    <SafeImg src={selectedEvent.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: 8, fontSize: 9, fontWeight: 900, pointerEvents: 'none' }}>
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

                    <div onClick={function() { window.open('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(selectedEvent.address + ' ' + (selectedEvent.localidad || '') + ' ' + selectedEvent.city)); }} style={{ background: 'rgba(99,102,241,.1)', padding: 10, borderRadius: 8, cursor: 'pointer', textAlign: 'center', border: '1px dashed #6366f1', marginBottom: 8 }}>
                      <MapPin color="#6366f1" size={14} style={{ margin: '0 auto 2px' }} />
                      <b style={{ fontSize: 10 }}>{selectedEvent.address}, {selectedEvent.localidad || ''} - {selectedEvent.city}</b><br />
                      <span style={{ fontSize: 8, color: '#2563eb', fontWeight: 900 }}>GPS GOOGLE MAPS</span>
                    </div>

                    {/* BOTONES COMPARTIR Y COPIAR - CORREGIDO */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <button onClick={function() { shareEvent(selectedEvent); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 12, background: 'rgba(34,197,94,.1)', border: '1px dashed #22c55e', borderRadius: 8, color: '#22c55e', fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>
                        <Share2 size={14} /> COMPARTIR
                      </button>
                      <button onClick={async function() { 
                        const url = APP_URL + '/evento/' + selectedEvent.id;
                        try {
                          await navigator.clipboard.writeText(url);
                          showToast('✅ Enlace copiado', 'success');
                        } catch (err) {
                          showToast('No se pudo copiar', 'error');
                        }
                      }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 12, background: 'rgba(99,102,241,.1)', border: '1px dashed #6366f1', borderRadius: 8, color: '#6366f1', fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>
                        <Copy size={14} /> COPIAR LINK
                      </button>
                    </div>

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
  <input
    name="city"
    placeholder="CIUDAD"
    style={INPUT_STYLE}
    value={form.city}
    onChange={handleInputChange}
  />

  <button
    type="button"
    onClick={() => setShowFormCategoryPicker(true)}
    style={{
      ...INPUT_STYLE,
      textAlign: 'left',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}
  >
    <span>{getCategoryLabel(form.category)}</span>
    <span style={{ fontSize: 10 }}>▼</span>
  </button>
</div>
              <input name="localidad" placeholder="LOCALIDAD" style={INPUT_STYLE} value={form.localidad} onChange={handleInputChange} />
              <input name="address" placeholder="DIRECCIÓN" style={INPUT_STYLE} value={form.address} onChange={handleInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <input name="date" type="date" style={{ ...INPUT_STYLE, padding: 8 }} value={form.date} onChange={handleInputChange} />
                <input name="time" type="time" style={{ ...INPUT_STYLE, padding: 8 }} value={form.time} onChange={handleInputChange} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button onClick={() => handleOpenPicker(false)} style={{ padding: 10, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
                  <ImageIcon size={14} /> ELEGIR DEL CATÁLOGO
                </button>

                <label style={{ padding: 10, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                  {isUploading ? 'SUBIENDO...' : 'SUBIR MI FOTO'}
                  <input 
  type="file" 
  accept="image/*" 
  style={{ display: 'none' }} 
  onChange={async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      showToast('El archivo seleccionado no es una imagen.', 'error');
      e.target.value = '';
      return;
    }

    // Validar tamaño máximo (8MB)
    if (file.size > 8 * 1024 * 1024) {
      showToast(`La foto es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 8MB.`, 'error');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    showToast('Optimizando imagen...', 'info');

    try {
      const result = await uploadImageToStorage(file);
      setForm((prev) => ({ ...prev, image_url: result.url }));
      showToast('Imagen subida (' + Math.round(result.compressedSize / 1024) + 'KB)', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al subir la imagen', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }} 
/>
                </label>
              </div>

              {form.image_url && (
  <div style={{ position: 'relative', marginTop: 4 }}>
    <img
      key={form.image_url}
      src={form.image_url}
      alt=""
      style={{
        width: '100%',
        height: 140,
        objectFit: 'cover',
        borderRadius: 12,
        display: 'block'
      }}
    />

    <button
      onClick={() => {
        setForm((prev) => ({ ...prev, image_url: '' }));
        showToast('Foto eliminada. Puedes elegir otra.', 'info');
      }}
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        background: 'rgba(239,68,68,0.95)',
        color: 'white',
        border: '2px solid white',
        borderRadius: '50%',
        width: 34,
        height: 34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        padding: 0,
        zIndex: 5
      }}
      title="Quitar foto"
    >
      <X size={17} strokeWidth={3} />
    </button>

    <div style={{
      position: 'absolute',
      bottom: 8,
      left: 8,
      background: 'rgba(34,197,94,0.95)',
      color: 'white',
      padding: '3px 8px',
      borderRadius: 6,
      fontSize: 9,
      fontWeight: 900,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }}>
      <CheckCircle size={11} /> FOTO LISTA
    </div>
  </div>
)}

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
                <input type="checkbox" checked={editForm.featured === true} onChange={function(e) { setEditForm(function(prev) { return { ...prev, featured: e.target.checked }; }); }} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                <Star size={16} fill={editForm.featured ? '#22c55e' : 'none'} color={editForm.featured ? '#22c55e' : '#6366f1'} />
                <span style={{ fontSize: 12, fontWeight: 900, color: editForm.featured ? '#22c55e' : 'inherit' }}>MARCAR COMO DESTACADO</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 5 }}>
                <button onClick={() => handleOpenPicker(true)} style={{ padding: 10, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
                  <ImageIcon size={14} /> ELEGIR DEL CATÁLOGO
                </button>

                <label style={{ padding: 10, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                  {isUploading ? 'SUBIENDO...' : 'SUBIR MI FOTO'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditGalleryUpload} />
                </label>
              </div>

              {editForm.image_url && (
  <div style={{ position: 'relative', marginTop: 4 }}>
    <img
      key={editForm.image_url}
      src={editForm.image_url}
      alt=""
      style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12, display: 'block' }}
    />
    <button
      onClick={() => {
        setEditForm((prev) => ({ ...prev, image_url: '' }));
        showToast('Foto eliminada', 'info');
      }}
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        background: 'rgba(239,68,68,0.95)',
        color: 'white',
        border: '2px solid white',
        borderRadius: '50%',
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        padding: 0
      }}
      title="Quitar foto"
    >
      <X size={16} strokeWidth={3} />
    </button>
    <div style={{
      position: 'absolute',
      bottom: 8,
      left: 8,
      background: 'rgba(34,197,94,0.95)',
      color: 'white',
      padding: '3px 8px',
      borderRadius: 6,
      fontSize: 9,
      fontWeight: 900,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }}>
      <CheckCircle size={11} /> FOTO LISTA
    </div>
  </div>
)}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                <button onClick={cancelEditEvent} disabled={isSubmitting} style={{ width: '100%', background: '#64748b', color: 'white', padding: 13, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 11, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>CANCELAR</button>
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
                <button onClick={function() { fetchEvents(); showToast('Eventos actualizados', 'success'); }} style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: 'rgba(99,102,241,.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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
                <input value={adminSearch} onChange={function(e) { setAdminSearch(e.target.value); }} placeholder="Buscar por título, ciudad, dirección..." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'inherit', fontWeight: 800, fontSize: 10 }} />
                {adminSearch && <button onClick={function() { setAdminSearch(''); }} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 900 }}>X</button>}
              </div>

              <select value={adminCityFilter} onChange={function(e) { setAdminCityFilter(e.target.value); }} style={{ width: '100%', padding: 10, borderRadius: 12, border: 'none', outline: 'none', background: isDark ? '#1e293b' : '#e2e8f0', color: 'inherit', fontWeight: 900, fontSize: 10 }}>
                <option value="TODAS">TODAS LAS CIUDADES</option>
                {adminCitiesList.map(function(city) { return <option key={city} value={city}>{city}</option>; })}
              </select>

              {adminFiltersActive && (
                <button onClick={function() { setAdminSearch(''); setAdminCityFilter('TODAS'); }} style={{ width: '100%', marginTop: 8, padding: 8, borderRadius: 10, border: 'none', background: 'rgba(99,102,241,.12)', color: '#6366f1', fontWeight: 900, fontSize: 9, cursor: 'pointer' }}>
                  LIMPIAR FILTROS
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <button onClick={function() { setAdminTab('pending'); fetchEvents(); }} style={{ padding: 10, borderRadius: 12, border: 'none', background: adminTab === 'pending' ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: adminTab === 'pending' ? 'white' : 'inherit', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>
                PENDIENTES ({pendingEvents.length}{adminFiltersActive ? '/' + rawPendingEvents.length : ''})
              </button>
              <button onClick={function() { setAdminTab('approved'); fetchEvents(); }} style={{ padding: 10, borderRadius: 12, border: 'none', background: adminTab === 'approved' ? '#22c55e' : (isDark ? '#1e293b' : '#e2e8f0'), color: adminTab === 'approved' ? 'white' : 'inherit', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>
                APROBADOS ({approvedEvents.length}{adminFiltersActive ? '/' + rawApprovedEvents.length : ''})
              </button>
            </div>

            {adminTab === 'approved' && approvedEvents.length > 0 && (
              <button onClick={function() { exportToCSV(approvedEvents); }} style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'rgba(99,102,241,.1)', color: '#6366f1', fontWeight: 900, fontSize: 10, cursor: 'pointer', marginBottom: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Download size={14} /> EXPORTAR RESULTADOS A CSV
              </button>
            )}

            {adminTab === 'pending' && pendingEvents.length === 0 && <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS PENDIENTES</p>}
            {adminTab === 'pending' && pendingEvents.map(function(ev) {
              return <AdminMiniCard key={ev.id} ev={ev} isDark={isDark} mode="pending"
                onClick={function() { setSelectedPendingEvent(ev); }}
                onApprove={function() { handleApproveEvent(ev.id); }}
                onReject={function() { handleRejectEvent(ev.id); }}
                onDelete={function() { handleDeleteEvent(ev.id); }} />;
            })}

            {adminTab === 'approved' && approvedEvents.length === 0 && <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS APROBADOS</p>}
            {adminTab === 'approved' && approvedEvents.map(function(ev) {
              return <AdminMiniCard key={ev.id} ev={ev} isDark={isDark} mode="approved"
                onClick={function() { openEvent(ev); }}
                onView={function() { openEvent(ev); }}
                onEdit={function() { startEditEvent(ev); }}
                onDelete={function() { handleDeleteEvent(ev.id); }} />;
            })}
          </div>
        )}

        {view === 'admin' && selectedPendingEvent && !editingEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <button onClick={function() { setSelectedPendingEvent(null); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}>
              <ArrowLeft size={16} /> VOLVER A LISTA
            </button>

            <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 20, overflow: 'hidden', padding: 0 }}>
              <SafeImg src={selectedPendingEvent.image_url} alt="" style={{ width: '100%', height: 220, objectFit: 'cover' }} />
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
                <div key={ev.id} className="contenedor-principal">
                <div className={isDark ? 'card-dark' : 'card-light'} style={{ display: 'flex', gap: 10, padding: 10, borderRadius: 18, marginBottom: 8, alignItems: 'center', cursor: 'pointer' }} onClick={function() { openEvent(ev); }}>
                  <SafeImg src={ev.image_url} alt="" style={{ width: 45, height: 45, borderRadius: 10, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 900, fontSize: 13 }}>{ev.title}</p>
                    <p style={{ fontSize: 9, color: '#6366f1' }}>{ev.city}</p>
                    {dl && <span style={{ fontSize: 8, color: dl.color, fontWeight: 900, background: dl.bg, padding: '2px 6px', borderRadius: 6 }}>{dl.text}</span>}
                  </div>
                  <button onClick={function(e) { e.stopPropagation(); toggleFavorite(ev.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={18} />
                  </button>
        </div>
      </div>
    );
  })}
</div>
)}

        {view === 'profile' ? (
 <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
 <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 22, borderRadius: 35, width: '100%', maxWidth: 300, textAlign: 'center' }}>
 <h2 style={{ fontWeight: 900, marginBottom: 12, fontSize: 16 }}>SOPORTE</h2>

 {userEmail && (
 <p style={{ fontSize: 9, opacity: 0.6, marginBottom: 8 }}>
 Conectado: {userEmail}
 </p>
 )}

 <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
 <a
 href="https://ko-fi.com/eventora"
 target="_blank"
 rel="noreferrer"
 style={{
 background: '#29abe0',
 color: 'white',
 padding: 14,
 borderRadius: 12,
 textDecoration: 'none',
 fontWeight: 900,
 fontSize: 11
 }}
 >
 INVITAR A UN CAFÉ (KO-FI)
 </a>

 <a
 href="https://paypal.me/EVENTORA"
 target="_blank"
 rel="noreferrer"
 style={{
 background: '#003087',
 color: 'white',
 padding: 14,
 borderRadius: 12,
 textDecoration: 'none',
 fontWeight: 900,
 fontSize: 11
 }}
 >
 APOYAR EN PAYPAL
 </a>
 </div>

 {!userEmail ? (
 <button
 onClick={handleLogin}
 style={{
 background: '#4f46e5',
 color: 'white',
 fontSize: 10,
 padding: '8px 15px',
 borderRadius: 8,
 border: 'none',
 fontWeight: 900,
 cursor: 'pointer'
 }}
 >
 LOGIN
 </button>
 ) : (
 <button
 onClick={handleLogout}
 style={{
 background: '#ef4444',
 color: 'white',
 fontSize: 10,
 padding: '8px 15px',
 borderRadius: 8,
 border: 'none',
 fontWeight: 900,
 cursor: 'pointer'
 }}
 >
 CERRAR SESIÓN
 </button>
 )}
 </div>
 </div>
) : null}
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
