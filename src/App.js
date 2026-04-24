import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2,
  Map as MapIcon, Clock, LayoutList, ShieldCheck, Sparkles,
  Loader2, ArrowLeft, Search
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ========== ICONOS LEAFLET ==========
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

// ========== SUPABASE ==========
var supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

// ========== CONFIG ==========
var ADMIN_EMAILS = ['garverjacobo@gmail.com', 'jacobogarver@gmail.com'];
var INITIAL_FORM = { title: '', city: '', localidad: '', address: '', time: '21:00', date: '', category: 'MUSICA', image_url: '' };

// ========== MAP RESIZER ==========
function MapResizer(props) {
  var map = useMap();
  useEffect(function () {
    var timer = setTimeout(function () {
      map.invalidateSize();
      if (props.center) {
        map.setView(props.center, 13, { animate: true });
      } else {
        map.setView([40.4167, -3.7037], 6);
      }
    }, 600);
    return function () { clearTimeout(timer); };
  }, [map, props.center]);
  return null;
}

// ========== APP ==========
export default function App() {
  var _events = useState([]);
  var events = _events[0];
  var setEvents = _events[1];

  var _favorites = useState(function () {
    if (typeof window === 'undefined') return [];
    var saved = localStorage.getItem('eventora_favs_v4');
    return saved ? JSON.parse(saved) : [];
  });
  var favorites = _favorites[0];
  var setFavorites = _favorites[1];

  var _profile = useState(null);
  var profile = _profile[0];
  var setProfile = _profile[1];

  var _view = useState('home');
  var view = _view[0];
  var setView = _view[1];

  var _isDark = useState(true);
  var isDark = _isDark[0];
  var setIsDark = _isDark[1];

  var _selectedCategory = useState('TODOS');
  var selectedCategory = _selectedCategory[0];
  var setSelectedCategory = _selectedCategory[1];

  var _selectedEvent = useState(null);
  var selectedEvent = _selectedEvent[0];
  var setSelectedEvent = _selectedEvent[1];

  var _mapCenter = useState(null);
  var mapCenter = _mapCenter[0];
  var setMapCenter = _mapCenter[1];

  var _isGenerating = useState(false);
  var isGenerating = _isGenerating[0];
  var setIsGenerating = _isGenerating[1];

  var _isSubmitting = useState(false);
  var isSubmitting = _isSubmitting[0];
  var setIsSubmitting = _isSubmitting[1];

  var _form = useState(INITIAL_FORM);
  var form = _form[0];
  var setForm = _form[1];

  // ========== EFFECTS ==========
  useEffect(function () { fetchEvents(); }, []);

  useEffect(function () {
    if (typeof window !== 'undefined') {
      localStorage.setItem('eventora_favs_v4', JSON.stringify(favorites));
    }
  }, [favorites]);

  useEffect(function () {
    function checkAdmin(user) {
      if (!user) return false;
      return user.email && ADMIN_EMAILS.indexOf(user.email) !== -1;
    }
    supabase.auth.getSession().then(function (result) {
      var session = result.data && result.data.session;
      var user = session && session.user;
      setProfile(checkAdmin(user) ? { role: 'admin' } : null);
    });
    var sub = supabase.auth.onAuthStateChange(function (event, session) {
      var user = session && session.user;
      setProfile(checkAdmin(user) ? { role: 'admin' } : null);
    });
    return function () {
      if (sub && sub.data && sub.data.subscription) {
        sub.data.subscription.unsubscribe();
      }
    };
  }, []);

  // ========== FUNCIONES ==========
  function fetchEvents() {
    supabase.from('events').select('*').then(function (result) {
      if (result.data) {
        setEvents(result.data.sort(function (a, b) { return new Date(a.date) - new Date(b.date); }));
      }
    });
  }

  function toggleFavorite(id) {
    setFavorites(function (prev) {
      if (prev.indexOf(id) !== -1) return prev.filter(function (f) { return f !== id; });
      return prev.concat([id]);
    });
  }

  function handleInputChange(e) {
    var name = e.target.name;
    var value = e.target.value;
    var upperFields = ['title', 'city', 'localidad'];
    var val = upperFields.indexOf(name) !== -1 ? value.toUpperCase() : value;
    var newForm = Object.assign({}, form);
    newForm[name] = val;
    setForm(newForm);
  }

  function generateAIImage() {
    if (!form.title) return alert('Escribe un titulo primero');
    setIsGenerating(true);
    var seed = Math.floor(Math.random() * 999999);
    var url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent('professional_event_photography_' + form.title) + '?width=800&height=600&seed=' + seed + '&nologo=true&t=' + Date.now();
    var newForm = Object.assign({}, form);
    newForm.image_url = url;
    setForm(newForm);
    setTimeout(function () { setIsGenerating(false); }, 2000);
  }

  function handleGalleryUpload(e) {
    var file = e.target.files[0];
    if (file) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        var newForm = Object.assign({}, form);
        newForm.image_url = ev.target.result;
        setForm(newForm);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleCitySearch(city) {
    if (city === 'ESPAÑA') { setMapCenter(null); return; }
    fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' + encodeURIComponent(city + ', Espana'))
      .then(function (r) { return r.json(); })
      .then(function (data) { if (data && data[0]) setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon]); })
      .catch(function (err) { console.error(err); });
  }

  function handleSubmitEvent() {
    if (!form.title || !form.date || !form.city || !form.address) return alert('Rellena: titulo, ciudad, fecha y direccion.');
    setIsSubmitting(true);
    supabase.from('events').insert([Object.assign({}, form, { status: 'pending' })])
      .then(function (result) {
        if (result.error) throw result.error;
        alert('Evento enviado a revision!');
        setForm(INITIAL_FORM);
        setView('home');
        fetchEvents();
      })
      .catch(function (err) { alert('Error al enviar.'); console.error(err); })
      .finally(function () { setIsSubmitting(false); });
  }

  function handleApproveEvent(id) {
    supabase.from('events').update({ status: 'approved' }).eq('id', id).then(function () { fetchEvents(); });
  }
  function handleRejectEvent(id) {
    supabase.from('events').update({ status: 'rejected' }).eq('id', id).then(function () { fetchEvents(); });
  }
  function handleDeleteEvent(id) {
    supabase.from('events').delete().eq('id', id).then(function () { fetchEvents(); });
  }

  // ========== DATOS ==========
  var today = new Date().toISOString().split('T')[0];
  var publicEvents = events.filter(function (e) { return e.status === 'approved' && e.date >= today; });
  var filteredEvents = publicEvents.filter(function (e) { return selectedCategory === 'TODOS' || e.category === selectedCategory; });
  var favoriteEvents = publicEvents.filter(function (e) { return favorites.indexOf(e.id) !== -1; });
  var pendingEvents = events.filter(function (e) { return e.status === 'pending'; });
  var citiesList = [];
  publicEvents.forEach(function (e) { if (citiesList.indexOf(e.city) === -1) citiesList.push(e.city); });

  // ========== ESTILOS ==========
  var INPUT_STYLE = { width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 };

  return (
    <div className={isDark ? 'dark-theme' : 'light-theme'} style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; transition: background-color 0.3s, color 0.3s; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
        .leaflet-container { background: #aad3df !important; }
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
      `}</style>

      {/* NAV */}
      <nav style={{ height: 55, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,0.2)', background: isDark ? '#0f172a' : '#fff', flexShrink: 0 }}>
        <div style={{ cursor: 'pointer' }} onClick={function() { setView('home'); setSelectedEvent(null); }}>
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" alt="Eventora" style={{ height: 20, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {profile && profile.role === 'admin' && <ShieldCheck size={22} className={pendingEvents.length > 0 ? 'pulse-admin' : ''} style={{ color: '#6366f1', cursor: 'pointer' }} onClick={function() { setView('admin'); }} />}
          <button onClick={function() { setIsDark(!isDark); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
            {isDark ? <Sun size={20} color="#facc15" /> : <Moon size={20} color="#4f46e5" />}
          </button>
          <Sparkles size={20} color="#6366f1" style={{ cursor: 'pointer' }} onClick={function() { setView('profile'); }} />
        </div>
      </nav>

      {/* CONTENIDO */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>

        {/* MAPA */}
        {view === 'map' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
            <div style={{ position: 'absolute', top: 15, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '85%', maxWidth: 300 }}>
              <div style={{ background: '#fff', borderRadius: 15, padding: '4px 12px', display: 'flex', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <Search size={16} color="#6366f1" />
                <select onChange={function(e) { handleCitySearch(e.target.value); }} style={{ width: '100%', padding: 10, border: 'none', outline: 'none', fontWeight: 900, fontSize: 11, color: '#0f172a', background: 'transparent' }}>
                  <option value="ESPAÑA">📍 BUSCAR CIUDAD...</option>
                  {citiesList.map(function(c) { return <option key={c} value={c}>{c}</option>; })}
                </select>
              </div>
            </div>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              <MapContainer center={[40.41, -3.70]} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                <MapResizer center={mapCenter} />
                <TileLayer url="https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}" attribution="Google Maps" maxZoom={20} subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
                {publicEvents.map(function(ev) {
                  if (ev.lat && ev.lng) {
                    return <Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><b>{ev.title}</b><br />{ev.city}</Popup></Marker>;
                  }
                  return null;
                })}
              </MapContainer>
            </div>
          </div>
        )}

        {/* HOME */}
        {view === 'home' && !selectedEvent && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 8, padding: '12px 15px', overflowX: 'auto', background: isDark ? '#020617' : '#f8fafc', borderBottom: '1px solid rgba(128,128,128,0.1)', flexShrink: 0 }}>
              {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map(function(cat) {
                return <button key={cat} onClick={function() { setSelectedCategory(cat); }} style={{ padding: '8px 18px', borderRadius: 25, border: 'none', background: selectedCategory === cat ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: selectedCategory === cat ? 'white' : 'inherit', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 }}>{cat}</button>;
              })}
            </div>
            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 20, paddingBottom: 120 }}>
              {filteredEvents.map(function(ev) {
                return (
                  <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 30, overflow: 'hidden', marginBottom: 18 }}>
                    <div style={{ position: 'relative', height: 170 }}>
                      <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      <button onClick={function() { toggleFavorite(ev.id); }} style={{ position: 'absolute', top: 12, right: 12, padding: 8, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444', display: 'flex', cursor: 'pointer' }}>
                        <Heart size={18} fill={favorites.indexOf(ev.id) !== -1 ? 'red' : 'none'} />
                      </button>
                    </div>
                    <div style={{ padding: 18, textAlign: 'center' }}>
                      <h3 style={{ fontWeight: 900, fontSize: 16 }}>{ev.title}</h3>
                      <p style={{ fontSize: 10, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 12 }}>{ev.city} | {ev.date}</p>
                      <button onClick={function() { setSelectedEvent(ev); }} style={{ width: '100%', padding: 12, borderRadius: 16, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>DETALLES</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DETALLES */}
        {selectedEvent && (
          <div className="no-scrollbar" style={{ padding: 15, height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
            <button onClick={function() { setSelectedEvent(null); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 8, marginBottom: 15, cursor: 'pointer' }}><ArrowLeft /> VOLVER</button>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 25, overflow: 'hidden', padding: 0 }}>
              <img src={selectedEvent.image_url} style={{ width: '100%', height: 220, objectFit: 'cover' }} alt="" />
              <div style={{ padding: 20 }}>
                <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>{selectedEvent.title}</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 8 }}><Calendar color="#6366f1" /> <b>{selectedEvent.date}</b></div>
                  <div style={{ display: 'flex', gap: 8 }}><Clock color="#6366f1" /> <b>{selectedEvent.time}H</b></div>
                  <div onClick={function() { window.open('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.localidad + ' ' + selectedEvent.city)); }} style={{ background: 'rgba(99,102,241,0.1)', padding: 18, borderRadius: 12, cursor: 'pointer', textAlign: 'center', border: '1px dashed #6366f1' }}>
                    <MapPin color="#6366f1" style={{ margin: '0 auto 5px' }} /><br />
                    <b>{selectedEvent.address}, {selectedEvent.localidad} - {selectedEvent.city}</b><br />
                    <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 900 }}>GPS (GOOGLE MAPS)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CREAR */}
        {view === 'create' && (
          <div className="no-scrollbar" style={{ padding: 15, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 18, borderRadius: 25, gap: 10, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 15 }}>ANADIR EVENTO</h2>
              <input name="title" placeholder="TITULO" style={INPUT_STYLE} value={form.title} onChange={handleInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                <input name="city" placeholder="CIUDAD" style={INPUT_STYLE} value={form.city} onChange={handleInputChange} />
                <select name="category" style={INPUT_STYLE} value={form.category} onChange={handleInputChange}>
                  <option value="MUSICA">MUSICA</option><option value="GASTRONOMIA">GASTRONOMIA</option><option value="TAURINO">TAURINO</option><option value="FIESTAS PATRONALES">FIESTAS</option><option value="OTROS">OTROS</option>
                </select>
              </div>
              <input name="localidad" placeholder="LOCALIDAD" style={INPUT_STYLE} value={form.localidad} onChange={handleInputChange} />
              <input name="address" placeholder="DIRECCION" style={INPUT_STYLE} value={form.address} onChange={handleInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input name="date" type="date" style={Object.assign({}, INPUT_STYLE, { padding: 10 })} value={form.date} onChange={handleInputChange} />
                <input name="time" type="time" style={Object.assign({}, INPUT_STYLE, { padding: 10 })} value={form.time} onChange={handleInputChange} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={generateAIImage} style={{ padding: 12, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}>
                  {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} IA FOTO
                </button>
                <label style={{ padding: 12, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>
                  GALERIA <input type="file" style={{ display: 'none' }} onChange={handleGalleryUpload} />
                </label>
              </div>
              {form.image_url && <img src={form.image_url} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 12 }} alt="" />}
              <button onClick={handleSubmitEvent} disabled={isSubmitting} style={{ width: '100%', background: '#4f46e5', color: 'white', padding: 14, borderRadius: 12, border: 'none', fontWeight: 900, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? 'Enviando...' : 'ENVIAR REVISION'}
              </button>
            </div>
          </div>
        )}

        {/* ADMIN */}
        {view === 'admin' && (
          <div className="no-scrollbar" style={{ padding: 15, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <button onClick={function() { setView('home'); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 8, marginBottom: 15, cursor: 'pointer' }}><ArrowLeft /> VOLVER</button>
            <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 15 }}>PENDIENTES ({pendingEvents.length})</h2>
            {pendingEvents.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS PENDIENTES</p>
            ) : pendingEvents.map(function(ev) {
              return (
                <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 18, padding: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {ev.image_url && <img src={ev.image_url} style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover' }} alt="" />}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 900, fontSize: 14 }}>{ev.title}</p>
                      <p style={{ fontSize: 10, color: '#6366f1' }}>{ev.city} | {ev.date}</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 10 }}>
                    <button onClick={function() { handleApproveEvent(ev.id); }} style={{ padding: 8, background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 9, cursor: 'pointer' }}>APROBAR</button>
                    <button onClick={function() { handleRejectEvent(ev.id); }} style={{ padding: 8, background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 9, cursor: 'pointer' }}>RECHAZAR</button>
                    <button onClick={function() { handleDeleteEvent(ev.id); }} style={{ padding: 8, background: '#64748b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 9, cursor: 'pointer' }}>BORRAR</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* GUARDADOS */}
        {view === 'favorites' && (
          <div className="no-scrollbar" style={{ padding: 15, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 15 }}>MIS GUARDADOS</h2>
            {favoriteEvents.length === 0 ? <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS GUARDADOS</p> : favoriteEvents.map(function(ev) {
              return (
                <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 20, marginBottom: 10, alignItems: 'center' }}>
                  <img src={ev.image_url} style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover' }} alt="" />
                  <div style={{ flex: 1 }}><p style={{ fontWeight: 900 }}>{ev.title}</p><p style={{ fontSize: 10, color: '#6366f1' }}>{ev.city}</p></div>
                  <button onClick={function() { toggleFavorite(ev.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={20} /></button>
                </div>
              );
            })}
          </div>
        )}

        {/* SOPORTE */}
        {view === 'profile' && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 25, borderRadius: 40, width: '100%', maxWidth: 320, textAlign: 'center' }}>
              <h2 style={{ fontWeight: 900, marginBottom: 15 }}>SOPORTE</h2>
              <div style={{ display: 'grid', gap: 10, marginBottom: 15 }}>
                <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 15, borderRadius: 15, textDecoration: 'none', fontWeight: 900, fontSize: 12 }}>APOYAR EN KO-FI</a>
                <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 15, borderRadius: 15, textDecoration: 'none', fontWeight: 900, fontSize: 12 }}>APOYAR EN PAYPAL</a>
              </div>
              <button onClick={function() { var e = prompt('Email Admin:'); if (e) supabase.auth.signInWithOtp({ email: e }); }} style={{ opacity: 0.1, fontSize: 10, background: 'none', border: 'none', cursor: 'pointer' }}>Admin Login</button>
            </div>
          </div>
        )}
      </main>

      {/* BOTONERA */}
      <nav style={{ position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 380, height: 65, borderRadius: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 10px 30px rgba(0,0,0,0.4)', zIndex: 3000, background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}>
        <button onClick={function() { setView('home'); setSelectedEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'home' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><LayoutList size={24} /></button>
        <button onClick={function() { setView('favorites'); setSelectedEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b', cursor: 'pointer' }}><Heart size={24} fill={view === 'favorites' ? '#ef4444' : 'none'} /></button>
        <button onClick={function() { setView('create'); setSelectedEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'create' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><PlusCircle size={24} /></button>
        <button onClick={function() { setView('map'); setSelectedEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'map' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><MapIcon size={24} /></button>
      </nav>
    </div>
  );
}
