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
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

var supabase = createClient(process.env.REACT_APP_SUPABASE_URL || '', process.env.REACT_APP_SUPABASE_ANON_KEY || '');
var ADMIN_EMAILS = ['garverjacobo@gmail.com', 'jacobogarver@gmail.com'];
var INITIAL_FORM = { title: '', city: '', localidad: '', address: '', time: '21:00', date: '', category: 'MUSICA', image_url: '' };

function formatDate(dateStr) { if (!dateStr) return ''; var parts = dateStr.split('-'); if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0]; return dateStr; }

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

function Splash({ onDone }) {
  useEffect(function () {
    var t = setTimeout(function () { onDone(); }, 2200);
    return function () { clearTimeout(t); };
  }, []);
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
      <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" alt="Eventora" style={{ height: 50, width: 'auto' }} />
      <p style={{ color: '#6366f1', fontSize: 11, fontWeight: 700 }}>Cargando eventos...</p>
      <Loader2 className="animate-spin" size={24} color="#4f46e5" />
    </div>
  );
}

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
}

var darkTileUrl = 'https://mt1.google.com/vt/lyrs=r&hl=es&x={x}&y={y}&z={z}';
var lightTileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}';

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
  var showSplash = _splash[0]; var setShowSplash = _splash[1];
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
  
  function geocodeAddress(address, localidad, city) { 
    var fullAddress = address + ', ' + localidad + ', ' + city + ', Espana'; 
    return fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' + encodeURIComponent(fullAddress))
      .then(function (r) { return r.json(); })
      .then(function (data) { 
        if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }; 
        return { lat: null, lng: null }; 
      })
      .catch(function () { return { lat: null, lng: null }; }); 
  }

  function handleSubmitEvent() { 
    if (!form.title || !form.date || !form.city || !form.address) return alert('Rellena: titulo, ciudad, fecha y direccion.'); 
    setIsSubmitting(true); 
    geocodeAddress(form.address, form.localidad, form.city).then(function (coords) { 
      return supabase.from('events').insert([Object.assign({}, form, { status: 'pending', lat: coords.lat, lng: coords.lng })]); 
    }).then(function (r) { 
      if (r.error) {
        console.error("Error de Supabase:", r.error);
        throw new Error(r.error.message);
      }
      alert('Evento enviado a revision!'); 
      setForm(INITIAL_FORM); setView('home'); fetchEvents(); 
    }).catch(function (err) { 
      alert('Error: ' + err.message); 
    }).finally(function () { setIsSubmitting(false); }); 
  }

  function handleApproveEvent(id) { supabase.from('events').update({ status: 'approved' }).eq('id', id).then(function () { setSelectedPendingEvent(null); fetchEvents(); }); }
  function handleRejectEvent(id) { supabase.from('events').update({ status: 'rejected' }).eq('id', id).then(function () { setSelectedPendingEvent(null); fetchEvents(); }); }
  function handleDeleteEvent(id) { if (window.confirm('¿Borrar evento?')) { supabase.from('events').delete().eq('id', id).then(function () { setSelectedPendingEvent(null); fetchEvents(); }); } }

  var today = new Date().toISOString().split('T')[0];
  var publicEvents = events.filter(function (e) { return e.status === 'approved' && e.date >= today; });
  var searchedEvents = searchQuery ? publicEvents.filter(function (e) { return e.title.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1 || e.city.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1; }) : publicEvents;
  var categoryEvents = searchedEvents.filter(function (e) { return selectedCategory === 'TODOS' || e.category === selectedCategory; });
  var filteredEvents = categoryEvents;
  var favoriteEvents = publicEvents.filter(function (e) { return favorites.indexOf(e.id) !== -1; });
  var pendingEvents = events.filter(function (e) { return e.status === 'pending'; });
  var approvedEvents = events.filter(function (e) { return e.status === 'approved'; });
  var citiesList = [];
  publicEvents.forEach(function (e) { if (citiesList.indexOf(e.city) === -1) citiesList.push(e.city); });

  if (showSplash) return <Splash onDone={function () { setShowSplash(false); }} />;

  return (
    <div className={isDark ? 'dark-theme' : 'light-theme'} style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; transition: background-color 0.3s, color 0.3s; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
        .leaflet-container { background: #aad3df !important; }
        .leaflet-container img { max-width: none !important; max-height: none !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .dark-theme { background-color: #020617; color: white; }
        .light-theme { background-color: #f8fafc; color: #0f172a; }
        .card-dark { background-color: #0f172a; border: 1px solid #1e293b; color: white; }
        .card-light { background-color: white; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        @keyframes admin-pulse { 0% { transform: scale(1); color: #818cf8; } 50% { transform: scale(1.15); color: #ef4444; } 100% { transform: scale(1); color: #818cf8; } }
        .pulse-admin { animation: admin-pulse 2s infinite; }
        @keyframes heartPop { 0% { transform: scale(1); } 30% { transform: scale(1.5); } 60% { transform: scale(0.9); } 100% { transform: scale(1); } }
        .heart-pop { animation: heartPop 0.6s ease-out; }
      `}</style>

      <nav style={{ height: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,0.2)', background: isDark ? '#0f172a' : '#fff', flexShrink: 0 }}>
        <div style={{ cursor: 'pointer' }} onClick={function () { setView('home'); setSelectedEvent(null); setSelectedPendingEvent(null); setSearchQuery(''); }}>
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" alt="Eventora" style={{ height: 18, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasAdmin && <ShieldCheck size={20} className={pendingEvents.length > 0 ? 'pulse-admin' : ''} style={{ color: '#6366f1', cursor: 'pointer' }} onClick={function () { setView('admin'); setSelectedPendingEvent(null); setAdminTab('pending'); }} />}
          <button onClick={function () { setIsDark(!isDark); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            {isDark ? <Sun size={18} color="#facc15" /> : <Moon size={18} color="#4f46e5" />}
          </button>
          <Sparkles size={18} color="#6366f1" style={{ cursor: 'pointer' }} onClick={function () { setView('profile'); }} />
        </div>
      </nav>

      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {view === 'map' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
            <div style={{ position: 'absolute', top: 15, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '85%', maxWidth: 320 }}>
               <select onChange={function (e) { handleCitySearch(e.target.value); }} style={{ width: '100%', padding: 10, borderRadius: 12, border: 'none', fontWeight: 900, fontSize: 11, background: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                  <option value="ESPAÑA">📍 BUSCAR CIUDAD...</option>
                  {citiesList.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
               </select>
            </div>
            <MapContainer center={[40.41, -3.70]} zoom={6} style={{ height: '100%', width: '100%' }}>
              <MapResizer center={mapCenter} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              {publicEvents.map(function (ev) { if (ev.lat && ev.lng) { return <Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><b>{ev.title}</b><br />{ev.city}</Popup></Marker>; } return null; })}
            </MapContainer>
          </div>
        )}

        {view === 'home' && !selectedEvent && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 8, padding: '10px 12px', overflowX: 'auto', background: isDark ? '#020617' : '#f8fafc', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
              {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map(function (cat) { return <button key={cat} onClick={function () { setSelectedCategory(cat); }} style={{ padding: '7px 15px', borderRadius: 25, border: 'none', background: selectedCategory === cat ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: selectedCategory === cat ? 'white' : 'inherit', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer' }}>{cat}</button>; })}
            </div>
            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 15, paddingBottom: 120 }}>
              {filteredEvents.map(function (ev) {
                return (
                  <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 25, overflow: 'hidden', marginBottom: 15 }}>
                    <div style={{ position: 'relative', height: 160 }}>
                      <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      <button onClick={function () { toggleFavorite(ev.id); }} style={{ position: 'absolute', top: 10, right: 10, padding: 7, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444', display: 'flex', cursor: 'pointer' }}>
                        <Heart size={16} className={animHeart === ev.id ? 'heart-pop' : ''} fill={favorites.indexOf(ev.id) !== -1 ? 'red' : 'none'} />
                      </button>
                    </div>
                    <div style={{ padding: 15, textAlign: 'center' }}>
                      <h3 style={{ fontWeight: 900, fontSize: 15 }}>{ev.title}</h3>
                      <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 10 }}>{ev.city} | {formatDate(ev.date)}</p>
                      <button onClick={function () { setSelectedEvent(ev); }} style={{ width: '100%', padding: 11, borderRadius: 14, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>DETALLES</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
            <button onClick={function () { setSelectedEvent(null); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}><ArrowLeft size={16} /> VOLVER</button>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 20, overflow: 'hidden' }}>
              <img src={selectedEvent.image_url} style={{ width: '100%', height: 220, objectFit: 'cover' }} alt="" />
              <div style={{ padding: 18 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>{selectedEvent.title}</h2>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 6, fontSize: 13 }}><Calendar color="#6366f1" size={16} /> <b>{formatDate(selectedEvent.date)}</b></div>
                  <div style={{ display: 'flex', gap: 6, fontSize: 13 }}><Clock color="#6366f1" size={16} /> <b>{selectedEvent.time}H</b></div>
                  <div onClick={function () { window.open('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.localidad + ' ' + selectedEvent.city)); }} style={{ background: 'rgba(99,102,241,0.1)', padding: 15, borderRadius: 10, cursor: 'pointer', textAlign: 'center', border: '1px dashed #6366f1' }}>
                    <MapPin color="#6366f1" size={16} style={{ margin: '0 auto 4px' }} /><br />
                    <b style={{ fontSize: 12 }}>{selectedEvent.address}, {selectedEvent.localidad} - {selectedEvent.city}</b><br />
                    <span style={{ fontSize: 9, color: '#2563eb', fontWeight: 900 }}>GPS (GOOGLE MAPS)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'favorites' && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 12, fontSize: 16 }}>MIS GUARDADOS</h2>
            {favoriteEvents.length === 0 ? <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>EN ESTOS MOMENTOS NO HAY NINGÚN EVENTO GUARDADO</p> : favoriteEvents.map(function (ev) {
              return <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ display: 'flex', gap: 10, padding: 10, borderRadius: 18, marginBottom: 8, alignItems: 'center' }}><img src={ev.image_url} style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover' }} alt="" /><div style={{ flex: 1 }}><p style={{ fontWeight: 900, fontSize: 13 }}>{ev.title}</p><p style={{ fontSize: 9, color: '#6366f1' }}>{ev.city}</p></div><button onClick={function () { toggleFavorite(ev.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={20} /></button></div>;
            })}
          </div>
        )}

        {view === 'create' && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 150 }}>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 20, borderRadius: 25, gap: 8, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 16 }}>AÑADIR EVENTO</h2>
              <input name="title" placeholder="TÍTULO" style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.title} onChange={handleInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 6 }}>
                <input name="city" placeholder="CIUDAD" style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.city} onChange={handleInputChange} />
                <select name="category" style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.category} onChange={handleInputChange}><option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINO">TAURINO</option><option value="FIESTAS PATRONALES">FIESTAS</option><option value="OTROS">OTROS</option></select>
              </div>
              <input name="localidad" placeholder="LOCALIDAD" style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.localidad} onChange={handleInputChange} />
              <input name="address" placeholder="DIRECCIÓN" style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.address} onChange={handleInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><input name="date" type="date" style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit' }} value={form.date} onChange={handleInputChange} /><input name="time" type="time" style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit' }} value={form.time} onChange={handleInputChange} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                 <button onClick={generateAIImage} style={{ padding: 10, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900 }}>{isGenerating ? 'CARGANDO...' : 'IA FOTO'}</button>
                 <label style={{ padding: 10, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>GALERÍA <input type="file" style={{ display: 'none' }} onChange={handleGalleryUpload} /></label>
              </div>
              {form.image_url && <img src={form.image_url} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 12 }} alt="" />}
              <button onClick={handleSubmitEvent} disabled={isSubmitting} style={{ width: '100%', background: '#4f46e5', color: 'white', padding: 14, borderRadius: 12, border: 'none', fontWeight: 900 }}>{isSubmitting ? 'Enviando...' : 'ENVIAR REVISIÓN'}</button>
            </div>
          </div>
        )}

        {view === 'profile' && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 30, borderRadius: 45, width: '100%', maxWidth: 320, textAlign: 'center' }}>
              <h2 style={{ fontWeight: 900, marginBottom: 20 }}>SOPORTE</h2>
              <div style={{ display: 'grid', gap: 10, marginBottom: 15 }}>
                 <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 16, borderRadius: 14, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>APOYAR EN KO-FI</a>
                 <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 16, borderRadius: 14, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>APOYAR EN PAYPAL</a>
              </div>
              {!user ? (<button onClick={handleLogin} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900 }}>ADMIN LOGIN</button>) : (<button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 900 }}>CERRAR SESIÓN</button>)}
            </div>
          </div>
        )}

        {view === 'admin' && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
             <button onClick={function () { setView('home'); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}><ArrowLeft size={16} /> VOLVER</button>
             <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 20, color: '#ef4444' }}>MODERACIÓN ({pendingEvents.length})</h2>
             {pendingEvents.map(ev => (
               <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 15, borderRadius: 20, marginBottom: 12 }}>
                  <h3 style={{ fontWeight: 900 }}>{ev.title}</h3>
                  <p style={{fontSize:12}}>{ev.city} | {formatDate(ev.date)}</p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                     <button onClick={() => handleApproveEvent(ev.id)} style={{ flex: 1, background: '#16a34a', color: 'white', padding: 10, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 10 }}>APROBAR</button>
                     <button onClick={() => handleRejectEvent(ev.id)} style={{ flex: 1, background: '#ef4444', color: 'white', padding: 10, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 10 }}>RECHAZAR</button>
                  </div>
               </div>
             ))}
          </div>
        )}
      </main>

      <nav style={{ position: 'fixed', bottom: 15, left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: 400, height: 75, borderRadius: 35, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', zIndex: 3000, background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(128,128,128,0.2)' }}>
        <button onClick={() => {setView('home'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'home' ? '#2563eb' : '#64748b' }}><LayoutList size={26}/></button>
        <button onClick={() => setView('favorites')} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b' }}><Heart size={26} fill={view === 'favorites' ? "#ef4444" : "none"}/></button>
        <button onClick={() => setView('create')} style={{ background: 'none', border: 'none', color: view === 'create' ? '#2563eb' : '#64748b' }}><PlusCircle size={26}/></button>
        <button onClick={() => setView('map')} style={{ background: 'none', border: 'none', color: view === 'map' ? '#2563eb' : '#64748b' }}><MapIcon size={26}/></button>
      </nav>
    </div>
  );
}
