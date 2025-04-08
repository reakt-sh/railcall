import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatTime',
  standalone: true
})
export class FormatTimePipe implements PipeTransform {

  transform(value: number): string {
    if (!value && value !== 0) return '0:00';

    const minutes = Math.floor(value / 60); // Ganze Minuten berechnen
    const seconds = value % 60; // Verbleibende Sekunden berechnen

    // Formatieren der Zeit
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

}
