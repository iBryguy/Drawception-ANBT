import { ID } from './idSelector'

export function fixTabletPluginGoingAwol() {
  const stupidPlugin = ID('wacom')
  const container = ID('wacomContainer')
  window.onblur = () => {
    if (container.childNodes.length === 1) container.removeChild(stupidPlugin)
  }
  window.onfocus = () => {
    if (container.childNodes.length === 0) container.appendChild(stupidPlugin)
  }
}


