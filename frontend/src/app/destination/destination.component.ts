import { Component, Input , inject} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import { Router } from '@angular/router'; 
import { Station } from '../shared/interfaces/station';
import { ApiService } from '../shared/api.service';
import { MyMaterialModule } from "../shared/my-material.module";
import { Location } from '../../../schema-gen/location';
import { MapComponent } from "../map/map.component";
import { MapLogicService } from "../map/logic/map-logic.service";
import { Marker } from "maplibre-gl";

@Component({
  selector: 'app-destination',
  standalone: true,
  imports: [ReactiveFormsModule, MyMaterialModule, MapComponent],
  templateUrl: './destination.component.html',
  styleUrl: './destination.component.scss'
})
export class DestinationComponent{
  stationList: Station[] = [];
  apiService: ApiService = inject(ApiService);
  mapLogic: MapLogicService = inject(MapLogicService);
  destinationMarker: Marker
  destination = -1;

  options: String[] = [];
  selectedOption: string | undefined;

  constructor(private router: Router) {
    this.mapLogic.removeMarker()

    const destMarkerElement = document.createElement('div');
    destMarkerElement.style.width = '50px';
    destMarkerElement.style.height = '50px';
    destMarkerElement.style.backgroundImage = 'url(assets/map/flag_marker.png)';
    destMarkerElement.style.backgroundSize = 'cover';
    this.destinationMarker = new Marker({element:destMarkerElement, draggable:true})

    this.stationList = this.apiService.getAllStations();
    this.options = this.stationList.map(station => station.name)
    let start_loc = this.apiService.getStart();
    if(start_loc.lat === 0 && start_loc.lon === 0) {
      router.navigate(['']);
    }
    const waitForMapInitialization = async (): Promise<void> => {
      while (!this.mapLogic.mapInitialized()) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Warte 100ms
      }
      const mapCenter = this.mapLogic.getMapCenter();
      if (mapCenter != null) {
        this.destinationMarker = this.mapLogic.setDraggableMarker(mapCenter, this.destinationMarker) ?? this.destinationMarker;
      }
    };
    
    waitForMapInitialization();
    
  }

  selectDestination() {
    const destination = this.selectedOption;
    const dest_obj = this.stationList.find((Station) => Station.name === destination);
    if(dest_obj != undefined) {
      let nearestLocation = this.apiService.nearestLocation(dest_obj.coordinates)

      nearestLocation.then((location) => {
        console.log("end location on track: ", location)
        this.apiService.setDestination(location)
        this.apiService.sendNewJob(this.router)
        //this.router.navigate(['/waitForTrain']);
      }).catch((error) => {
        console.log("Error: ", error)
      })
    } else {
      let nearestLocation = this.apiService.nearestLocation(this.mapLogic.getMarkerLocation(this.destinationMarker))
      nearestLocation.then((location) => {
        console.log("end location on track: ", location)
        this.apiService.setDestination(location)
        this.apiService.sendNewJob(this.router)
        //this.router.navigate(['/waitForTrain']);
      }).catch((error) => {
        console.log("Error: ", error)
      })
    }
  }

  
}
