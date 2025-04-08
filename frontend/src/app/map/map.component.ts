import { HttpClient } from "@angular/common/http";
import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MapComponent as LibreMapComponent } from "@maplibre/ngx-maplibre-gl";
import { Logger } from "loglevel";
import { Map, StyleSpecification } from "maplibre-gl";
import { RailLine } from "../../../schema-gen/railline";
import { LoggingService } from "../shared/logging.service";
import { MapIconsService } from "./logic/map-icons.service";
import { MapLogicService } from "./logic/map-logic.service";
import { RailLineService } from "./logic/rail-line.service";
import { Geolocation } from '@capacitor/geolocation';

@Component({
    selector: "app-map",
    standalone: true,
    imports: [LibreMapComponent],
    templateUrl: "./map.component.html",
    styleUrl: "./map.component.scss"
})
export class MapComponent implements OnInit, OnDestroy {

    @ViewChild("map", { static: true })
    private mapComp!: LibreMapComponent;

    // The underlying map instance
    private map?: Map;

    private readonly logger: Logger;

    readonly mapStyle: StyleSpecification = {
        "version": 8,
        "sources": {
            "osm": {
                "type": "raster",
                "tiles": ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
                "tileSize": 256,
                "attribution": "&copy; OpenStreetMap Contributors",
                "maxzoom": 20
            }
        },
        "glyphs": "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf", // FIXME
        "layers": [
            {
                "id": "osm",
                "type": "raster",
                "source": "osm" // This must match the source key above
            }
        ]
    };

    constructor(
        private readonly railLine: RailLineService,
        private readonly mapLogic: MapLogicService,
        private readonly mapIcons: MapIconsService,
        private readonly httpClient: HttpClient,
        logging: LoggingService,
    ) {
        this.logger = logging.getLogger("map:component");
    }

    ngOnInit() {
        this.mapComp.mapLoad.subscribe((m) => this.initMap(m));
    }

    ngOnDestroy(): void {
        this.mapLogic.stop();
    }

    private initMap = async (map: Map) => {
        this.map = map

        this.mapIcons.init(map);

        const options: PositionOptions = {enableHighAccuracy:true}
        const coordinates = await Geolocation.getCurrentPosition(options);

        this.railLine.getRailLine().subscribe({
            next: (line: RailLine) => {
                
                // Configure
                const conf = line.map.startConfiguration;
                if (conf) {
                    map.setCenter({ lat: coordinates.coords.latitude, lng: coordinates.coords.longitude });
                    map.setZoom(conf.zoom ?? 15);
                }
                map.dragRotate.disable();
                map.keyboard.disable();
                map.touchZoomRotate.disableRotation();

                // Start to populate map
                this.mapLogic.start(map);
            }
        });
    }
}
