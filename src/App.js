import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2,
  Map as MapIcon, Clock, LayoutList, ShieldCheck, Sparkles,
  Loader2, ArrowLeft, Search
} from 'lucide-react';
import {
  MapContainer, TileLayer, Marker, Popup, useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

var globalStyles = '\
  * { margin: 0; padding: 0; box-sizing: border-box; transition: background-color 0.3s, color 0.3s; }\
  html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }\
  .leaflet-container { background: #aad3df !important; height: 100% !important; width: 100% !important; }\
  .leaflet-container img { max-width: none !important; max-height: none !important; }\
  .no-scrollbar::-webkit-scrollbar { display: none; }\
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }\
  .dark-theme { background-color: #020617; color: white; }\
  .light-theme { background-color: #f8fafc; color: #0f172a; }\
  .card-dark { background-color: #0f172a; border: 1px solid #1e293b; color: white; }\
  .card-light { background-color: white; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }\
  @keyframes admin-pulse { 0% { transform: scale(1); color: #818cf8; } 50% { transform: scale(1.15); color: #ef4444; } 100% { transform: scale(1); color: #818cf8; } }\
  .pulse-admin { animation: admin-pulse 2s infinite; }\
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }\
  .animate-spin { animation: spin 1s linear infinite; }\
';

function MapResizer(props) {
  var map = useMap();
  useEffect(function() {
    var timer = setTimeout(function() {
      map.invalidateSize();
      if (props.center) {
        map.setView(props.center, 13, { animate: true });
      } else {
        map.setView([40.4167, -3.7037], 6);
      }
    }, 500);
    return function() { clearTimeout(timer); };
  }, [map, props.center]);
  return null;
}

var supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

// ✅ AMBOS EMAILS COMO ADMIN
var ADMIN_EMAILS = ['garverjacobo@gmail.com', 'jacobogarver@gmail.com'];

var INITIAL_FORM = {
  title: '', city: '', localidad: '', address: '',
  time: '21:00', date: '', category: 'MUSICA', image_url: ''
};

export default function App() {
  var _events = useState([]);
  var events = _events[0];
  var setEvents = _events[1];

  var _favorites = useState(function() {
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

  useEffect(function() {
    fetchEvents();
  }, []);

  useEffect(function() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('eventora_favs_v4', JSON.stringify(favorites));
    }
  }, [favorites]);

  useEffect(function() {
    function checkAdmin(user) {
      if (!user) return false;
      if (user.email && ADMIN_EMAILS.indexOf(user.email) !== -1) return true;
      return false;
    }

    supabase.auth.getSession().then(function(result) {
      var session = result.data && result.data.session;
      var user = session && session.user;
      if (checkAdmin(user)) {
        setProfile({ role: 'admin' });
      } else {
        setProfile(null);
      }
    });

    var sub = supabase.auth.onAuthStateChange(function(event, session) {
      var user = session && session.user;
      if (checkAdmin(user)) {
        setProfile({ role: 'admin' });
      } else {
        setProfile(null);
      }
    });

    return function() {
      if (sub.data && sub.data.subscription) {
        sub.data.subscription.unsubscribe();
      }
    };
  }, []);

  function fetchEvents() {
    supabase.from('events').select('*').then(function(result) {
      if (result.data) {
        var sorted = result.data.sort(function(a, b) {
          return new Date(a.date) - new Date(b.date);
        });
        setEvents(sorted);
      }
    });
  }

  function toggleFavorite(id) {
    setFavorites(function(prev) {
      if (prev.indexOf(id) !== -1) {
        return prev.filter(function(f) { return f !== id; });
      }
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
    if (!form.title) {
      alert('Escribe un titulo primero');
      return;
    }
    setIsGenerating(true);
    var seed = Math.floor(Math.random() * 999999);
    var url = 'https://image.pollinations.ai/prompt/' +
      encodeURIComponent('professional_event_photography_' + form.title) +
      '?width=800&height=600&seed=' + seed + '&nologo=true&t=' + Date.now();
    var newForm = Object.assign({}, form);
    newForm.image_url = url;
    setForm(newForm);
    setTimeout(function() { setIsGenerating(false); }, 2000);
  }

  function handleGalleryUpload(e) {
    var file = e.target.files[0];
    if (file) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        var newForm = Object.assign({}, form);
        newForm.image_url = ev.target.result;
        setForm(newForm);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleCitySearch(city) {
    if (city === 'ESPAÑA') {
      setMapCenter(null);
      return;
    }
    fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' +
      encodeURIComponent(city + ', España')
    )
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data[0]) {
          setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      })
      .catch(function(err) { console.error(err); });
  }

  function handleSubmitEvent() {
    if (!form.title || !form.date || !form.city || !form.address) {
      alert('Rellena: titulo, ciudad, fecha y direccion.');
      return;
    }
    setIsSubmitting(true);
    var eventData = Object.assign({}, form, { status: 'pending' });
    supabase.from('events').insert([eventData])
      .then(function(result) {
        if (result.error) throw result.error;
        alert('Evento enviado a revision!');
        setForm(INITIAL_FORM);
        setView('home');
        fetchEvents();
      })
      .catch(function(err) {
        alert('Error al enviar. Intentalo de nuevo.');
        console.error(err);
      })
      .finally(function() {
        setIsSubmitting(false);
      });
  }

  function handleApproveEvent(id) {
    supabase.from('events').update({ status: 'approved' }).eq('id', id)
      .then(function() { fetchEvents(); });
  }

  function handleRejectEvent(id) {
    supabase.from('events').update({ status: 'rejected' }).eq('id', id)
      .then(function() { fetchEvents(); });
  }

  function handleDeleteEvent(id) {
    supabase.from('events').delete().eq('id', id)
      .then(function() { fetchEvents(); });
  }

  var today = new Date().toISOString().split('T')[0];
  var publicEvents = events.filter(function(e) { return e.status === 'approved' && e.date >= today; });
  var filteredEvents = publicEvents.filter(function(e) {
    return selectedCategory === 'TODOS' || e.category === selectedCategory;
  });
  var favoriteEvents = publicEvents.filter(function(e) { return favorites.indexOf(e.id) !== -1; });
  var pendingEvents = events.filter(function(e) { return e.status === 'pending'; });
  var citiesList = [];
  publicEvents.forEach(function(e) {
    if (citiesList.indexOf(e.city) === -1) citiesList.push(e.city);
  });

  var INPUT_STYLE = {
    width: '100%', padding: 14, borderRadius: 10,
    border: 'none', background: 'rgba(128,128,128,0.1)',
    color: 'inherit', fontWeight: 700
  };

  var themeClass = isDark ? 'dark-theme' : 'light-theme';
  var cardClass = isDark ? 'card-dark' : 'card-light';
  var navBg = isDark ? '#0f172a' : '#fff';

  return React.createElement('div', { className: themeClass, style: { width: '100vw', height: '100vh', overflow: 'hidden' } },

    React.createElement('style', null, globalStyles),

    React.createElement('nav', {
      style: { height: 65, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,0.2)', background: navBg }
    },
      React.createElement('div', { style: { cursor: 'pointer', flexShrink: 0 }, onClick: function() { setView('home'); setSelectedEvent(null); } },
        React.createElement('img', { src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png', alt: 'Eventora', style: { height: 22, width: 'auto' } })
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 20, marginLeft: 'auto' } },
        profile && profile.role === 'admin' && React.createElement(ShieldCheck, { size: 28, className: pendingEvents.length > 0 ? 'pulse-admin' : '', style: { color: '#6366f1', cursor: 'pointer' }, onClick: function() { setView('admin'); } }),
        React.createElement('button', { onClick: function() { setIsDark(!isDark); }, style: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex' } }, isDark ? React.createElement(Sun, { size: 24, color: '#facc15' }) : React.createElement(Moon, { size: 24, color: '#4f46e5' })),
        React.createElement(Sparkles, { size: 24, color: '#6366f1', style: { cursor: 'pointer' }, onClick: function() { setView('profile'); } })
      )
    ),

    React.createElement('main', { style: { flex: 1, overflow: 'hidden', position: 'relative' } },

      view === 'map' && React.createElement('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } },
        React.createElement('div', { style: { position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '85%', maxWidth: 320 } },
          React.createElement('div', { style: { background: '#fff', borderRadius: 15, padding: '5px 15px', display: 'flex', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' } },
            React.createElement(Search, { size: 18, color: '#6366f1' }),
            React.createElement('select', { onChange: function(e) { handleCitySearch(e.target.value); }, style: { width: '100%', padding: 12, border: 'none', outline: 'none', fontWeight: 900, fontSize: 12, color: '#0f172a', background: 'transparent' } },
              React.createElement('option', { value: 'ESPAÑA' }, 'BUSCAR CIUDAD...'),
              citiesList.map(function(c) { return React.createElement('option', { key: c, value: c }, c); })
            )
          )
        ),
        React.createElement(MapContainer, { center: [40.41, -3.70], zoom: 6, style: { width: '100%', height: '100%' } },
          React.createElement(MapResizer, { center: mapCenter }),
          React.createElement(TileLayer, { url: 'https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}', attribution: 'Google Maps', maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }),
          publicEvents.map(function(ev) {
            if (ev.lat && ev.lng) {
              return React.createElement(Marker, { key: ev.id, position: [ev.lat, ev.lng] }, React.createElement(Popup, null, React.createElement('b', null, ev.title), React.createElement('br'), ev.city));
            }
            return null;
          })
        )
      ),

      view === 'home' && !selectedEvent && React.createElement('div', { style: { height: '100%', display: 'flex', flexDirection: 'column' } },
        React.createElement('div', { className: 'no-scrollbar', style: { display: 'flex', gap: 10, padding: '15px 20px', overflowX: 'auto', background: isDark ? '#020617' : '#f8fafc', borderBottom: '1px solid rgba(128,128,128,0.1)' } },
          ['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map(function(cat) {
            return React.createElement('button', { key: cat, onClick: function() { setSelectedCategory(cat); }, style: { padding: '10px 22px', borderRadius: 25, border: 'none', background: selectedCategory === cat ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: selectedCategory === cat ? 'white' : 'inherit', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer' } }, cat);
          })
        ),
        React.createElement('div', { className: 'no-scrollbar', style: { flex: 1, overflowY: 'auto', padding: 20, paddingBottom: 150 } },
          filteredEvents.map(function(ev) {
            return React.createElement('div', { key: ev.id, className: cardClass, style: { borderRadius: 32, overflow: 'hidden', marginBottom: 20 } },
              React.createElement('div', { style: { position: 'relative', height: 180 } },
                React.createElement('img', { src: ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800', style: { width: '100%', height: '100%', objectFit: 'cover' }, alt: '' }),
                React.createElement('button', { onClick: function() { toggleFavorite(ev.id); }, style: { position: 'absolute', top: 15, right: 15, padding: 10, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444', display: 'flex', cursor: 'pointer' } }, React.createElement(Heart, { size: 20, fill: favorites.indexOf(ev.id) !== -1 ? 'red' : 'none' }))
              ),
              React.createElement('div', { style: { padding: 20, textAlign: 'center' } },
                React.createElement('h3', { style: { fontWeight: 900, fontSize: 18 } }, ev.title),
                React.createElement('p', { style: { fontSize: 10, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 15 } }, ev.city + ' | ' + ev.date),
                React.createElement('button', { onClick: function() { setSelectedEvent(ev); }, style: { width: '100%', padding: 14, borderRadius: 16, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 900, fontSize: 11, cursor: 'pointer' } }, 'DETALLES')
              )
            );
          })
        )
      ),

      selectedEvent && React.createElement('div', { className: 'no-scrollbar', style: { padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 120 } },
        React.createElement('button', { onClick: function() { setSelectedEvent(null); }, style: { background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 8, marginBottom: 20, cursor: 'pointer' } }, React.createElement(ArrowLeft), ' VOLVER'),
        React.createElement('div', { className: cardClass, style: { borderRadius: 30, overflow: 'hidden', padding: 0 } },
          React.createElement('img', { src: selectedEvent.image_url, style: { width: '100%', height: 250, objectFit: 'cover' }, alt: '' }),
          React.createElement('div', { style: { padding: 25 } },
            React.createElement('h2', { style: { fontSize: 24, fontWeight: 900, marginBottom: 15 } }, selectedEvent.title),
            React.createElement('div', { style: { display: 'grid', gap: 15 } },
              React.createElement('div', { style: { display: 'flex', gap: 10 } }, React.createElement(Calendar, { color: '#6366f1' }), React.createElement('b', null, selectedEvent.date)),
              React.createElement('div', { style: { display: 'flex', gap: 10 } }, React.createElement(Clock, { color: '#6366f1' }), React.createElement('b', null, selectedEvent.time + 'H')),
              React.createElement('div', { onClick: function() { window.open('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.localidad + ' ' + selectedEvent.city)); }, style: { background: 'rgba(99,102,241,0.1)', padding: 20, borderRadius: 15, cursor: 'pointer', textAlign: 'center', border: '1px dashed #6366f1' } },
                React.createElement(MapPin, { color: '#6366f1', style: { margin: '0 auto 5px' } }),
                React.createElement('br'),
                React.createElement('b', null, selectedEvent.address + ', ' + selectedEvent.localidad + ' - ' + selectedEvent.city),
                React.createElement('br'),
                React.createElement('span', { style: { fontSize: 10, color: '#2563eb', fontWeight: 900 } }, 'GPS (GOOGLE MAPS)')
              )
            )
          )
        )
      ),

      view === 'create' && React.createElement('div', { className: 'no-scrollbar', style: { padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 150 } },
        React.createElement('div', { className: cardClass, style: { padding: 20, borderRadius: 30, gap: 10, display: 'flex', flexDirection: 'column' } },
          React.createElement('h2', { style: { textAlign: 'center', fontWeight: 900, fontSize: 16 } }, 'ANADIR EVENTO'),
          React.createElement('input', { name: 'title', placeholder: 'TITULO', style: INPUT_STYLE, value: form.title, onChange: handleInputChange }),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 } },
            React.createElement('input', { name: 'city', placeholder: 'CIUDAD', style: INPUT_STYLE, value: form.city, onChange: handleInputChange }),
            React.createElement('select', { name: 'category', style: INPUT_STYLE, value: form.category, onChange: handleInputChange },
              React.createElement('option', { value: 'MUSICA' }, 'MUSICA'),
              React.createElement('option', { value: 'GASTRONOMIA' }, 'GASTRONOMIA'),
              React.createElement('option', { value: 'TAURINO' }, 'TAURINO'),
              React.createElement('option', { value: 'FIESTAS PATRONALES' }, 'FIESTAS'),
              React.createElement('option', { value: 'OTROS' }, 'OTROS')
            )
          ),
          React.createElement('input', { name: 'localidad', placeholder: 'LOCALIDAD', style: INPUT_STYLE, value: form.localidad, onChange: handleInputChange }),
          React.createElement('input', { name: 'address', placeholder: 'DIRECCION', style: INPUT_STYLE, value: form.address, onChange: handleInputChange }),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            React.createElement('input', { name: 'date', type: 'date', style: Object.assign({}, INPUT_STYLE, { padding: 10 }), value: form.date, onChange: handleInputChange }),
            React.createElement('input', { name: 'time', type: 'time', style: Object.assign({}, INPUT_STYLE, { padding: 10 }), value: form.time, onChange: handleInputChange })
          ),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            React.createElement('button', { onClick: generateAIImage, style: { padding: 12, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' } },
              isGenerating ? React.createElement(Loader2, { className: 'animate-spin', size: 14 }) : React.createElement(Sparkles, { size: 14 }),
              ' IA FOTO'
            ),
            React.createElement('label', { style: { padding: 12, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' } },
              'GALERIA ', React.createElement('input', { type: 'file', style: { display: 'none' }, onChange: handleGalleryUpload })
            )
          ),
          form.image_url && React.createElement('img', { src: form.image_url, style: { width: '100%', height: 120, objectFit: 'cover', borderRadius: 15 }, alt: '' }),
          React.createElement('button', { onClick: handleSubmitEvent, disabled: isSubmitting, style: { width: '100%', background: '#4f46e5', color: 'white', padding: 15, borderRadius: 12, border: 'none', fontWeight: 900, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 } },
            isSubmitting ? 'Enviando...' : 'ENVIAR REVISION'
          )
        )
      ),

      view === 'admin' && React.createElement('div', { className: 'no-scrollbar', style: { padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 120 } },
        React.createElement('button', { onClick: function() { setView('home'); }, style: { background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 8, marginBottom: 20, cursor: 'pointer' } }, React.createElement(ArrowLeft), ' VOLVER'),
        React.createElement('h2', { style: { textAlign: 'center', fontWeight: 900, marginBottom: 20 } }, 'EVENTOS PENDIENTES (' + pendingEvents.length + ')'),
        pendingEvents.length === 0
          ? React.createElement('p', { style: { textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 } }, 'NO HAY EVENTOS PENDIENTES')
          : pendingEvents.map(function(ev) {
              return React.createElement('div', { key: ev.id, className: cardClass, style: { borderRadius: 20, overflow: 'hidden', marginBottom: 15, padding: 15 } },
                React.createElement('div', { style: { display: 'flex', gap: 15, alignItems: 'center' } },
                  ev.image_url && React.createElement('img', { src: ev.image_url, style: { width: 60, height: 60, borderRadius: 15, objectFit: 'cover' }, alt: '' }),
                  React.createElement('div', { style: { flex: 1 } },
                    React.createElement('p', { style: { fontWeight: 900 } }, ev.title),
                    React.createElement('p', { style: { fontSize: 10, color: '#6366f1' } }, ev.city + ' | ' + ev.date)
                  )
                ),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 } },
                  React.createElement('button', { onClick: function() { handleApproveEvent(ev.id); }, style: { padding: 10, background: '#22c55e', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' } }, 'APROBAR'),
                  React.createElement('button', { onClick: function() { handleRejectEvent(ev.id); }, style: { padding: 10, background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' } }, 'RECHAZAR'),
                  React.createElement('button', { onClick: function() { handleDeleteEvent(ev.id); }, style: { padding: 10, background: '#64748b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' } }, 'BORRAR')
                )
              );
            })
      ),

      view === 'favorites' && React.createElement('div', { className: 'no-scrollbar', style: { padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 120 } },
        React.createElement('h2', { style: { textAlign: 'center', fontWeight: 900, marginBottom: 20 } }, 'MIS GUARDADOS'),
        favoriteEvents.length === 0
          ? React.createElement('p', { style: { textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 } }, 'NO HAY EVENTOS GUARDADOS')
          : favoriteEvents.map(function(ev) {
              return React.createElement('div', { key: ev.id, className: cardClass, style: { display: 'flex', gap: 15, padding: 15, borderRadius: 25, marginBottom: 12, alignItems: 'center' } },
                React.createElement('img', { src: ev.image_url, style: { width: 60, height: 60, borderRadius: 15, objectFit: 'cover' }, alt: '' }),
                React.createElement('div', { style: { flex: 1 } },
                  React.createElement('p', { style: { fontWeight: 900 } }, ev.title),
                  React.createElement('p', { style: { fontSize: 10, color: '#6366f1' } }, ev.city)
                ),
                React.createElement('button', { onClick: function() { toggleFavorite(ev.id); }, style: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' } }, React.createElement(Trash2, { size: 22 }))
              );
            })
      ),

      view === 'profile' && React.createElement('div', { style: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } },
        React.createElement('div', { className: cardClass, style: { padding: 30, borderRadius: 45, width: '100%', maxWidth: 350, textAlign: 'center' } },
          React.createElement('h2', { style: { fontWeight: 900, marginBottom: 20 } }, 'SOPORTE'),
          React.createElement('div', { style: { display: 'grid', gap: 12, marginBottom: 20 } },
            React.createElement('a', { href: 'https://ko-fi.com/eventora', target: '_blank', rel: 'noreferrer', style: { background: '#29abe0', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12 } }, 'APOYAR EN KO-FI'),
            React.createElement('a', { href: 'https://www.paypal.com/paypalme/jacobogarbas', target: '_blank', rel: 'noreferrer', style: { background: '#003087', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12 } }, 'APOYAR EN PAYPAL')
          ),
          React.createElement('button', { onClick: function() { var e = prompt('Email Admin:'); if (e) supabase.auth.signInWithOtp({ email: e }); }, style: { opacity: 0.1, fontSize: 10, background: 'none', border: 'none', cursor: 'pointer' } }, 'Admin Login')
        )
      )
    ),

    React.createElement('nav', { style: { position: 'fixed', bottom: 15, left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: 400, height: 75, borderRadius: 35, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', zIndex: 3000, background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' } },
      React.createElement('button', { onClick: function() { setView('home'); setSelectedEvent(null); }, style: { background: 'none', border: 'none', color: view === 'home' ? '#4f46e5' : '#64748b', cursor: 'pointer' } }, React.createElement(LayoutList, { size: 26 })),
      React.createElement('button', { onClick: function() { setView('favorites'); setSelectedEvent(null); }, style: { background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b', cursor: 'pointer' } }, React.createElement(Heart, { size: 26, fill: view === 'favorites' ? '#ef4444' : 'none' })),
      React.createElement('button', { onClick: function() { setView('create'); setSelectedEvent(null); }, style: { background: 'none', border: 'none', color: view === 'create' ? '#4f46e5' : '#64748b', cursor: 'pointer' } }, React.createElement(PlusCircle, { size: 26 })),
      React.createElement('button', { onClick: function() { setView('map'); setSelectedEvent(null); }, style: { background: 'none', border: 'none', color: view === 'map' ? '#4f46e5' : '#64748b', cursor: 'pointer' } }, React.createElement(MapIcon, { size: 26 }))
    )
  );
}
