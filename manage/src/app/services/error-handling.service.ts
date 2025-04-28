import { Injectable, ErrorHandler } from '@angular/core';
import { ApiClientService } from './api-client.service';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService implements ErrorHandler {

  constructor(private http: ApiClientService) {
  }

  async handleError(error) {
    console.error(error);
    if(this.http && error.type !== 'WebError') {
      try {
        // await this.http.sendError({
        //   message: error.message,
        //   stack: error.stack,
        //   url: document.URL
        // });
      } catch (err) {
        console.error(err);
      }
    }
  }
}
