"""Main API routes"""

import logging
from typing import Any
from fastapi import APIRouter, Response, Body
import json
from pydantic import BaseModel
from geopy.distance import geodesic
from datetime import datetime, timedelta
from schema_gen.newjob import NewJob
from schema_gen.job import Job
from schema_gen.location import Location
"""
class Location(BaseModel):
    lat: float
    lon: float

class NewJob(BaseModel):
    start: Location
    end: Location

    class Config:
        arbitrary_types_allowed = True

class Job(BaseModel):
    id: int
    start: Location
    end: Location
    picked_up: bool
    arrival_time: datetime
"""
stations = [
    {
        "id": 1,
        "name": "Malente",
        "coordinates" : {
            "lat": 54.16658810713585,
            "lon" : 10.552514453228953
        }
    },
    {
        "id": 2,
        "name": "Luetjenburg",
        "coordinates" : {
            "lat" : 54.29309247366586,
            "lon" : 10.600941704125859
        }
    }
    ]
jobs = {}
_id = 0
waitingTime = 20

# load the track
file_path = '../data/malente-luetjenburg.json'
with open(file_path, 'r') as file:
    track = json.load(file)

router = APIRouter()
logger = logging.getLogger("app.api")

## Routes

@router.get("/alive")
async def alive():
    """Used for health checks. Only sends success."""
    return Response()  # Just 200


@router.post("/test")
async def raw_tracker(body: Any = Body()):
    """Replace with actual route"""
    logger.info("Test: %s", str(body))
    return Response()


@router.get("/get_stations")
async def get_stations():
    return stations

def get_arrival_time(job_id):
    # Anfrage an Zug wann er da ist und gib diese Zeit zurück um arrival_time zu updaten
    return jobs[job_id].arrival_time

@router.post("/new_job")
async def new_job(newJob: NewJob):
    global _id
    _id = _id + 1
    current_time = datetime.now()
    newjob = {
        "id":_id,
        "start": newJob.start,
        "end": newJob.end,
        "picked_up": False,
        "arrival_time": current_time + timedelta(seconds=waitingTime)
    }
    jobs[_id] = Job(**newjob)
    return jobs[_id]


@router.get("/get_update/{job_id}")
async def get_update(job_id: int):
    if job_id in jobs:
        jobs[job_id].arrival_time = get_arrival_time(job_id)
        return jobs[job_id]
    else: 
        return {"Error": "Job not found"}

@router.post("/pick_up/{job_id}")
async def pick_up(job_id:int):
    if job_id in jobs:
        current_time = datetime.now()
        jobs[job_id].picked_up = not jobs[job_id].picked_up
        jobs[job_id].arrival_time = current_time + timedelta(seconds=waitingTime)
        return jobs[job_id]

def find_closest_point(location: Location) -> Location:
    smallest_distance = 10000000000000000000000
    nearest_point = (-1, -1)
    point = (location.lat, location.lon)
    for feature in track["tracks"][0]["data"]["features"]:
        lat = feature["geometry"]["coordinates"][1]
        lon = feature["geometry"]["coordinates"][0]
        feature_point = (lat, lon)
        distance = geodesic(point, feature_point).meters
        if distance < smallest_distance:
            smallest_distance = distance
            nearest_point = feature_point
    return_point = {
        "lat": nearest_point[0],
        "lon": nearest_point[1]
    }
    return Location(**return_point)


@router.get("/find_nearest_location/{lat}/{lon}")
async def find_nearest_location(lat: float, lon: float):
    location_data = {
        "lat": lat,
        "lon": lon
    }
    nearestPoint = find_closest_point(Location(**location_data))

    return {
        "lat": nearestPoint.lat,
        "lon": nearestPoint.lon
    }

@router.delete("/finish_job/{job_id}")
async def delete_job(job_id: int):
    if job_id in jobs:
        del jobs[job_id]
        return {"Message": "Job deleted"}