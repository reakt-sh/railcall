import { Injectable } from "@angular/core";
import * as turfHelpers from "@turf/helpers";
import * as turfMeta from "@turf/meta";
import { Logger } from "loglevel";
import { Map, Marker } from "maplibre-gl";
//import { MapPosition } from "../../../../schema-gen/map_position";
import { RailLine } from "../../../../schema-gen/railline";
import { LoggingService } from "../../shared/logging.service";
//import { VehiclesService } from "../../shared/vehicles.service";
import { RailLineService } from "./rail-line.service";
import { Location as CustomLocation } from '../../../../schema-gen/location';

@Injectable({
    providedIn: "root"
})
export class MapLogicService {
    private readonly logger: Logger;
    //private readonly vehiclePositions: Record<number, MapPosition> = {};

    private map?: Map | null;
    private markerList: Marker[] = []

    constructor(
        private readonly railline: RailLineService,
        //vehiclesUpdates: VehiclesService,
        logging: LoggingService,
    ) {
        this.logger = logging.getLogger("map:logic");

        railline.getRailLine().subscribe({
            next: () => {
                // Subscribe to vehicle positions
                /**  
                vehiclesUpdates.createMapUpdateSubscription().subscribe({
                    next: (pos: MapPosition) => {
                        this.updateVehiclePosition(pos);
                    }
                });
                */
                // Delayed start when rail line is only ready after start
                if (this.map) {
                    this.start(this.map);
                }
            }
        });
    }

    public start(map: Map) {
        this.map = map;

        // Check if rail line is loaded
        if (this.railline.railLine) {
            this.initLine(this.railline.railLine, map);
            this.initVehicles(map);
            //this.refreshVehiclePositions();
        }
        
    }

    public stop() {
        this.map = null;
    }

    mapInitialized(): boolean {
        if(this.map != null) {
            return true;
        }
        else {
            return false;
        }
    }

    setMarker(loc: CustomLocation, marker: Marker): Marker | null {
        if (this.map != null){ 
            marker
                .setLngLat([loc.lon, loc.lat])
                .addTo(this.map);
            this.markerList.push(marker)
            return marker
        }
        return null
    }

    setDraggableMarker(loc: CustomLocation, marker: Marker): Marker | null {
        if (this.map != null){ 
            marker.setLngLat([loc.lon, loc.lat])
                .addTo(this.map);
            this.markerList.push(marker)
            return marker
        }
        return null
    }

    moveMarker(marker: Marker, loc: CustomLocation) {
        marker.setLngLat([loc.lon, loc.lat])
    }

    removeMarker() {
        for(const marker of this.markerList) {
            marker.remove()
        }
    }

    getMarkerLocation(marker: Marker): CustomLocation {
        let lngLat = marker.getLngLat();
        let marker_location: CustomLocation = {
            lat: lngLat.lat,
            lon: lngLat.lng
          }
        return marker_location
    }

    getMapCenter(): CustomLocation | null{
        if (this.map != null) {
            let mapCenter = this.map.getCenter()
            let mapCenterLoc: CustomLocation = {
                lat: mapCenter.lat,
                lon: mapCenter.lng
            }
            return mapCenterLoc
        }
        return null
    }

    setMapCenter(loc: CustomLocation) {
        if (this.map != null) {
            this.map.setCenter({ lat: loc.lat, lng: loc.lon });
        }
    }

    private initLine(line: RailLine, map: Map) {
        for (const track of line.tracks) {
            const trackData = track.data as unknown as GeoJSON.FeatureCollection<GeoJSON.Point>
            const lineStringData: GeoJSON.Feature<GeoJSON.LineString> = turfHelpers.lineString(turfMeta.coordAll(trackData))

            map.addSource(track.id, {
                "type": "geojson",
                "data": lineStringData
            });

            map.addLayer({
                "id": track.id,
                "type": "line",
                "source": track.id,
                "layout": {
                    "line-join": "round",
                    "line-cap": "round"
                },
                "paint": {
                    "line-color": "#a03472",
                    "line-width": 6
                }
            });
        }
    }

    private initVehicles(map: Map) {
        map.addSource("vehicles", {
            "type": "geojson",
            "data": {
                "type": "FeatureCollection",
                "features": []
            }
        });

        map.addLayer({
            "id": "vehicles",
            "type": "symbol",
            "source": "vehicles",
            "layout": {
                "text-field": ["get", "description"],
                "text-justify": "center",
                "text-allow-overlap": true,
                "icon-image": ["get", "icon"],
                "icon-size": 0.5,
                "icon-allow-overlap": true
            }
        });
    }
    /**
    private updateVehiclePosition(pos: MapPosition) {
        this.vehiclePositions[pos.vehicle] = pos;
        this.refreshVehiclePositions();
    }
    */

    /**
    refreshVehiclePositions() {
        if (this.map) {
            const data = {
                "type": "FeatureCollection",
                "features": Object.entries(this.vehiclePositions).filter(
                    ([_, pos]) =>
                        (pos.vehicle > 0 || this.auth.isLoggedInAsAdmin()) &&
                        (!pos.offtrack || this.auth.isLoggedInAsOperator())
                ).map(([_, pos]) => {
                    return {
                        "type": "Feature",
                        "properties": {
                            "description": pos.label,
                            "icon": "railvehicle"
                        },
                        "geometry": {
                            "type": "Point",
                            "coordinates": [pos.longitude, pos.latitude]
                        }
                    }
                })
            };
            this.logger.debug("New vehicle layer", data);
            (this.map.getSource("vehicles") as any).setData(data);
        }
    }
    */
}
