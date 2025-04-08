import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Logger } from "loglevel";
import { Map } from "maplibre-gl";
import { LoggingService } from "../../shared/logging.service";
import { environment } from "../../../environments/environment";

@Injectable({
    providedIn: "root"
})
export class MapIconsService {

    private readonly logger: Logger;
    private readonly prefix: string;
    private readonly icons: Record<string, HTMLImageElement | ImageBitmap> = {};
    private cached = false;

    constructor(
        logging: LoggingService,
    ) {
        this.logger = logging.getLogger("map-icon:service");
        this.prefix = `/assets/map/`;
    }

    init(map: Map) {
        if (this.cached) {
            for (const iconID in this.icons) {
                if (Object.prototype.hasOwnProperty.call(this.icons, iconID)) {
                    const data = this.icons[iconID];
                    map.addImage(iconID, data);
                }
            }
            this.logger.debug("Adding map icons");
        } else {
            this.logger.debug("Loading map icons");
            Promise.allSettled([
                map.loadImage(this.prefix + "vehicle_marker_neutral.png").then((img) => this.icons["railvehicle"] = img.data),
            ]).then(_ => {
                this.cached = true;
                this.init(map);
            }, err => {
                this.logger.error("Error loading icons", err);
            });
        }
    }
}
