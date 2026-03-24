import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getGuitarsForMap } from '../api/client';
import { MapPin, Navigation, Search } from 'lucide-react';
import styles from './MapView.module.css';

function toWhatsApp(phone) {
  if (!phone) return null;
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('972')) p = p;
  else if (p.startsWith('0')) p = '972' + p.slice(1);
  else if (p.startsWith('5')) p = '972' + p;
  return `https://wa.me/${p}`;
}

function WaIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 3C8.82 3 3 8.82 3 16c0 2.35.64 4.55 1.76 6.44L3 29l6.74-1.76A13 13 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm6.45 17.6c-.27.76-1.57 1.46-2.16 1.55-.55.08-1.24.12-2-.13-.46-.14-1.05-.34-1.8-.67-3.16-1.36-5.22-4.54-5.38-4.75-.16-.21-1.3-1.73-1.3-3.3 0-1.57.82-2.34 1.12-2.66.27-.3.6-.37.8-.37.2 0 .4 0 .57.01.18.01.44-.07.68.52.27.63.9 2.2.98 2.36.08.16.13.35.03.56-.1.21-.15.34-.3.52-.16.19-.33.42-.47.56-.16.16-.32.33-.14.65.18.32.82 1.35 1.76 2.19 1.21 1.08 2.23 1.41 2.55 1.57.32.16.5.13.68-.08.19-.21.8-.93 1.01-1.25.21-.32.42-.27.7-.16.29.11 1.84.87 2.16 1.03.32.16.53.24.61.37.08.13.08.76-.19 1.52z"/>
    </svg>
  );
}

