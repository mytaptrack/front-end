import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StringUtilsService {

  constructor() { }

  ensureSize(value: string, size: number): string {
    if(!value || value.length < size) {
      return value;
    }
    return value.substr(0, size - 3) + '...';
  }
}
