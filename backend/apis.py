"""Main API routes"""
# TODO Liste von Zügen hinzufügen damit mehr als ein zug arbeiten kann
import logging
from typing import Any, cast, Dict
from fastapi import APIRouter, Response, Body, WebSocket, HTTPException
from pydantic import BaseModel
from geopy.distance import geodesic
from datetime import datetime, timedelta
from schema_gen.newjob import NewJob
from schema_gen.job import Job
from schema_gen.location import Location
from wsManager import WebSocketManager
from storage import stations, jobs, _id, waitingTime, WSRequest, DEFAULT_LINE, AUGMENTED_TRACK_DATA, AUGMENTED_TRACK_LINESTRINGS
import json
import asyncio
from shapely import Point
from turf import distance, nearest_point, point as TPoint



router = APIRouter()
logger = logging.getLogger("app.api")
ws_manager = WebSocketManager()

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

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    print("WebSocket-Client verbunden")
    await ws_manager.listen_to_client(websocket)


async def ws_send(request: WSRequest):
    if not ws_manager.active_connections:
        raise HTTPException(status_code=503, detail="WebSocket-Client nicht verbunden")
    
    # Eine eindeutige ID für die Anfrage erstellen
    request_id = str(asyncio.get_event_loop().time())

    # Nachricht an WebSocket senden
    message = {
        "request_id": request_id,
        "action": request.action,
        "payload": request.payload,
    }

    try:
        # Nachricht an WebSocket senden
        await ws_manager.send_message(message=json.dumps(message))

        # Auf Antwort warten (Timeout nach 5 Sekunden)
        response = await asyncio.wait_for(ws_manager.receive_message(), timeout=5.0)
        return json.loads(response)

    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Timeout: Keine Antwort vom WebSocket-Client")
    


@router.get("/get_stations")
async def get_stations():
    return stations


def gps_to_km(loc: Location) -> float:
    track_features = next(iter(AUGMENTED_TRACK_DATA.values()))
    track_linestring = next(iter(AUGMENTED_TRACK_LINESTRINGS.values()))

    coords = Point(loc.lon, loc.lat)
    ## Find nearest point on track
    nearest_point_on_line = track_linestring.project(coords)

    # Get distance in km
    nearest_point_pos = track_linestring.interpolate(nearest_point_on_line)  # convert to point
    nearest_point_pos = TPoint((nearest_point_pos.x, nearest_point_pos.y))  # convert point for turf
    nearest_point_pos_feature = cast(Dict, nearest_point_pos)
    nearest_feature = cast(Dict, nearest_point(nearest_point_pos, track_features))  # type: ignore
    nearest_point_km = nearest_feature["properties"]["trackKm"] + distance(nearest_point_pos, nearest_feature["geometry"])
    off_track = distance(nearest_point_pos, TPoint((coords.x, coords.y))) > 0.1  # FIXME Improve

    return nearest_point_km

def km_to_gps(km: float) -> Location:
    loc = {
        "lat": 0,
        "lon": 0
    }
    feature_list = AUGMENTED_TRACK_DATA["main"]["features"]
    for i in range(len(feature_list)-1):
        feature = AUGMENTED_TRACK_DATA["main"]["features"][i]
        trackKm = feature["properties"]["trackKm"]
        if km < trackKm: 
            prevFeature = AUGMENTED_TRACK_DATA["main"]["features"][i-1]

            km1, lat1, lon1 = prevFeature["properties"]["trackKm"], prevFeature["geometry"]["coordinates"][1], prevFeature["geometry"]["coordinates"][0]
            km2, lat2, lon2 = feature["properties"]["trackKm"], feature["geometry"]["coordinates"][1], feature["geometry"]["coordinates"][0]
            # Interpolationsfaktor
            t = (km - km1) / (km2 - km1)
            
            # Interpolierte Koordinaten
            lat = lat1 + t * (lat2 - lat1)
            lon = lon1 + t * (lon2 - lon1)
            
            loc = {
                "lat": lat,
                "lon": lon
            }
            break
    if loc["lat"] == 0 and loc["lon"] == 0:
        last_point = feature_list[-1]
        lat, lon = last_point["geometry"]["coordinates"][1], last_point["geometry"]["coordinates"][0]
        loc = {
                "lat": lat,
                "lon": lon
            }
        
    return Location(**loc)

async def send_job_to_train(job: Job):

    if not job.picked_up: 
        new_request = {
            "action": "newJob",
            "payload": {
                "id": job.id,
                "destination": gps_to_km(job.start)
            }
        }
    else:
        new_request = {
            "action": "newJob",
            "payload": {
                "id": job.id,
                "destination": gps_to_km(job.end)
            }
        }
    
    await ws_send(WSRequest(**new_request))

async def get_train_pos():
    new_request = {
        "action": "position",
        "payload": {},
    }
    train_pos = await ws_send(WSRequest(**new_request))
    return train_pos["response"]["data"]

async def get_arrival_time(cur_train_loc: float, dest: float, speed: float):
    # cur_train_loc und dest sind Streckenkilometer
    # speed ist die Geschwindigkeit des Zuges in km/h

    if speed == 0:
        speed = 1
    travel_dist = abs(dest - cur_train_loc)
    
    # in stunden
    travel_time_h = travel_dist / speed

    #in sekunden
    travel_time_s = travel_time_h * 60 * 60
    print(f"traveltime: {travel_time_s}")
    current_time = datetime.now()

    return current_time + timedelta(seconds=travel_time_s) 

