import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbcCollectionComponent } from './abc-collection.component';

describe('AbcCollectionComponent', () => {
  let component: AbcCollectionComponent;
  let fixture: ComponentFixture<AbcCollectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AbcCollectionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AbcCollectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
