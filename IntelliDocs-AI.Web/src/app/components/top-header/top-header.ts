import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/icon/icon';

@Component({
  selector: 'app-top-header',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './top-header.html',
  styleUrl: './top-header.css',
})
export class TopHeaderComponent {
  docName = input<string>('Product Requirements Doc.pdf');
  userName = input<string>('Sushil Thakur');
  userInitials = input<string>('DL');
}
