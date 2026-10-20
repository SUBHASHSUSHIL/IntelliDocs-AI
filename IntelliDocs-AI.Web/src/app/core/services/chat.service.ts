import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatRequest, ChatResponse } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:7002/api/Chat';

  ask(question: string): Observable<ChatResponse> {
    const body: ChatRequest = { question };
    return this.http.post<ChatResponse>(this.baseUrl, body);
  }
}
