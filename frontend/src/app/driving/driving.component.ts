import { Component, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; 
import { Station } from '../shared/interfaces/station';
import { ApiService } from '../shared/api.service';
import { MyMaterialModule } from "../shared/my-material.module";
import { FormGroup, ReactiveFormsModule} from '@angular/forms';
import { Geolocation } from '@capacitor/geolocation';
import { Location as CustomLocation } from '../../../schema-gen/location';
import { MapComponent } from "../map/map.component";
import { MapLogicService } from "../map/logic/map-logic.service";
import { Marker } from "maplibre-gl";
import { FormatTimePipe } from '../format-time.pipe'

@Component({
  selector: 'app-driving',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MyMaterialModule, MapComponent, FormatTimePipe],
  templateUrl: './driving.component.html',
  styleUrl: './driving.component.scss'
})
export class DrivingComponent {
  stationList: Station[] = [];
  apiService: ApiService = inject(ApiService);
  mapLogic: MapLogicService = inject(MapLogicService)
  time_to_drive = -1
  minutes = 0
  seconds = 0
  private timerId: any;

  destLocMark: Marker = new Marker()
  trainMarker: Marker = new Marker()


  constructor(private router: Router) {
    const destMarkerElement = document.createElement('div');
    destMarkerElement.style.width = '50px';
    destMarkerElement.style.height = '50px';
    destMarkerElement.style.backgroundImage = 'url(assets/map/flag_marker.png)';
    destMarkerElement.style.backgroundSize = 'cover';
    this.destLocMark = new Marker({element:destMarkerElement, anchor: 'bottom'})

    const trainMarkerElement = document.createElement('div');
    trainMarkerElement.style.width = '50px';
    trainMarkerElement.style.height = '50px';
    trainMarkerElement.style.backgroundImage = 'url(assets/map/train_marker.png)';
    trainMarkerElement.style.backgroundSize = 'cover';
    this.trainMarker = new Marker({element:trainMarkerElement})

    const job_id = this.apiService.getJobId().then((jobId) => {
      if (jobId != 0) {
        this.apiService.getJobUpdate(jobId).then(() => {
          this.stationList = this.apiService.getAllStations();
          this.time_to_drive = this.apiService.getTimeToDrive()
  
          const waitForMapInitialization = async (): Promise<void> => {
            while (!this.mapLogic.mapInitialized()) {
              await new Promise(resolve => setTimeout(resolve, 100)); // Warte 100ms
            }
            this.mapLogic.removeMarker()
            let destLoc = this.apiService.getDestination()
            this.destLocMark = this.mapLogic.setMarker(destLoc, this.destLocMark) ?? this.destLocMark
            this.apiService.getTrainLoc().then((train_loc) => {
              this.trainMarker = this.mapLogic.setMarker(train_loc, this.trainMarker) ?? this.trainMarker
              this.mapLogic.setMapCenter(train_loc)
            })
            
          }
          
          waitForMapInitialization()
  
          this.startTimer()
        })
      } else {
        router.navigate(['']);
      }
      
    })
  }

  startTimer() {
    if (this.timerId) {
      clearInterval(this.timerId); // Vorherigen Timer stoppen
    }

    //this.time_to_wait = 10;
    this.timerId = setInterval(() => {
      if (this.time_to_drive >= 0) {
        this.time_to_drive--;
        this.minutes = Math.floor(this.time_to_drive / 60)
        this.seconds = this.time_to_drive % 60 
        this.apiService.getTrainLoc().then((train_loc) => {
          this.mapLogic.moveMarker(this.trainMarker, train_loc)
        })
        if (this.time_to_drive > 30) {
          this.update()
        } else {
          this.apiService.getTrainLoc().then((train_loc) => {
            this.mapLogic.moveMarker(this.trainMarker, train_loc)
          })
        }
        // TODO Move marker to updated Position
      } else {
        clearInterval(this.timerId); // Timer stoppen
      }
    }, 1000);
  }

  restart() {
    this.apiService.removeJobId().then(() => {
      this.router.navigate([''])
    })
    
  }
  update() {
    const job_id = this.apiService.getJobId().then((jobId) => {
      this.apiService.getJobUpdate(jobId).then(() => {
        this.apiService.getTrainLoc().then((train_loc) => {
          this.mapLogic.moveMarker(this.trainMarker, train_loc)
        })
        this.time_to_drive = this.apiService.getTimeToDrive()
        this.startTimer()
      })
    })
  }
}
