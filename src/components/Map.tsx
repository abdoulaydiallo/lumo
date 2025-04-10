'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Loader2, ZoomIn, ZoomOut, LocateFixed, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

// Configuration Mapbox
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface Location {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
}

interface MapProps {
  center?: Location;
  origin?: Location;
  destination?: Location;
  waypoints?: Location[];
  zoom?: number;
  className?: string;
  interactive?: boolean;
  showRoute?: boolean;
  onOrderCreate?: () => void;
  onOrderCancel?: () => void;
  onLocationSelect?: (location: Location) => void;
}

export const Map = ({
  center = { lat: 9.6412, lng: -13.5784, label: 'Conakry' },
  origin,
  destination,
  waypoints = [],
  zoom = 14,
  className,
  interactive = true,
  showRoute = true,
  onOrderCreate,
  onOrderCancel,
  onLocationSelect,
}: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const routeLayerId = 'route';

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };

  const slideUp = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.3 } }
  };

  const scaleIn = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { duration: 0.3 } }
  };

  // Safe layer removal
  const safeRemoveLayer = useCallback((map: mapboxgl.Map, layerId: string) => {
    try {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(layerId)) {
        map.removeSource(layerId);
      }
    } catch (error) {
      console.warn(`Error removing layer ${layerId}:`, error);
    }
  }, []);

  // Gestion des marqueurs avec animation
  const createMarker = useCallback((location: Location, map: mapboxgl.Map) => {
    const markerElement = document.createElement('div');
    markerElement.className = 'custom-marker';
    markerElement.innerHTML = `
      <div class="relative">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${location.color || '#3b82f6'}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        ${location.label ? `<div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded-md shadow-md text-xs font-medium whitespace-nowrap">${location.label}</div>` : ''}
      </div>
    `;

    const marker = new mapboxgl.Marker({
      element: markerElement,
      anchor: 'bottom'
    })
      .setLngLat([location.lng, location.lat])
      .addTo(map);

    // Animation d'apparition
    markerElement.style.opacity = '0';
    setTimeout(() => {
      markerElement.style.transition = 'opacity 0.3s ease-out';
      markerElement.style.opacity = '1';
    }, 100);

    if (onLocationSelect) {
      marker.getElement().addEventListener('click', () => {
        onLocationSelect(location);
      });
    }

    return marker;
  }, [onLocationSelect]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => {
      const element = marker.getElement();
      if (element) {
        element.style.transition = 'opacity 0.2s ease-out';
        element.style.opacity = '0';
        setTimeout(() => marker.remove(), 200);
      }
    });
    markersRef.current = [];
  }, []);

  // Gestion de l'itinéraire avec animation
  const clearRoute = useCallback((map: mapboxgl.Map) => {
    if (!map || !isMapLoaded) return;
    safeRemoveLayer(map, routeLayerId);
  }, [isMapLoaded, safeRemoveLayer]);

  const drawRoute = useCallback(
    async (map: mapboxgl.Map, origin: Location, destination: Location, waypoints: Location[] = []) => {
      if (!showRoute || !map || !isMapLoaded) return;

      try {
        const coordinates = [
          [origin.lng, origin.lat],
          ...waypoints.map(wp => [wp.lng, wp.lat]),
          [destination.lng, destination.lat]
        ].join(';');

        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=${mapboxgl.accessToken}`
        );
        const data = await response.json();

        clearRoute(map);

        map.addLayer({
          id: routeLayerId,
          type: 'line',
          source: {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: data.routes[0].geometry,
            },
          },
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#6366f1',
            'line-width': 4,
            'line-opacity': 0
          },
        });

        // Animation de l'itinéraire
        setTimeout(() => {
          if (map.getLayer(routeLayerId)) {
            map.setPaintProperty(routeLayerId, 'line-opacity', 0.6);
          }
        }, 100);
      } catch (err) {
        console.error('Failed to draw route:', err);
      }
    },
    [showRoute, clearRoute, isMapLoaded]
  );

  // Initialisation de la carte
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initializeMap = () => {
      try {
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [center.lng, center.lat],
          zoom,
          interactive,
        });

        mapInstance.on('load', () => {
          setIsMapLoaded(true);
          setLoading(false);
        });

        mapInstance.on('click', (e) => {
          if (onLocationSelect) {
            onLocationSelect({
              lat: e.lngLat.lat,
              lng: e.lngLat.lng,
            });
          }
        });

        mapInstance.on('zoom', () => {
          setCurrentZoom(mapInstance.getZoom());
        });

        mapRef.current = mapInstance;

        return () => {
          clearMarkers();
          if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
          }
          setIsMapLoaded(false);
        };
      } catch (err) {
        setError('Erreur de chargement de la carte');
        setLoading(false);
        console.error('Map initialization error:', err);
      }
    };

    initializeMap();

    return () => {
      clearMarkers();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setIsMapLoaded(false);
    };
  }, []);

  // Mise à jour de la carte avec animation
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    mapRef.current.flyTo({
      center: [center.lng, center.lat],
      zoom,
      speed: 0.8,
      curve: 1
    });
  }, [center, zoom, isMapLoaded]);

  // Mise à jour des marqueurs et itinéraires
  useEffect(() => {
    if (!mapRef.current || loading || !isMapLoaded) return;

    const updateMap = async () => {
      updateMarkers(mapRef.current!);
      if (origin && destination) {
        await drawRoute(mapRef.current!, origin, destination, waypoints);
      } else {
        clearRoute(mapRef.current!);
      }
    };

    updateMap();
  }, [origin, destination, waypoints, loading, isMapLoaded]);

  // Update markers function
  const updateMarkers = useCallback(
    (map: mapboxgl.Map) => {
      clearMarkers();

      if (origin) {
        const originMarker = createMarker(
          { ...origin, color: '#3b82f6', label: origin.label || 'Point de départ' },
          map
        );
        markersRef.current.push(originMarker);
      }

      waypoints.forEach((waypoint, index) => {
        const wpMarker = createMarker(
          { ...waypoint, color: '#f59e0b', label: waypoint.label || `Étape ${index + 1}` },
          map
        );
        markersRef.current.push(wpMarker);
      });

      if (destination) {
        const destMarker = createMarker(
          { ...destination, color: '#10b981', label: destination.label || 'Destination' },
          map
        );
        markersRef.current.push(destMarker);
      }
    },
    [origin, destination, waypoints, createMarker, clearMarkers]
  );

  // Commandes de la carte avec animations
  const zoomIn = () => {
    mapRef.current?.zoomIn({ duration: 300 });
  };

  const zoomOut = () => {
    mapRef.current?.zoomOut({ duration: 300 });
  };

  const resetView = () => {
    mapRef.current?.flyTo({
      center: [center.lng, center.lat],
      zoom,
      duration: 800,
      essential: true
    });
  };

  const locateUser = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        mapRef.current?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 15,
          duration: 1000,
          essential: true
        });
      },
      (error) => console.error('Error getting location:', error)
    );
  };

  if (error) {
    return (
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className={cn('flex items-center justify-center bg-muted text-destructive', className)}
      >
        <AlertCircle className="mr-2 h-4 w-4" />
        {error}
      </motion.div>
    );
  }

  return (
    <div className={cn('relative h-72 w-full', className)}>
      <AnimatePresence>
        {loading && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={fadeIn}
            className="absolute inset-0 z-10 flex items-center justify-center"
          >
            <Skeleton className="absolute inset-0" />
            <Loader2 className="h-8 w-8 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
      
      <div
        ref={mapContainer}
        className="h-full w-full rounded-lg"
        style={{ visibility: loading ? 'hidden' : 'visible' }}
      />

      {/* Commandes de navigation avec animations */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={slideUp}
        className="absolute right-4 top-4 z-20 flex flex-col space-y-2"
      >
        <motion.div variants={scaleIn}>
          <Button variant="outline" size="icon" onClick={zoomIn} title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </motion.div>
        <motion.div variants={scaleIn}>
          <Button variant="outline" size="icon" onClick={zoomOut} title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
        </motion.div>
        <motion.div variants={scaleIn}>
          <Button variant="outline" size="icon" onClick={resetView} title="Reset view">
            <Compass className="h-4 w-4" />
          </Button>
        </motion.div>
        <motion.div variants={scaleIn}>
          <Button variant="outline" size="icon" onClick={locateUser} title="Locate me">
            <LocateFixed className="h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>

      {/* Boutons de commande avec animations */}
      <AnimatePresence>
        {(onOrderCreate || onOrderCancel) && (
          <motion.div 
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={slideUp}
            className="absolute bottom-4 left-0 right-0 z-20 flex justify-center space-x-4"
          >
            {onOrderCreate && (
              <motion.div variants={scaleIn}>
                <Button 
                  onClick={onOrderCreate}
                  className="bg-green-600 hover:bg-green-700 shadow-lg"
                  size="lg"
                >
                  Confirmer la livraison
                </Button>
              </motion.div>
            )}
            {onOrderCancel && (
              <motion.div variants={scaleIn}>
                <Button 
                  onClick={onOrderCancel}
                  variant="destructive"
                  className="shadow-lg"
                  size="lg"
                >
                  Annuler la commande
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Style des marqueurs */}
      <style jsx global>{`
        .custom-marker {
          cursor: pointer;
          transform: translate(-50%, -100%);
          transition: transform 0.2s ease-out;
        }
        .custom-marker:hover {
          transform: translate(-50%, -100%) scale(1.1);
        }
        .mapboxgl-popup-content {
          padding: 12px;
          border-radius: 8px;
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};