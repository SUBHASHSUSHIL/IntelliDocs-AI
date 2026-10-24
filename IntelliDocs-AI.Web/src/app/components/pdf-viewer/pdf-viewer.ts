import { Component, signal, inject, ElementRef, ViewChild, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentService } from '../../core/services/document.service';
import { DocumentDto, DocumentUploadUpdate } from '../../core/models/document.model';
import { IconComponent } from '../../shared/icon/icon';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.css',
})
export class PdfViewerComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly uploadStateChange = output<DocumentUploadUpdate>();

  private readonly docService = inject(DocumentService);
  private nextUploadId = 1;

  panelLabel = signal('AI Voice Changer PDF File....');
  zoom = signal(100);
  currentPage = signal(1);
  totalPages = signal(50);
  collapsed = signal(false);

  // Upload state
  uploadStatus = signal<UploadStatus>('idle');
  uploadProgress = signal(0);
  uploadMessage = signal('');
  isDragOver = signal(false);

  // Uploaded documents list
  documents = signal<DocumentDto[]>([]);
  activeDocument = signal<DocumentDto | null>(null);
  listLoading = signal(false);

  // ── zoom / page ──────────────────────────────────────────────────────────────

  zoomIn() { if (this.zoom() < 200) this.zoom.update((z) => z + 10); }
  zoomOut() { if (this.zoom() > 50) this.zoom.update((z) => z - 10); }
  prevPage() { if (this.currentPage() > 1) this.currentPage.update((p) => p - 1); }
  nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update((p) => p + 1); }
  toggleCollapse() { this.collapsed.update((v) => !v); }

  // ── file pick / drag-drop ────────────────────────────────────────────────────

  openFilePicker() { this.fileInput.nativeElement.click(); }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.upload(file);
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave() { this.isDragOver.set(false); }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.upload(file);
  }

  // ── upload ───────────────────────────────────────────────────────────────────

  upload(file: File) {
    const uploadId = this.nextUploadId++;
    this.uploadStatus.set('uploading');
    this.uploadProgress.set(0);
    this.uploadMessage.set('');
    this.uploadStateChange.emit({
      uploadId,
      fileName: file.name,
      sizeBytes: file.size,
      status: 'uploading',
      progress: 0,
    });

    this.docService.upload(file).subscribe({
      next: (evt) => {
        if (evt.kind === 'progress') {
          this.uploadProgress.set(evt.progress);
          this.uploadStateChange.emit({
            uploadId,
            fileName: file.name,
            sizeBytes: file.size,
            status: 'uploading',
            progress: evt.progress,
          });
        } else {
          if (evt.response.success && evt.response.document) {
            this.uploadStatus.set('success');
            this.uploadMessage.set(`"${file.name}" uploaded successfully.`);
            this.uploadStateChange.emit({
              uploadId,
              fileName: file.name,
              sizeBytes: file.size,
              status: 'success',
              progress: 100,
              message: 'Uploaded successfully',
            });
            // Add to local list and set as active
            this.documents.update((list) => [evt.response.document!, ...list]);
            this.activeDocument.set(evt.response.document!);
            this.panelLabel.set(file.name);
          } else {
            this.uploadStatus.set('error');
            this.uploadMessage.set(evt.response.message || 'Upload failed.');
            this.uploadStateChange.emit({
              uploadId,
              fileName: file.name,
              sizeBytes: file.size,
              status: 'error',
              progress: 0,
              message: evt.response.message || 'Upload failed.',
            });
          }
        }
      },
      error: (err) => {
        this.uploadStatus.set('error');
        this.uploadMessage.set(err?.error?.message ?? 'Upload failed. Is the server running?');
        this.uploadStateChange.emit({
          uploadId,
          fileName: file.name,
          sizeBytes: file.size,
          status: 'error',
          progress: 0,
          message: this.uploadMessage(),
        });
      },
    });
  }

  // ── load documents list ───────────────────────────────────────────────────────

  loadDocuments() {
    this.listLoading.set(true);
    this.docService.getAll().subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.listLoading.set(false);
      },
      error: () => this.listLoading.set(false),
    });
  }

  selectDocument(doc: DocumentDto) {
    this.activeDocument.set(doc);
    this.panelLabel.set(doc.fileName);
  }

  downloadActive() {
    const doc = this.activeDocument();
    if (!doc) return;
    window.open(this.docService.getDownloadUrl(doc.id), '_blank');
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  dismissMessage() {
    if (this.uploadStatus() !== 'uploading') this.uploadStatus.set('idle');
  }
}