const MARKER_COLOR = { collected: '#2d6a4f', pending: '#f4a261' };

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function MapView() {
  const [guitars, setGuitars]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [filter, setFilter]         = useState('הכל');
  const [userLocation, setUserLocation] = useState(null);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [manualInput, setManualInput]   = useState('');
  const [locating, setLocating]         = useState(false);
  const [nearbyExpanded, setNearbyExpanded] = useState(false);
  const [nearby, setNearby]             = useState([]);

  useEffect(() => {
    getGuitarsForMap()
      .then(setGuitars)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filters = ['הכל', 'נאסף', 'ממתין'];
  const visible = filter === 'הכל' ? guitars
    : filter === 'נאסף' ? guitars.filter(g => g.collected)
    : guitars.filter(g => !g.collected);

  // Calculate top 10 nearest uncollected guitars
  const calcNearby = useCallback((lat, lon) => {
    const uncollected = guitars.filter(g => !g.collected && g.lat && g.lon);
    const withDist = uncollected.map(g => ({
      ...g,
      distance: haversine(lat, lon, g.lat, g.lon),
    }));
    withDist.sort((a, b) => a.distance - b.distance);
    setNearby(withDist.slice(0, 10));
    setUserLocation({ lat, lon });
  }, [guitars]);

  const detectLocation = () => {
    if (!navigator.geolocation) { alert('הדפדפן לא תומך ב-geolocation'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        calcNearby(pos.coords.latitude, pos.coords.longitude);
        setResolvedAddress('מיקום GPS');
        setLocating(false);
      },
      () => { alert('לא הצלחנו לזהות מיקום'); setLocating(false); }
    );
  };

  // Manual location: geocode using Nominatim
  const handleManualSearch = async () => {
    if (!manualInput.trim()) return;
    setLocating(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualInput + ', ישראל')}&format=json&limit=1&countrycodes=il`,
        { headers: { 'User-Agent': 'EchoGuitars/1.0' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        calcNearby(parseFloat(data[0].lat), parseFloat(data[0].lon));
        // Show the full resolved address from Nominatim
        const parts = data[0].display_name.split(',').slice(0, 3).join(',');
        setResolvedAddress(parts);
      } else {
        alert('לא נמצא מיקום עבור: ' + manualInput);
      }
    } catch { alert('שגיאה בחיפוש מיקום'); }
    finally { setLocating(false); }
  };

  return (
    <div className={styles.page}>
      {/* ── Left: Map ── */}
      <div className={`${styles.mapSide} ${nearbyExpanded ? styles.mapSideCollapsed : ''}`}>
        <div className={styles.mapHeader}>
          <h1>מפת גיטרות</h1>
          <div className={styles.filters}>
            {filters.map(t => (
              <button key={t}
                className={`${styles.filterBtn} ${filter === t ? styles.active : ''}`}
                onClick={() => setFilter(t)}
                style={filter === t && t !== 'הכל'
                  ? { background: t === 'נאסף' ? MARKER_COLOR.collected : MARKER_COLOR.pending, color: '#fff', borderColor: 'transparent' }
                  : {}}
              >{t}</button>
            ))}
          </div>
          <span className={styles.count}>{visible.length} גיטרות</span>
        </div>

        <div className={styles.mapWrapper}>
          {loading && <div className={styles.loading}>טוען...</div>}
          {error   && <div className={styles.loading} style={{color:'red'}}>שגיאה: {error}</div>}
          {!loading && !error && (
            <MapContainer center={[31.5, 35.0]} zoom={8} className={styles.map}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {userLocation && (
                <CircleMarker
                  center={[userLocation.lat, userLocation.lon]}
                  radius={10} fillColor="#4361ee" color="#fff" weight={3} fillOpacity={1}
                >
                  <Popup>המיקום שלך</Popup>
                </CircleMarker>
              )}
              {visible.map(g => (
                <CircleMarker
                  key={g.id}
                  center={[g.lat, g.lon]}
                  radius={8}
                  fillColor={g.collected ? MARKER_COLOR.collected : MARKER_COLOR.pending}
                  color="#fff" weight={2} fillOpacity={0.85}
                >
                  <Popup>
                    <div className={styles.popup}>
                      <strong>{g.name}</strong>
                      <div className={styles.popupSub}>{g.city}{g.street ? `, ${g.street}` : ''}</div>
                      <div className={styles.popupMeta}>
                        <span>{g.guitarType || 'לא ידוע'}</span>
                        <span className={g.collected ? styles.collected : styles.pending}>
                          {g.collected ? '✓ נאסף' : 'ממתין'}
                        </span>
                      </div>
                      {g.phone && (
                        <div style={{ display:'flex', gap:6, alignItems:'center', justifyContent:'center' }}>
                          <a href={`tel:${g.phone}`} className={styles.popupCall}>📞 {g.phone}</a>
                          <a href={toWhatsApp(g.phone)} target="_blank" rel="noopener noreferrer" className={styles.popupWa}><WaIcon /></a>
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>

        <div className={styles.legend}>
          <div className={styles.legendItem}><span className={styles.dot} style={{background: MARKER_COLOR.collected}}/> נאסף ({guitars.filter(g=>g.collected).length})</div>
          <div className={styles.legendItem}><span className={styles.dot} style={{background: MARKER_COLOR.pending}}/> ממתין ({guitars.filter(g=>!g.collected).length})</div>
          <div className={styles.legendItem}><span className={styles.dot} style={{background:'#4361ee'}}/> המיקום שלי</div>
        </div>
      </div>

      {/* ── Right: Nearby Picker ── */}
      <div className={`${styles.nearbySide} ${nearbyExpanded ? styles.nearbySideExpanded : ''}`}>
        <div className={styles.nearbyHeader}>
          <MapPin size={18} />
          <h2>המלצות לאיסוף בקרבתי</h2>
          <button className={styles.expandBtn} onClick={() => setNearbyExpanded(e => !e)} title={nearbyExpanded ? 'צמצם' : 'הרחב'}>
            {nearbyExpanded ? '▼' : '▲'}
          </button>
        </div>

        <div className={styles.locationControls}>
          <button className={styles.detectBtn} onClick={detectLocation} disabled={locating || loading}>
            <Navigation size={15} />
            {locating ? 'מאתר...' : 'זהה מיקום אוטומטית'}
          </button>
          <div className={styles.manualRow}>
            <input
              className={styles.manualInput}
              placeholder="או הזן עיר / כתובת..."
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
            />
            <button className={styles.searchBtn} onClick={handleManualSearch} disabled={locating}>
              <Search size={15} />
            </button>
          </div>
        </div>

        {resolvedAddress && (
          <div className={styles.resolvedAddress}>
            <Navigation size={13} /> {resolvedAddress}
          </div>
        )}

        {nearby.length === 0 && !userLocation && (
          <div className={styles.emptyNearby}>
            <MapPin size={40} color="#d1d5db" />
            <p>זהה מיקום כדי לראות<br/>את הגיטרות הקרובות אליך</p>
          </div>
        )}

        {nearby.length > 0 && (
          <div className={styles.nearbyList}>
            <p className={styles.nearbySubtitle}>Top 10 גיטרות שלא נאספו בקרבתך</p>
            {nearby.map((g, i) => (
              <div key={g.id} className={styles.nearbyCard}>
                <div className={styles.nearbyRank}>#{i + 1}</div>
                <div className={styles.nearbyInfo}>
                  <div className={styles.nearbyName}>{g.name}</div>
                  <div className={styles.nearbyAddress}>
                    <MapPin size={12} /> {g.city}{g.street ? `, ${g.street}` : ''}
                  </div>
                  {g.phone && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <a href={`tel:${g.phone}`} className={styles.nearbyPhone}>📞 {g.phone}</a>
                      <a href={toWhatsApp(g.phone)} target="_blank" rel="noopener noreferrer" className={styles.waBtn}><WaIcon /></a>
                    </div>
                  )}
                  {g.guitarType && <span className={styles.nearbyType}>{g.guitarType}</span>}
                </div>
                <div className={styles.nearbyDist}>{g.distance.toFixed(1)} ק"מ</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
