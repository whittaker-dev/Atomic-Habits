'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { IconChevronDown, IconSearch } from './ui';

// Ô chọn có tìm kiếm theo mẫu combobox của WAI-ARIA (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/):
// bấm vào là mở danh sách, gõ để lọc, ↑ ↓ để di chuyển, Enter để chọn, Esc để đóng. Tiêu điểm luôn ở ô nhập;
// mục đang trỏ tới được báo qua aria-activedescendant nên trình đọc màn hình đọc được.
//
// Ô này không tự lọc: trang cha giữ chữ đang gõ và đưa vào các nhóm đã lọc, vì mỗi nơi lọc một kiểu
// (danh sách nước có sẵn, hay thành phố gợi ý cộng kết quả tìm từ server).

export type ComboOption = { id: string; label: string; hint?: string };
export type ComboGroup = { label: string; options: ComboOption[] };

export function Combobox({
  label,
  selectedLabel,
  placeholder,
  query,
  onQueryChange,
  groups,
  onSelect,
  emptyText,
  disabled,
  inputRef,
  selectedId,
}: {
  label: ReactNode;
  /** Chữ hiện trong ô khi danh sách đóng (mục đang chọn); rỗng thì hiện placeholder. */
  selectedLabel: string;
  placeholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  groups: ComboGroup[];
  onSelect: (option: ComboOption) => void;
  /** Câu hiện trong danh sách khi không có mục nào (chưa gõ, đang tìm, không thấy…). */
  emptyText: string;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  selectedId?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const ownInputRef = useRef<HTMLInputElement>(null);
  const input = inputRef ?? ownInputRef;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const flat = groups.flatMap((g) => g.options);
  const shownGroups = groups.filter((g) => g.options.length > 0);

  // Danh sách đổi (gõ thêm chữ, kết quả tìm về) thì trỏ lại mục đầu tiên.
  const signature = flat.map((o) => o.id).join('|');
  useEffect(() => setActive(0), [signature, open]);

  // Bấm ra ngoài thì đóng.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  });

  // Mục đang trỏ luôn nằm trong vùng nhìn thấy của danh sách khi di chuyển bằng phím.
  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  });

  function close() {
    setOpen(false);
    onQueryChange('');
  }

  function choose(option: ComboOption) {
    close();
    onSelect(option);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) setOpen(true);
        else setActive((i) => Math.min(i + 1, flat.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) setOpen(true);
        else setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case 'End':
        if (open) {
          e.preventDefault();
          setActive(Math.max(flat.length - 1, 0));
        }
        break;
      case 'Enter': {
        const option = flat[active];
        if (open && option) {
          e.preventDefault();
          choose(option);
        }
        break;
      }
      case 'Escape':
        if (open) {
          e.preventDefault();
          close();
        }
        break;
      case 'Tab':
        if (open) close();
        break;
    }
  }

  let index = -1;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <label
        htmlFor={`${id}-input`}
        className="mb-1 block text-[12.5px] font-semibold text-[color:var(--tr-ink-soft)]"
      >
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--tr-ink-faint)]">
          <IconSearch className="h-[18px] w-[18px]" />
        </span>
        <input
          id={`${id}-input`}
          ref={input}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && flat[active] ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={open ? query : selectedLabel}
          placeholder={open ? selectedLabel || placeholder : placeholder}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setOpen(true);
            onQueryChange(e.target.value);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'h-11 w-full rounded-xl border border-[color:var(--tr-line)] bg-[color:var(--tr-ground)] pl-10 pr-10 text-[14.5px] text-[color:var(--tr-ink)] caret-[color:var(--tr-blue)] outline-none transition-shadow placeholder:text-[color:var(--tr-ink-faint)] focus:border-[color:var(--tr-blue)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,98,240,0.15)] disabled:cursor-wait',
            open && 'placeholder:text-[color:var(--tr-ink-soft)]',
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (open) close();
            else {
              setOpen(true);
              input.current?.focus();
            }
          }}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[color:var(--tr-ink-faint)] hover:bg-white hover:text-[color:var(--tr-ink)]"
        >
          <span className={cn('transition-transform duration-150', open && 'rotate-180')}>
            <IconChevronDown />
          </span>
        </button>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-[320px] overflow-y-auto overscroll-contain rounded-xl border border-[color:var(--tr-line)] bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(14,26,51,0.22),0_2px_6px_rgba(14,26,51,0.06)]"
        >
          {flat.length === 0 && (
            <li
              role="presentation"
              className="px-3 py-2.5 text-[13.5px] text-[color:var(--tr-ink-soft)]"
            >
              {emptyText}
            </li>
          )}
          {shownGroups.map((group, g) => (
            <li key={group.label} role="presentation">
              <div
                // Mã theo số thứ tự: aria-labelledby là danh sách mã cách nhau bằng dấu cách, nên mã không được chứa
                // dấu cách như tên nhóm.
                id={`${id}-g${g}`}
                className="px-3 pb-1 pt-2 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[color:var(--tr-ink-faint)]"
              >
                {group.label}
              </div>
              <ul role="group" aria-labelledby={`${id}-g${g}`}>
                {group.options.map((option) => {
                  index += 1;
                  const i = index;
                  const isActive = i === active;
                  const isSelected = option.id === selectedId;
                  return (
                    <li
                      key={option.id}
                      id={optionId(i)}
                      role="option"
                      aria-selected={isActive}
                      // Giữ tiêu điểm ở ô nhập khi bấm chuột, để bàn phím vẫn dùng tiếp được.
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseMove={() => setActive(i)}
                      onClick={() => choose(option)}
                      className={cn(
                        'flex cursor-pointer items-baseline gap-2 rounded-lg px-3 py-2',
                        isActive && 'bg-[color:var(--tr-blue-wash)]',
                      )}
                    >
                      <span
                        className={cn(
                          'text-[14.5px] text-[color:var(--tr-ink)]',
                          isSelected
                            ? 'font-semibold text-[color:var(--tr-blue-deep)]'
                            : 'font-medium',
                        )}
                      >
                        {option.label}
                      </span>
                      {option.hint && (
                        <span className="truncate text-[12.5px] text-[color:var(--tr-ink-faint)]">
                          {option.hint}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
