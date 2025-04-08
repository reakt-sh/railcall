import json
from pydantic import BaseModel
from schema_gen.railline import RailLine
from typing import Dict
from shapely import LineString
from turf import distance
from geojson import utils as gutils
from copy import deepcopy

stations = [
    {
        "id": 1,
        "name": "Malente Bhf",
        "coordinates" : {
            "lat": 54.16658810713585,
            "lon" : 10.552514453228953
        }
    },
    {
        "id": 2,
        "name": "Godenbergstraße",
        "coordinates" : {
            "lat": 54.174610015791856,
            "lon" : 10.55596348046608
        }
    },
    {
        "id": 3,
        "name": "Neversfelder Str.",
        "coordinates" : {
            "lat": 54.17665110841718,
            "lon" : 10.556828932897945
        }
    },
    {
        "id": 4,
        "name": "Lütjenburger Str.",
        "coordinates" : {
            "lat": 54.18210688851479,
            "lon" : 10.562875986564993
        }
    },
    {
        "id": 5,
        "name": "Malkwitzer Weg",
        "coordinates" : {
            "lat": 54.18384680752333,
            "lon" : 10.570011530907882
        }
    },
    {
        "id": 6,
        "name": "Bhf Holsteinische Schweiz",
        "coordinates" : {
            "lat": 54.186124357737235,
            "lon" : 10.59019234342511
        }
    },
    {
        "id": 7,
        "name": "Bruhnskoppeler Weg",
        "coordinates" : {
            "lat": 54.198241696121094,
            "lon" : 10.596917077503655
        }
    },
    {
        "id": 8,
        "name": "Wühren",
        "coordinates" : {
            "lat": 54.20811560988331,
            "lon" : 10.605140125292936
        }
    },
    {
        "id": 9,
        "name": "Benz Alter Bahnhof",
        "coordinates" : {
            "lat": 54.22184895893808,
            "lon" : 10.614167817104905
        }
    },
    {
        "id": 10,
        "name": "Flehm",
        "coordinates" : {
            "lat": 54.23125175002047,
            "lon" : 10.622438122144906
        }
    },
    {
        "id": 11,
        "name": "Blekendorfer Str.",
        "coordinates" : {
            "lat": 54.258670033166595,
            "lon" : 10.625896055281915
        }
    },
    {
        "id": 12,
        "name": "Lindenallee",
        "coordinates" : {
            "lat": 54.27704116577773,
            "lon" : 10.612081918835676
        }
    },
    {
        "id": 13,
        "name": "Lütjenburg Bhf",
        "coordinates" : {
            "lat" : 54.29287607855948,
            "lon" : 10.60109862008053
        }
    }
    ]
jobs = {}
_id = 0
waitingTime = 20

class WSRequest(BaseModel):
    action: str
    payload: dict

# load the track
file_path = '../data/malente-luetjenburg.json'
with open(file_path, 'r') as file:
    track = json.load(file)

DEFAULT_LINE: RailLine
with open(file_path) as f:
    DEFAULT_LINE = RailLine.model_validate_json(f.read())

# Augment with track km
AUGMENTED_TRACK_DATA: Dict[str, Dict] = {}
AUGMENTED_TRACK_LINESTRINGS: Dict[str, LineString] = {}
for i in range(len(DEFAULT_LINE.tracks)):
    track = DEFAULT_LINE.tracks[i]
    data = deepcopy(track.data)

    for idx, feature in enumerate(data["features"]):
        if idx == 0:
            km = 0
        else:
            prev = data["features"][idx - 1]
            km = prev["properties"]["trackKm"] + distance(prev["geometry"], feature["geometry"])
        feature["properties"]["trackKm"] = km

    AUGMENTED_TRACK_DATA[track.id] = data
    AUGMENTED_TRACK_LINESTRINGS[track.id] = LineString(gutils.coords(data))