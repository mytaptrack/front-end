import { Component, Input, OnInit } from '@angular/core';
import { 
  StudentClass
} from '../../../../lib';
import {
  AbcCollection, AccessLevel, UserSummaryRestrictions
} from '@mytaptrack/types'

@Component({
  selector: 'app-abc',
  templateUrl: './abc.component.html',
  styleUrls: ['./abc.component.scss'],
  standalone: false
})
export class AbcComponent implements OnInit {
  @Input() student: StudentClass;
  @Input() restrictions: UserSummaryRestrictions;

  public get abcCollection() {
    return this.student.abc;
  }
  public set abcCollection(abc: AbcCollection) {

  }

  constructor() { }

  ngOnInit(): void {
  }

}
