import { Component, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type MessageRole = 'user' | 'ai';

export interface ChatMessage {
  id: number;
  role: MessageRole;
  text: string;
  time: string;
  hasActions?: boolean;
}

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.css',
})
export class ChatPanelComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  panelLabel = signal('AI Voice Changer PDF File....');
  messageInput = signal('');
  selectedLanguage = signal('English');
  isTyping = signal(false);
  private nextId = 4;
  private shouldScroll = false;

  readonly messages = signal<ChatMessage[]>([
    {
      id: 1,
      role: 'ai',
      text: 'How can I help you today?',
      time: '12:54 PM',
    },
    {
      id: 2,
      role: 'user',
      text: 'Show me device setup wizard',
      time: '12:54 PM',
    },
    {
      id: 3,
      role: 'ai',
      text: 'Setup Wizard:\nWhen you first boot up the phone (or after a factory reset), the setup wizard lets you customise all features, including language, software buttons, gestures, fingerprint unlock, and other features. If you want to change these later, you can do so after settings up the phone in the settings aoo.',
      time: '12:55 PM',
      hasActions: true,
    },
  ]);

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
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  sendMessage() {
    const text = this.messageInput().trim();
    if (!text) return;

    this.messages.update((msgs) => [
      ...msgs,
      { id: this.nextId++, role: 'user', text, time: this.formatTime() },
    ]);
    this.messageInput.set('');
    this.isTyping.set(true);
    this.shouldScroll = true;

    // Simulate AI response
    setTimeout(() => {
      this.messages.update((msgs) => [
        ...msgs,
        {
          id: this.nextId++,
          role: 'ai',
          text: `I found relevant information about "${text}" in the document. Let me summarize the key points for you based on the PDF content.`,
          time: this.formatTime(),
          hasActions: true,
        },
      ]);
      this.isTyping.set(false);
      this.shouldScroll = true;
    }, 1500);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  regenerate() {
    const msgs = this.messages();
    const lastAi = [...msgs].reverse().find((m) => m.role === 'ai');
    if (!lastAi) return;
    this.isTyping.set(true);
    setTimeout(() => {
      this.messages.update((list) =>
        list.map((m) =>
          m.id === lastAi.id
            ? { ...m, text: 'Here is a regenerated response based on the document content. The setup wizard guides you through initial device configuration step by step.' }
            : m
        )
      );
      this.isTyping.set(false);
    }, 1200);
  }
}
