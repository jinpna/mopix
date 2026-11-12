// MONDAY workflow simplify 2026-11-12: the Motion preset picker (Presets) and the
// two-style Comparison dialog were removed from the node panel. Only the preset
// direction helper is kept, so video nodes that already carry a preset still run.
import{VIDEO_PRESET_GROUPS}from'./studio-video-spec.js?v=36';
export const CANVAS_PRESETS=Object.values(VIDEO_PRESET_GROUPS).flatMap(g=>g.items.map(([id,label,direction])=>({id,label,direction})));
export function canvasPresetDirection(id){if(!id)return'';const p=CANVAS_PRESETS.find(p=>p.id===id);if(!p)throw Error('Preset không còn khả dụng. Chọn lại preset.');return'MOTION PRESET: '+p.label+'\n'+p.direction+'\nPreserve the source identity, connected scene and plausible physical motion. Apply within the requested 5s or 10s only. No unrequested text.'}
