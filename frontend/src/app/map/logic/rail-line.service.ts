import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, filter } from "rxjs";
import { RailLine } from "../../../../schema-gen/railline";
import { environment } from "../../../environments/environment";
import { LoggingService } from "../../shared/logging.service";
import { Logger } from "loglevel";

@Injectable({
    providedIn: "root"
})
export class RailLineService {

    private readonly logger: Logger;
    private readonly railLineSubject = new BehaviorSubject<RailLine | undefined>(undefined);

    constructor(
        private httpClient: HttpClient,
        logging: LoggingService,
    ) {
        this.logger = logging.getLogger("railline:service");
        this.httpClient.get<RailLine>(`/assets/raillines/malente-luetjenburg.json`).subscribe({
            next: (railline: RailLine) => {
                // Maybe validate?
                if (railline) {
                    this.railLineSubject.next(railline);
                }
            },
            error: (err) => this.logger.log(`Error loading rail line 'malente-luetjenburg'`, err)
            
        })
    }

    public getRailLine(): Observable<RailLine> {
        return this.railLineSubject.pipe(filter((line): line is RailLine => !!line));
    }

    public get railLine(): RailLine | undefined {
        return this.railLineSubject.value;
    }
}
