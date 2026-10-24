import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      [attr.aria-label]="label() || null"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-hidden]="label() ? null : 'true'"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <use [attr.href]="href()" />
    </svg>
  `,
})
export class IconComponent {
  /** Icon name without the `icon-` prefix. E.g. `"file"`, `"send"`. */
  name = input.required<string>();

  /** Width and height in px (passed as the SVG width/height attribute). Default: '16'. */
  size = input<string>('16');

  /** If set, adds aria-label and role="img". If absent the SVG is aria-hidden. */
  label = input<string>('');

  readonly href = computed(() => `/assets/icons.svg#icon-${this.name()}`);
}
