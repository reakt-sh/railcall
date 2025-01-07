import { Component, Input , inject} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import { Router } from '@angular/router'; 
import { Station } from '../shared/interfaces/station';
import { ApiService } from '../shared/api.service';
import { MyMaterialModule } from "../shared/my-material.module";
import { Location } from '../../../schema-gen/location';

@Component({
  selector: 'app-destination',
  standalone: true,
  imports: [ReactiveFormsModule, MyMaterialModule],
  templateUrl: './destination.component.html',
  styleUrl: './destination.component.scss'
})
export class DestinationComponent{
  stationList: Station[] = [];
  apiService: ApiService = inject(ApiService);
  start = -1;

  constructor(private router: Router) {
    this.stationList = this.apiService.getAllStations();
  }

  
  destinationLocation = new FormGroup({
    destination: new FormControl(""),
  });

  selectDestination() {
    const destination = this.destinationLocation.value.destination?.toLowerCase();
    const dest_obj = this.stationList.find((Station) => Station.name.toLowerCase() === destination);
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
    }
  }
}
