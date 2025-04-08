import asyncio
import websockets
import json
import time
from OperatingController import setDestination, getDestination, finishJob, getTrackPosition, getCurrentSpeed

current_job = None
current_track_km = 6
# Train speed in km/h
train_speed = 600
last_time = None

async def handle_request():
    uri = "ws://192.168.1.35:5010/ws"

    async with websockets.connect(uri) as websocket:
        print("Verbunden mit dem WebSocket-Server")
        global current_job, current_track_km, last_time
        while True:
            try:

                ########################
                # simuliert die Bewegung des Zuges
                """
                if current_job is not None and last_time is not None:
                    if abs(current_track_km - current_job["destination"]) > 0.01:
                        current_time = time.time()
                        elapsed_time = current_time - last_time
                        speed_in_s = train_speed / 3600
                        distance_traveled = elapsed_time * speed_in_s
                        print(f"current destination: {current_job["destination"]}")
                        if track_km < current_job["destination"]:
                            direction = 1
                        else:
                            direction = -1
                        current_track_km += distance_traveled * direction
                        last_time = current_time
                        print(f"current Position on Track: {current_track_km}")
"""
                # Auf eine Nachricht vom Server warten
                message = await websocket.recv()
                data = json.loads(message)
                print(f"Anfrage erhalten: {data}")
                
                # Anfrage verarbeiten
                match data["action"]:
                    case "newJob":
                        current_job = data["payload"]
                        setDestination(current_job)
                        last_time = time.time()
                        response_data = {
                            "request_id": data["request_id"],
                            "response": {
                                "status": "success",
                                "data": "Job loaded",
                                "arrived": False,
                            },
                        }
                    case "update":
                        # TODO get Streckenkilometer
                        track_km = getTrackPosition()
                        job = getDestination()
                        train_s = getCurrentSpeed()
                        arrived = False
                        if job is not None:
                            if abs(track_km - job["destination"]) < 0.01:
                                arrived = True
                                print("Destination reached!")
                            response_data = {
                                "request_id": data["request_id"],
                                "response": {
                                    "status": "success",
                                    "data": {
                                        "jobID": job["id"],
                                        "track_km": track_km,
                                        "arrived": arrived,
                                        "destination": job["destination"],
                                        "speed": train_s,
                                    }
                                },
                            }
                        if job == None:
                            response_data = {
                                "request_id": data["request_id"],
                                "response": {
                                    "status": "Error"
                                }
                            }
                    case "position":
                        # TODO get Streckenkilometer
                        track_km = getTrackPosition()
                        train_s = getCurrentSpeed()
                        response_data = {
                            "request_id": data["request_id"],
                            "response": {
                                "status": "success",
                                "data": {
                                    "track_km": track_km,
                                    "speed": train_s,
                                }
                            },
                        }
                    case "finish":
                        current_job = None
                        finishJob()
                        last_time = None
                        response_data = {
                            "request_id": data["request_id"],
                            "response": {
                                "status": "success",
                            },
                        }
                    case _:
                        print("Unknown action: " + {data["action"]})
                

                # Antwort zurücksenden
                await websocket.send(json.dumps(response_data))
                print(f"Antwort gesendet: {response_data}")

            except websockets.ConnectionClosed:
                print("Verbindung zum Server verloren")
                break

"""
if __name__ == "__main__":
    asyncio.run(handle_request())
    """