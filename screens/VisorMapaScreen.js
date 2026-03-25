import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Platform,
  UIManager,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Easing
} from 'react-native';
import * as Location from 'expo-location';
import { obtenerRegistros } from '../database';
import { formatCoordsDms, parseCoordinates } from '../utils/coordsFormat';

let WebViewComponent = null;
try {
  const webviewModule = require('react-native-webview');
  WebViewComponent = webviewModule.WebView || null;
} catch (error) {
  WebViewComponent = null;
}

const getMarkerColor = (ubicacionVia) => {
  const key = (ubicacionVia || '').toUpperCase();
  if (key === 'TALUD SUPERIOR') return '#e53935';
  if (key === 'BERMA') return '#1e88e5';
  if (key === 'SEPARADOR') return '#43a047';
  if (key === 'TALUD INFERIOR') return '#fb8c00';
  return '#6d4c41';
};

const escapeHtml = (value) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const formatDistance = (distanceMeters) => {
  if (distanceMeters < 1000) {
    return Math.round(distanceMeters) + ' m';
  }
  return (distanceMeters / 1000).toFixed(2) + ' km';
};

const buildLeafletHtml = (points, currentLocation) => {
  const currentLocationJson = currentLocation
    ? JSON.stringify({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      accuracy: currentLocation.accuracy,
      coordsDms: escapeHtml(formatCoordsDms(currentLocation.latitude, currentLocation.longitude))
    })
    : 'null';

  const pointsJson = JSON.stringify(
    points.map((p) => ({
      ...p,
      color: getMarkerColor(p.ubicacionVia),
      idArbol: escapeHtml(p.idArbol),
      especie: escapeHtml(p.especie),
      inspector: escapeHtml(p.inspector),
      fechaInspeccion: escapeHtml(p.fechaInspeccion),
      ubicacionVia: escapeHtml(p.ubicacionVia),
      coordsDms: escapeHtml(formatCoordsDms(p.latitude, p.longitude))
    }))
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(180deg, #dff3df 0%, #eef8ee 45%, #f8fcf7 100%);
    }
    #map {
      background: linear-gradient(180deg, #dff0df 0%, #eef8ee 100%);
      opacity: 0;
      transform: scale(1.02);
      transition: opacity 520ms ease, transform 720ms cubic-bezier(.22,.8,.2,1);
      transform-origin: center center;
    }
    body.is-ready #map {
      opacity: 1;
      transform: scale(1);
    }
    .ambience {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 401;
      background:
        radial-gradient(circle at 18% 14%, rgba(255,255,255,0.28) 0, rgba(255,255,255,0) 22%),
        radial-gradient(circle at 84% 18%, rgba(160, 213, 172, 0.14) 0, rgba(160, 213, 172, 0) 20%),
        linear-gradient(180deg, rgba(222, 244, 226, 0.18) 0%, rgba(255,255,255,0) 45%, rgba(197, 230, 200, 0.16) 100%);
    }
    .ambience-bottom {
      position: absolute;
      left: 18px;
      right: 18px;
      bottom: 14px;
      height: 42px;
      border-radius: 999px;
      background: rgba(255,255,255,0.16);
      filter: blur(18px);
      pointer-events: none;
      z-index: 401;
    }
    .leaflet-tile-pane {
      filter: saturate(1.16) contrast(1.03);
    }
    .leaflet-container {
      background: #dff0df;
    }
    .leaflet-control-zoom {
      border: none !important;
      box-shadow: 0 10px 20px rgba(25, 76, 45, 0.18) !important;
      overflow: hidden;
      border-radius: 14px !important;
    }
    .leaflet-control-zoom a {
      background: rgba(255,255,255,0.96) !important;
      color: #245237 !important;
      border-bottom: 1px solid #d7ead7 !important;
      width: 34px !important;
      height: 34px !important;
      line-height: 34px !important;
      font-weight: 700;
    }
    .leaflet-control-attribution {
      background: rgba(255,255,255,0.82) !important;
      border-radius: 10px 0 0 0;
      padding: 3px 7px !important;
      color: #57705d !important;
      font-size: 10px !important;
    }
    .splash {
      position: absolute;
      inset: 0;
      z-index: 12000;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(circle at 18% 15%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 30%),
        linear-gradient(135deg, rgba(18,63,126,0.96) 0%, rgba(39,84,147,0.94) 45%, rgba(41,123,168,0.92) 100%);
      opacity: 1;
      transition: opacity 560ms ease, transform 700ms cubic-bezier(.2,.76,.2,1);
      transform: scale(1);
      pointer-events: none;
    }
    .splash.hidden {
      opacity: 0;
      transform: scale(1.04);
    }
    .splash-card {
      min-width: 240px;
      max-width: 280px;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.24);
      background: rgba(255,255,255,0.13);
      backdrop-filter: blur(7px);
      padding: 18px 16px;
      box-shadow: 0 18px 40px rgba(8, 33, 80, 0.25);
    }
    .splash-title {
      margin: 0;
      color: #ffffff;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.6px;
    }
    .splash-subtitle {
      margin-top: 6px;
      color: rgba(232, 244, 255, 0.95);
      font-size: 12px;
    }
    .splash-bar {
      margin-top: 12px;
      height: 6px;
      border-radius: 999px;
      background: rgba(255,255,255,0.18);
      overflow: hidden;
    }
    .splash-bar-fill {
      width: 38%;
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #ffffff 0%, #9ee0ff 100%);
      animation: splashLoad 1.2s ease-in-out infinite;
    }
    @keyframes splashLoad {
      0% { transform: translateX(-120%); }
      55% { transform: translateX(210%); }
      100% { transform: translateX(210%); }
    }
    .panel {
      position: absolute;
      z-index: 9999;
      left: 12px;
      top: 12px;
      background: rgba(255,255,255,0.86);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 10px 12px;
      border: 1px solid rgba(190, 221, 190, 0.9);
      box-shadow: 0 10px 28px rgba(31, 73, 43, 0.18);
      min-width: 180px;
    }
    .panel h4 {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #1e5a35;
    }
    .item {
      display: flex;
      align-items: center;
      margin: 5px 0;
      font-size: 11px;
      color: #355643;
    }
    .dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      margin-right: 8px;
      border: 2px solid #fff;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
    }
    .map-badge {
      position: absolute;
      z-index: 9999;
      right: 12px;
      top: 12px;
      background: linear-gradient(135deg, rgba(35, 102, 58, 0.92), rgba(53, 138, 80, 0.88));
      color: #fff;
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.4px;
      box-shadow: 0 10px 24px rgba(25, 76, 45, 0.22);
    }
    .leaflet-popup-content-wrapper {
      border-radius: 16px;
      background: rgba(255,255,255,0.96);
      box-shadow: 0 16px 30px rgba(38, 72, 45, 0.18);
    }
    .leaflet-popup-tip {
      background: rgba(255,255,255,0.96);
    }
    .popup-title {
      font-weight: 800;
      color: #1b4d31;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .popup-line {
      font-size: 12px;
      color: #355643;
      margin: 4px 0;
    }
    .tree-icon-wrap {
      background: transparent;
      border: none;
    }
    .user-icon-wrap {
      background: transparent;
      border: none;
    }
    .tree-pin {
      width: 46px;
      height: 52px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: translateY(-34px) scale(0.22) rotate(-8deg);
      animation: markerPop 860ms cubic-bezier(.18,.86,.22,1.18) forwards;
      will-change: transform, opacity;
    }
    .tree-pin .tree-ring {
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: rgba(46, 125, 50, 0.16);
      box-shadow: 0 0 0 8px rgba(46, 125, 50, 0.06);
      bottom: 1px;
      animation: treePulse 1.8s ease-out infinite;
    }
    .tree-pin .tree-emoji {
      font-size: 34px;
      line-height: 34px;
      text-shadow: 0 3px 8px rgba(16,44,24,0.25);
    }
    @keyframes markerPop {
      0% { opacity: 0; transform: translateY(-34px) scale(0.22) rotate(-8deg); }
      46% { opacity: 1; transform: translateY(8px) scale(1.16) rotate(2deg); }
      74% { opacity: 1; transform: translateY(-2px) scale(0.96) rotate(-1deg); }
      100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
    }
    @keyframes treePulse {
      0% { transform: scale(0.6); opacity: 0.55; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .user-pin {
      width: 22px;
      height: 22px;
      border-radius: 999px;
      background: #1976d2;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 1px rgba(25, 118, 210, 0.4), 0 6px 14px rgba(4, 35, 67, 0.35);
      position: relative;
      animation: userPulse 1.6s ease-out infinite;
    }
    .user-pin::after {
      content: '';
      position: absolute;
      inset: -8px;
      border-radius: 999px;
      border: 2px solid rgba(25, 118, 210, 0.28);
    }
    @keyframes userPulse {
      0% { transform: scale(0.95); }
      55% { transform: scale(1.08); }
      100% { transform: scale(0.95); }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="splash" id="splash">
    <div class="splash-card">
      <p class="splash-title">VINUS MAPA ACTIVO</p>
      <div class="splash-subtitle">Cargando arboles inspeccionados...</div>
      <div class="splash-bar"><div class="splash-bar-fill"></div></div>
    </div>
  </div>
  <div class="ambience"></div>
  <div class="ambience-bottom"></div>
  <div class="panel">
    <h4>Arboles inspeccionados</h4>
    <div class="item"><span class="dot" style="background:#e53935"></span>Talud Superior</div>
    <div class="item"><span class="dot" style="background:#1e88e5"></span>Berma</div>
    <div class="item"><span class="dot" style="background:#43a047"></span>Separador</div>
    <div class="item"><span class="dot" style="background:#fb8c00"></span>Talud Inferior</div>
    <div class="item"><span class="dot" style="background:#1976d2"></span>Tu ubicacion actual</div>
  </div>
  <div class="map-badge">VINUS AMBIENTAL</div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const points = ${pointsJson};
    let currentLocation = ${currentLocationJson};
    const map = L.map('map', { zoomControl: true }).setView([4.711, -74.0721], 6);
    const transparentTile = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    const providers = [
      {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: {
          maxZoom: 20,
          attribution: '&copy; OpenStreetMap contributors',
          errorTileUrl: transparentTile
        }
      },
      {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        options: {
          subdomains: 'abcd',
          maxZoom: 20,
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          errorTileUrl: transparentTile
        }
      },
      {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        options: {
          maxZoom: 17,
          attribution: '&copy; OpenStreetMap contributors, SRTM | OpenTopoMap',
          errorTileUrl: transparentTile
        }
      }
    ];
    let providerIndex = 0;
    let activeLayer = null;
    let tileErrors = 0;
    const splash = document.getElementById('splash');
    let didAnimateMap = false;

    const revealMap = () => {
      if (didAnimateMap) return;
      didAnimateMap = true;
      document.body.classList.add('is-ready');
      if (splash) {
        splash.classList.add('hidden');
        setTimeout(() => {
          if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
        }, 680);
      }
    };

    const mountProvider = (index) => {
      if (activeLayer) {
        map.removeLayer(activeLayer);
      }

      providerIndex = index;
      tileErrors = 0;
      const provider = providers[index];
      activeLayer = L.tileLayer(provider.url, provider.options).addTo(map);

      activeLayer.on('tileerror', () => {
        tileErrors += 1;
        if (tileErrors > 8 && providerIndex < providers.length - 1) {
          mountProvider(providerIndex + 1);
        }
      });
    };

    mountProvider(0);

    map.whenReady(() => {
      requestAnimationFrame(revealMap);
    });
    map.on('load', revealMap);
    setTimeout(revealMap, 900);

    const markersLayer = L.layerGroup().addTo(map);
    let userMarker = null;
    let userAccuracyCircle = null;

    const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const earthRadius = 6371000;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return earthRadius * c;
    };

    const formatDistance = (distanceMeters) => {
      if (distanceMeters < 1000) {
        return Math.round(distanceMeters) + ' m';
      }
      return (distanceMeters / 1000).toFixed(2) + ' km';
    };

    const spreadNearbyPoints = (sourcePoints) => {
      const groups = {};
      sourcePoints.forEach((point, index) => {
        // Bucket nearby points (~3m) so overlapping trees can be selected separately.
        const key = Math.round(point.latitude * 35000) + '_' + Math.round(point.longitude * 35000);
        if (!groups[key]) groups[key] = [];
        groups[key].push({ ...point, _index: index });
      });

      const adjusted = [];
      Object.keys(groups).forEach((key) => {
        const group = groups[key];
        if (group.length === 1) {
          adjusted.push({
            ...group[0],
            displayLatitude: group[0].latitude,
            displayLongitude: group[0].longitude,
            wasSpread: false
          });
          return;
        }

        const radius = 0.000045 + Math.min(0.00002, group.length * 0.000003);
        group.forEach((point, idx) => {
          const angle = (Math.PI * 2 * idx) / group.length;
          adjusted.push({
            ...point,
            displayLatitude: point.latitude + Math.sin(angle) * radius,
            displayLongitude: point.longitude + Math.cos(angle) * radius,
            wasSpread: true
          });
        });
      });

      adjusted.sort((a, b) => a._index - b._index);
      return adjusted;
    };

    const pointsToRender = spreadNearbyPoints(points);

    const buildEmojiIcon = (delayMs) => {
      return L.divIcon({
        html: '<div class="tree-pin" style="animation-delay:' + delayMs + 'ms"><div class="tree-ring"></div><div class="tree-emoji">🌳</div></div>',
        className: 'tree-icon-wrap',
        iconSize: [46, 52],
        iconAnchor: [23, 46],
        popupAnchor: [0, -40]
      });
    };

    const renderMarkers = () => {
      markersLayer.clearLayers();
      const bounds = [];

      if (currentLocation) {
        userMarker = L.marker([currentLocation.latitude, currentLocation.longitude], {
          icon: L.divIcon({
            html: '<div class="user-pin"></div>',
            className: 'user-icon-wrap',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            popupAnchor: [0, -14]
          }),
          zIndexOffset: 1000
        }).addTo(markersLayer);

        const accuracyRadius = Math.max(5, Number(currentLocation.accuracy) || 10);
        userAccuracyCircle = L.circle([currentLocation.latitude, currentLocation.longitude], {
          radius: accuracyRadius,
          color: '#1976d2',
          fillColor: '#42a5f5',
          fillOpacity: 0.18,
          weight: 1
        }).addTo(markersLayer);

        userMarker.bindPopup(
          '<div class="popup-title">Tu ubicacion actual</div>' +
          '<div class="popup-line"><b>Coords:</b> ' + currentLocation.coordsDms + '</div>' +
          '<div class="popup-line"><b>Precision aprox:</b> ' + Math.round(accuracyRadius) + ' m</div>'
        );

        bounds.push([currentLocation.latitude, currentLocation.longitude]);
      }

      pointsToRender.forEach((p, index) => {
        const delay = 140 + Math.min(index, 24) * 65;
        const marker = L.marker([p.displayLatitude, p.displayLongitude], {
          icon: buildEmojiIcon(delay)
        }).addTo(markersLayer);

        const spreadNote = p.wasSpread
          ? '<div class="popup-line"><b>Nota:</b> Marcador separado para facilitar seleccion.</div>'
          : '';

        const distanceLine = currentLocation
          ? '<div class="popup-line"><b>Distancia a ti:</b> ' + formatDistance(calculateDistanceMeters(currentLocation.latitude, currentLocation.longitude, p.latitude, p.longitude)) + '</div>'
          : '';

        marker.bindPopup(
          '<div class="popup-title">' + p.idArbol + '</div>' +
          '<div class="popup-line"><b>Especie:</b> ' + p.especie + '</div>' +
          '<div class="popup-line"><b>Inspector:</b> ' + p.inspector + '</div>' +
          '<div class="popup-line"><b>Ubicacion via:</b> ' + p.ubicacionVia + '</div>' +
          '<div class="popup-line"><b>Fecha:</b> ' + p.fechaInspeccion + '</div>' +
          '<div class="popup-line"><b>Coords:</b> ' + p.coordsDms + '</div>' +
          distanceLine +
          spreadNote
        );

        bounds.push([p.displayLatitude, p.displayLongitude]);
      });

      if (bounds.length === 1) {
        map.flyTo(bounds[0], 17, { duration: 1.2, easeLinearity: 0.25 });
      } else if (bounds.length > 1) {
        map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 18, duration: 1.3 });
      }
    };

    renderMarkers();

    const updateCurrentLocation = (nextLocation) => {
      if (!nextLocation || typeof nextLocation.latitude !== 'number' || typeof nextLocation.longitude !== 'number') {
        return;
      }

      currentLocation = nextLocation;
      const accuracyRadius = Math.max(5, Number(currentLocation.accuracy) || 10);

      if (!userMarker) {
        userMarker = L.marker([currentLocation.latitude, currentLocation.longitude], {
          icon: L.divIcon({
            html: '<div class="user-pin"></div>',
            className: 'user-icon-wrap',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            popupAnchor: [0, -14]
          }),
          zIndexOffset: 1000
        }).addTo(markersLayer);
      } else {
        userMarker.setLatLng([currentLocation.latitude, currentLocation.longitude]);
      }

      if (!userAccuracyCircle) {
        userAccuracyCircle = L.circle([currentLocation.latitude, currentLocation.longitude], {
          radius: accuracyRadius,
          color: '#1976d2',
          fillColor: '#42a5f5',
          fillOpacity: 0.18,
          weight: 1
        }).addTo(markersLayer);
      } else {
        userAccuracyCircle.setLatLng([currentLocation.latitude, currentLocation.longitude]);
        userAccuracyCircle.setRadius(accuracyRadius);
      }

      userMarker.bindPopup(
        '<div class="popup-title">Tu ubicacion actual</div>' +
        '<div class="popup-line"><b>Coords:</b> ' + (currentLocation.coordsDms || '-') + '</div>' +
        '<div class="popup-line"><b>Precision aprox:</b> ' + Math.round(accuracyRadius) + ' m</div>'
      );
    };

    const handleIncomingMessage = (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (payload && payload.type === 'CURRENT_LOCATION' && payload.location) {
          updateCurrentLocation(payload.location);
        }
      } catch (error) {
        // Ignore malformed messages from webview bridge.
      }
    };

    document.addEventListener('message', handleIncomingMessage);
    window.addEventListener('message', handleIncomingMessage);
  </script>
