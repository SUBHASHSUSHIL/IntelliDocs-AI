import { Component } from '@angular/core';
import { SidebarComponent } from './components/sidebar/sidebar';
import { TopHeaderComponent } from './components/top-header/top-header';
import { PdfViewerComponent } from './components/pdf-viewer/pdf-viewer';
import { ChatPanelComponent } from './components/chat-panel/chat-panel';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    SidebarComponent,
    TopHeaderComponent,
    PdfViewerComponent,
    ChatPanelComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
