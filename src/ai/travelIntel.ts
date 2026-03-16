export function composeTravelIntel(stats: {
  missions: number
  countries: number
  cities: string[]
  topCity: string
  topCityCount: number
}): string {
  if (stats.missions === 0) return 'No field operations recorded. Awaiting first deployment.'

  const cityList = stats.cities.slice(0, 5).join(', ')
  const more = stats.cities.length > 5 ? ` and ${stats.cities.length - 5} additional locations` : ''

  let text = `${stats.missions} field operation${stats.missions !== 1 ? 's' : ''} across ${stats.countries} ${stats.countries === 1 ? 'territory' : 'territories'}. `

  if (stats.topCity && stats.topCityCount > 1) {
    text += `Primary theatre of operations: ${stats.topCity} (${stats.topCityCount} deployment${stats.topCityCount !== 1 ? 's' : ''}). `
  }

  text += `Known coordinates: ${cityList}${more}.`
  return text
}
