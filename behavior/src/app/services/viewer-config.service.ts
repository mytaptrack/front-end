import { Injectable } from '@angular/core';

export function isMobileDevice() {
  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    return true;
  }
  return false;
}

@Injectable({
  providedIn: 'root'
})
export class ViewerConfigService {

  public get isMobile() {
    return isMobileDevice();
  }

  constructor() { }
}
