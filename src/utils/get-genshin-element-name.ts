export function get_genshin_element_name(element: string) {
  switch (element) {
    case 'Pyro':
      return '火'
    case 'Cryo':
      return '冰'
    case 'Geo':
      return '岩'
    case 'Anemo':
      return '风'
    case 'Electro':
      return '电'
    case 'Hydro':
      return '水'
    case 'Dendro':
      return '草'
    default:
      return '？'
  }
}
