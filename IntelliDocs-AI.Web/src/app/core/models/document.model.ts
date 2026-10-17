export interface DocumentDto {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string; // ISO 8601
  downloadUrl: string;
}

export interface UploadDocumentResponse {
  success: boolean;
  message: string;
  document?: DocumentDto;
}
