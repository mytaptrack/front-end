import { Component, Input } from '@angular/core';
import { IoTDeviceClass, StudentBehavior } from '../../../../..';

@Component({
  selector: 'app-track-registration',
  templateUrl: './track-registration.component.html',
  styleUrl: './track-registration.component.scss',
  standalone: false
})
export class TrackRegistrationComponent {
  @Input() selected: IoTDeviceClass;
  @Input() administrator: boolean = false;
  @Input() activeBehaviors: StudentBehavior[] = [];
  loading: boolean = false;
}
