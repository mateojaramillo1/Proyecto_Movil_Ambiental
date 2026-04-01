import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Platform,
  UIManager,
  TouchableOpacity,
  ScrollView,
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

const getCriticidadColor = (registro) => {
  if (registro?.colorCriticidad) return registro.colorCriticidad;
  return getMarkerColor(registro?.ubicacionVia);
};

const FILTROS_CRITICIDAD = [
  { key: 'Baja', color: '#43a047', accent: '#d9f2df' },
  { key: 'Media', color: '#c6a800', accent: '#fff9c4' },
  { key: 'Alta', color: '#fb8c00', accent: '#ffe0b8' },
  { key: 'Muy alta', color: '#e53935', accent: '#ffd7d6' },
  { key: 'Critica', color: '#7b1f1f', accent: '#efc7c7' },
];

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
      color: p.colorCriticidad || getMarkerColor(p.ubicacionVia),
      idArbol: escapeHtml(p.idArbol),
      especie: escapeHtml(p.especie),
      inspector: escapeHtml(p.inspector),
      fechaInspeccion: escapeHtml(p.fechaInspeccion),
      ubicacionVia: escapeHtml(p.ubicacionVia),
      nivelCriticidad: escapeHtml(p.nivelCriticidad || 'Sin clasificar'),
      puntajeCriticidad: p.puntajeCriticidad ?? null,
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
    .tree-pin .tree-core {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255,255,255,0.96);
      box-shadow: 0 8px 16px rgba(16,44,24,0.24);
    }
    .tree-pin .tree-emoji {
      font-size: 24px;
      line-height: 24px;
      text-shadow: 0 2px 5px rgba(16,44,24,0.18);
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
    .route-tip {
      background: rgba(25, 118, 210, 0.94);
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: 4px 9px;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 8px 16px rgba(9, 44, 79, 0.25);
    }
    .route-tip:before {
      display: none;
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
    const guidanceLayer = L.layerGroup().addTo(map);
    let userMarker = null;
    let userAccuracyCircle = null;
    let guidanceLine = null;
    let guidanceLineOutline = null;
    let guidanceTarget = null;
    let selectedMarker = null;
    let guidanceRequestSeq = 0;
    let markersByNivel = {};

    const clearGuidance = () => {
      guidanceLayer.clearLayers();
      guidanceLine = null;
      guidanceLineOutline = null;
      guidanceTarget = null;
      selectedMarker = null;
    };

    const markerIsVisibleByFilter = (markerData, activeLevels) => {
      if (!markerData) return false;
      const nivel = markerData.nivelCriticidad || 'Sin clasificar';
      if (nivel === 'Sin clasificar') return true;
      if (!activeLevels || activeLevels.length === 0) return true;
      return activeLevels.includes(nivel);
    };

    const fetchRoadRoute = async (targetPoint) => {
      if (!currentLocation || !targetPoint) return null;

      const fetchWithTimeout = (url, timeoutMs) => {
        return Promise.race([
          fetch(url),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('timeout')), timeoutMs);
          })
        ]);
      };

      const start = currentLocation.longitude + ',' + currentLocation.latitude;
      const end = targetPoint.longitude + ',' + targetPoint.latitude;
      const profiles = ['driving', 'walking', 'cycling'];

      const requests = profiles.map(async (profile) => {
        const url =
          'https://router.project-osrm.org/route/v1/' + profile + '/' + start + ';' + end +
          '?overview=full&geometries=geojson&alternatives=true&steps=false';

        try {
          const response = await fetchWithTimeout(url, 8000);
          if (!response.ok) return [];
          const data = await response.json();
          const routes = Array.isArray(data && data.routes) ? data.routes : [];

          return routes
            .map((route) => {
              if (!route || !route.geometry || !Array.isArray(route.geometry.coordinates)) return null;
              const coords = route.geometry.coordinates
                .filter((c) => Array.isArray(c) && c.length >= 2)
                .map((c) => [c[1], c[0]]);
              if (coords.length < 2) return null;

              return {
                coords,
                distanceMeters: Number(route.distance) || null,
                profile,
                fromRoadNetwork: true
              };
            })
            .filter(Boolean);
        } catch (error) {
          return [];
        }
      });

      const settled = await Promise.allSettled(requests);
      const candidates = [];
      settled.forEach((result) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          result.value.forEach((candidate) => candidates.push(candidate));
        }
      });

      if (candidates.length === 0) return null;

      candidates.sort((a, b) => {
        const aDist = Number.isFinite(a.distanceMeters) ? a.distanceMeters : Infinity;
        const bDist = Number.isFinite(b.distanceMeters) ? b.distanceMeters : Infinity;
        return aDist - bDist;
      });

      return candidates[0];
    };

    const drawGuidanceTo = async (targetPoint, shouldFocus = true) => {
      if (!targetPoint || !currentLocation) {
        clearGuidance();
        return;
      }

      guidanceTarget = {
        markerId: targetPoint.markerId || null,
        nivelCriticidad: targetPoint.nivelCriticidad || 'Sin clasificar',
        latitude: targetPoint.latitude,
        longitude: targetPoint.longitude,
        idArbol: targetPoint.idArbol || 'Arbol'
      };

      const requestId = guidanceRequestSeq + 1;
      guidanceRequestSeq = requestId;

      clearGuidance();

      const roadRoute = await fetchRoadRoute(targetPoint);
      if (guidanceRequestSeq !== requestId) {
        return;
      }

      if (!(roadRoute && Array.isArray(roadRoute.coords) && roadRoute.coords.length > 1)) {
        clearGuidance();
        return;
      }

      const routeCoords = roadRoute.coords;
      const distanceMeters =
        roadRoute.distanceMeters ||
        calculateDistanceMeters(
          currentLocation.latitude,
          currentLocation.longitude,
          targetPoint.latitude,
          targetPoint.longitude
        );
      const selectedProfile = roadRoute.profile || 'via';

      guidanceLineOutline = L.polyline(routeCoords, {
        color: '#0d3c6f',
        weight: 8,
        opacity: 0.34,
        lineJoin: 'round'
      }).addTo(guidanceLayer);

      guidanceLine = L.polyline(routeCoords, {
        color: '#1e88e5',
        weight: 5,
        opacity: 0.95,
        lineJoin: 'round'
      }).addTo(guidanceLayer);

      guidanceLine.bindTooltip(
        'Ruta por via (' + selectedProfile + '): ' + formatDistance(distanceMeters),
        { permanent: true, sticky: false, direction: 'center', className: 'route-tip' }
      );

      if (shouldFocus) {
        map.flyToBounds(routeCoords, { padding: [60, 60], maxZoom: 18, duration: 0.75 });
      }
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

    const hexToRgba = (hex, alpha) => {
      const normalized = String(hex || '').replace('#', '');
      if (normalized.length !== 6) return 'rgba(46,125,50,' + alpha + ')';
      const red = parseInt(normalized.slice(0, 2), 16);
      const green = parseInt(normalized.slice(2, 4), 16);
      const blue = parseInt(normalized.slice(4, 6), 16);
      return 'rgba(' + red + ',' + green + ',' + blue + ',' + alpha + ')';
    };

    const buildEmojiIcon = (delayMs, markerColor) => {
      const ringColor = hexToRgba(markerColor, 0.22);
      const ringShadow = hexToRgba(markerColor, 0.08);
      return L.divIcon({
        html:
          '<div class="tree-pin" style="animation-delay:' + delayMs + 'ms">' +
          '<div class="tree-ring" style="background:' + ringColor + ';box-shadow:0 0 0 8px ' + ringShadow + '"></div>' +
          '<div class="tree-core" style="background:' + markerColor + '"><div class="tree-emoji">🌳</div></div>' +
          '</div>',
        className: 'tree-icon-wrap',
        iconSize: [46, 52],
        iconAnchor: [23, 46],
        popupAnchor: [0, -40]
      });
    };

    const renderMarkers = () => {
      markersLayer.clearLayers();
      markersByNivel = {};
      clearGuidance();
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
          icon: buildEmojiIcon(delay, p.color)
        }).addTo(markersLayer);

        const spreadNote = p.wasSpread
          ? '<div class="popup-line"><b>Nota:</b> Marcador separado para facilitar seleccion.</div>'
          : '';

        const distanceLine = currentLocation
          ? '<div class="popup-line"><b>Distancia a ti:</b> ' + formatDistance(calculateDistanceMeters(currentLocation.latitude, currentLocation.longitude, p.latitude, p.longitude)) + '</div>'
          : '';
        const criticidadLine =
          '<div class="popup-line"><b>Criticidad:</b> ' + p.nivelCriticidad +
          (p.puntajeCriticidad != null ? ' (' + p.puntajeCriticidad + '/100)' : '') + '</div>';

        marker.bindPopup(
          '<div class="popup-title">' + p.idArbol + '</div>' +
          criticidadLine +
          '<div class="popup-line"><b>Especie:</b> ' + p.especie + '</div>' +
          '<div class="popup-line"><b>Inspector:</b> ' + p.inspector + '</div>' +
          '<div class="popup-line"><b>Ubicacion via:</b> ' + p.ubicacionVia + '</div>' +
          '<div class="popup-line"><b>Fecha:</b> ' + p.fechaInspeccion + '</div>' +
          '<div class="popup-line"><b>Coords:</b> ' + p.coordsDms + '</div>' +
          distanceLine +
          '<div class="popup-line"><b>Guia:</b> toca este arbol para calcular ruta por vias desde tu posicion.</div>' +
          spreadNote
        );

        marker.__vinusData = {
          markerId: p.id,
          nivelCriticidad: p.nivelCriticidad || 'Sin clasificar',
          latitude: p.latitude,
          longitude: p.longitude,
          idArbol: p.idArbol || 'Arbol'
        };

        marker.on('click', () => {
          if (!currentLocation) {
            marker.openPopup();
            return;
          }
          selectedMarker = marker;
          drawGuidanceTo({
            ...p,
            markerId: p.id
          }, true);
        });

        marker.on('popupopen', () => {
          if (!currentLocation) return;
          if (guidanceTarget && guidanceTarget.markerId === p.id) return;
          selectedMarker = marker;
          drawGuidanceTo({
            ...p,
            markerId: p.id
          }, false);
        });

        if (!markersByNivel[p.nivelCriticidad]) markersByNivel[p.nivelCriticidad] = [];
        markersByNivel[p.nivelCriticidad].push(marker);

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

      // No redibujamos la ruta aqui: actualizar la posicion del pin es suficiente.
      // Re-dibujar la ruta en cada GPS update cancela peticiones OSRM pendientes.
    };

    let lastMsgData = null;
    let lastMsgTime = 0;

    const applyFilter = (activeLevels) => {
      Object.entries(markersByNivel).forEach(([nivel, markers]) => {
        // Arboles sin criticidad evaluada siempre visibles
        const sinClasificar = nivel === 'Sin clasificar';
        const visible =
          sinClasificar ||
          !activeLevels ||
          activeLevels.length === 0 ||
          activeLevels.includes(nivel);
        markers.forEach((m) => {
          if (visible) {
            if (!markersLayer.hasLayer(m)) markersLayer.addLayer(m);
          } else {
            if (markersLayer.hasLayer(m)) markersLayer.removeLayer(m);
          }
        });
      });

      // Si la ruta apunta a un arbol que ya no cumple filtro, se limpia.
      if (guidanceTarget && !markerIsVisibleByFilter(guidanceTarget, activeLevels)) {
        clearGuidance();
        return;
      }

      // Si el arbol seleccionado queda fuera del filtro, ocultamos ruta inmediatamente.
      if (selectedMarker) {
        const data = selectedMarker.__vinusData;
        if (!markerIsVisibleByFilter(data, activeLevels)) {
          clearGuidance();
          return;
        }
      }

      // Si hay un objetivo de guia pero ya no existe/visible, tambien limpiar.
      if (guidanceTarget) {
        const stillVisible = Object.values(markersByNivel)
          .flat()
          .some((marker) => {
            const data = marker.__vinusData;
            if (!data) return false;
            if (guidanceTarget.markerId != null && data.markerId !== guidanceTarget.markerId) return false;
            if (!markerIsVisibleByFilter(data, activeLevels)) return false;
            return markersLayer.hasLayer(marker);
          });

        if (!stillVisible) {
          clearGuidance();
        }
      }
    };

    const handleIncomingMessage = (event) => {
      // Deduplicar: document y window pueden disparar el mismo mensaje dos veces
      const now = Date.now();
      if (event.data === lastMsgData && now - lastMsgTime < 50) return;
      lastMsgData = event.data;
      lastMsgTime = now;

      try {
        const payload = JSON.parse(event.data || '{}');
        if (payload && payload.type === 'CURRENT_LOCATION' && payload.location) {
          updateCurrentLocation(payload.location);
        }
        if (payload && payload.type === 'SET_FILTER') {
          applyFilter(payload.levels);
        }
      } catch (error) {
        // Ignore malformed messages from webview bridge.
      }
    };

    // Exponemos funciones para canal alterno via injectJavaScript desde React Native.
    window.__vinusUpdateCurrentLocation = (location) => {
      updateCurrentLocation(location);
    };
    window.__vinusApplyFilter = (levels) => {
      applyFilter(levels);
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
  const [filtroNiveles, setFiltroNiveles] = useState(null); // null = todos visibles
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
          ubicacionVia: registro.ubicacionVia || '-',
          nivelCriticidad: registro.nivelCriticidad || 'Sin clasificar',
          puntajeCriticidad: registro.puntajeCriticidad,
          colorCriticidad: getCriticidadColor(registro)
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

  const conteosPorNivel = useMemo(() => {
    const mapa = {};
    FILTROS_CRITICIDAD.forEach((f) => { mapa[f.key] = 0; });
    puntos.forEach((p) => {
      if (mapa[p.nivelCriticidad] !== undefined) mapa[p.nivelCriticidad]++;
    });
    return mapa;
  }, [puntos]);

  const mapHtml = useMemo(() => buildLeafletHtml(puntos, ubicacionActual), [puntos]);

  const webviewSource = useMemo(() => ({ html: mapHtml }), [mapHtml]);

  const enviarUbicacionAlVisor = (location) => {
    if (!hasNativeWebView || !webViewRef.current || !location) return;

    const bridgeLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      coordsDms: formatCoordsDms(location.latitude, location.longitude)
    };

    try {
      webViewRef.current.postMessage(
        JSON.stringify({ type: 'CURRENT_LOCATION', location: bridgeLocation })
      );
      webViewRef.current.injectJavaScript(
        'window.__vinusUpdateCurrentLocation && window.__vinusUpdateCurrentLocation(' +
          JSON.stringify(bridgeLocation) +
          '); true;'
      );
    } catch (error) {
      // Ignore transient bridge errors while WebView initializes.
    }
  };

  const enviarFiltroAlVisor = (levels) => {
    if (!hasNativeWebView || !webViewRef.current) return;

    try {
      webViewRef.current.postMessage(
        JSON.stringify({ type: 'SET_FILTER', levels })
      );
      webViewRef.current.injectJavaScript(
        'window.__vinusApplyFilter && window.__vinusApplyFilter(' +
          JSON.stringify(levels) +
          '); true;'
      );
    } catch (e) {
      // ignore bridge errors
    }
  };

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
    enviarUbicacionAlVisor(ubicacionActual);
  }, [ubicacionActual, hasNativeWebView]);

  useEffect(() => {
    if (!hasNativeWebView || !webViewRef.current) return;
    enviarFiltroAlVisor(filtroNiveles);
  }, [filtroNiveles, hasNativeWebView]);

  const toggleFiltroNivel = (key) => {
    setFiltroNiveles((prev) => {
      if (prev === null) {
        // De "todos" → solo este nivel
        return [key];
      }
      const existe = prev.includes(key);
      if (existe) {
        const siguiente = prev.filter((k) => k !== key);
        return siguiente.length === 0 ? null : siguiente;
      }
      return [...prev, key];
    });
  };

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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtroBar}
            contentContainerStyle={styles.filtroBarContent}
          >
            <TouchableOpacity
              style={[
                styles.filtroChip,
                filtroNiveles === null && styles.filtroChipTodos
              ]}
              onPress={() => setFiltroNiveles(null)}
            >
              <Text
                style={[
                  styles.filtroChipText,
                  filtroNiveles === null && styles.filtroChipTextActive
                ]}
              >
                Todos ({puntos.length})
              </Text>
            </TouchableOpacity>
            {FILTROS_CRITICIDAD.map((nivel) => {
              const isActive =
                filtroNiveles !== null && filtroNiveles.includes(nivel.key);
              return (
                <TouchableOpacity
                  key={nivel.key}
                  style={[
                    styles.filtroChip,
                    { borderColor: nivel.color },
                    isActive && { backgroundColor: nivel.color }
                  ]}
                  onPress={() => toggleFiltroNivel(nivel.key)}
                >
                  <View
                    style={[
                      styles.filtroChipDot,
                      { backgroundColor: isActive ? '#fff' : nivel.color }
                    ]}
                  />
                  <Text
                    style={[
                      styles.filtroChipText,
                      { color: isActive ? '#fff' : nivel.color }
                    ]}
                  >
                    {nivel.key} ({conteosPorNivel[nivel.key]})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
                source={webviewSource}
                style={styles.webview}
                onLoadEnd={() => {
                  enviarFiltroAlVisor(filtroNiveles);
                  enviarUbicacionAlVisor(ubicacionActual);
                }}
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
  },
  filtroBar: {
    flexGrow: 0,
    backgroundColor: '#f0f9f2'
  },
  filtroBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  filtroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#b0cdb5',
    backgroundColor: '#fff',
    gap: 5
  },
  filtroChipTodos: {
    backgroundColor: '#1f5d38',
    borderColor: '#1f5d38'
  },
  filtroChipDot: {
    width: 8,
    height: 8,
    borderRadius: 999
  },
  filtroChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3a6645'
  },
  filtroChipTextActive: {
    color: '#fff'
  }
});

export default VisorMapaScreen;
