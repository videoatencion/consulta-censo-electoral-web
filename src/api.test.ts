import { describe, expect, it } from 'vitest'
import { parseDisambiguation } from './api'

describe('parseDisambiguation', () => {
  it('parseja una llista de camps entre claudàtors', () => {
    expect(parseDisambiguation('[day year sn2]')).toEqual(['day', 'year', 'sn2'])
    expect(parseDisambiguation('[postCode]')).toEqual(['postCode'])
  })

  it('ignora els valors desconeguts', () => {
    expect(parseDisambiguation('[day foo bar]')).toEqual(['day'])
    expect(parseDisambiguation('[unknown]')).toEqual([])
  })

  it('retorna colele com a valor conegut (el filtratge és feina del cridador)', () => {
    expect(parseDisambiguation('[colele]')).toEqual(['colele'])
  })

  it('retorna llista buida si el missatge no té el format esperat', () => {
    expect(parseDisambiguation('no records found')).toEqual([])
    expect(parseDisambiguation('[]')).toEqual([])
    expect(parseDisambiguation('[ ]')).toEqual([])
    expect(parseDisambiguation('day year')).toEqual([])
  })
})
