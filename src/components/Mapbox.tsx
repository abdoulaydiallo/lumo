import React, { useRef, useEffect, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

type Coordinate = {
  lat: number;
  lng: number;
};

type MapboxProps = {
  center: Coordinate;
  zoom?: number;
  route?: GeoJSON.Feature<GeoJSON.LineString>;
  geolocateControl?: boolean;
  onGeolocate?: (position: mapboxgl.LngLat) => void;
  onClick?: (position: mapboxgl.LngLat) => void;
  className?: string;
  style?: React.CSSProperties;
};

export const Mapbox: React.FC<MapboxProps> = React.memo(({
  center,
  zoom = 11,
  route,
  geolocateControl = false,
  onGeolocate,
  onClick,
  className = '',
  style = { width: "100%", height: "100%" },
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const animationRef = useRef<number | null>(null);
  
  // Annule toute animation en cours
  const cancelCurrentAnimation = useCallback(() => {
    if (animationRef.current && mapRef.current) {
      mapRef.current.stop();
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Initialisation de la carte
  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [center.lng, center.lat],
      zoom: zoom,
      antialias: true,
      fadeDuration: 0,
      preserveDrawingBuffer: true,
      interactive: true,
    });

    mapRef.current = map;

    // Configuration des contrôles
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(new mapboxgl.FullscreenControl(), "top-right");

    // Gestionnaire de clic optimisé
    map.on('click', (e) => {
      cancelCurrentAnimation();
      
      if (markerRef.current) {
        markerRef.current.setLngLat(e.lngLat);
      }

      // Animation fluide sans rebond
      animationRef.current = requestAnimationFrame(() => {
        map.flyTo({
          center: [e.lngLat.lng, e.lngLat.lat],
          essential: true,
          duration: 1000,
          easing: (t) => t, // Animation linéaire
          offset: [0, 0], // Pas de décalage
        });
      });

      onClick?.(e.lngLat);
    });

    // Géolocalisation
    if (geolocateControl) {
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      });

      geolocate.on("geolocate", (e) => {
        const position = new mapboxgl.LngLat(e.coords.longitude, e.coords.latitude);
        onGeolocate?.(position);
      });

      map.addControl(geolocate, "bottom-right");
    }

    // Marqueur principal
    markerRef.current = new mapboxgl.Marker({ color: "#3FB1CE" })
      .setLngLat([center.lng, center.lat])
      .addTo(map);

    map.on('load', () => {
      setIsMapLoaded(true);
      
      // Animation initiale
      cancelCurrentAnimation();
      animationRef.current = requestAnimationFrame(() => {
        map.flyTo({
          center: [center.lng, center.lat],
          essential: true,
          duration: 1500,
          easing: (t) => t,
        });
      });

      // Gestion des routes
      if (route) {
        map.addSource('route-source', {
          type: "geojson",
          data: route,
        });

        map.addLayer({
          id: 'route-layer',
          type: "line",
          source: 'route-source',
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#FF5722",
            "line-width": 4,
          },
        });
      }
    });

    return () => {
      cancelCurrentAnimation();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center.lat, center.lng, zoom, geolocateControl, onGeolocate, onClick, route, cancelCurrentAnimation]);

  // Effet pour initialiser la carte
  useEffect(() => {
    const cleanup = initializeMap();
    return cleanup;
  }, [initializeMap]);

  // Mise à jour du centre
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !isMapLoaded) return;

    cancelCurrentAnimation();
    animationRef.current = requestAnimationFrame(() => {
      mapRef.current?.flyTo({
        center: [center.lng, center.lat],
        essential: true,
        duration: 1500,
        easing: (t) => t,
      });
      markerRef.current?.setLngLat([center.lng, center.lat]);
    });
  }, [center, isMapLoaded, cancelCurrentAnimation]);

  // Nettoyage
  useEffect(() => {
    return () => {
      cancelCurrentAnimation();
    };
  }, [cancelCurrentAnimation]);

  return (
    <div 
      ref={mapContainerRef} 
      className={`mapbox-container ${className}`}
      style={{ 
        ...style,
        opacity: isMapLoaded ? 1 : 0,
        transition: 'opacity 300ms ease',
      }}
    />
  );
});

Mapbox.displayName = 'Mapbox';