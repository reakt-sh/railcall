import { Component, inject} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import { Router } from '@angular/router'; 
import { Station } from '../shared/interfaces/station';
import { ApiService } from '../shared/api.service';
import { MyMaterialModule } from "../shared/my-material.module";
import { Geolocation } from '@capacitor/geolocation';
import { Location as CustomLocation } from '../../../schema-gen/location';
import { MapComponent } from "../map/map.component";
import { MapLogicService } from "../map/logic/map-logic.service";
import { Marker } from "maplibre-gl";


@Component({
  selector: 'app-start',
  standalone: true,
  imports: [ReactiveFormsModule, MyMaterialModule, MapComponent],
  templateUrl: './start.component.html',
  styleUrl: './start.component.scss'
})
export class StartComponent {
  stationList: Station[] = [];
  apiService: ApiService = inject(ApiService);
  mapLogic: MapLogicService = inject(MapLogicService);

  userLocMarker: Marker;

  lat = 0
  lon = 0

  options: String[] = [];
  selectedOption: string | undefined;

  constructor(private router: Router) {
    this.mapLogic.removeMarker()
    const userMarkerElement = document.createElement('div');
    userMarkerElement.style.width = '50px';
    userMarkerElement.style.height = '50px';
    userMarkerElement.style.backgroundImage = 'url(assets/map/person_marker.png)';
    userMarkerElement.style.backgroundSize = 'cover';
    this.userLocMarker = new Marker({element:userMarkerElement})

    this.apiService.getJobId().then((job_id) => {
      console.log("Currently stored Job ID: ",job_id)
        if(job_id != 0) {
          this.apiService.getJobUpdate(job_id).then(() => {
          console.log(this.apiService.getJob())
          if(this.apiService.getJob().picked_up) {
            router.navigate(['/driving']);
          } else {
            router.navigate(['/waitForTrain']);
          }
        })
      }
    })
    this.mapLogic.removeMarker()
    this.apiService.getStations().then((stationList: Station[]) => {
      this.stationList = stationList;
      this.options = this.stationList.map(station => station.name)
    })
    
    //this.printCurrentPosition();
  }

  selectStart() {
    const start = this.selectedOption
    const start_obj = this.stationList.find((Station) => Station.name === start)
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

  selectStartGPS = async () => {
    if(this.lat === 0 && this.lon === 0) {
      const options: PositionOptions = {enableHighAccuracy:true}
      const coordinates = await Geolocation.getCurrentPosition(options);
      this.lat = coordinates.coords.latitude
      this.lon = coordinates.coords.longitude

      let user_location: CustomLocation = {
        lat: this.lat,
        lon: this.lon
      }
      console.log('Current position:', coordinates);

      this.userLocMarker = this.mapLogic.setMarker(user_location, this.userLocMarker) ?? this.userLocMarker
    }
    console.log("Marker Position ", this.mapLogic.getMarkerLocation(this.userLocMarker))
    
  };
}
