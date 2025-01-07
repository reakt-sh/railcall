import { Location } from './location';
export interface Job {
    id: number
    start: Location
    end: Location
    picked_up: boolean
    arrivel_time: Date
}
