import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MttTagsComponent } from './mtt-tags.component';

describe('MttTagsComponent', () => {
  let component: MttTagsComponent;
  let fixture: ComponentFixture<MttTagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MttTagsComponent, MttTagsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MttTagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
