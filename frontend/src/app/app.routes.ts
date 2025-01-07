import { Routes } from "@angular/router";
import { HomeComponent } from "./home/home.component";
import { StartComponent } from './start/start.component';
import { DestinationComponent } from './destination/destination.component';
import { WaitingComponent } from './waiting/waiting.component';
import { DrivingComponent } from './driving/driving.component';

export const routes: Routes = [
    // Home
    {
        path: "home",
        component: HomeComponent,
    },
    {
        path: '',
        component: StartComponent,
        title: 'Start',
      },
      {
        path: 'destination',
        component: DestinationComponent,
        title: 'Destination',
      },
      {
        path: 'waitForTrain',
        component: WaitingComponent,
        title: 'waitForTrain',
      },
      {
        path: 'driving',
        component: DrivingComponent,
        title: 'Driving',
      },
    // Catch all
    {
        path: "**",
        redirectTo: "/home",
    }
];
