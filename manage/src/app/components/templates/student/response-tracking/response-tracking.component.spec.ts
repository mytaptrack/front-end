import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResponseTrackingComponent } from './response-tracking.component';

describe('ResponseTrackingComponent', () => {
  let component: ResponseTrackingComponent;
  let fixture: ComponentFixture<ResponseTrackingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ResponseTrackingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ResponseTrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
