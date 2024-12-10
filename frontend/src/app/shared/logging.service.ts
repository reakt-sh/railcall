import { Injectable } from "@angular/core";
import log, { Logger } from "loglevel";
import { environment } from "../../environments/environment";

@Injectable({
    providedIn: "root"
})
export class LoggingService {

    constructor() {
        if (environment.debug) {
            log.setLevel("TRACE");
        } else {
            log.setLevel("ERROR");
        }
    }

    public getLogger(name: string): Logger {
        return log.getLogger(name);
    }
}
