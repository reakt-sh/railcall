import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Logger } from "loglevel";
import { BehaviorSubject } from "rxjs";
import { RailLine } from "../../../schema-gen/railline";
import { LoggingService } from "./logging.service";

@Injectable({
    providedIn: "root"
})
export class DataService {

    private readonly logger: Logger;

    private readonly latestRailline = new BehaviorSubject<RailLine | undefined>(undefined);
    public readonly latestRailline$ = this.latestRailline.asObservable();

    constructor(
        private readonly http: HttpClient,
        readonly logging: LoggingService,
    ) {
        this.logger = logging.getLogger("data:service");

        this.http.get<RailLine>("/assets/data/malente-luetjenburg.json").subscribe({
            next: line => {
                this.latestRailline.next(line);
            },
            error: (err) => this.logger.log("Error loading rail line.", err)
        });
    }

}
