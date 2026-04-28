import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2, Edit,
  Map as MapIcon, Clock, LayoutList, ShieldCheck, Sparkles,
  Loader2, ArrowLeft, Search, Share2, Star, Download, X, CheckCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;

var supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

var ADMIN_EMAILS = ['garverjacobo@gmail.com', 'jacobogarver@gmail.com'];
var INITIAL_FORM = { title: '', city: '', localidad: '', address: '', time: '21:00', date: '', category: 'MUSICA', image_url: '' };

var categoryEmojis = { 
  MUSICA: '🎵', GASTRONOMIA: '🍽️', TAURINO: '🐂', 
  'FIESTAS PATRONALES': '🎉', OTROS: '📌' 
};

var darkTileUrl = 'https://mt1.google.com/vt/lyrs=r&hl=es&x={x}&y={y}&z={z}';
var lightTileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}';

var redPinIcon = L.divIcon({
  html: '<div style="width:22px;height:30px;position:relative;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><svg viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 13.3 23.5 14 24.4.3.4.7.4 1 0C16.7 38.5 30 26.2 30 15 30 6.7 23.3 0 15 0z" fill="#ef4444"/><circle cx="15" cy="14" r="5" fill="white"/></svg></div>',
  iconSize: [22, 30], iconAnchor: [11, 30], popupAnchor: [0, -30], className: ''
});

// --- UTILIDADES ---
function formatDate(dateStr) { 
  if (!dateStr) return ''; 
  var parts = String(dateStr).split('-'); 
  if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0]; 
  return dateStr; 
}

function getDaysLeft(dateStr) { 
  if (!dateStr) return null; 
  var eventDate = new Date(dateStr + 'T23:59:59'); 
  var today = new Date(); today.setHours(0, 0, 0, 0); 
  return Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24)); 
}

function getDaysLabel(dateStr) { 
  var days = getDaysLeft(dateStr); 
  if (days === null) return ''; 
  if (days === 0) return { text: 'HOY', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }; 
  if (days === 1) return { text: 'MAÑANA', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' }; 
  if (days <= 3) return { text: 'EN ' + days + ' DÍAS', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }; 
  if (days <= 7) return { text: 'EN ' + days + ' DÍAS', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' }; 
  return { text: 'EN ' + days + ' DÍAS', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' }; 
}

// --- COMPONENTES UI ---
function Splash(props) {
  useEffect(function () {
    var t = setTimeout(function () { props.onDone(); }, 1400);
    return function () { clearTimeout(t); };
  }, []);
  return (<div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
    <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" alt="Eventora" style={{ height: 50, width: 'auto' }} />
    <p style={{ color: '#6366f1', fontSize: 11, fontWeight: 700 }}>Cargando eventos...</p>
    <Loader2 className="animate-spin" size={24} color="#4f46e5" /></div>);
}

function ToastNotification(props) {
  if (!props.show) return null;
  return (<div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: props.type === 'success' ? '#22c55e' : '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '8px', animation: 'slideDown 0.3s ease-out' }}>
    {props.type === 'success' ? <CheckCircle size={20} /> : <X size={20} />}
    <span style={{ fontWeight: '900' }}>{props.message}</span></div>);
}

function EventCard(props) {
  var ev = props.ev; var dl = getDaysLabel(ev.date);
  var isFeatured = ev.featured === true;
  return (<div key={ev.id} className={props.isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 25, overflow: 'hidden', marginBottom: 15, border: isFeatured ? '2px solid #22c55e' : undefined }}>
    <div style={{ position: 'relative' }}>
      {isFeatured && <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 5, background: '#22c55e', color: 'white', padding: '4px 10px', borderRadius: 8, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} fill="white" /> DESTACADO</div>}
      {dl && <div style={{ position: 'absolute', top: 10, right: 50, zIndex: 5, background: dl.bg, color: dl.color, padding: '4px 10px', borderRadius: 8, fontSize: 9, fontWeight: 900 }}>{dl.text}</div>}
      <div style={{ position: 'relative', height: isFeatured ? 200 : 160 }}>
        <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        <button onClick={() => props.toggleFavorite(ev.id)} style={{ position: 'absolute', top: 10, right: 10, padding: isFeatured ? 8 : 7, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444', display: 'flex', cursor: 'pointer' }}>
          <Heart size={isFeatured ? 18 : 16} className={props.animHeart === ev.id ? 'heart-pop' : ''} fill={props.favorites.indexOf(ev.id) !== -1 ? 'red' : 'none'} /></button>
      </div>
      <div style={{ padding: 15, textAlign: 'center' }}>
        <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 5 }}>{categoryEmojis[ev.category] || '📌'} {ev.city} | {formatDate(ev.date)}</p>
        <h3 style={{ fontWeight: 900, fontSize: isFeatured ? 17 : 15, marginBottom: 10 }}>{ev.title}</h3>
        <button onClick={() => props.selectEventById(ev.id)} style={{ width: '100%', padding: isFeatured ? 12 : 11, borderRadius: 14, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 900, fontSize: isFeatured ? 11 : 10, cursor: 'pointer' }}>{isFeatured ? 'VER DETALLES' : 'DETALLES'}</button>
      </div>
    </div>
  </div>);
}

function AdminListItem(props) {
  var ev = props.ev;
  return (<div className={props.isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 15, padding: 10, marginBottom: 10, cursor: 'pointer' }} onClick={props.onClick}>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: 50, height: 50, borderRadius: 10, objectFit: 'cover' }} alt="" />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 900, fontSize: 13 }}>{ev.title}</p>
        <p style={{ fontSize: 9, color: '#6366f1' }}>{ev.city} | {formatDate(ev.date)}</p>
      </div>
      <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 700 }}>{props.rightText}</span>
    </div>
  </div>);
}

