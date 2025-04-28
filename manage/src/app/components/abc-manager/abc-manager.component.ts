import { Component, OnInit } from '@angular/core';
import { 
  ManageAbcClass, ManageClass
} from '../../lib';
import {
  UserService
} from '../../services';
import { AbcCollection } from '@mytaptrack/types';

@Component({
    selector: 'app-abc-manager',
    templateUrl: './abc-manager.component.html',
    styleUrls: ['./abc-manager.component.scss'],
    standalone: false
})
export class AbcManagerComponent implements OnInit {
  public loading: boolean = true;
  public collections: AbcCollection[] = [];
  public selected: AbcCollection;
  private _management: ManageClass;
  private _abcManage: ManageAbcClass;

  public get noneSelected() {
    if(!this.collections) {
      return true;
    }
    if(!this.collections.find(x => x == this.selected)) {
      return true;
    }
    return false;
  }

  constructor(private userService: UserService) {
    this.userService.user.subscribe(user => {
      if(!user) {
        this._management = undefined;
        return;
      }
      this._management = user.management;
      this.load();
    });
   }

  ngOnInit(): void {
  }

  async load() {
    const abcManage = await this._management.getAbc();
    this._abcManage = abcManage;
    this.collections = abcManage.collections;
    if(!this.collections) {
      this.collections = [];
    }
    if(this.collections.length == 0) {
      this.addCollection();
    } else {
      this.selected = this.collections[0];
    }
    this.loading = false;
  }

  addCollection() {
    this.selected = this._abcManage.createCollection();
  }
}
