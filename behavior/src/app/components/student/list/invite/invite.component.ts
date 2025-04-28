import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TeamInviteClass } from '../../../..';

@Component({
  selector: 'app-invite',
  templateUrl: './invite.component.html',
  styleUrls: ['./invite.component.scss'],
  standalone: false
})
export class InviteComponent implements OnInit {
  @Input('invite') public invite: TeamInviteClass;
  public inAction: boolean;

  @Output('resolved') resolved = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
  }

  async setInAction(val: boolean) {
    this.inAction = val;
  }

  async acceptInvite() {
    this.setInAction(true);
    try {
      await this.invite.accept();
      this.resolved.emit();
    } finally {
      this.setInAction(false);
    }
  }

  async ignoreInvite() {
    this.setInAction(true);
    try {
      await this.invite.decline();
      this.resolved.emit();
    } finally {
      this.setInAction(false);
    }
  }
}
