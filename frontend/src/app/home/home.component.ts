import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { DataService } from "../shared/data.service";
import { LoggingService } from "../shared/logging.service";
import { MyMaterialModule } from "../shared/my-material.module";
import { Logger } from "loglevel";

@Component({
    selector: "app-home",
    imports: [MyMaterialModule],
    templateUrl: "./home.component.html",
    styleUrl: "./home.component.scss"
})
export class HomeComponent implements OnInit, OnDestroy {

    private readonly logger: Logger;
    private subscription?: Subscription

    protected loaded = false
    protected text = ""

    constructor(
        private readonly data: DataService,
        readonly logging: LoggingService,
    ) {
        this.logger = logging.getLogger("home:component");
    }

    ngOnInit(): void {
        this.data.latestRailline$.subscribe({
            next: (line) => {
                if (line) {
                    this.loaded = true;
                    this.text = JSON.stringify(line);
                    this.logger.log("Data loaded.")
                }
            }
        })
    }

    ngOnDestroy(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

}
