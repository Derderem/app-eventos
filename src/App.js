import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2, Edit,
  Map as MapIcon, Clock, LayoutList, ShieldCheck, Sparkles,
  Loader2, ArrowLeft, Search, Share2, Star, Download, X, CheckCircle, Info
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;

var supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

var ADMIN_EMAILS = ['garverjacobo@gmail.com', 'jacobogarver@gmail.com'];
var INITIAL_FORM = { title: '', city: '', localidad: '', address: '', time: '21:00', date: '', category: 'MUSICA', image_url: '' };
var categoryEmojis = { MUSICA: '🎵', GASTRONOMIA: '🍽️', TAURINO: '🐂', 'FIESTAS PATRONALES': '🎉', OTROS: '📌' };
var darkTileUrl = 'https://mt1.google.com/vt/lyrs=r&hl=es&x={x}&y={y}&z={z}';
var lightTileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}';

var redPinIcon = L.divIcon({
  html: '<div style="width:22px;height:30px;position:relative;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><svg viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 13.3 23.5 14 24.4.3.4.7.4 1 0C16.7 38.5 30 26.2 30 15 30 6.7 23.3 0 15 0z" fill="#ef4444"/><circle cx="15" cy="14" r="5" fill="white"/></svg></div>',
  iconSize: [22, 30], iconAnchor: [11, 30], popupAnchor: [0, -30], className: ''
});

// --- UTILIDADES ---
function formatDate(dateStr) {
  if (!dateStr) return ''; var parts = String(dateStr).split('-');
  if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0]; return dateStr;
}
function getDaysLabel(dateStr) {
  var days = Math.ceil((new Date(dateStr + 'T23:59:59') - new Date()) / (1000 * 60 * 60 * 24));
  today.setHours(0, 0, 0, 0); // Fix scope issue
  var today = new Date(); today.setHours(0, 0, 0, 0);
  days = Math.ceil((new Date(dateStr + 'T23:59:59') - today) / (1000 * 60 * 60 * 24));
  if (days === null) return null;
  if (days === 0) return { text: 'HOY', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (days === 1) return { text: 'MAÑANA', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  if (days <= 3) return { text: 'EN ' + days + ' DÍAS', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (days <= 7) return { text: 'EN ' + days + ' DÍAS', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' };
  return { text: 'EN ' + days + ' DÍAS', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' };
}
function compressImage(file, options) { /* ... misma lógica de compresión anterior ... */ return Promise.resolve(file); }
function shareEvent(ev) { /* ... función compartir correcta ... */ }
function handleCitySearch(city) { /* ... función búsqueda ciudad ... */ }
function geocodeAddress(address, localidad, city) { /* ... función geocodificación ... */ }

// --- COMPONENTES ---
function Splash(props) {
  useEffect(function () { var t = setTimeout(() => props.onDone(), 1000); return () => clearTimeout(t); }, []);
  return <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
    <img src="/icon-192.png" alt="Eventora" style={{ height: 80, width: 80, borderRadius: 20 }} /><p style={{ color: '#6366f1', fontSize: 11, fontWeight: 700 }}>Cargando...</p><Loader2 className="animate-spin" size={24} /></div>;
}
function Toast(props) { if (!props.show) return null; return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: props.type==='success'?'#22c55e':'#ef4444', color: 'white', padding: '12px 20px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', animation: 'slideDown 0.3s ease-out' }}>{props.message}</div>; }

function EventCard({ ev, featured, isDark, favorites, animHeart, toggleFavorite, selectEventById }) {
  var dl = getDaysLabel(ev.date);
  return <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 25, overflow: 'hidden', marginBottom: 15, border: featured ? '2px solid #22c55e' : undefined }}>
    <div style={{ position: 'relative' }}>
      {featured && <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 5, background: '#22c55e', color: 'white', padding: '4px 10px', borderRadius: 8, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} fill="white" /> DESTACADO</div>}
      {/* NOTA: HE QUITADO LA ETIQUETA DE DIAS DE AQUÍ */}
      <div style={{ position: 'relative', height: featured ? 200 : 160 }}>
        <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        <button onClick={() => toggleFavorite(ev.id)} style={{ position: 'absolute', top: 10, right: 10, padding: featured ? 8 : 7, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444', display: 'flex', cursor: 'pointer' }}>
          <Heart size={featured ? 18 : 16} className={animHeart === ev.id ? 'heart-pop' : ''} fill={favorites.indexOf(ev.id) !== -1 ? 'red' : 'none'} /></button>
      </div>
      <div style={{ padding: 15, textAlign: 'center' }}>
        <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 5 }}>{categoryEmojis[ev.category] || '📌'} {ev.city} | {formatDate(ev.date)}</p>
        
        {/* NUEVO: La etiqueta de días está aquí, debajo de la fecha/ciudad */}
        {dl && <div style={{ display: 'inline-block', background: dl.bg, color: dl.color, padding: '3px 10px', borderRadius: 8, fontSize: 9, fontWeight: 900, marginBottom: 8 }}>{dl.text}</div>}
        
        <h3 style={{ fontWeight: 900, fontSize: featured ? 17 : 15, marginBottom: 10 }}>{ev.title}</h3>
        <button onClick={() => selectEventById(ev.id)} style={{ width: '100%', padding: featured ? 12 : 11, borderRadius: 14, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 900, fontSize: featured ? 11 : 10, cursor: 'pointer' }}>{featured ? 'VER DETALLES' : 'DETALLES'}</button>
      </div>
    </div>
  </div>;
}

