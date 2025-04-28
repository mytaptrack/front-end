import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BehaviorsComponent } from './behaviors.component';

describe('BehaviorsComponent', () => {
  let component: BehaviorsComponent;
  let fixture: ComponentFixture<BehaviorsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ BehaviorsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BehaviorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
