import { Component, inject} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import { Router } from '@angular/router'; 
import { Station } from '../shared/interfaces/station';
import { ApiService } from '../shared/api.service';
import { MyMaterialModule } from "../shared/my-material.module";
import { Geolocation } from '@capacitor/geolocation';
import { Location as CustomLocation } from '../../../schema-gen/location';
//import { Location as CustomLocation } from '../shared//interfaces/location';

@Component({
  selector: 'app-start',
  standalone: true,
  imports: [ReactiveFormsModule, MyMaterialModule],
  templateUrl: './start.component.html',
  styleUrl: './start.component.scss'
})
export class StartComponent {
  stationList: Station[] = [];
  apiService: ApiService = inject(ApiService);

  lat = 0
  lon = 0

  constructor(private router: Router) {
    this.apiService.getJobId().then((job_id) => {
      console.log("Currently stored Job ID: ",job_id)
        if(job_id != 0) {
          this.apiService.getJobUpdate(job_id).then(() => {
          console.log(this.apiService.getJob())
          if(this.apiService.getJob().picked_up) {
            this.router.navigate(['/driving']);
          } else {
            router.navigate(['/waitForTrain']);
          }
        })
      }
    })
    this.apiService.getStations().then((stationList: Station[]) => {
      this.stationList = stationList;
    })
    //this.printCurrentPosition();
  }

  startLocation = new FormGroup({
    start: new FormControl(""),
  });

  gpsForm = new FormGroup({
    
  })

  selectStart() {
    const start = this.startLocation.value.start?.toLowerCase()
    const start_obj = this.stationList.find((Station) => Station.name.toLowerCase() === start)
    if (start_obj != undefined) {
      let nearestLocation = this.apiService.nearestLocation(start_obj.coordinates)
      
      nearestLocation.then((location) => {
        console.log("start location on track: ", location)
        this.apiService.setStart(location)
        this.router.navigate(['/destination'])
      }).catch((error) => {
        console.log("Error: ", error)
      })
    } else if (this.lat != 0 && this.lon != 0) {
      let start_location: CustomLocation = {
        lat: this.lat,
        lon: this.lon
      }
      let nearestLocation = this.apiService.nearestLocation(start_location)

      nearestLocation.then((location) => {
        console.log("start location on track: ", location)
        this.apiService.setStart(location)
        this.router.navigate(['/destination'])
      }).catch((error) => {
        console.log("Error: ", error)
      })
    }

  }

  printCurrentPosition = async () => {
    const options: PositionOptions = {enableHighAccuracy:true}
    const coordinates = await Geolocation.getCurrentPosition(options);
    this.lat = coordinates.coords.latitude
    this.lon = coordinates.coords.longitude

    console.log('Current position:', coordinates);
  };
}