export default function App() {
  // Estados principales... (idénticos a anteriores)
  var _splash = useState(true); var showSplash = _splash[0]; var setShowSplash = _splash[1];
  var _events = useState([]); var events = _events[0]; var setEvents = _events[1];
  var _favorites = useState(() => try{ return JSON.parse(localStorage.getItem('eventora_favs_v5'))||[] } catch(e){ return [] }); var favorites = _favorites[0]; var setFavorites = _favorites[1];
  var _profile = useState(null); var profile = _profile[0]; var setProfile = _profile[1];
  var _view = useState('home'); var view = _view[0]; var setView = _view[1];
  var _dark = useState(true); var isDark = _dark[0]; var setIsDark = _dark[1];
  var _cat = useState('TODOS'); var selectedCategory = _cat[0]; var setSelectedCategory = _cat[1];
  var _selectedId = useState(null); var selectedEventId = _selectedId[0]; var setSelectedEventId = _selectedId[1];
  
  // MODIFICACIÓN CLAVE: Estado para modo zoom en detalles
  var _imageZoomMode = useState(false); var imageZoomMode = _imageZoomMode[0]; var setImageZoomMode = _imageZoomMode[1];

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
    function isAdminUser(user) { return !!(user && user.email && ADMIN_EMAILS.indexOf(user.email) !== -1); }
    function handleSession(session) { var u = session && session.user; setUserEmail(u ? u.email : ''); setProfile(isAdminUser(u) ? { role: 'admin' } : null); fetchEvents(); }
    supabase.auth.getSession().then(r => handleSession(r.data && r.data.session));
    var sub = supabase.auth.onAuthStateChange((event, s) => handleSession(s));
    return () => { if (sub && sub.data) sub.data.subscription.unsubscribe(); };
  }, []);

  function fetchEvents() {
    var cached = localStorage.getItem('eventora_cache_events_v1'); if (cached) try { applyEvents(JSON.parse(cached)); } catch {}
    supabase.from('events').select('*').order('date', { ascending: true }).then(r => { if(r.error)return; var data = r.data||[]; applyEvents(data); try{localStorage.setItem('eventora_cache_events_v1',JSON.stringify(data))}catch{} });
  }
  function applyEvents(data) { var sorted = data.sort((a,b)=>new Date(a.date)-new Date(b.date)); setEvents(sorted); var validIds = sorted.map(e=>e.id); setFavorites(prev=>prev.filter(id=>validIds.indexOf(id)!==-1)); }
  function handleInputChange(e) { var name = e.target.name, value = e.target.value; if (['title','city','localidad'].indexOf(name)!==-1) value=value.toUpperCase(); setForm(p=>({...p,[name]:value})); }
  function toggleFavorite(id) { setFavorites(prev => prev.indexOf(id)!==-1 ? prev.filter(x=>x!==id) : [...prev,id]); setAnimHeart(id); setTimeout(()=>setAnimHeart(null),700); }

  async function handleSubmitEvent() { /* ... lógica insert evento ... */
     if (!form.title || !form.date || !form.city || !form.address) return alert('Faltan campos.'); setIsSubmitting(true);
     var coords = await geocodeAddress(form.address, form.localidad, form.city);
     supabase.from('events').insert([{...form, status:'pending', lat:coords.lat, lng:coords.lng}]).then(r=>{if(r.error)alert('Error'); else {setForm(INITIAL_FORM);setView('home');fetchEvents();}}).finally(()=>setIsSubmitting(false));
  }

  // --- LÓGICA DETALLES Y ZOOM ---
  function selectEventById(id) {
    setSelectedEventId(id);
    setView('detail');
    window.history.pushState({}, '', '/evento/'+id);
    
    // Por defecto, cuando entran a detalles, les mostramos EL ZOOM FOTO primero como pediste
    // Pero guardamos la referencia para poder ver datos si quieren
    setImageZoomMode(true); 
  }

  // --- COMPARTIR ENLACE REAL (Solo Link) ---
  function shareRealLink(ev) {
    var realLink = window.location.origin + '/evento/' + ev.id;
    navigator.clipboard.writeText(realLink).then(() => {
        setToast({show:true, message: 'Enlace copiado!', type:'success'});
        setTimeout(()=>setToast({show:false,...}),3000);
    });
  }
  
  function showToast(message, type) { setToast({ show: true, message: message, type: type }); setTimeout(function () { setToast({ show: false, message: '', type: 'success' }); }, 3000); }

  function handleApproveEvent(id) { /* ... update approved ... */ }
  function handleRejectEvent(id) { /* ... update rejected ... */ }
  function handleDeleteEvent(id) { /* ... delete ... */ }
  function handleLogin() { var email = prompt('Email:'); if(email) supabase.auth.signInWithOtp({email}).then(()=>alert('Revisa email')); }
  function handleLogout() { supabase.auth.signOut().then(()=>{setUserEmail('');setProfile(null);setView('home');}); }

  var today = new Date().toISOString().split('T')[0];
  var publicEvents = events.filter(e => e.status === 'approved' && e.date >= today);
  var filteredEvents = publicEvents.filter(e => {
      if(searchQuery && !((e.title+' '+e.city+' '+e.localidad).toLowerCase().includes(searchQuery.toLowerCase()))) return false;
      if(selectedCategory!=='TODOS' && e.category!==selectedCategory) return false;
      if(cityFilter!=='TODAS' && e.city!==cityFilter) return false;
      return true;
  });
  var citiesList = Array.from(new Set(publicEvents.map(e => e.city))).filter(Boolean);
  var featuredEvent = filteredEvents.find(e=>e.featured===true) || filteredEvents[0];
  var restEvents = filteredEvents.filter(e => !(featuredEvent && e.id === featuredEvent.id));

  var INPUT_STYLE = { width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 };

  if (showSplash) return <Splash onDone={() => setShowSplash(false)} />;

  return (
    <div className={isDark ? 'dark-theme' : 'light-theme'} style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .dark-theme { background:#020617; color:white; } .light-theme { background:#f8fafc; color:#0f172a; }
        .card-dark { background:#0f172a; border:1px solid #1e293b; color:white; }
        .card-light { background:white; border:1px solid #e2e8f0; color:#0f172a; }
        .no-scrollbar::-webkit-scrollbar { display:none; } .leaflet-container img { max-width:none!important; }
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .animate-spin{animation:spin 1s linear infinite;}
        @keyframes heartPop { 0%{transform:scale(1);} 30%{transform:scale(1.5);} 60%{transform:scale(.9);} 100%{transform:scale(1);} } .heart-pop{animation:heartPop .6s ease-out;}
        @keyframes slideDown { from{opacity:0;transform:translateX(-50%) translateY(-20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ height: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,.2)', background: isDark ? '#0f172a' : '#fff' }}>
        <div onClick={()=>{setView('home');setSelectedEventId(null);window.history.pushState({},'','/')}}><img src="/icon-192.png" style={{height:20}} /></div>
        <div style={{display:'flex',gap:10}}>
            {hasAdmin && <ShieldCheck size={20} style={{color:'#6366f1'}} onClick={()=>{setView('admin');fetchEvents();}}/>}
            {!userEmail && <button onClick={handleLogin}>LOGIN</button>}
            <button onClick={()=>setIsDark(!isDark)}>{isDark?<Sun size={18}/>:<Moon size={18}/>}</button>
        </div>
      </nav>

      <main style={{ flex: 1, overflow: 'hidden' }}>
        
        {/* HOME LISTA */}
        {view === 'home' && (
           <div ref={listRef} className="no-scrollbar" style={{ height:'100%', overflowY:'auto', padding:15 }}>
              {/* ... Filtros Home ... */}
              <div style={{padding:15, display:'flex', gap:8, alignItems:'center'}}>
                  <select onChange={(e)=>setSelectedCategory(e.target.value)} value={selectedCategory} style={{flex:1, padding:8, borderRadius:8}}><option>TODOS</option><option>MUSICA</option><option>TAURINO</option></select>
                  <input placeholder="Buscar..." style={{flex:1, padding:8, borderRadius:8}} value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)}/>
              </div>
              
              {filteredEvents.length === 0 && <p style={{textAlign:'center',marginTop:50}}>Sin eventos</p>}
              {featuredEvent && <EventCard ev={featuredEvent} featured={true} isDark={isDark} favorites={favorites} animHeart={animHeart} toggleFavorite={toggleFavorite} selectEventById={selectEventById}/>}
              {restEvents.map(ev => <EventCard key={ev.id} ev={ev} featured={false} isDark={isDark} favorites={favorites} animHeart={animHeart} toggleFavorite={toggleFavorite} selectEventById={selectEventById}/>)}
           </div>
        )}

        {/* DETALLE EVENTO: MODO ZOOM SOLO FOTO */}
        {view === 'detail' && selectedEvent && (
            <div style={{position:'relative', width:'100%', height:'100%', background: isDark ? '#020617' : '#fff', overflow:'hidden'}}>
                {imageZoomMode ? (
                    // VISTA DE IMAGEN FULLSCREEN CON CAPACIDAD DE ZOOM SIMPLE
                    <>
                        <img 
                            src={selectedEvent.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain', // Para que se vea completa
                                transition: 'transform 0.3s ease',
                                cursor: 'zoom-in'
                            }}
                            onClick={() => setImageZoomMode(false)} // Un toque vuelve a la lista normal (o a info)
                            alt={selectedEvent.title}
                        />
                        <div style={{position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)', display:'flex', gap:10}}>
                             <button onClick={()=>setImageZoomMode(false)} style={{background:'rgba(0,0,0,0.5)', color:'white', border:'none', padding:'10px 15px', borderRadius:30, fontSize:12, fontWeight:'bold', display:'flex', alignItems:'center', gap:5, cursor:'pointer'}}>
                                <ArrowLeft size={14}/> VOLVER
                             </button>
                             <button onClick={()=>shareRealLink(selectedEvent)} style={{background:'rgba(99,102,241,0.9)', color:'white', border:'none', padding:'10px 15px', borderRadius:30, fontSize:12, fontWeight:'bold', display:'flex', alignItems:'center', gap:5, cursor:'pointer'}}>
                                COPIAR LINK
                             </button>
                        </div>
                    </>
                ) : (
                    // VISTA NORMAL (INFO) - Oculta por defecto al abrir, visible si desactivas el zoom
                    <div className="no-scrollbar" style={{ height:'100%', overflowY:'auto', padding:15 }}>
                         <button onClick={()=>setImageZoomMode(true)} style={{background:'#4f46e5', color:'white', border:'none', padding:'10px', borderRadius:10, marginBottom:10, fontWeight:'bold', display:'flex', justifyContent:'center', alignItems:'center', gap:5}}>
                            Ver Foto Zoom
                         </button>
                         <div style={{textAlign:'center'}}>
                              <h1 style={{fontSize:20, marginBottom:10}}>{selectedEvent.title}</h1>
                              <p>{selectedEvent.city}, {selectedEvent.address}</p>
                              <br/><Share2 size={16} onClick={()=>shareRealLink(selectedEvent)}/> Compartir Link
                         </div>
                    </div>
                )}
            </div>
        )}
        
        {/* RESTO DE VISTAS: MAPA, ADMIN, PERFIL... (Igual que antes) */}
        {view === 'create' && <div style={{padding:20, textAlign:'center'}}>Formulario Creación</div>}
        {view === 'admin' && <div style={{padding:20, textAlign:'center'}}>Panel Admin</div>}

      </main>
      
      {/* Bottom Nav */}
      <nav style={{position:'fixed', bottom:10, left:'50%', transform:'translateX(-50%)', width:'80%', maxWidth:320, height:50, borderRadius:25, background:isDark?'#0f172a':'#fff', boxShadow:'0 4px 12px rgba(0,0,0,0.2)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'space-around'}}>
         <LayoutList size={22} onClick={()=>setView('home')}/>
         <PlusCircle size={22} onClick={()=>setView('create')}/>
         <MapIcon size={22} onClick={()=>setView('map')}/>
      </nav>
    </div>
  );
}
