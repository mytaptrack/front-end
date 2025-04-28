import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.scss'],
  standalone: false
})
export class LoadingComponent implements OnInit {
  public showLoading: boolean = true;

  @Input()
  public absolute: boolean = false;
  @Input()
  public text: string = 'Loading';
  @Input()
  public subtext: string = '';

  constructor() { }

  ngOnInit() {
  }

}
