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
  selector: 'app-waiting',
  standalone: true,
  imports: [CommonModule,ReactiveFormsModule,MyMaterialModule, MapComponent, FormatTimePipe],
  templateUrl: './waiting.component.html',
  styleUrl: './waiting.component.scss'
})
export class WaitingComponent {
  stationList: Station[] = [];
  apiService: ApiService = inject(ApiService);
  mapLogic: MapLogicService = inject(MapLogicService)
  time_to_wait = -1
  minutes = 0
  seconds = 0
  worked_on = false
  private timerId: any;

  startLocMark: Marker = new Marker()
  userLocMark: Marker
  trainMarker: Marker = new Marker()


  constructor(private router: Router) {
    const startMarkerElement = document.createElement('div');
    startMarkerElement.style.width = '50px';
    startMarkerElement.style.height = '50px';
    startMarkerElement.style.backgroundImage = 'url(assets/map/flag_marker.png)';
    startMarkerElement.style.backgroundSize = 'cover';
    this.startLocMark = new Marker({element:startMarkerElement, anchor: 'bottom'})

    const userMarkerElement = document.createElement('div');
    userMarkerElement.style.width = '50px';
    userMarkerElement.style.height = '50px';
    userMarkerElement.style.backgroundImage = 'url(assets/map/person_marker.png)';
    userMarkerElement.style.backgroundSize = 'cover';
    this.userLocMark = new Marker({element:userMarkerElement})

    const trainMarkerElement = document.createElement('div');
    trainMarkerElement.style.width = '50px';
    trainMarkerElement.style.height = '50px';
    trainMarkerElement.style.backgroundImage = 'url(assets/map/train_marker.png)';
    trainMarkerElement.style.backgroundSize = 'cover';
    this.trainMarker = new Marker({element:trainMarkerElement})
    this.apiService.getJobId().then((jobID) => {
      if (jobID != 0) {
        this.apiService.getJobUpdate(jobID).then(() => {
          this.stationList = this.apiService.getAllStations();
          this.time_to_wait = this.apiService.getTimeToWait();
          this.worked_on = this.apiService.get_worked_on();
  
          const waitForMapInitialization = async (): Promise<void> => {
            while (!this.mapLogic.mapInitialized()) {
              await new Promise(resolve => setTimeout(resolve, 100)); // Warte 100ms
            }
            const options: PositionOptions = {enableHighAccuracy:true}
            Geolocation.getCurrentPosition(options).then((coordinates) => {
              let user_location: CustomLocation = {
                lat: coordinates.coords.latitude,
                lon: coordinates.coords.longitude
              }     
              this.userLocMark = this.mapLogic.setMarker(user_location, this.userLocMark) ?? this.userLocMark
            })
            let startLoc = this.apiService.getStart()
            this.startLocMark = this.mapLogic.setMarker(startLoc, this.startLocMark) ?? this.startLocMark
            this.apiService.getTrainLoc().then((train_loc) => {
              this.trainMarker = this.mapLogic.setMarker(train_loc, this.trainMarker) ?? this.trainMarker
            })
          }
          
          waitForMapInitialization()
  
          if(this.worked_on){
          
            this.startTimer()
            }
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
      if (this.time_to_wait >= 0) {
        this.time_to_wait--;
        this.minutes = Math.floor(this.time_to_wait / 60)
        this.seconds = this.time_to_wait % 60 
        // Emulator time war asynchron und konnte sie nicht auf die sekunde genau einstellen
        if (this.time_to_wait > 30) {
          this.update()
        } else {
          this.apiService.getTrainLoc().then((train_loc) => {
            this.mapLogic.moveMarker(this.trainMarker, train_loc)
          })
          const options: PositionOptions = {enableHighAccuracy:true}
            Geolocation.getCurrentPosition(options).then((coordinates) => {
              let user_location: CustomLocation = {
                lat: coordinates.coords.latitude,
                lon: coordinates.coords.longitude
              }     
              this.userLocMark = this.mapLogic.setMarker(user_location, this.userLocMark) ?? this.userLocMark
            })
        }
        // TODO Move marker to updated Position
      } else {
        clearInterval(this.timerId); // Timer stoppen
        //this.router.navigate(['/driving']);
      }
    }, 1000);
  }


  get_in() {
    this.apiService.getIn().then(() => {
      this.router.navigate(['/driving']);
    })
  }

  update() {
    const job_id = this.apiService.getJobId().then((jobId) => {
      this.apiService.getJobUpdate(jobId).then(() => {
        this.apiService.getTrainLoc().then((train_loc) => {
          this.mapLogic.moveMarker(this.trainMarker, train_loc)
        })
        this.time_to_wait = this.apiService.getTimeToWait()
        this.worked_on = this.apiService.get_worked_on()
        const options: PositionOptions = {enableHighAccuracy:true}
        Geolocation.getCurrentPosition(options).then((coordinates) => {
          let user_location: CustomLocation = {
            lat: coordinates.coords.latitude,
            lon: coordinates.coords.longitude
          }     
          this.userLocMark = this.mapLogic.setMarker(user_location, this.userLocMark) ?? this.userLocMark
        })
        if(this.worked_on){ 
          this.startTimer()
        }
      })
    })
    
  }
}
