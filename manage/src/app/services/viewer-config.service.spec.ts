import { TestBed } from '@angular/core/testing';

import { ViewerConfigService } from './viewer-config.service';

describe('ViewerConfigService', () => {
  let service: ViewerConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ViewerConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
