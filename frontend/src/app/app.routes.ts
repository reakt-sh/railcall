import { Routes } from "@angular/router";
import { HomeComponent } from "./home/home.component";

export const routes: Routes = [
    // Home
    {
        path: "home",
        component: HomeComponent,
    },
    // Catch all
    {
        path: "",
        redirectTo: "/home",
        pathMatch: "full"
    },
    {
        path: "**",
        redirectTo: "/home",
    }
];
