import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { MyMaterialModule } from "./shared/my-material.module";

@Component({
    selector: "app-root",
    imports: [
        RouterOutlet,
        MyMaterialModule,
    ],
    templateUrl: "./app.component.html",
    styleUrl: "./app.component.scss"
})
export class AppComponent {


}