export default function App() {
  // Estados
  var _splash = useState(true); var showSplash = _splash[0]; var setShowSplash = _splash[1];
  var _events = useState([]); var events = _events[0]; var setEvents = _events[1];
  var _favorites = useState(() => { try { var saved = localStorage.getItem('eventora_favs_v5'); return saved ? JSON.parse(saved) : []; } catch (e) { return []; } }); var favorites = _favorites[0]; var setFavorites = _favorites[1];
  var _profile = useState(null); var profile = _profile[0]; var setProfile = _profile[1];
  var _view = useState('home'); var view = _view[0]; var setView = _view[1];
  var _dark = useState(true); var isDark = _dark[0]; var setIsDark = _dark[1];
  var _cat = useState('TODOS'); var selectedCategory = _cat[0]; var setSelectedCategory = _cat[1];
  var _selectedId = useState(null); var selectedEventId = _selectedId[0]; var setSelectedEventId = _selectedId[1];
  var _mapCenter = useState(null); var mapCenter = _mapCenter[0]; var setMapCenter = _mapCenter[1];
  var _generating = useState(false); var isGenerating = _generating[0]; var setIsGenerating = _generating[1];
  var _submitting = useState(false); var isSubmitting = _submitting[0]; var setIsSubmitting = _submitting[1];
  var _form = useState(INITIAL_FORM); var form = _form[0]; var setForm = _form[1];
  var _email = useState(''); var userEmail = _email[0]; var setUserEmail = _email[1];
  var _pendingSelected = useState(null); var selectedPendingEvent = _pendingSelected[0]; var setSelectedPendingEvent = _pendingSelected[1];
  var _adminTab = useState('pending'); var adminTab = _adminTab[0]; var setAdminTab = _adminTab[1];
  var _search = useState(''); var searchQuery = _search[0]; var setSearchQuery = _search[1];
  var _dateFilter = useState('all'); var dateFilter = _dateFilter[0]; var setDateFilter = _dateFilter[1];
  var _animHeart = useState(null); var animHeart = _animHeart[0]; var setAnimHeart = _animHeart[1];
  var _toast = useState({ show: false, message: '', type: 'success' }); var toast = _toast[0]; var setToast = _toast[1];
  var _cityFilter = useState('TODAS'); var cityFilter = _cityFilter[0]; var setCityFilter = _cityFilter[1];
  var _editingEvent = useState(null); var editingEvent = _editingEvent[0]; var setEditingEvent = _editingEvent[1];
  var listRef = useRef(null);

  var selectedEvent = events.find(e => e.id === selectedEventId);
  var hasAdmin = profile && ADMIN_EMAILS.indexOf(profile.email) !== -1;
  var pendingEventsCount = hasAdmin ? events.filter(e => e.status === 'pending').length : 0;

  useEffect(function () { fetchEvents(); }, []);
  useEffect(function () { localStorage.setItem('eventora_favs_v5', JSON.stringify(favorites)); }, [favorites]);
  
  useEffect(function () {
    var path = window.location.pathname;
    if (path.startsWith('/evento/')) {
      var id = parseInt(path.split('/')[2]);
      if (!isNaN(id)) {
        setSelectedEventId(id);
        setView('detail');
        window.scrollTo(0, 0);
      }
    } else if (path.includes('/admin')) {
       setView('admin');
    }
  }, []);

  useEffect(function () {
    function isAdminUser(user) { return !!(user && user.email && ADMIN_EMAILS.indexOf(user.email) !== -1); }
    function handleSession(session) { 
      var user = session && session.user; 
      setUserEmail(user ? user.email : ''); 
      setProfile(isAdminUser(user) ? { role: 'admin', email: user.email } : null); 
      fetchEvents(); 
    }
    supabase.auth.getSession().then(function (res) { handleSession(res.data && res.data.session); });
    var sub = supabase.auth.onAuthStateChange(function (event, session) { handleSession(session); });
    return function () { if (sub && sub.data && sub.data.subscription) { sub.data.subscription.unsubscribe(); } };
  }, []);

  // ⚡ FETCH EVENTS OPTIMIZADO CON CACHÉ INSTANTÁNEO
  function fetchEvents() {
    // 1. Cargar de la memoria caché inmediatamente
    var cachedData = localStorage.getItem('eventora_cache_events');
    if (cachedData) {
      try {
        var prevEvents = JSON.parse(cachedData);
        console.log("📦 Cargando desde memoria (Instantáneo)...");
        setEvents(prevEvents.sort((a,b) => new Date(a.date) - new Date(b.date))); 
      } catch(e) { console.warn('Caché corrupta'); }
    }

    // 2. Hacer petición real al servidor para refrescar
    supabase.from('events').select('*').order('date', { ascending: true }).then(function (res) {
      if (res.error) { console.error('Error cargando:', res.error); return; }
      var data = res.data || [];
      
      // Guardar en caché para próxima visita
      try {
        localStorage.setItem('eventora_cache_events', JSON.stringify(data));
      } catch(e) { console.warn('No se pudo guardar caché'); }
      
      setEvents(data);
      var validIds = data.map(function (e) { return e.id; });
      setFavorites(function (prev) { return prev.filter(function (id) { return validIds.indexOf(id) !== -1; }); });
    });
  }

  function selectEventById(id) {
    setSelectedEventId(id);
    setView('detail');
    window.history.pushState({}, document.title, '/evento/' + id);
    window.scrollTo(0, 0);
  }

  function handleInputChange(e) {
    var name = e.target.name; var value = e.target.value;
    if (['title', 'city', 'localidad'].indexOf(name) !== -1) value = value.toUpperCase();
    setForm(function (prev) { var next = Object.assign({}, prev); next[name] = value; return next; });
  }
  
  function toggleFavorite(id) { 
    setFavorites(function (prev) { 
      if (prev.indexOf(id) !== -1) return prev.filter(function (f) { return f !== id; }); 
      return prev.concat([id]); 
    });
    setAnimHeart(id); setTimeout(function () { setAnimHeart(null); }, 700); 
  }
  
  async function generateAIImage() { 
    if (!form.title) return alert('Escribe un título primero.'); 
    setIsGenerating(true); 
    var seed = Math.floor(Math.random() * 999999);
    var url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent('professional_event_photography_' + form.title) + '?width=800&height=600&seed=' + seed + '&nologo=true&t=' + Date.now();
    setForm(function (prev) { return Object.assign({}, prev, { image_url: url }); });
    setTimeout(function () { setIsGenerating(false); }, 1200); 
  }

  async function handleGalleryUpload(e) {
    var file = e.target.files && e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Imagen muy grande (max 5MB)'); return; }
    setIsGenerating(true);
    try {
      var ext = file.name.split('.').pop() || 'jpg';
      var safeName = Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
      var path = 'uploads/' + safeName;
      var upload = await supabase.storage.from('event-images').upload(path, file, { cacheControl: '3600', upsert: false });
      if (upload.error) throw upload.error;
      var publicUrlData = supabase.storage.from('event-images').getPublicUrl(path);
      setForm(function (prev) { return Object.assign({}, prev, { image_url: publicUrlData.data.publicUrl }); });
    } catch (err) { console.error(err); alert('Error al subir imagen'); } finally { setIsGenerating(false); }
  }

  function geocodeAddress(address, localidad, city) {
    var fullAddress = [address, localidad, city, 'España'].filter(Boolean).join(', ');
    return fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' + encodeURIComponent(fullAddress))
      .then(r => r.json()).then(data => {
        if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        return fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' + encodeURIComponent(city + ', España'))
          .then(r2 => r2.json()).then(data2 => data2 && data2[0] ? { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) } : { lat: null, lng: null });
      }).catch(() => ({ lat: null, lng: null }));
  }

  function showToast(message, type) { setToast({ show: true, message: message, type: type }); setTimeout(function () { setToast({ show: false, message: '', type: 'success' }); }, 3000); }

  async function handleSubmitEvent() {
    if (!form.title || !form.date || !form.city || !form.address) return alert('Faltan campos obligatorios.');
    setIsSubmitting(true);
    geocodeAddress(form.address, form.localidad, form.city).then(function (coords) {
      var eventToInsert = {
        title: form.title.trim(), category: form.category, city: form.city.trim(),
        localidad: form.localidad ? form.localidad.trim() : null, address: form.address.trim(),
        date: form.date, time: form.time || '21:00', image_url: form.image_url || null,
        status: 'pending', lat: coords.lat, lng: coords.lng
      };
      supabase.from('events').insert([eventToInsert]).then(function (res) {
        if (res.error) { console.error(res.error); showToast('Error: ' + res.error.message, 'error'); return; }
        showToast('✅ Evento enviado a revisión', 'success');
        setForm(INITIAL_FORM); setView('home'); fetchEvents();
      }).finally(function () { setIsSubmitting(false); });
    });
  }

  async function handleApproveEvent(id) {
    supabase.from('events').update({ status: 'approved' }).eq('id', id).then(function (res) {
      if (res.error) alert('Error aprobando'); else { setSelectedPendingEvent(null); fetchEvents(); showToast('Evento aprobado', 'success'); }
    });
  }
  
  async function handleRejectEvent(id) {
    supabase.from('events').update({ status: 'rejected' }).eq('id', id).then(function (res) {
      if (res.error) alert('Error rechazando'); else { setSelectedPendingEvent(null); fetchEvents(); showToast('Evento rechazado', 'error'); }
    });
  }
  
  async function handleDeleteEvent(id) {
    if (!confirm('¿Borrar este evento permanentemente?')) return;
    supabase.from('events').delete().eq('id', id).then(function (res) {
      if (res.error) alert('Error borrando'); else { setSelectedPendingEvent(null); setSelectedEventId(null); fetchEvents(); showToast('Evento eliminado', 'error'); }
    });
  }

  async function handleUpdateEvent(id, updates) {
    supabase.from('events').update(updates).eq('id', id).then(function (res) {
      if (res.error) { alert('Error actualizando'); return; }
      setEditingEvent(null); fetchEvents(); showToast('✅ Evento actualizado correctamente', 'success');
    });
  }
  
  function shareEvent(ev) { 
    var realLink = window.location.origin + '/evento/' + ev.id;
    var text = 'EVENTO: ' + ev.title + ' | ' + ev.city + ' | ' + formatDate(ev.date) + '\n\n' + realLink;
    if (navigator.share) {
        navigator.share({ title: ev.title, text: text, url: realLink }).catch(console.error);
    } else {
        navigator.clipboard.writeText(text).then(() => showToast('Enlace copiado', 'success'));
    }
  }
  
  function handleLogin() { var email = prompt('Escribe tu email para iniciar sesión:'); if (!email) return; supabase.auth.signInWithOtp({ email: email }).then(() => { alert('Revisa tu correo para continuar'); }); }
  
  function handleLogout() { 
    supabase.auth.signOut().then(() => { 
      setUserEmail(''); setProfile(null); fetchEvents(); setView('home'); showToast('Sesión cerrada', 'success'); 
    }); 
  }

  // Filtros
  var today = new Date().toISOString().split('T')[0];
  var publicEvents = events.filter(function (e) { return e.status === 'approved' && e.date >= today; });
  
  var searchedEvents = searchQuery ? publicEvents.filter(function (e) { 
    return (e.title || '').toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1 || 
           (e.city || '').toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1 || 
           (e.localidad || '').toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1; 
  }) : publicEvents;

  var filteredByCategory = searchedEvents.filter(function (e) { return selectedCategory === 'TODOS' || e.category === selectedCategory; });
  
  var finalFilteredEvents = filteredByCategory.filter(function (e) {
    if (cityFilter !== 'TODAS') return e.city === cityFilter;
    if (dateFilter === 'today') return e.date === today;
    if (dateFilter === 'week') { var d = new Date(e.date); var n = new Date(); n.setDate(n.getDate() + 7); return d >= n && d <= n; }
    return true;
  });

  var favoriteEvents = publicEvents.filter(function (e) { return favorites.indexOf(e.id) !== -1; });
  var pendingEvents = hasAdmin ? events.filter(e => e.status === 'pending') : [];
  var approvedEvents = hasAdmin ? events.filter(e => e.status === 'approved') : [];
  var citiesList = [...new Set(publicEvents.map(e => e.city))];

  var featuredEvent = finalFilteredEvents.find(e => e.featured === true) || finalFilteredEvents[0];
  var restEvents = finalFilteredEvents.filter(e => !(featuredEvent && e.id === featuredEvent.id));

  var INPUT_STYLE = { width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 };

  if (showSplash) return <Splash onDone={function () { setShowSplash(false); }} />;

  return (
    <div className={isDark ? 'dark-theme' : 'light-theme'} style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <ToastNotification show={toast.show} message={toast.message} type={toast.type} />
      
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; transition: background-color .25s, color .25s; }
        html, body, #root { width: 100%; height: 100%; overflow: hidden; }
        .dark-theme { background:#020617; color:white; } .light-theme { background:#f8fafc; color:#0f172a; }
        .card-dark { background:#0f172a; border:1px solid #1e293b; color:white; }
        .card-light { background:white; border:1px solid #e2e8f0; color:#0f172a; box-shadow:0 4px 12px rgba(0,0,0,.05); }
        .no-scrollbar::-webkit-scrollbar { display:none; } .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        .leaflet-container img { max-width:none!important; max-height:none!important; }
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .animate-spin{animation:spin 1s linear infinite;}
        @keyframes admin-pulse { 0%{transform:scale(1);color:#818cf8;} 50%{transform:scale(1.2);color:#ef4444;} 100%{transform:scale(1);color:#818cf8;} } .pulse-admin{animation:admin-pulse 1.4s infinite;}
        @keyframes heartPop { 0%{transform:scale(1);} 30%{transform:scale(1.5);} 60%{transform:scale(.9);} 100%{transform:scale(1);} } .heart-pop{animation:heartPop .6s ease-out;}
        @keyframes slideDown { from{opacity:0;transform:translateX(-50%) translateY(-20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
      `}</style>

      {/* NAV SUPERIOR */}
      <nav style={{ height: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,.2)', background: isDark ? '#0f172a' : '#fff', flexShrink: 0 }}>
        <div onClick={function () { setView('home'); setSelectedEventId(null); setSelectedPendingEvent(null); window.history.pushState({}, '', '/'); }} style={{ cursor: 'pointer' }}>
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" alt="Eventora" style={{ height: 18, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasAdmin && (
            <div onClick={function () { setView('admin'); setSelectedEventId(null); setAdminTab('pending'); fetchEvents(); window.history.pushState({}, '', '/admin'); }} style={{ position: 'relative', cursor: 'pointer' }}>
              <ShieldCheck size={20} className={pendingEventsCount > 0 ? 'pulse-admin' : ''} style={{ color: '#6366f1' }} />
              {pendingEventsCount > 0 && <span style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 900, borderRadius: '50%', padding: '2px 5px', minWidth: 16, textAlign: 'center', border: '2px solid white' }}>{pendingEventsCount}</span>}
            </div>
          )}
          {!userEmail && <button onClick={handleLogin} style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 8, fontWeight: 900, cursor: 'pointer' }}>LOGIN</button>}
          <button onClick={function () { setIsDark(!isDark); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>{isDark ? <Sun size={18} color="#facc15" /> : <Moon size={18} color="#4f46e5" />}</button>
          <Sparkles size={18} color="#6366f1" style={{ cursor: 'pointer' }} onClick={function () { setView('profile'); window.history.pushState({}, '', '/perfil'); }} />
        </div>
      </nav>

      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>

        {/* MAPA */}
        {view === 'map' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <div style={{ position: 'absolute', top: 15, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '85%', maxWidth: 300 }}>
               <div style={{ background: '#fff', borderRadius: 15, padding: '4px 12px', display: 'flex', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <Search size={16} color="#6366f1" />
                <input onChange={function (e) { var val = e.target.value; if (val && val !== 'ESPAÑA') { fetch('https://nominatim.openstreetmap.org/search?format=json&q='+encodeURIComponent(val+',Spain')).then(r=>r.json()).then(d=>{if(d&&d[0])setMapCenter([parseFloat(d[0].lat),parseFloat(d[0].lon)])})}} placeholder="Buscar ciudad..." style={{ width: '100%', padding: 10, border: 'none', outline: 'none', fontWeight: 900, fontSize: 11 }} />
              </div>
            </div>
            <MapContainer center={[40.41, -3.70]} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <TileLayer url={isDark ? darkTileUrl : lightTileUrl} attribution="Google Maps" maxZoom={20} />
              {publicEvents.map(function (ev) { if (ev.lat && ev.lng) return <Marker key={ev.id} position={[ev.lat, ev.lng]} icon={redPinIcon}><Popup><b>{ev.title}</b><br />{ev.address}, {ev.city}<br /><a href={"/evento/"+ev.id}>VER EVENTO</a></Popup></Marker>; return null; })}
            </MapContainer>
          </div>
        )}

        {/* HOME & FILTROS */}
        {view === 'home' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 12px', flexShrink: 0, background: isDark ? '#020617' : '#f8fafc', borderBottom: '1px solid rgba(128,128,128,.1)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select value={cityFilter} onChange={(e)=>setCityFilter(e.target.value)} style={{ padding: '5px', borderRadius: 6, border: '1px solid rgba(128,128,128,.2)', background: isDark ? '#1e293b' : '#e2e8f0', color: isDark ? 'white':'black', fontSize:'10px' }}><option value="TODAS">Todas ciudades</option>{citiesList.map(c=><option key={c} value={c}>{c}</option>)}</select>
              <select value={selectedCategory} onChange={(e)=>setSelectedCategory(e.target.value)} style={{ padding: '5px', borderRadius: 6, border: '1px solid rgba(128,128,128,.2)', background: isDark ? '#1e293b' : '#e2e8f0', color: isDark ? 'white':'black', fontSize:'10px' }}><option value="TODOS">Todas categorías</option><option value="MUSICA">Musica</option><option value="GASTRONOMIA">Gastronomia</option><option value="TAURINO">Taurino</option><option value="FIESTAS PATRONALES">Fiestas</option><option value="OTROS">Otros</option></select>
              <select value={dateFilter} onChange={(e)=>setDateFilter(e.target.value)} style={{ padding: '5px', borderRadius: 6, border: '1px solid rgba(128,128,128,.2)', background: isDark ? '#1e293b' : '#e2e8f0', color: isDark ? 'white':'black', fontSize:'10px' }}><option value="all">Todo</option><option value="today">Hoy</option><option value="week">Semana</option></select>
            </div>
            <div style={{ padding: '8px 12px', flexShrink: 0, background: isDark ? '#020617' : '#f8fafc', borderBottom: '1px solid rgba(128,128,128,.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isDark ? '#1e293b' : '#e2e8f0', borderRadius: 12, padding: '6px 12px' }}>
                <Search size={16} color="#6366f1" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar evento..." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: 11, color: 'inherit' }} />
              </div>
            </div>
            <div ref={listRef} className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 15, paddingBottom: 120 }}>
              {finalFilteredEvents.length === 0 && <div style={{ textAlign: 'center', marginTop: 60, opacity: 0.5 }}><Search size={40} style={{ margin: '0 auto 15px' }} /><p>NINGÚN EVENTO ENCONTRADO</p></div>}
              {featuredEvent && <EventCard ev={featuredEvent} isDark={isDark} favorites={favorites} animHeart={animHeart} toggleFavorite={toggleFavorite} selectEventById={selectEventById} />}
              {restEvents.map(function (ev) { return <EventCard key={ev.id} ev={ev} isDark={isDark} favorites={favorites} animHeart={animHeart} toggleFavorite={toggleFavorite} selectEventById={selectEventById} />; })}
            </div>
          </div>
        )}

        {/* ADMIN PANEL */}
        {view === 'admin' && !selectedPendingEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto' }}>
             <button onClick={function () { setView('home'); setSelectedPendingEvent(null); window.history.pushState({}, '', '/'); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}><ArrowLeft size={16} /> VOLVER</button>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
               <button onClick={function () { setAdminTab('pending'); fetchEvents(); }} style={{ padding: 10, borderRadius: 12, border: 'none', background: adminTab === 'pending' ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: adminTab === 'pending' ? 'white' : 'inherit', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>PENDIENTES ({pendingEvents.length})</button>
               <button onClick={function () { setAdminTab('approved'); fetchEvents(); }} style={{ padding: 10, borderRadius: 12, border: 'none', background: adminTab === 'approved' ? '#22c55e' : (isDark ? '#1e293b' : '#e2e8f0'), color: adminTab === 'approved' ? 'white' : 'inherit', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>APROBADOS ({approvedEvents.length})</button>
             </div>
             {adminTab === 'pending' && pendingEvents.length === 0 && <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50 }}>NO HAY EVENTOS PENDIENTES</p>}
             {adminTab === 'pending' && pendingEvents.map(function (ev) { return <AdminListItem key={ev.id} ev={ev} isDark={isDark} onClick={() => setSelectedPendingEvent(ev)} rightText="VER >" />; })}
             {adminTab === 'approved' && approvedEvents.length === 0 && <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50 }}>NO HAY EVENTOS APROBADOS</p>}
             {adminTab === 'approved' && approvedEvents.map(function (ev) { return <AdminListItem key={ev.id} ev={ev} isDark={isDark} onClick={() => selectEventById(ev.id)} rightText="VER & EDITAR" />; })}
          </div>
        )}

        {view === 'admin' && selectedPendingEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto' }}>
            <button onClick={function () { setSelectedPendingEvent(null); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, marginBottom: 12, cursor: 'pointer' }}><ArrowLeft size={16} /> VOLVER</button>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 20, overflow: 'hidden', padding: 18 }}>
              {selectedPendingEvent.image_url && <img src={selectedPendingEvent.image_url} style={{ width: '100%', height: 200, objectFit: 'cover' }} alt="" />}
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 15 }}>{selectedPendingEvent.title}</h2>
              <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                 <div><b>Fecha:</b> {formatDate(selectedPendingEvent.date)}</div>
                 <div><b>Hora:</b> {selectedPendingEvent.time}</div>
                 <div><b>Dirección:</b> {selectedPendingEvent.address}, {selectedPendingEvent.localidad} - {selectedPendingEvent.city}</div>
                 <div><b>Categoría:</b> {selectedPendingEvent.category}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <button onClick={function () { handleApproveEvent(selectedPendingEvent.id); }} style={{ padding: 12, background: '#22c55e', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, cursor: 'pointer' }}>APROBAR</button>
                <button onClick={function () { handleRejectEvent(selectedPendingEvent.id); }} style={{ padding: 12, background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, cursor: 'pointer' }}>RECHAZAR</button>
                <button onClick={function () { handleDeleteEvent(selectedPendingEvent.id); }} style={{ padding: 12, background: '#64748b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, cursor: 'pointer' }}>BORRAR</button>
              </div>
            </div>
          </div>
        )}

        {/* DETALLE Y EDICIÓN */}
        {view === 'detail' && selectedEvent && (
          <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', padding: 15 }}>
            <button onClick={function () { setSelectedEventId(null); setView(adminTab ? 'admin' : 'home'); window.history.pushState({}, '', '/'); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 4, marginBottom: 12, cursor: 'pointer' }}><ArrowLeft size={14} /> VOLVER</button>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 20, overflow: 'hidden' }}>
              <img src={selectedEvent.image_url} style={{ width: '100%', height: 250, objectFit: 'cover' }} alt="" />
              <div style={{ padding: 18 }}>
                <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>{selectedEvent.title}</h2>
                <p style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 15 }}>{selectedEvent.category} | {selectedEvent.city}</p>
                <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                  <div><b>📅 {formatDate(selectedEvent.date)}</b> a las <b>{selectedEvent.time}</b></div>
                  <div><b>📍 {selectedEvent.address}, {selectedEvent.localidad}</b></div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 15 }}>
                  <button onClick={function () { shareEvent(selectedEvent); }} style={{ padding: 10, background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'none', borderRadius: 8, fontWeight: 900, cursor: 'pointer' }}>COMPARTIR</button>
                  
                  {hasAdmin && selectedEvent.status === 'approved' && !editingEvent && (
                      <button onClick={function () { setEditingEvent(selectedEvent); }} style={{ padding: 10, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'none', borderRadius: 8, fontWeight: 900, cursor: 'pointer' }}>EDITAR</button>
                  )}
                </div>

                {editingEvent && hasAdmin && selectedEvent.status === 'approved' && (
                   <div className={isDark ? 'card-light' : 'card-dark'} style={{ padding: 15, borderRadius: 12, backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>
                     <h3 style={{ fontWeight: 900, fontSize: 14, marginBottom: 10 }}>Editar Detalles</h3>
                     <input name="title" style={INPUT_STYLE} value={editingEvent.title} onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})} placeholder="Titulo"/>
                     <select name="category" style={INPUT_STYLE} value={editingEvent.category} onChange={(e) => setEditingEvent({...editingEvent, category: e.target.value})}>
                       <option value="MUSICA">MUSICA</option><option value="GASTRONOMIA">GASTRONOMIA</option><option value="TAURINO">TAURINO</option><option value="FIESTAS PATRONALES">FIESTAS</option><option value="OTROS">OTROS</option>
                     </select>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                        <button onClick={function () { handleUpdateEvent(editingEvent.id, { title: editingEvent.title, category: editingEvent.category }); }} style={{ padding: 10, background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, fontWeight: 900 }}>GUARDAR</button>
                        <button onClick={function () { setEditingEvent(null); }} style={{ padding: 10, background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontWeight: 900 }}>CANCELAR</button>
                     </div>
                   </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PERFIL Y SOPORTE */}
        {view === 'profile' && (
           <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
             <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 22, borderRadius: 35, width: '100%', maxWidth: 300, textAlign: 'center' }}>
               <h2 style={{ fontWeight: 900, marginBottom: 12 }}>SOPORTE</h2>
               <p style={{ fontSize: 9, opacity: .6, marginBottom: 12 }}>Gracias por usar Eventora 🙏</p>
               <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                 <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 14, borderRadius: 12, textDecoration: 'none', fontWeight: 900 }}>APOYAR KO-FI</a>
                 <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 14, borderRadius: 12, textDecoration: 'none', fontWeight: 900 }}>APOYAR PAYPAL</a>
               </div>
               {!userEmail && <button onClick={handleLogin} style={{ background: '#4f46e5', color: 'white', padding: '8px 15px', borderRadius: 8, border: 'none', fontWeight: 900, marginTop: 10 }}>INICIAR SESIÓN</button>}
               {userEmail && (
                 <>
                    <p style={{ fontSize: 11, opacity: .8, marginBottom: 10 }}>Conectado como: <b>{userEmail}</b></p>
                    <button onClick={handleLogout} style={{ background: '#ef4444', color: 'white', padding: '8px 15px', borderRadius: 8, border: 'none', fontWeight: 900 }}>CERRAR SESIÓN</button>
                 </>
               )}
             </div>
           </div>
        )}

        {/* CREATE VIEW */}
        {view === 'create' && (<div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
          <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 15, borderRadius: 20, gap: 8, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 14 }}>AÑADIR EVENTO</h2>
            <input name="title" placeholder="TÍTULO" style={INPUT_STYLE} value={form.title} onChange={handleInputChange} />
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 6 }}>
              <input name="city" placeholder="CIUDAD" style={INPUT_STYLE} value={form.city} onChange={handleInputChange} />
              <select name="category" style={INPUT_STYLE} value={form.category} onChange={handleInputChange}>
                <option value="MUSICA">MUSICA</option><option value="GASTRONOMIA">GASTRONOMIA</option><option value="TAURINO">TAURINO</option><option value="FIESTAS PATRONALES">FIESTAS</option><option value="OTROS">OTROS</option>
              </select>
            </div>
            <input name="localidad" placeholder="LOCALIDAD" style={INPUT_STYLE} value={form.localidad} onChange={handleInputChange} />
            <input name="address" placeholder="DIRECCIÓN" style={INPUT_STYLE} value={form.address} onChange={handleInputChange} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <input name="date" type="date" style={Object.assign({}, INPUT_STYLE, { padding: 8 })} value={form.date} onChange={handleInputChange} />
              <input name="time" type="time" style={Object.assign({}, INPUT_STYLE, { padding: 8 })} value={form.time} onChange={handleInputChange} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button onClick={generateAIImage} disabled={isGenerating} style={{ padding: 10, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: isGenerating ? 'not-allowed' : 'pointer' }}>
                {isGenerating ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                IA FOTO
              </button>
              <label style={{ padding: 10, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>
                GALERÍA
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleGalleryUpload} />
              </label>
            </div>
            {form.image_url && (<img src={form.image_url} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 10 }} alt="" />)}
            <button onClick={handleSubmitEvent} disabled={isSubmitting} style={{ width: '100%', background: '#4f46e5', color: 'white', padding: 13, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 11, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? .7 : 1 }}>
              {isSubmitting ? 'Enviando...' : 'ENVIAR REVISIÓN'}
            </button>
          </div>
        </div>)}

      </main>

      {/* BOTTOM NAV */}
      <nav style={{ position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)', width: '88%', maxWidth: 360, height: 55, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 8px 25px rgba(0,0,0,0.4)', zIndex: 3000, background: isDark ? 'rgba(15,23,42,.95)' : 'rgba(255,255,255,.95)' }}>
        <button onClick={function () { setView('home'); setSelectedEventId(null); setSelectedPendingEvent(null); window.history.pushState({}, '', '/'); }} style={{ background: 'none', border: 'none', color: view === 'home' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><LayoutList size={22} /></button>
        <button onClick={function () { setView('create'); setSelectedEventId(null); setSelectedPendingEvent(null); window.history.pushState({}, '', '/crear'); }} style={{ background: 'none', border: 'none', color: view === 'create' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><PlusCircle size={22} /></button>
        <button onClick={function () { setView('map'); setSelectedEventId(null); setSelectedPendingEvent(null); window.history.pushState({}, '', '/mapa'); }} style={{ background: 'none', border: 'none', color: view === 'map' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><MapIcon size={22} /></button>
        <button onClick={function () { setView('profile'); window.history.pushState({}, '', '/perfil'); }} style={{ background: 'none', border: 'none', color: view === 'profile' ? '#ef4444' : '#64748b', cursor: 'pointer' }}><Sparkles size={22} /></button>
      </nav>
    </div>
  );
}
