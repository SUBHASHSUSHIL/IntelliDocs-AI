import { Component, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SearchHistoryItem {
  id: number;
  text: string;
  isActive?: boolean;
}

export interface HistoryGroup {
  label: string;
  items: SearchHistoryItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent {
  readonly newDocumentRequested = output<void>();

  searchQuery = signal('');
  collapsed = signal(false);

  readonly recentDoc = signal({
    name: 'Product Requir...',
    date: '12 Mar 2024',
  });

  readonly historyGroups = signal<HistoryGroup[]>([
    {
      label: 'Today',
      items: [
        { id: 1, text: 'what are the biggest risk in plan?', isActive: true },
        { id: 2, text: 'write a LinkedIn post about this...' },
        { id: 3, text: 'who will approve the final budget.' },
      ],
    },
    {
      label: 'Previous 7 Days',
      items: [
        { id: 4, text: 'Scan & Pay Shopping' },
        { id: 5, text: 'who is Michael L. Green and what...' },
        { id: 6, text: "what is SOPHY's main focus as a..." },
        { id: 7, text: 'Write summary of this documents.' },
        { id: 8, text: 'What is main focus as a commerce...' },
      ],
    },
    {
      label: 'Previous 30 Days',
      items: [
        { id: 9, text: 'write description for this docum...' },
        { id: 10, text: 'what are the biggest risk in plan?' },
      ],
    },
  ]);

  readonly filteredGroups = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.historyGroups();
    return this.historyGroups()
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => i.text.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  });

  toggleCollapse() {
    this.collapsed.update((v) => !v);
  }

  setActive(id: number) {
    this.historyGroups.update((groups) =>
      groups.map((g) => ({
        ...g,
        items: g.items.map((item) => ({ ...item, isActive: item.id === id })),
      }))
    );
  }
}
