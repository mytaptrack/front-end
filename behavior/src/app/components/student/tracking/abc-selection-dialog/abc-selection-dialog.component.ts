import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface AbcSelectionData {
  antecedents: string[];
  consequences: string[];
}

export interface AbcSelectionResult {
  a: string;
  c: string;
}

@Component({
  selector: 'app-abc-selection-dialog',
  templateUrl: './abc-selection-dialog.component.html',
  styleUrls: ['./abc-selection-dialog.component.scss'],
  standalone: false
})
export class AbcSelectionDialogComponent {
  selectedAntecedent: string = '';
  selectedConsequence: string = '';

  constructor(
    public dialogRef: MatDialogRef<AbcSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AbcSelectionData
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.selectedAntecedent && this.selectedConsequence) {
      const result: AbcSelectionResult = {
        a: this.selectedAntecedent,
        c: this.selectedConsequence
      };
      this.dialogRef.close(result);
    }
  }

  get canConfirm(): boolean {
    return !!(this.selectedAntecedent && this.selectedConsequence);
  }
}