</body>
</html>`;
};

const VisorMapaScreen = ({ navigation }) => {
  const [registros, setRegistros] = useState([]);
  const [ubicacionActual, setUbicacionActual] = useState(null);
  const [ubicacionError, setUbicacionError] = useState('');
  const [actualizandoUbicacion, setActualizandoUbicacion] = useState(false);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef(null);
  const locationWatcherRef = useRef(null);
  const mapIntroOpacity = useRef(new Animated.Value(0)).current;
  const mapIntroTranslateY = useRef(new Animated.Value(18)).current;
  const framePulse = useRef(new Animated.Value(0)).current;

  const hasNativeWebView = useMemo(() => {
    if (!WebViewComponent) {
      return false;
    }
    const manager =
      UIManager.getViewManagerConfig &&
      UIManager.getViewManagerConfig('RNCWebView');
    if (manager) {
      return true;
    }
    if (Platform.OS === 'ios') {
      return true;
    }
    return false;
  }, []);

  const puntos = useMemo(() => {
    return registros
      .map((registro) => {
        const parsed = parseCoordinates(registro.coordenadas || registro.ubicacion);
        if (!parsed) return null;
        return {
          id: registro.id,
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          idArbol: registro.idArbol || ('Arbol ' + registro.id),
          especie: registro.especie || 'Sin especie',
          inspector: registro.inspector || registro.nombre || 'Sin inspector',
          fechaInspeccion: registro.fechaInspeccion || '-',
          ubicacionVia: registro.ubicacionVia || '-'
        };
      })
      .filter(Boolean);
  }, [registros]);

  const distanciaMinima = useMemo(() => {
    if (!ubicacionActual || puntos.length === 0) return null;
    let minima = Infinity;
    puntos.forEach((p) => {
      const distancia = calculateDistanceMeters(
        ubicacionActual.latitude,
        ubicacionActual.longitude,
        p.latitude,
        p.longitude
      );
      if (distancia < minima) minima = distancia;
    });
    return Number.isFinite(minima) ? minima : null;
  }, [puntos, ubicacionActual]);

  const mapHtml = useMemo(() => buildLeafletHtml(puntos, ubicacionActual), [puntos]);

  const detenerSeguimientoUbicacion = () => {
    if (locationWatcherRef.current) {
      locationWatcherRef.current.remove();
      locationWatcherRef.current = null;
    }
  };

  const iniciarSeguimientoUbicacion = async () => {
    try {
      detenerSeguimientoUbicacion();

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setUbicacionError('Permiso de ubicacion no concedido.');
        return;
      }

      locationWatcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 2
        },
        (location) => {
          if (!location?.coords) return;
          setUbicacionActual({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 10
          });
          setUbicacionError('');
        }
      );
    } catch (error) {
      setUbicacionError('No fue posible iniciar seguimiento en tiempo real.');
    }
  };

  const cargarUbicacionActual = async (showErrorAlert = false) => {
    try {
      setActualizandoUbicacion(true);

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setUbicacionError('Permiso de ubicacion no concedido.');
        if (showErrorAlert) {
          Alert.alert('Ubicacion', 'Debes habilitar el permiso de ubicacion para verte en el mapa.');
        }
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 8000
      });

      if (!location?.coords) {
        setUbicacionError('No fue posible obtener tu ubicacion actual.');
        if (showErrorAlert) {
          Alert.alert('Ubicacion', 'No fue posible obtener tu ubicacion actual.');
        }
        return;
      }

      setUbicacionActual({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 10
      });
      setUbicacionError('');
    } catch (error) {
      setUbicacionError('No fue posible actualizar tu ubicacion.');
      if (showErrorAlert) {
        Alert.alert('Ubicacion', 'No fue posible actualizar tu ubicacion en este momento.');
      }
    } finally {
      setActualizandoUbicacion(false);
    }
  };

  const cargarRegistros = async () => {
    try {
      setLoading(true);
      const data = await obtenerRegistros();
      setRegistros(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los puntos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRegistros();
    cargarUbicacionActual();
    const unsubscribe = navigation.addListener('focus', () => {
      cargarRegistros();
      cargarUbicacionActual();
      iniciarSeguimientoUbicacion();
    });
    iniciarSeguimientoUbicacion();
    return () => {
      unsubscribe();
      detenerSeguimientoUbicacion();
    };
  }, [navigation]);

  useEffect(() => {
    if (!hasNativeWebView || !webViewRef.current || !ubicacionActual) {
      return;
    }

    const payload = JSON.stringify({
      type: 'CURRENT_LOCATION',
      location: {
        latitude: ubicacionActual.latitude,
        longitude: ubicacionActual.longitude,
        accuracy: ubicacionActual.accuracy,
        coordsDms: formatCoordsDms(ubicacionActual.latitude, ubicacionActual.longitude)
      }
    });

    try {
      webViewRef.current.postMessage(payload);
    } catch (error) {
      // Ignore transient bridge errors while WebView initializes.
    }
  }, [ubicacionActual, hasNativeWebView]);

  useEffect(() => {
    if (loading || puntos.length === 0) {
      return;
    }

    mapIntroOpacity.setValue(0);
    mapIntroTranslateY.setValue(18);

    Animated.parallel([
      Animated.timing(mapIntroOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(mapIntroTranslateY, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true
      })
    ]).start();
  }, [loading, puntos.length, mapIntroOpacity, mapIntroTranslateY]);

  useEffect(() => {
    if (loading || puntos.length === 0) {
      framePulse.stopAnimation();
      framePulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(framePulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(framePulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );
    loop.start();

    return () => {
      loop.stop();
      framePulse.stopAnimation();
    };
  }, [loading, puntos.length, framePulse]);

  return (
    <View style={styles.container}>
      <View style={styles.topPanel}>
        <Text style={styles.topTitle}>Visor de Arboles</Text>
        <Text style={styles.topSubtitle}>Mapa interactivo con identificacion y colores por ubicacion</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Registros</Text>
            <Text style={styles.kpiValue}>{registros.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Con coordenadas</Text>
            <Text style={styles.kpiValue}>{puntos.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Arbol mas cercano</Text>
            <Text style={styles.kpiValueSmall}>{distanciaMinima != null ? formatDistance(distanciaMinima) : '--'}</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={cargarRegistros}>
            <Text style={styles.actionButtonText}>ACTUALIZAR LISTA</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonAlt]}
            onPress={() => cargarUbicacionActual(true)}
            disabled={actualizandoUbicacion}
          >
            <Text style={[styles.actionButtonText, styles.actionButtonAltText]}>
              {actualizandoUbicacion ? 'UBICANDO...' : 'MI UBICACION'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.locationStatus}>
          {ubicacionActual
            ? 'Tu posicion esta activa en el mapa.'
            : (ubicacionError || 'Activa la ubicacion para comparar distancia con cada arbol.')}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#275493" />
          <Text style={styles.loadingText}>Cargando puntos...</Text>
        </View>
      ) : puntos.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>Arbol</Text>
          <Text style={styles.emptyTitle}>Sin puntos disponibles</Text>
          <Text style={styles.emptySubtitle}>
            Aun no hay registros con coordenadas validas.{'\n'}
            Guarda registros con ubicacion GPS para verlos aqui.
          </Text>
        </View>
      ) : (
        <View style={styles.contentWrap}>
          {hasNativeWebView ? (
            <Animated.View
              style={[
                styles.mapShell,
                {
                  opacity: mapIntroOpacity,
                  transform: [{ translateY: mapIntroTranslateY }]
                }
              ]}
            >
              <WebViewComponent
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                style={styles.webview}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#275493" />
                    <Text style={styles.loadingText}>Renderizando visor...</Text>
                  </View>
                )}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.mapGlow,
                  {
                    opacity: framePulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 0.65]
                    }),
                    transform: [
                      {
                        scale: framePulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.03]
                        })
                      }
                    ]
                  }
                ]}
              />
            </Animated.View>
          ) : (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Visor avanzado no disponible en este APK</Text>
              <Text style={styles.warningText}>
                Este dispositivo no tiene el modulo nativo de WebView para el mapa integrado.
                Instala el APK mas reciente para ver el mapa completo.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#edf6ef' },
  topPanel: {
    backgroundColor: '#1f5d38',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#12341f',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8
  },
  topTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  topSubtitle: { color: '#d6eddc', fontSize: 13, marginTop: 4 },
  kpiRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
  kpiCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12
  },
  kpiLabel: { color: '#e3f4e6', fontSize: 12, fontWeight: '600' },
  kpiValue: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  kpiValueSmall: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 5 },
  actionRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
  actionButton: { flex: 1, backgroundColor: '#f4fbf5', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  actionButtonAlt: { backgroundColor: '#1d4675' },
  actionButtonText: { color: '#1f5d38', fontSize: 13, fontWeight: '800' },
  actionButtonAltText: { color: '#fff' },
  locationStatus: { marginTop: 8, color: '#d6eddc', fontSize: 12, fontWeight: '600' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: '#1f5d38', fontWeight: '700' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyIcon: { fontSize: 18, marginBottom: 14, color: '#1f5d38', fontWeight: '700' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1f5d38', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#5f7d64', textAlign: 'center', lineHeight: 22 },
  contentWrap: { flex: 1 },
  mapShell: {
    flex: 1,
    marginTop: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cfe6cf',
    backgroundColor: '#f6fbf5',
    shadowColor: '#163521',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6
  },
  mapGlow: {
    position: 'absolute',
    top: -1,
    right: -1,
    bottom: -1,
    left: -1,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#72d0ff'
  },
  webview: { flex: 1, backgroundColor: '#f6fbf5' },
  warningCard: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffd4d4',
    padding: 12
  },
  warningTitle: {
    color: '#b63b3b',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 4
  },
  warningText: {
    color: '#754848',
    fontSize: 12,
    lineHeight: 18
  }
});

export default VisorMapaScreen;
