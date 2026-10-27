import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseHTML } from 'linkedom';
import { mountEasingVisualization, mountSelectControl, mountSlider, mountTextControl, mountToggle } from './vanilla';

const { document, MutationObserver } = parseHTML('<!doctype html><html><body></body></html>');
Object.assign(globalThis, { document, ResizeObserver: class { observe() {} disconnect() {} } });

/** The attributes, or `childList`, that `change` writes under `host`. */
async function writes(host: HTMLElement, change: () => void) {
  const records: MutationRecord[] = [];
  const observer = new MutationObserver((batch: MutationRecord[]) => records.push(...batch));
  observer.observe(host, { subtree: true, attributes: true, childList: true, characterData: true });
  change();
  await new Promise(resolve => setTimeout(resolve));
  observer.disconnect();
  return records.map(record => record.attributeName ?? record.type).sort();
}

describe('vanilla render', () => {
  it('writes only the attributes and text whose values change', async () => {
    const host: HTMLElement = document.createElement('div');
    document.body.append(host);
    const onChange = () => {};
    const slider = { label: 'Radius', value: 4, min: 0, max: 10, step: 1, unit: 'px', shortcut: { key: 'r' }, onChange };
    const toggle = { label: 'Shadow', checked: true, shortcut: { key: 's' }, onChange };
    const select = { label: 'Tone', value: 'warm', options: ['warm', 'cool'], onChange };
    const text = { label: 'Title', value: 'Hello', placeholder: 'Name', onChange };
    const easing = { easing: { type: 'easing' as const, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }, onChange };
    const sliderControl = mountSlider(host, slider);
    const toggleControl = mountToggle(host, toggle);
    const selectControl = mountSelectControl(host, select);
    const textControl = mountTextControl(host, text);
    const easingControl = mountEasingVisualization(host, easing);
    assert.deepEqual(await writes(host, () => {
      sliderControl.update({ ...slider });
      toggleControl.update({ ...toggle });
      selectControl.update({ ...select });
      textControl.update({ ...text });
      easingControl.update({ ...easing });
    }), []);
    assert.deepEqual(await writes(host, () => sliderControl.update({ ...slider, value: 5 })), ['aria-valuenow', 'aria-valuetext', 'childList', 'childList']);
    assert.deepEqual(await writes(host, () => toggleControl.update({ ...toggle, checked: false })), ['aria-checked', 'aria-checked', 'data-active', 'data-active', 'tabindex', 'tabindex']);
  });
});
