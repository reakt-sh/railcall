import { Component, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; 
import { Station } from '../shared/interfaces/station';
import { ApiService } from '../shared/api.service';
import { MyMaterialModule } from "../shared/my-material.module";
import { FormGroup, ReactiveFormsModule} from '@angular/forms';

@Component({
  selector: 'app-driving',
  standalone: true,
  imports: [CommonModule,ReactiveFormsModule,MyMaterialModule],
  templateUrl: './driving.component.html',
  styleUrl: './driving.component.scss'
})
export class DrivingComponent {
  stationList: Station[] = [];
  apiService: ApiService = inject(ApiService);
  time_to_drive = -1
  private timerId: any;

  restartForm = new FormGroup({
  });
  updateForm = new FormGroup({
  })

  constructor(private router: Router) {
    const job_id = this.apiService.getJobId().then((jobId) => {
      this.apiService.getJobUpdate(jobId).then(() => {
        this.stationList = this.apiService.getAllStations();
        this.time_to_drive = this.apiService.getTimeToDrive()

        this.startTimer()
      })
    })
  }

  startTimer() {
    if (this.timerId) {
      clearInterval(this.timerId); // Vorherigen Timer stoppen
    }

    //this.time_to_wait = 10;
    this.timerId = setInterval(() => {
      if (this.time_to_drive > 0) {
        this.time_to_drive--;
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
        this.time_to_drive = this.apiService.getTimeToDrive()
      })
    })
    
  }
}
