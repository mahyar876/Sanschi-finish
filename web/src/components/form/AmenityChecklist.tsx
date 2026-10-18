'use client';



import { PITCH_AMENITIES, type PitchAmenityId } from '@/lib/pitch-amenities';



type Props = {

  value: PitchAmenityId[];

  onChange: (next: PitchAmenityId[]) => void;

  compact?: boolean;

  /** پنهان کردن راهنمای ذخیره (مثلاً وقتی خودکار ذخیره می‌شود) */

  hideSaveHint?: boolean;

};



export function AmenityChecklist({

  value,

  onChange,

  compact = false,

  hideSaveHint = false,

}: Props) {

  const set = new Set(value);



  function toggle(id: PitchAmenityId) {

    const next = new Set(set);

    if (next.has(id)) next.delete(id);

    else next.add(id);

    onChange([...next]);

  }



  return (

    <div

      className={

        compact ? 'amenity-checklist amenity-checklist--compact' : 'amenity-checklist'

      }

    >

      <p className="amenity-checklist-legend" id="amenity-checklist-label">

        امکانات

      </p>

      <div

        className="amenity-chip-grid scroll-y-right"

        role="group"

        aria-labelledby="amenity-checklist-label"

      >

        {PITCH_AMENITIES.map((a) => {

          const active = set.has(a.id);

          return (

            <button

              key={a.id}

              type="button"

              aria-pressed={active}

              className={active ? 'chip active' : 'chip'}

              onClick={() => toggle(a.id)}

            >

              {a.label}

            </button>

          );

        })}

      </div>

      {!hideSaveHint && (

        <p className="muted-sm amenity-checklist-hint">

          برای اعمال در سایت، پایین همین بخش «ذخیره» را بزنید.

        </p>

      )}

    </div>

  );

}

