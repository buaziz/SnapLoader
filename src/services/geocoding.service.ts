import { Injectable, inject } from '@angular/core';
import { Memory } from '../models';
import { StateService } from './state.service';

export interface GeocodingUpdate {
  progress: number;
  memoryId: string;
  country: string;
}

// --- Interfaces for GeoJSON data structure ---
interface GeoJsonFeature {
    type: 'Feature';
    properties: { name: string; [key: string]: any };
    geometry: {
        type: 'Polygon' | 'MultiPolygon';
        coordinates: any[];
    };
}

interface GeoJson {
    type: 'FeatureCollection';
    features: GeoJsonFeature[];
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private stateService = inject(StateService);
  // This promise ensures the GeoJSON is fetched only once.
  private countryDataPromise: Promise<GeoJson> | null = null;
  private readonly COUNTRIES_URL = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';

  /**
   * Fetches and caches the country boundary data.
   */
  private loadCountryData(): Promise<GeoJson> {
    if (!this.countryDataPromise) {
      console.log('Fetching country boundary data...');
      this.countryDataPromise = fetch(this.COUNTRIES_URL)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load country boundary data: ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
            console.log('Country boundary data loaded successfully.');
            return data;
        });
    }
    return this.countryDataPromise;
  }

  /**
   * Main public method to geocode a list of memories using an offline algorithm.
   */
  async geocodeMemories(
    memories: readonly Memory[],
    onUpdate: (update: GeocodingUpdate) => void
  ): Promise<void> {
    const memoriesWithLocation = memories.filter(m => m.location.latitude !== 0 || m.location.longitude !== 0);
    const memoriesWithoutLocation = memories.filter(m => m.location.latitude === 0 && m.location.longitude === 0);

    let processedCount = 0;
    const total = memories.length;

    // Immediately update memories that have no location data.
    for (const memory of memoriesWithoutLocation) {
        processedCount++;
        onUpdate({
            progress: Math.round((processedCount / total) * 100),
            memoryId: memory.id,
            country: 'NO_LOCATION_DATA'
        });
    }

    if (memoriesWithLocation.length === 0) return;

    try {
        const countryGeoJson = await this.loadCountryData();

        for (const memory of memoriesWithLocation) {
            if (this.stateService.isCancelled()) {
                console.log("Geocoding process cancelled by user.");
                break;
            }

            const country = this.findCountryForCoordinates(
                memory.location.longitude,
                memory.location.latitude,
                countryGeoJson
            );

            processedCount++;
            onUpdate({
                progress: Math.round((processedCount / total) * 100),
                memoryId: memory.id,
                country: country || 'LOCATION_NOT_IDENTIFIED'
            });
        }
    } catch(error) {
        console.error("Geocoding failed:", error);
        // Mark remaining memories as errored if the data fetch fails
        for (const memory of memoriesWithLocation) {
            if (memory.country === 'PENDING_GEOCODING') {
                 processedCount++;
                 onUpdate({
                    progress: Math.round((processedCount / total) * 100),
                    memoryId: memory.id,
                    country: 'API_ERROR' // Re-using this status for data load failure
                });
            }
        }
    }
  }

  /**
   * Iterates through GeoJSON features to find which country contains the given coordinates.
   */
  private findCountryForCoordinates(lon: number, lat: number, geoJson: GeoJson): string | null {
    const point: [number, number] = [lon, lat];
    for (const feature of geoJson.features) {
        if (this.isPointInGeometry(point, feature.geometry)) {
            return feature.properties.name;
        }
    }
    return null;
  }
  
  /**
   * Checks if a point is within a GeoJSON geometry (Polygon or MultiPolygon).
   */
  private isPointInGeometry(point: [number, number], geometry: GeoJsonFeature['geometry']): boolean {
    switch (geometry.type) {
        case 'Polygon':
            return this.isPointInPolygon(point, geometry.coordinates);
        case 'MultiPolygon':
            // If the point is in any of the polygons, it's a match.
            for (const polygon of geometry.coordinates) {
                if (this.isPointInPolygon(point, polygon)) {
                    return true;
                }
            }
            return false;
        default:
            return false;
    }
  }
  
  /**
   * Implements the Ray-casting algorithm to check if a point is inside a polygon.
   * This handles polygons with holes, as per the GeoJSON specification.
   */
  private isPointInPolygon(point: [number, number], polygon: number[][][]): boolean {
    let isInside = false;
    const [x, y] = point;

    // A polygon is an array of rings. The first is the exterior, the rest are holes.
    for (let ringIndex = 0; ringIndex < polygon.length; ringIndex++) {
      const ring = polygon[ringIndex];
      let ringInside = false;

      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];

        const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) {
          ringInside = !ringInside;
        }
      }

      if (ringInside) {
        if (ringIndex === 0) {
          // Point is in the exterior ring
          isInside = true;
        } else {
          // Point is in a hole, so it's not inside the polygon
          return false;
        }
      }
    }
    return isInside;
  }
}
