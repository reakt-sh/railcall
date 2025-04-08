import { Injectable } from '@angular/core';
import { Station } from './interfaces/station';
import { Router } from '@angular/router'; 
import { NONE_TYPE } from '@angular/compiler';
import {HttpClient, HttpHeaders, HttpResponse} from '@angular/common/http';
import { CapacitorHttp } from '@capacitor/core';
import { Job } from '../../../schema-gen/job';
import { Location } from '../../../schema-gen/location';
import { NewJob } from '../../../schema-gen/newjob';
//import { Job } from './interfaces/job';
//import { Location } from './interfaces/location';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // url for web
  //url = 'http://localhost:5010/'
  // url for emulator
  url = 'http://10.0.2.2:5010/'

  // stores the start location
  protected start: Location = {
    lat: 0,
    lon: 0
  }
  setStart(start: Location){
    this.start = start;
  }
  getStart(): Location {
    return this.start;
  }
  // stores the end location
  protected destination: Location = {
    lat: 0,
    lon: 0
  }
  setDestination(destination: Location){
    this.destination = destination;
  }
  getDestination(): Location {
    return this.destination;
  }
  // stores all stations
  protected stations: Station[] = []
  getAllStations(): Station[]{
    return this.stations
  }

  async getStations(): Promise<Station[]> {
    const options = {
      url: this.url + "get_stations",
    }
    const response = await CapacitorHttp.get(options);
    this.stations = (await response.data) ?? []
    console.log(this.stations)
    return this.stations;
  }

  getStationById(id: number): Station | undefined {
    return this.stations.find((Station) => Station.id === id)
  }
  
  protected worked_on = false
  set_worked_on(status: boolean) {
    this.worked_on = status
  }
  get_worked_on() {
    return this.worked_on
  }


  protected job: Job | any = 0
  async setJob (job:Job) {
    console.log(job)
    const arrivalTime = new Date(job.arrival_time).getTime();
    const currentTime = Date.now();
    const waitingTime = arrivalTime - currentTime;
    this.job = job
    await Preferences.set({
        key: 'job_id',
        value: job.id.toString(),
      });
    this.setStart(job.start);
    this.setDestination(job.end)
    this.setTimeToWait(waitingTime)
    this.setTimeToDrive(waitingTime)
    this.set_worked_on(job.worked_on)
  }

  getJob(){
    return this.job
  }

  async getJobId(): Promise<number> {
    const { value } = await Preferences.get({ key: 'job_id' });
    console.log(`Job ID: ${value}`);
    return Number(value).valueOf()
  }

  async removeJobId() {
    let job_id = await this.getJobId() 
    const options = {
      url: this.url + "finish_job/" + job_id,
    }
    const response = await CapacitorHttp.delete(options);
    await Preferences.remove({key: 'job_id'});

  }

  async sendNewJob(router:Router) {
    
    const data: NewJob = {
      start: this.getStart(),
      end: this.getDestination()
    }
    
    const options = {
      url: this.url + 'new_job',
      headers: { 'Content-Type': 'application/json' },
      data: data,
    };
    const response = await CapacitorHttp.post(options);
    console.log(response.data)
    await this.setJob(response.data)
    router.navigate(['/waitForTrain']);
    
    return response.data;
  }

  async getJobUpdate(job_id: number) {
    const options = {
      url: this.url + "get_update/" + job_id,
      headers: { 'Content-Type': 'application/json' },
    }
    const response = await CapacitorHttp.get(options);
    if ("Error" in response.data) {
      await Preferences.remove({key: 'job_id'});
    }else {
      await this.setJob(response.data)
    }
    return;
  }

  async getIn() {
    const job_id = await this.getJobId()
    const options = {
      url: this.url + "pick_up/" + job_id,
      headers: { 'Content-Type': 'application/json' },
    }
    const response = await CapacitorHttp.post(options);
    await this.setJob(response.data)
    return
  }

  protected time_to_wait = 5;
  setTimeToWait(time: number) {
    this.time_to_wait = time;
  }
  getTimeToWait(): number {
    return Math.round(this.time_to_wait / 1000);
  }

  protected time_to_drive = 5;
  getTimeToDrive(): number {
    return Math.round(this.time_to_drive / 1000);
  }
  setTimeToDrive(time: number) {
    this.time_to_drive = time;
  }

  async nearestLocation(location: Location): Promise<Location>{
    let loc: Location = {
      lat: 0,
      lon: 0
    }
    const options = {
      url: this.url + "find_nearest_location/",
      headers: { 'Content-Type': 'application/json' },
      data: location,
    }
    const response = await CapacitorHttp.post(options);
    loc = (await response.data) ?? loc
    return loc;
  }


  async getTrainLoc(): Promise<Location> {
    let loc: Location = {
      lat: 0,
      lon: 0
    }
    
    const options = {
      url: this.url + "get_train_loc/",
      headers: { 'Content-Type': 'application/json' },
    }
    const response = await CapacitorHttp.get(options);
    loc = (await response.data) ?? loc
    console.log("pos on track: ", loc)
    return loc;
  }
  constructor() { }
}


