import raw from './data/machines.json'
import type { AppData, Machine, MachineImage } from './types'

export const data = raw as unknown as AppData

export function machineById(id: string): Machine | undefined {
  return data.machines.find((m) => m.id === id)
}

/** Photos shown to kids (drawing references are for the artist only). */
export function viewerImages(m: Machine): MachineImage[] {
  return m.images.filter((i) => i.use !== 'drawing-reference')
}

export function imageSrc(i: MachineImage): string {
  return i.localPath ?? i.url
}

export function shortName(m: Machine): string {
  return m.name.split(' (')[0]
}
