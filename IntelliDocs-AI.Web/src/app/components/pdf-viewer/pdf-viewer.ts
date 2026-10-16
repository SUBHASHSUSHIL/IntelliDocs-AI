import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.css',
})
export class PdfViewerComponent {
  panelLabel = signal('AI Voice Changer PDF File....');
  zoom = signal(100);
  currentPage = signal(1);
  totalPages = signal(50);
  collapsed = signal(false);

  zoomIn() {
    if (this.zoom() < 200) this.zoom.update((z) => z + 10);
  }

  zoomOut() {
    if (this.zoom() > 50) this.zoom.update((z) => z - 10);
  }

  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update((p) => p - 1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update((p) => p + 1);
  }

  toggleCollapse() {
    this.collapsed.update((v) => !v);
  }
}
