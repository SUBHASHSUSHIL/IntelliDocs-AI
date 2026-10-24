import { Component, signal, ElementRef, ViewChild, AfterViewChecked, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { DocumentUploadUpdate } from '../../core/models/document.model';
import { IconComponent } from '../../shared/icon/icon';

export type MessageRole = 'user' | 'ai';

export interface ChatMessage {
  id: number;
  role: MessageRole;
  text: string;
  time: string;
  attachment?: DocumentUploadUpdate;
  sources?: string[];
  hasActions?: boolean;
  isError?: boolean;
}

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.css',
})
export class ChatPanelComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  readonly uploadRequested = output<void>();

  private readonly chatService = inject(ChatService);

  panelLabel = signal('AI Voice Changer PDF File....');
  messageInput = signal('');
  selectedLanguage = signal('English');
  isTyping = signal(false);

  private nextId = 2;
  private shouldScroll = false;
  private lastUserQuestion = '';

  get hasLastQuestion() { return !!this.lastUserQuestion; }

  readonly messages = signal<ChatMessage[]>([
    {
      id: 1,
      role: 'ai',
      text: 'How can I help you today?',
      time: this.formatTime(),
    },
  ]);

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom() {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  private formatTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  sendMessage() {
    const text = this.messageInput().trim();
    if (!text || this.isTyping()) return;

    // Add user message
    this.messages.update((msgs) => [
      ...msgs,
      { id: this.nextId++, role: 'user', text, time: this.formatTime() },
    ]);

    this.lastUserQuestion = text;
    this.messageInput.set('');
    this.isTyping.set(true);
    this.shouldScroll = true;

    // Call the real API
    this.chatService.ask(text).subscribe({
      next: (res) => {
        this.messages.update((msgs) => [
          ...msgs,
          {
            id: this.nextId++,
            role: 'ai',
            text: res.answer,
            time: this.formatTime(),
            sources: res.sources?.length ? res.sources : undefined,
            hasActions: true,
          },
        ]);
        this.isTyping.set(false);
        this.shouldScroll = true;
      },
      error: (err) => {
        const msg =
          err?.error?.message ??
          err?.message ??
          'Something went wrong. Please try again.';
        this.messages.update((msgs) => [
          ...msgs,
          {
            id: this.nextId++,
            role: 'ai',
            text: msg,
            time: this.formatTime(),
            hasActions: false,
            isError: true,
          },
        ]);
        this.isTyping.set(false);
        this.shouldScroll = true;
      },
    });
  }

  onUploadStateChange(update: DocumentUploadUpdate) {
    this.messages.update((msgs) => {
      const existingMessage = msgs.find((msg) => msg.attachment?.uploadId === update.uploadId);
      if (!existingMessage) {
        return [
          ...msgs,
          {
            id: this.nextId++,
            role: 'user',
            text: '',
            time: this.formatTime(),
            attachment: update,
          },
        ];
      }

      return msgs.map((msg) =>
        msg.attachment?.uploadId === update.uploadId
          ? { ...msg, attachment: update }
          : msg
      );
    });
    this.shouldScroll = true;
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ── Regenerate ─────────────────────────────────────────────────────────────

  regenerate() {
    if (!this.lastUserQuestion || this.isTyping()) return;

    // Remove the last AI message then re-ask
    this.messages.update((msgs) => {
      const lastAiIdx = [...msgs].reverse().findIndex((m) => m.role === 'ai');
      if (lastAiIdx === -1) return msgs;
      const idx = msgs.length - 1 - lastAiIdx;
      return msgs.filter((_, i) => i !== idx);
    });

    this.isTyping.set(true);
    this.shouldScroll = true;

    this.chatService.ask(this.lastUserQuestion).subscribe({
      next: (res) => {
        this.messages.update((msgs) => [
          ...msgs,
          {
            id: this.nextId++,
            role: 'ai',
            text: res.answer,
            time: this.formatTime(),
            sources: res.sources?.length ? res.sources : undefined,
            hasActions: true,
          },
        ]);
        this.isTyping.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        this.isTyping.set(false);
      },
    });
  }

  // ── Copy ───────────────────────────────────────────────────────────────────

  copyMessage(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}
