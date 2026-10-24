import { Component, input, computed, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICONS, IconName } from './icons.registry';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      [attr.aria-label]="label() || null"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-hidden]="label() ? null : 'true'"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      [innerHTML]="svgContent()"
    ></svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
  `],
})
export class IconComponent {
  private sanitizer = inject(DomSanitizer);

  /** Icon name — must be a key from the ICONS registry. */
  name = input.required<IconName>();

  /** Width and height in px. Default: '16'. */
  size = input<string>('16');

  /** Accessible label. If set, adds aria-label + role="img". If absent, SVG is aria-hidden. */
  label = input<string>('');

  readonly svgContent = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()] ?? '')
  );
}
