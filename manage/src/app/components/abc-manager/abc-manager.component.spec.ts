import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbcManagerComponent } from './abc-manager.component';

describe('AbcManagerComponent', () => {
  let component: AbcManagerComponent;
  let fixture: ComponentFixture<AbcManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AbcManagerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AbcManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
