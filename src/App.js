import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2,
  Map as MapIcon, Clock, LayoutList, ShieldCheck, Sparkles,
  Loader2, ArrowLeft, Search, Share2, Star, Download
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;

var redPinIcon = L.divIcon({
  html: '<div style="width:22px;height:30px;position:relative;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><svg viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 13.3 23.5 14 24.4.3.4.7.4 1 0C16.7 38.5 30 26.2 30 15 30 6.7 23.3 0 15 0z" fill="#ef4444"/><circle cx="15" cy="14" r="5" fill="white"/></svg></div>',
  iconSize: [22, 30], iconAnchor: [11, 30], popupAnchor: [0, -30], className: ''
});

var categoryEmojis = { 'MUSICA': '🎵', 'GASTRONOMIA': '🍽️', 'TAURINO': '🐂', 'FIESTAS PATRONALES': '🎉', 'OTROS': '📌' };
var darkTileUrl = 'https://mt1.google.com/vt/lyrs=r&hl=es&x={x}&y={y}&z={z}';
var lightTileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}';

var supabase = createClient(process.env.REACT_APP_SUPABASE_URL || '', process.env.REACT_APP_SUPABASE_ANON_KEY || '');
var ADMIN_EMAILS = ['garverjacobo@gmail.com', 'jacobogarver@gmail.com'];
var INITIAL_FORM = { title: '', city: '', localidad: '', address: '', time: '21:00', date: '', category: 'MUSICA', image_url: '' };

// ✅ FORMATEAR FECHA A DD/MM/YYYY
function formatDate(dateStr) { if (!dateStr) return ''; var parts = dateStr.split('-'); if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0]; return dateStr; }

// ✅ PUNTO 1: CUENTA ATRÁS DE 3 DÍAS
function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  var eventDate = new Date(dateStr + 'T23:59:59');
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var diff = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
  return diff;
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

// ✅ PUNTO 4: SPLASH SCREEN
function Splash({ onDone }) {
  useEffect(function () {
    var t = setTimeout(function () { onDone(); }, 2200);
    return function () { clearTimeout(t); };
  }, []);
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
      <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" alt="Eventora" style={{ height: 50, width: 'auto', animation: 'fadeIn 0.6s ease-out' }} />
      <p style={{ color: '#6366f1', fontSize: 11, fontWeight: 700 }}>Cargando eventos...</p>
      <Loader2 className="animate-spin" size={24} color="#4f46e5" />
    </div>
  );
}

// ✅ PUNTO 5: EXPORTAR CSV (ADMIN)
function exportToCSV(events) {
  if (events.length === 0) return alert('No hay eventos para exportar.');
  var headers = ['Titulo', 'Ciudad', 'Localidad', 'Direccion', 'Fecha', 'Hora', 'Categoria', 'Estado', 'Lat', 'Lng'];
  var rows = events.map(function (e) {
    return [e.title, e.city, e.localidad, e.address, formatDate(e.date), e.time, e.category, e.status, e.lat || '', e.lng || ''].join(';"');
  });
  var csv = '\uFEFF' + headers.join(';"') + ';\n' + rows.map(function (r) { return '"' + r + '"'; }).join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'eventora_eventos_' + new Date().toISOString().split('T')[0] + '.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function MapResizer(props) {
  var map = useMap();
  var prevCenter = React.useRef(null);
  useEffect(function () {
    map.invalidateSize();
    if (props.center) {
      var isNew = !prevCenter.current || prevCenter.current[0] !== props.center[0] || prevCenter.current[1] !== props.center[1];
      if (isNew) { map.flyTo(props.center, 9, { animate: true, duration: 1.5 }); prevCenter.current = props.center; }
    } else { map.setView([40.4167, -3.7037], 6); prevCenter.current = null; }
  }, [props.center]);
  return null;
}

