import { booleanAttribute, ChangeDetectionStrategy, Component, contentChild, Directive, input, numberAttribute, TemplateRef } from '@angular/core';

export type PbChipsSearchMode = 'autoSearch' | 'disabled';
export type PbSearchFilterCondition = 'contains' | 'startsWith' | 'equals';
export type PbSearchTextParseMode = 'groupWordsByAnd' | 'groupWordsByOr' | 'exactMatch';
export type PbListRenderMode = 'entire' | 'virtual';
export type PbDropDownWidthMode = 'contentOrEditorWidth' | 'contentWidth' | 'editorWidth';

/** A chip was dragged from `previousIndex` to `currentIndex`. */
export interface PbChipsReorderEvent {
  previousIndex: number;
  currentIndex: number;
}

/** A piece of text, highlighted when it matches the search text. */
export interface PbHighlightSegment {
  text: string;
  match: boolean;
}

/** Context of a `pbChipsTag` template: one tag (chip). */
export interface PbChipsTagContext<T> {
  dataItem: T | undefined;
  /** The tag was typed by the user and is not in the data. */
  isCustom: boolean;
  displayText: string;
  remove: () => void;
}

/** Context of a `pbChipsItem` template: one item of the dropdown list. */
export interface PbChipsItemContext<T, V> {
  dataItem: T;
  value: V | undefined;
  displayText: string;
  /** The display text split into search matches (render with pb-chips-highlight). */
  highlightedDisplayText: PbHighlightSegment[];
  visibleIndex: number;
  selected: boolean;
}

/** Context of a `pbChipsCell` template inside a pb-chips-column. */
export interface PbChipsCellContext<T> {
  dataItem: T;
  column: PbChipsColumn;
  value: unknown;
  displayText: string;
  highlightedDisplayText: PbHighlightSegment[];
  visibleIndex: number;
}

/** `<ng-template pbChipsTag let-tag>`: custom tag (chip) content (TagDisplayTemplate). */
@Directive({ selector: 'ng-template[pbChipsTag]' })
export class PbChipsTagTemplate {
  constructor(readonly template: TemplateRef<{ $implicit: PbChipsTagContext<unknown> }>) {}
}

/** `<ng-template pbChipsItem let-item>`: custom list item content (ItemDisplayTemplate). */
@Directive({ selector: 'ng-template[pbChipsItem]' })
export class PbChipsItemTemplate {
  constructor(readonly template: TemplateRef<{ $implicit: PbChipsItemContext<unknown, unknown> }>) {}
}

/** `<ng-template pbChipsGroupHeader let-group>`: custom group header (GroupHeaderDisplayTemplate). */
@Directive({ selector: 'ng-template[pbChipsGroupHeader]' })
export class PbChipsGroupHeaderTemplate {
  constructor(readonly template: TemplateRef<{ $implicit: { groupName: string } }>) {}
}

/** `<ng-template pbChipsEmpty let-state>`: content of an empty list (EmptyDataAreaTemplate). */
@Directive({ selector: 'ng-template[pbChipsEmpty]' })
export class PbChipsEmptyTemplate {
  constructor(readonly template: TemplateRef<{ $implicit: { isDataLoading: boolean } }>) {}
}

/** `<ng-template pbChipsCell let-cell>` inside a pb-chips-column: custom cell content (CellDisplayTemplate). */
@Directive({ selector: 'ng-template[pbChipsCell]' })
export class PbChipsCellTemplate {
  constructor(readonly template: TemplateRef<{ $implicit: PbChipsCellContext<unknown> }>) {}
}

/** A column of a multi-column pb-chips dropdown list (DxListEditorColumn). */
@Component({
  selector: 'pb-chips-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class PbChipsColumn {
  /** The data item property shown in this column. */
  readonly fieldName = input.required<string>();
  readonly caption = input<string>();
  /** A CSS width (`120px`, `30%`); columns without one share the remaining space. */
  readonly width = input<string>();
  readonly visible = input(true, { transform: booleanAttribute });
  /** Display order; columns keep their markup order when it is not set. */
  readonly visibleIndex = input(-1, { transform: numberAttribute });
  /** Search text is matched against this column's cells. */
  readonly searchEnabled = input(true, { transform: booleanAttribute });
  readonly cellTemplate = contentChild(PbChipsCellTemplate);
}

/** Renders text with its search matches highlighted (`highlightedDisplayText` of the item and cell contexts). */
@Component({
  selector: 'pb-chips-highlight',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (part of segments(); track $index) {
    @if (part.match) {<span class="pb-chips__match">{{ part.text }}</span>} @else {{{ part.text }}}
  }`,
})
export class PbChipsHighlight {
  readonly segments = input.required<PbHighlightSegment[]>();
}