@router.post("/new_job")
async def new_job(newJob: NewJob):
    global _id
    _id = _id + 1
    train_pos = await get_train_pos()
    arrival_time = await get_arrival_time(train_pos["track_km"], gps_to_km(newJob.start), train_pos["speed"])
    newjob = {
        "id":_id,
        "start": newJob.start,
        "end": newJob.end,
        "picked_up": False,
        "arrival_time": arrival_time,
        "worked_on": False
    }
    jobs[_id] = Job(**newjob)
    if jobs:
        next_job_id = min(jobs.keys())
        jobs[next_job_id].worked_on = True
        await send_job_to_train(jobs[next_job_id])
    return jobs[_id]

async def update_from_train(job: Job) -> Job:
    new_request = {
        "action": "update",
        "payload": {
            "id": job.id,
        }
    }
    updates = await ws_send(WSRequest(**new_request))
    print(updates)
    if updates["response"]["status"] == "success":
        if updates["response"]["data"].get("arrived"):
            new_request = {
                "action": "finish",
                "payload": {
                    "id": job.id,
                }
            }
        #await ws_send(WSRequest(**new_request))
    
        train_pos = updates["response"]["data"].get("track_km")
        train_dest = updates["response"]["data"].get("destination")
        train_speed = updates["response"]["data"].get("speed")
        arrived = updates["response"]["data"].get("arrived")
        if not arrived:
            arrival_time = await get_arrival_time(train_pos, train_dest, train_speed)
            job.arrival_time = arrival_time
        else:
            arrival_time = datetime.now()
            job.arrival_time = arrival_time
    else: 
        if jobs:
            next_job_id = min(jobs.keys())
            jobs[next_job_id].worked_on = True
            await send_job_to_train(jobs[next_job_id]) 
    return job

@router.get("/get_update/{job_id}")
async def get_update(job_id: int):
    if job_id in jobs:
        if job_id != min(jobs.keys()):
            train = await get_train_pos()
            train_pos = train["track_km"]
            train_speed = train["speed"]
            dest = gps_to_km(jobs[job_id].start)
            arrival_time = await get_arrival_time(train_pos, dest, train_speed)
            jobs[job_id].arrival_time = arrival_time
            return jobs[job_id]
        return await update_from_train(jobs[job_id])
    else: 
        return {"Error": "Job not found"}

@router.post("/pick_up/{job_id}")
async def pick_up(job_id:int):
    if job_id in jobs:
        new_request = {
                "action": "finish",
                "payload": {
                    "id": job_id,
                }
            }
        await ws_send(WSRequest(**new_request))
        current_time = datetime.now()
        jobs[job_id].picked_up = not jobs[job_id].picked_up
        jobs[job_id].arrival_time = current_time + timedelta(seconds=waitingTime)
        await send_job_to_train(jobs[job_id])
        return jobs[job_id]

def find_closest_point(location: Location) -> Location:
    track_features = next(iter(AUGMENTED_TRACK_DATA.values()))
    track_linestring = next(iter(AUGMENTED_TRACK_LINESTRINGS.values()))

    coords = Point(location.lon, location.lat)
    ## Find nearest point on track
    nearest_point_on_line = track_linestring.project(coords)

    # Get distance in km
    nearest_point_pos = track_linestring.interpolate(nearest_point_on_line)  # convert to point
    nearest_point_pos = TPoint((nearest_point_pos.x, nearest_point_pos.y))  # convert point for turf
    nearest_point_pos_feature = cast(Dict, nearest_point_pos)
    nearest_feature = cast(Dict, nearest_point(nearest_point_pos, track_features))  # type: ignore
    nearest_point_km = nearest_feature["properties"]["trackKm"] + distance(nearest_point_pos, nearest_feature["geometry"])
    off_track = distance(nearest_point_pos, TPoint((coords.x, coords.y))) > 0.1  # FIXME Improve

    return_point = {
        "lat": nearest_point_pos["geometry"]["coordinates"][1],
        "lon": nearest_point_pos["geometry"]["coordinates"][0]
    }
    return Location(**return_point)

@router.post("/find_nearest_location/")
async def find_nearest_location(location: Location):
    
    nearestPoint = find_closest_point(location)

    return {
        "lat": nearestPoint.lat,
        "lon": nearestPoint.lon
    }

@router.delete("/finish_job/{job_id}")
async def delete_job(job_id: int):
    if job_id in jobs:
        new_request = {
            "action": "finish",
            "payload": {
                "id": job_id,
            }
        }
        await ws_send(WSRequest(**new_request))
        del jobs[job_id]
        if jobs:
            next_job_id = min(jobs.keys())
            jobs[next_job_id].worked_on = True
            await send_job_to_train(jobs[next_job_id])
        return {"Message": "Job deleted"}
    
@router.get("/get_train_loc/")
async def get_train_loc():
    train_track = await get_train_pos()
    train_track_km = train_track["track_km"]
    train_track_pos = km_to_gps(train_track_km)
    
    print(f"train km on track: {train_track_km}")
    print(f"train pos on track: {train_track_pos}")
    print(f"real pos: {gps_to_km(train_track_pos)}")
    
    return train_track_pos