export default function App() {
  var _splash = useState(true);
  var showSplash = _splash[0];
  var setShowSplash = _splash[1];

  var _ev = useState([]);
  var events = _ev[0]; var setEvents = _ev[1];
  var _fav = useState(function () { if (typeof window === 'undefined') return []; var s = localStorage.getItem('eventora_favs_v4'); return s ? JSON.parse(s) : []; });
  var favorites = _fav[0]; var setFavorites = _fav[1];
  var _prof = useState(null); var profile = _prof[0]; var setProfile = _prof[1];
  var _vw = useState('home'); var view = _vw[0]; var setView = _vw[1];
  var _dark = useState(true); var isDark = _dark[0]; var setIsDark = _dark[1];
  var _cat = useState('TODOS'); var selectedCategory = _cat[0]; var setSelectedCategory = _cat[1];
  var _sel = useState(null); var selectedEvent = _sel[0]; var setSelectedEvent = _sel[1];
  var _mc = useState(null); var mapCenter = _mc[0]; var setMapCenter = _mc[1];
  var _gen = useState(false); var isGenerating = _gen[0]; var setIsGenerating = _gen[1];
  var _sub = useState(false); var isSubmitting = _sub[0]; var setIsSubmitting = _sub[1];
  var _form = useState(INITIAL_FORM); var form = _form[0]; var setForm = _form[1];
  var _email = useState(''); var userEmail = _email[0]; var setUserEmail = _email[1];
  var _adminSel = useState(null); var selectedPendingEvent = _adminSel[0]; var setSelectedPendingEvent = _adminSel[1];
  var _adminTab = useState('pending'); var adminTab = _adminTab[0]; var setAdminTab = _adminTab[1];
  var _search = useState(''); var searchQuery = _search[0]; var setSearchQuery = _search[1];
  var _dateFilter = useState('all'); var dateFilter = _dateFilter[0]; var setDateFilter = _dateFilter[1];
  var _animHeart = useState(null); var animHeart = _animHeart[0]; var setAnimHeart = _animHeart[1];
  var listRef = useRef(null);

  useEffect(function () { fetchEvents(); }, []);
  useEffect(function () { if (typeof window !== 'undefined') { localStorage.setItem('eventora_favs_v4', JSON.stringify(favorites)); } }, [favorites]);
  useEffect(function () {
    function checkAdmin(user) { if (!user) return false; return user.email && ADMIN_EMAILS.indexOf(user.email) !== -1; }
    function handleSession(session) { var u = session && session.user; setUserEmail(u ? u.email : ''); setProfile(checkAdmin(u) ? { role: 'admin' } : null); }
    supabase.auth.getSession().then(function (r) { handleSession(r.data && r.data.session); });
    var sub = supabase.auth.onAuthStateChange(function (event, session) { handleSession(session); });
    return function () { if (sub && sub.data && sub.data.subscription) { sub.data.subscription.unsubscribe(); } };
  }, []);

  function fetchEvents() {
    supabase.from('events').select('*').then(function (r) {
      if (r.data) {
        var sorted = r.data.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
        setEvents(sorted);
        var validIds = sorted.map(function (e) { return e.id; });
        setFavorites(function (prev) {
          var cleaned = prev.filter(function (id) { return validIds.indexOf(id) !== -1; });
          if (cleaned.length !== prev.length) localStorage.setItem('eventora_favs_v4', JSON.stringify(cleaned));
          return cleaned;
        });
      }
    });
  }

  function toggleFavorite(id) {
    setFavorites(function (prev) {
      if (prev.indexOf(id) !== -1) return prev.filter(function (f) { return f !== id; });
      return prev.concat([id]);
    });
    setAnimHeart(id);
    setTimeout(function () { setAnimHeart(null); }, 800);
  }

  function handleInputChange(e) { var n = e.target.name; var v = e.target.value; var up = ['title', 'city', 'localidad']; var val = up.indexOf(n) !== -1 ? v.toUpperCase() : v; var nf = Object.assign({}, form); nf[n] = val; setForm(nf); }
  function generateAIImage() { if (!form.title) return alert('Escribe un titulo primero'); setIsGenerating(true); var seed = Math.floor(Math.random() * 999999); var url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent('professional_event_photography_' + form.title) + '?width=800&height=600&seed=' + seed + '&nologo=true&t=' + Date.now(); var nf = Object.assign({}, form); nf.image_url = url; setForm(nf); setTimeout(function () { setIsGenerating(false); }, 2000); }
  function handleGalleryUpload(e) { var file = e.target.files[0]; if (file) { var reader = new FileReader(); reader.onload = function (ev) { var nf = Object.assign({}, form); nf.image_url = ev.target.result; setForm(nf); }; reader.readAsDataURL(file); } }
  function handleCitySearch(city) { if (city === 'ESPAÑA') { setMapCenter(null); return; } fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' + encodeURIComponent(city + ', Espana')).then(function (r) { return r.json(); }).then(function (data) { if (data && data[0]) { setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]); } }).catch(function (err) { console.error(err); }); }

  // ✅ GEOCODE ADDRESS MEJORADO
  function geocodeAddress(address, localidad, city) {
    var fullAddress = (address || '') + ', ' + (localidad || '') + ', ' + (city || '') + ', Espana';
    console.log("🌍 Geocodificando:", fullAddress);
    return fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' + encodeURIComponent(fullAddress))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data[0]) {
          console.log("📍 Encontrado:", data[0].lat, data[0].lon);
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        console.log("📍 No encontrado, intentando solo ciudad...");
        return fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' + encodeURIComponent(city + ', Espana'))
          .then(function (r2) { return r2.json(); })
          .then(function (data2) {
            if (data2 && data2[0]) {
              return { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) };
            }
            return { lat: null, lng: null };
          });
      })
      .catch(function (err) {
        console.error("❌ Error geocoding:", err);
        return { lat: null, lng: null };
      });
  }

  // ✅ ENVIAR EVENTO MEJORADO
  function handleSubmitEvent() {
    if (!form.title || !form.date || !form.city || !form.address) {
      return alert('❌ Faltan campos:\n\n- Título\n- Ciudad\n- Fecha\n- Dirección');
    }
    setIsSubmitting(true);
    console.log("📤 Enviando evento...", form);
    geocodeAddress(form.address, form.localidad, form.city).then(function (coords) {
      console.log("📍 Coordenadas:", coords);
      return supabase.from('events').insert([{
        title: form.title,
        category: form.category,
        city: form.city,
        localidad: form.localidad || null,
        address: form.address,
        date: form.date,
        time: form.time,
        image_url: form.image_url || null,
        status: 'pending',
        lat: coords.lat,
        lng: coords.lng
      }]).select();
    }).then(function (r) {
      if (r.error) {
        console.error("❌ Error Supabase:", r.error);
        throw r.error;
      }
      console.log("✅ Evento creado:", r.data);
      alert('✅ ¡Evento enviado a revisión!');
      setForm(INITIAL_FORM);
      setView('home');
      fetchEvents();
    }).catch(function (err) {
      console.error("❌ Error completo:", err);
      alert('❌ Error al enviar.\n\nAbre consola (F12) y dime qué aparece en rojo.');
    }).finally(function () {
      setIsSubmitting(false);
    });
  }

  function handleApproveEvent(id) { supabase.from('events').update({ status: 'approved' }).eq('id', id).then(function () { setSelectedPendingEvent(null); fetchEvents(); }); }
  function handleRejectEvent(id) { supabase.from('events').update({ status: 'rejected' }).eq('id', id).then(function () { setSelectedPendingEvent(null); fetchEvents(); }); }
  function handleDeleteEvent(id) { if (confirm('Seguro que quieres borrar este evento?')) { supabase.from('events').delete().eq('id', id).then(function () { setSelectedPendingEvent(null); fetchEvents(); }); } }
  function shareEvent(ev) { var text = 'EVENTO: ' + ev.title + ' | ' + ev.city + ' | ' + formatDate(ev.date) + ' | ' + ev.address + ', ' + ev.localidad; if (navigator.share) { navigator.share({ title: ev.title, text: text }); } else { navigator.clipboard.writeText(text).then(function () { alert('Texto copiado al portapapeles'); }); } }
  function handleLogin() { var email = prompt('Escribe tu email:'); if (email) { supabase.auth.signInWithOtp({ email: email }).then(function () { alert('Revisa tu email y pulsa el enlace.'); }); } }
  function handleCategoryChange(cat) { setSelectedCategory(cat); if (listRef.current) { listRef.current.scrollTop = 0; } }

  // ✅ AÑADIR A GOOGLE CALENDAR
  function addToGoogleCalendar(ev) {
    var dateParts = ev.date.split('-');
    var startDate = dateParts.join('T').replace(/-/g, '');
    var timeParts = (ev.time || '12:00').split(':');
    var startTime = startDate + 'T' + timeParts[0] + timeParts[1] + '00';
    var endHour = parseInt(timeParts[0]) + 2;
    var endTime = startDate + 'T' + (endHour < 10 ? '0' + endHour : endHour) + timeParts[1] + '00';
    var details = ev.title + '\n' + ev.address + ', ' + ev.localidad + ' - ' + ev.city;
    var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(ev.title) + '&dates=' + startTime + '/' + endTime + '&details=' + encodeURIComponent(details) + '&location=' + encodeURIComponent(ev.address + ', ' + ev.localidad + ', ' + ev.city);
    window.open(url, '_blank');
  }

  var today = new Date().toISOString().split('T')[0];
  var publicEvents = events.filter(function (e) { return e.status === 'approved' && e.date >= today; });
  var searchedEvents = searchQuery ? publicEvents.filter(function (e) { return e.title.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1 || e.city.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1; }) : publicEvents;
  var categoryEvents = searchedEvents.filter(function (e) { return selectedCategory === 'TODOS' || e.category === selectedCategory; });
  var filteredEvents = categoryEvents.filter(function (e) {
    if (dateFilter === 'today') return e.date === today;
    if (dateFilter === 'week') { var eventDate = new Date(e.date); var now = new Date(); var weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7); return eventDate >= now && eventDate <= weekEnd; }
    return true;
  });
  var favoriteEvents = publicEvents.filter(function (e) { return favorites.indexOf(e.id) !== -1; });
  var pendingEvents = events.filter(function (e) { return e.status === 'pending'; });
  var approvedEvents = events.filter(function (e) { return e.status === 'approved'; });
  var citiesList = [];
  publicEvents.forEach(function (e) { if (citiesList.indexOf(e.city) === -1) citiesList.push(e.city); });
  var featuredEvent = filteredEvents.length > 0 ? filteredEvents[0] : null;
  var restEvents = filteredEvents.length > 0 ? filteredEvents.slice(1) : [];

  var INPUT_STYLE = { width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 };
  var hasAdmin = profile && profile.role === 'admin';

  if (showSplash) {
    return <Splash onDone={function () { setShowSplash(false); }} />;
  }

  return (
    <div className={isDark ? 'dark-theme' : 'light-theme'} style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; transition: background-color 0.3s, color 0.3s; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
        .leaflet-container { background: #aad3df !important; }
        .leaflet-tile-pane { background: #aad3df !important; }
        .leaflet-container img { max-width: none !important; max-height: none !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .dark-theme { background-color: #020617; color: white; }
        .light-theme { background-color: #f8fafc; color: #0f172a; }
        .card-dark { background-color: #0f172a; border: 1px solid #1e293b; color: white; }
        .card-light { background-color: white; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        @keyframes admin-pulse { 0% { transform: scale(1); color: #818cf8; } 50% { transform: scale(1.15); color: #ef4444; } 100% { transform: scale(1); color: #818cf8; } }
        .pulse-admin { animation: admin-pulse 2s infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes heartPop {
          0% { transform: scale(1); }
          30% { transform: scale(1.5); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .heart-pop { animation: heartPop 0.6s ease-out; }
      `}</style>

      <nav style={{ height: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,0.2)', background: isDark ? '#0f172a' : '#fff', flexShrink: 0 }}>
        <div style={{ cursor: 'pointer' }} onClick={function () { setView('home'); setSelectedEvent(null); setSelectedPendingEvent(null); setSearchQuery(''); }}>
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" alt="Eventora" style={{ height: 18, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasAdmin && <ShieldCheck size={20} className={pendingEvents.length > 0 ? 'pulse-admin' : ''} style={{ color: '#6366f1', cursor: 'pointer' }} onClick={function () { setView('admin'); setSelectedPendingEvent(null); setAdminTab('pending'); }} />}
          {!hasAdmin && <button onClick={handleLogin} style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 8, fontWeight: 900, cursor: 'pointer' }}>LOGIN</button>}
          <button onClick={function () { setIsDark(!isDark); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
            {isDark ? <Sun size={18} color="#facc15" /> : <Moon size={18} color="#4f46e5" />}
          </button>
          <Sparkles size={18} color="#6366f1" style={{ cursor: 'pointer' }} onClick={function () { setView('profile'); }} />
        </div>
      </nav>

      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>

        {/* MAPA */}
        {view === 'map' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
            <div style={{ position: 'absolute', top: 15, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '85%', maxWidth: 300 }}>
              <div style={{ background: '#fff', borderRadius: 15, padding: '4px 12px', display: 'flex', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <Search size={16} color="#6366f1" />
                <select onChange={function (e) { handleCitySearch(e.target.value); }} style={{ width: '100%', padding: 10, border: 'none', outline: 'none', fontWeight: 900, fontSize: 11, color: '#0f172a', background: 'transparent' }}>
                  <option value="ESPAÑA">BUSCAR CIUDAD...</option>
                  {citiesList.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
                </select>
              </div>
            </div>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: isDark ? '#1a1a2e' : '#aad3df' }}>
              <MapContainer center={[40.41, -3.70]} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                <MapResizer center={mapCenter} />
                <TileLayer url={isDark ? darkTileUrl : lightTileUrl} attribution="Google Maps" maxZoom={20} subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
                {publicEvents.map(function (ev) { if (ev.lat && ev.lng) { return <Marker key={ev.id} position={[ev.lat, ev.lng]} icon={redPinIcon}><Popup><b>{ev.title}</b><br />{ev.address}, {ev.localidad} - {ev.city}<br />{formatDate(ev.date)}</Popup></Marker>; } return null; })}
              </MapContainer>
            </div>
          </div>
        )}

        {/* HOME */}
        {view === 'home' && !selectedEvent && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 12px', flexShrink: 0, background: isDark ? '#020617' : '#f8fafc', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isDark ? '#1e293b' : '#e2e8f0', borderRadius: 12, padding: '6px 12px' }}>
                <Search size={16} color="#6366f1" />
                <input value={searchQuery} onChange={function (e) { setSearchQuery(e.target.value); }} placeholder="Buscar evento o ciudad..." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: 11, color: 'inherit' }} />
                {searchQuery && <button onClick={function () { setSearchQuery(''); }} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 16, padding: 0 }}>X</button>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, padding: '6px 12px', flexShrink: 0, background: isDark ? '#020617' : '#f8fafc', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
              {[{ k: 'all', l: 'TODOS' }, { k: 'today', l: 'HOY' }, { k: 'week', l: 'ESTA SEMANA' }].map(function (f) {
                return <button key={f.k} onClick={function () { setDateFilter(f.k); }} style={{ padding: '5px 10px', borderRadius: 10, border: 'none', background: dateFilter === f.k ? '#22c55e' : 'transparent', color: dateFilter === f.k ? 'white' : '#6366f1', fontSize: 8, fontWeight: 900, cursor: 'pointer' }}>{f.l}</button>;
              })}
            </div>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 8, padding: '8px 12px', overflowX: 'auto', background: isDark ? '#020617' : '#f8fafc', borderBottom: '1px solid rgba(128,128,128,0.1)', flexShrink: 0 }}>
              {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map(function (cat) { return <button key={cat} onClick={function () { handleCategoryChange(cat); }} style={{ padding: '7px 15px', borderRadius: 25, border: 'none', background: selectedCategory === cat ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: selectedCategory === cat ? 'white' : 'inherit', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 }}>{cat}</button>; })}
            </div>
            <div style={{ padding: '4px 12px', fontSize: 9, color: '#6366f1', fontWeight: 800, flexShrink: 0 }}>{filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''}</div>
            <div ref={listRef} className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 15, paddingBottom: 120 }}>
              {filteredEvents.length === 0 && <div style={{ textAlign: 'center', marginTop: 60, opacity: 0.5 }}><Search size={40} style={{ margin: '0 auto 15px' }} /><p style={{ fontWeight: 900, fontSize: 14 }}>NO SE ENCONTRARON EVENTOS</p><p style={{ fontSize: 10, marginTop: 8 }}>Prueba con otra busqueda o categoria</p></div>}

              {featuredEvent && (
                <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 25, overflow: 'hidden', marginBottom: 15, border: '2px solid #22c55e' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 5, background: '#22c55e', color: 'white', padding: '4px 10px', borderRadius: 8, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} fill="white" /> DESTACADO</div>
                    {getDaysLeft(featuredEvent.date) !== null && (function () {
                      var dl = getDaysLabel(featuredEvent.date);
                      return <div style={{ position: 'absolute', top: 10, right: 50, zIndex: 5, background: dl.bg, color: dl.color, padding: '4px 10px', borderRadius: 8, fontSize: 9, fontWeight: 900 }}>{dl.text}</div>;
                    })()}
                    <div style={{ position: 'relative', height: 200 }}>
                      <img src={featuredEvent.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      <button onClick={function () { toggleFavorite(featuredEvent.id); }} style={{ position: 'absolute', top: 10, right: 10, padding: 8, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444', display: 'flex', cursor: 'pointer' }}>
                        <Heart size={18} className={animHeart === featuredEvent.id ? 'heart-pop' : ''} fill={favorites.indexOf(featuredEvent.id) !== -1 ? 'red' : 'none'} />
                      </button>
                    </div>
                    <div style={{ padding: 15, textAlign: 'center' }}>
                      <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 5 }}>{categoryEmojis[featuredEvent.category] || '📌'} {featuredEvent.city} | {formatDate(featuredEvent.date)}</p>
                      <h3 style={{ fontWeight: 900, fontSize: 17, marginBottom: 10 }}>{featuredEvent.title}</h3>
                      <button onClick={function () { setSelectedEvent(featuredEvent); }} style={{ width: '100%', padding: 12, borderRadius: 14, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>VER DETALLES</button>
                    </div>
                  </div>
                </div>
              )}

              {restEvents.map(function (ev) {
                var dl = getDaysLabel(ev.date);
                return (
                  <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 25, overflow: 'hidden', marginBottom: 15 }}>
                    <div style={{ position: 'relative', height: 160 }}>
                      <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      {dl && <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 5, background: dl.bg, color: dl.color, padding: '3px 8px', borderRadius: 8, fontSize: 8, fontWeight: 900 }}>{dl.text}</div>}
                      <button onClick={function () { toggleFavorite(ev.id); }} style={{ position: 'absolute', top: 10, right: 10, padding: 7, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444', display: 'flex', cursor: 'pointer' }}>
                        <Heart size={16} className={animHeart === ev.id ? 'heart-pop' : ''} fill={favorites.indexOf(ev.id) !== -1 ? 'red' : 'none'} />
                      </button>
                    </div>
                    <div style={{ padding: 15, textAlign: 'center' }}>
                      <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 5 }}>{categoryEmojis[ev.category] || '📌'} {ev.city} | {formatDate(ev.date)}</p>
                      <h3 style={{ fontWeight: 900, fontSize: 15 }}>{ev.title}</h3>
                      <button onClick={function () { setSelectedEvent(ev); }} style={{ width: '100%', padding: 11, borderRadius: 14, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 900, fontSize: 10, cursor: 'pointer', marginTop: 10 }}>DETALLES</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DETALLES */}
        {selectedEvent && !selectedPendingEvent && (
          <div className="no-scrollbar" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '6px 10px 0', flexShrink: 0 }}>
              <button onClick={function () { setSelectedEvent(null); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 4, cursor: 'pointer', fontSize: 11 }}><ArrowLeft size={14} /> VOLVER</button>
            </div>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: '15px 15px 0 0', overflow: 'hidden', padding: 0, flex: 1, display: 'flex', flexDirection: 'column', margin: '0 8px', overflowY: 'auto' }}>
              <img src={selectedEvent.image_url} style={{ width: '100%', height: 140, objectFit: 'cover', flexShrink: 0 }} alt="" />
              <div style={{ padding: '10px 12px 8px', flex: 1 }}>
                <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>{categoryEmojis[selectedEvent.category] || '📌'}</p>
                <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 6 }}>{selectedEvent.title}</h2>
                <div style={{ display: 'flex', gap: 15, marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 4, fontSize: 11, alignItems: 'center' }}><Calendar color="#6366f1" size={13} /> <b>{formatDate(selectedEvent.date)}</b></div>
                  <div style={{ display: 'flex', gap: 4, fontSize: 11, alignItems: 'center' }}><Clock color="#6366f1" size={13} /> <b>{selectedEvent.time}H</b></div>
                </div>
                {getDaysLeft(selectedEvent.date) !== null && (function () {
                  var dl = getDaysLabel(selectedEvent.date);
                  return <div style={{ display: 'inline-block', background: dl.bg, color: dl.color, padding: '3px 10px', borderRadius: 8, fontSize: 9, fontWeight: 900, marginBottom: 6 }}>{dl.text}</div>;
                })()}
                <div onClick={function () { window.open('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.localidad + ' ' + selectedEvent.city)); }} style={{ background: 'rgba(99,102,241,0.1)', padding: '10px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', border: '1px dashed #6366f1', marginBottom: 6 }}>
                  <MapPin color="#6366f1" size={14} style={{ margin: '0 auto 2px' }} />
                  <b style={{ fontSize: 10 }}>{selectedEvent.address}, {selectedEvent.localidad} - {selectedEvent.city}</b><br />
                  <span style={{ fontSize: 8, color: '#2563eb', fontWeight: 900 }}>GPS (GOOGLE MAPS)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button onClick={function () { shareEvent(selectedEvent); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 10, background: 'rgba(34,197,94,0.1)', border: '1px dashed #22c55e', borderRadius: 8, color: '#22c55e', fontWeight: 900, fontSize: 10, cursor: 'pointer' }}><Share2 size={12} /> COMPARTIR</button>
                  <button onClick={function () { addToGoogleCalendar(selectedEvent); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 10, background: 'rgba(66,133,244,0.1)', border: '1px dashed #4285f4', borderRadius: 8, color: '#4285f4', fontWeight: 900, fontSize: 10, cursor: 'pointer' }}><Calendar size={12} /> CALENDAR</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'create' && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 15, borderRadius: 20, gap: 8, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 14 }}>ANADIR EVENTO</h2>
              <input name="title" placeholder="TITULO" style={INPUT_STYLE} value={form.title} onChange={handleInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 6 }}>
                <input name="city" placeholder="CIUDAD" style={INPUT_STYLE} value={form.city} onChange={handleInputChange} />
                <select name="category" style={INPUT_STYLE} value={form.category} onChange={handleInputChange}><option value="MUSICA">MUSICA</option><option value="GASTRONOMIA">GASTRONOMIA</option><option value="TAURINO">TAURINO</option><option value="FIESTAS PATRONALES">FIESTAS</option><option value="OTROS">OTROS</option></select>
              </div>
              <input name="localidad" placeholder="LOCALIDAD" style={INPUT_STYLE} value={form.localidad} onChange={handleInputChange} />
              <input name="address" placeholder="DIRECCION" style={INPUT_STYLE} value={form.address} onChange={handleInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <input name="date" type="date" style={Object.assign({}, INPUT_STYLE, { padding: 8 })} value={form.date} onChange={handleInputChange} />
                <input name="time" type="time" style={Object.assign({}, INPUT_STYLE, { padding: 8 })} value={form.time} onChange={handleInputChange} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button onClick={generateAIImage} style={{ padding: 10, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>{isGenerating ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} IA FOTO</button>
                <label style={{ padding: 10, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>GALERIA <input type="file" style={{ display: 'none' }} onChange={handleGalleryUpload} /></label>
              </div>
              {form.image_url && <img src={form.image_url} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 10 }} alt="" />}
              <button onClick={handleSubmitEvent} disabled={isSubmitting} style={{ width: '100%', background: '#4f46e5', color: 'white', padding: 13, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 11, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? 'Enviando...' : 'ENVIAR REVISION'}</button>
            </div>
          </div>
        )}

        {view === 'admin' && !selectedPendingEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <button onClick={function () { setView('home'); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}><ArrowLeft size={16} /> VOLVER</button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <button onClick={function () { setAdminTab('pending'); }} style={{ padding: 10, borderRadius: 12, border: 'none', background: adminTab === 'pending' ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: adminTab === 'pending' ? 'white' : 'inherit', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>PENDIENTES ({pendingEvents.length})</button>
              <button onClick={function () { setAdminTab('approved'); }} style={{ padding: 10, borderRadius: 12, border: 'none', background: adminTab === 'approved' ? '#22c55e' : (isDark ? '#1e293b' : '#e2e8f0'), color: adminTab === 'approved' ? 'white' : 'inherit', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>APROBADOS ({approvedEvents.length})</button>
            </div>
            {approvedEvents.length > 0 && (
              <button onClick={function () { exportToCSV(approvedEvents); }} style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 900, fontSize: 10, cursor: 'pointer', marginBottom: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Download size={14} /> EXPORTAR EVENTOS A CSV
              </button>
            )}
            {adminTab === 'pending' && pendingEvents.length === 0 && <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS PENDIENTES</p>}
            {adminTab === 'pending' && pendingEvents.map(function (ev) { return <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 15, padding: 10, marginBottom: 10, cursor: 'pointer' }} onClick={function () { setSelectedPendingEvent(ev); }}><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{ev.image_url && <img src={ev.image_url} style={{ width: 50, height: 50, borderRadius: 10, objectFit: 'cover' }} alt="" />}<div style={{ flex: 1 }}><p style={{ fontWeight: 900, fontSize: 13 }}>{ev.title}</p><p style={{ fontSize: 9, color: '#6366f1' }}>{ev.city} | {formatDate(ev.date)}</p></div><span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 700 }}>VER &gt;</span></div></div>; })}
            {adminTab === 'approved' && approvedEvents.length === 0 && <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS APROBADOS</p>}
            {adminTab === 'approved' && approvedEvents.map(function (ev) { return <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 15, padding: 10, marginBottom: 10 }}><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{ev.image_url && <img src={ev.image_url} style={{ width: 50, height: 50, borderRadius: 10, objectFit: 'cover' }} alt="" />}<div style={{ flex: 1 }}><p style={{ fontWeight: 900, fontSize: 13 }}>{ev.title}</p><p style={{ fontSize: 9, color: '#6366f1' }}>{ev.city} | {formatDate(ev.date)}</p></div><button onClick={function (e) { e.stopPropagation(); handleDeleteEvent(ev.id); }} style={{ padding: 8, background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 900 }}><Trash2 size={14} /> BORRAR</button></div></div>; })}
          </div>
        )}

        {view === 'admin' && selectedPendingEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <button onClick={function () { setSelectedPendingEvent(null); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}><ArrowLeft size={16} /> VOLVER A LISTA</button>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 20, overflow: 'hidden', padding: 0 }}>
              {selectedPendingEvent.image_url && <img src={selectedPendingEvent.image_url} style={{ width: '100%', height: 220, objectFit: 'cover' }} alt="" />}
              <div style={{ padding: 18 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 15 }}>{selectedPendingEvent.title}</h2>
                <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Calendar color="#6366f1" size={16} /><b>{formatDate(selectedPendingEvent.date)}</b></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Clock color="#6366f1" size={16} /><b>{selectedPendingEvent.time}H</b></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><MapPin color="#6366f1" size={16} /><b>{selectedPendingEvent.address}, {selectedPendingEvent.localidad} - {selectedPendingEvent.city}</b></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><span style={{ fontWeight: 900, color: '#6366f1' }}>CAT:</span><b>{selectedPendingEvent.category}</b></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <button onClick={function () { handleApproveEvent(selectedPendingEvent.id); }} style={{ padding: 12, background: '#22c55e', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>APROBAR</button>
                  <button onClick={function () { handleRejectEvent(selectedPendingEvent.id); }} style={{ padding: 12, background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>RECHAZAR</button>
                  <button onClick={function () { handleDeleteEvent(selectedPendingEvent.id); }} style={{ padding: 12, background: '#64748b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>BORRAR</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'favorites' && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 12, fontSize: 16 }}>MIS GUARDADOS ({favoriteEvents.length})</h2>
            {favoriteEvents.length === 0 ? <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS GUARDADOS</p> : favoriteEvents.map(function (ev) {
              var dl = getDaysLabel(ev.date);
              return <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ display: 'flex', gap: 10, padding: 10, borderRadius: 18, marginBottom: 8, alignItems: 'center' }}><img src={ev.image_url} style={{ width: 45, height: 45, borderRadius: 10, objectFit: 'cover' }} alt="" /><div style={{ flex: 1 }}><p style={{ fontWeight: 900, fontSize: 13 }}>{ev.title}</p><p style={{ fontSize: 9, color: '#6366f1' }}>{ev.city}</p>{dl && <span style={{ fontSize: 8, color: dl.color, fontWeight: 900, background: dl.bg, padding: '2px 6px', borderRadius: 6 }}>{dl.text}</span>}</div><button onClick={function () { toggleFavorite(ev.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button></div>;
            })}
          </div>
        )}

        {view === 'profile' && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 22, borderRadius: 35, width: '100%', maxWidth: 300, textAlign: 'center' }}>
              <h2 style={{ fontWeight: 900, marginBottom: 12, fontSize: 16 }}>SOPORTE</h2>
              {userEmail && <p style={{ fontSize: 9, opacity: 0.5, marginBottom: 8 }}>Conectado: {userEmail}</p>}
              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 14, borderRadius: 12, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>APOYAR EN KO-FI</a>
                <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 14, borderRadius: 12, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>APOYAR EN PAYPAL</a>
              </div>
              <button onClick={handleLogin} style={{ background: '#4f46e5', color: 'white', fontSize: 10, padding: '8px 15px', borderRadius: 8, border: 'none', fontWeight: 900, cursor: 'pointer' }}>LOGIN</button>
            </div>
          </div>
        )}
      </main>

      <nav style={{ position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)', width: '88%', maxWidth: 360, height: 55, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 8px 25px rgba(0,0,0,0.4)', zIndex: 3000, background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}>
        <button onClick={function () { setView('home'); setSelectedEvent(null); setSelectedPendingEvent(null); setSearchQuery(''); }} style={{ background: 'none', border: 'none', color: view === 'home' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><LayoutList size={22} /></button>
        <button onClick={function () { setView('favorites'); setSelectedEvent(null); setSelectedPendingEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b', cursor: 'pointer', position: 'relative' }}>
          <Heart size={22} fill={view === 'favorites' ? '#ef4444' : 'none'} />
          {favoriteEvents.length > 0 && <span style={{ position: 'absolute', top: -4, right: -8, background: '#ef4444', color: 'white', fontSize: 8, fontWeight: 900, borderRadius: 10, padding: '1px 5px', minWidth: 14, textAlign: 'center' }}>{favoriteEvents.length}</span>}
        </button>
        <button onClick={function () { setView('create'); setSelectedEvent(null); setSelectedPendingEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'create' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><PlusCircle size={22} /></button>
        <button onClick={function () { setView('map'); setSelectedEvent(null); setSelectedPendingEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'map' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><MapIcon size={22} /></button>
      </nav>
    </div>
  );
}
