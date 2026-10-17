import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable, map, filter } from 'rxjs';
import { DocumentDto, UploadDocumentResponse } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:7002/api/documents';

  /** Returns metadata for all uploaded documents. */
  getAll(): Observable<DocumentDto[]> {
    return this.http.get<DocumentDto[]>(this.baseUrl);
  }

  /** Returns metadata for a single document. */
  getById(id: string): Observable<DocumentDto> {
    return this.http.get<DocumentDto>(`${this.baseUrl}/${id}`);
  }

  /**
   * Uploads a file with progress tracking.
   * Emits `{ progress: number }` events (0–100) during upload,
   * then emits `{ response: UploadDocumentResponse }` on completion.
   */
  upload(file: File): Observable<UploadEvent> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const req = new HttpRequest('POST', `${this.baseUrl}/upload`, formData, {
      reportProgress: true,
    });

    return this.http.request<UploadDocumentResponse>(req).pipe(
      filter(
        (event) =>
          event.type === HttpEventType.UploadProgress ||
          event.type === HttpEventType.Response
      ),
      map((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? 1;
          return { kind: 'progress' as const, progress: Math.round((100 * event.loaded) / total) };
        }
        // HttpEventType.Response
        const res = (event as any).body as UploadDocumentResponse;
        return { kind: 'response' as const, response: res };
      })
    );
  }

  /** Returns a URL to download the raw file. */
  getDownloadUrl(id: string): string {
    return `${this.baseUrl}/${id}/download`;
  }

  /** Deletes a document by id. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

export type UploadEvent =
  | { kind: 'progress'; progress: number }
  | { kind: 'response'; response: UploadDocumentResponse };
