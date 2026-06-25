'use client'

import { useRef, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProgressBar } from './progress-bar'
import { TaskList } from './task-list'
import type { Category } from '@/lib/tracker/types'
import type { TrackerApi } from '@/lib/tracker/use-tracker'
import { formatDayLabel, monthDays, weekDays } from '@/lib/tracker/date-utils'

export function CategoryCard({
  category,
  tracker,
  focusedDate,
  onClearFocus,
}: {
  category: Category
  tracker: TrackerApi
  focusedDate: string | null
  onClearFocus: () => void
}) {
  const { state } = tracker
  const view = state.view
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const progress = tracker.categoryProgress(category.id)
  const percent = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)

  // Which day does the input add to?
  const inputDate =
    view === 'day' ? state.selectedDate : focusedDate /* week/month focused day */

  const showInput = view === 'day' || focusedDate !== null

  const suggestions = state.suggestions[category.id].filter((s) =>
    value.trim() ? s.toLowerCase().includes(value.trim().toLowerCase()) : true,
  )

  const submit = (raw: string) => {
    if (!inputDate || !raw.trim()) return
    tracker.addTaskForDate(category.id, inputDate, raw)
    setValue('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <section
      className={cn(
        'glass-card rounded-[2rem] p-5 transition-[z-index]',
        open ? 'relative z-40' : 'relative z-10',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-white/70 text-3xl shadow-sm">
          <span aria-hidden="true">{category.icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold text-ink">{category.title}</h2>
          <p className="text-xs font-bold text-muted-ink">
            {progress.done}/{progress.total} выполнено
          </p>
        </div>
        <span className="text-sm font-extrabold text-purple">{percent}%</span>
      </div>
      <ProgressBar percent={percent} className="mt-3" height="h-2" />

      {/* Input + suggestions */}
      {showInput && (
        <div className="relative mt-4">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => {
                if (blurTimer.current) clearTimeout(blurTimer.current)
                setOpen(true)
              }}
              onBlur={() => {
                blurTimer.current = setTimeout(() => setOpen(false), 150)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit(value)
              }}
              placeholder="Добавить задачу (напр. 09.30 прогулка)"
              className="min-w-0 flex-1 rounded-2xl border border-white/70 bg-white/75 px-4 py-2.5 text-sm font-semibold text-ink outline-none placeholder:text-muted-ink/70 focus:border-purple/50"
            />
            <button
              type="button"
              onClick={() => submit(value)}
              aria-label="Добавить задачу"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl btn-gradient text-white transition active:scale-95"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          {open && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-52 overflow-y-auto rounded-2xl border border-white/80 bg-white/95 p-1.5 shadow-xl backdrop-blur no-scrollbar animate-pop-in">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  // onMouseDown to fire before input blur closes the list
                  onMouseDown={(e) => {
                    e.preventDefault()
                    submit(s)
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-ink transition hover:bg-pink-soft/60"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks */}
      <div className="mt-4">
        {view === 'day' ? (
          <DayTasks category={category} tracker={tracker} />
        ) : (
          <PeriodTasks
            category={category}
            tracker={tracker}
            focusedDate={focusedDate}
            onClearFocus={onClearFocus}
          />
        )}
      </div>
    </section>
  )
}

function DayTasks({ category, tracker }: { category: Category; tracker: TrackerApi }) {
  const dateKey = tracker.state.selectedDate
  const all = tracker.getDayTasks(category.id, dateKey)
  const pinned = all.filter((t) => t.pinned)
  const unpinned = all.filter((t) => !t.pinned)

  if (all.length === 0) {
    return <p className="py-2 text-center text-sm font-semibold text-muted-ink">Пока нет задач ✨</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <TaskList tasks={pinned} category={category.id} dateKey={dateKey} group="pinned" tracker={tracker} />
      <TaskList tasks={unpinned} category={category.id} dateKey={dateKey} group="unpinned" tracker={tracker} />
    </div>
  )
}

function PeriodTasks({
  category,
  tracker,
  focusedDate,
  onClearFocus,
}: {
  category: Category
  tracker: TrackerApi
  focusedDate: string | null
  onClearFocus: () => void
}) {
  const { state } = tracker
  const view = state.view
  const days = view === 'week' ? weekDays(state.selectedDate) : monthDays(state.selectedDate)

  // Focused single day (even if empty) so the user can add tasks for it
  if (focusedDate) {
    const tasks = tracker.getUnpinned(category.id, focusedDate).map((t) => ({ ...t, pinned: false }))
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onClearFocus}
          className="flex items-center gap-1 self-start rounded-full bg-white/60 px-3 py-1 text-xs font-bold text-purple transition hover:bg-white"
        >
          <ArrowLeft className="h-3 w-3" />
          {view === 'week' ? 'Все дни недели' : 'Все дни месяца'}
        </button>
        <p className="text-xs font-extrabold text-muted-ink">{formatDayLabel(focusedDate)}</p>
        {tasks.length === 0 ? (
          <p className="py-2 text-center text-sm font-semibold text-muted-ink">
            На этот день пока нет дел — добавь первое ✨
          </p>
        ) : (
          <TaskList
            tasks={tasks}
            category={category.id}
            dateKey={focusedDate}
            group="unpinned"
            tracker={tracker}
          />
        )}
      </div>
    )
  }

  // Grouped: only days that have unpinned tasks
  const daysWithTasks = days.filter((d) => tracker.getUnpinned(category.id, d).length > 0)

  if (daysWithTasks.length === 0) {
    return (
      <p className="rounded-2xl bg-white/55 px-4 py-3 text-center text-sm font-semibold text-muted-ink">
        {view === 'week'
          ? 'На этой неделе пока нет незакреплённых дел ✨'
          : 'В этом месяце пока нет незакреплённых дел ✨'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {daysWithTasks.map((d) => {
        const tasks = tracker.getUnpinned(category.id, d).map((t) => ({ ...t, pinned: false }))
        return (
          <div key={d} className="flex flex-col gap-2">
            <p className="text-xs font-extrabold text-muted-ink">{formatDayLabel(d)}</p>
            <TaskList tasks={tasks} category={category.id} dateKey={d} group="unpinned" tracker={tracker} />
          </div>
        )
      })}
    </div>
  )
}
