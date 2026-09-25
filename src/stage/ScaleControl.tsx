import { DEFAULT_SCALE, SCALE_MAX, SCALE_MIN, SCALE_STEP } from './scale'

/** A text-size slider for the deck's menu — twice there, the deck and the
 *  notes window from afar. The notes window carries its own compact bar
 *  rather than this, sized to sit above the clock. Either way the control
 *  is px-sized, so it does not rescale while you drag it. */
export function ScaleControl({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (pct: number) => void
}) {
  return (
    <div className="menu__setting">
      <div className="menu__settingHead">
        <label htmlFor={id}>{label}</label>
        {value !== DEFAULT_SCALE && (
          <button className="menu__reset" onClick={() => onChange(DEFAULT_SCALE)}>
            reset
          </button>
        )}
      </div>

      <input
        id={id}
        className="menu__range"
        type="range"
        min={SCALE_MIN}
        max={SCALE_MAX}
        step={SCALE_STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />

      <div className="menu__scale" aria-hidden="true">
        <span>smaller</span>
        <span>larger</span>
      </div>
      <p className="menu__value">{value}%</p>
    </div>
  )
}
