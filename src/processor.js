import citeproc from 'citeproc'

export default class Processor {
  constructor({ items, style, locale, format = 'text' }) {
    const itemLookup = {}
    items.forEach(item => (itemLookup[item.id] = item))
    const sys = {
      retrieveItem: item => itemLookup[item],
      retrieveLocale: () => locale
    }
    this.engine = new citeproc.Engine(sys, style)
    this.format = format
  }

  get format() {
    return this._format
  }

  set format(fmt) {
    this.engine.setOutputFormat(fmt)
    this._format = fmt
  }

  citeInText(citationItem) {
    const numberedRefs =
      this.engine.cslXml.dataObj.children.find(c => c.name === 'citation').attrs
        .collapse === 'citation-number'
    if (numberedRefs) {
      citationItem['author-only'] = true
      return this.cite({ citationItems: [citationItem] })
    } else {
      const result = this.engine.makeCitationCluster([
        { id: citationItem.id, 'author-only': true }
      ])
      citationItem['suppress-author'] = true
      return [result, this.cite({ citationItems: [citationItem] })].join(' ')
    }
  }

  cite(citation) {
    const result = this.engine.processCitationCluster(
      citation,
      this.engine.registry.citationreg.citationByIndex.map(citation => [
        citation.citationID,
        citation.properties.noteIndex
      ]),
      []
    )
    return result[1][0][1]
  }

  noCite(citeIds) {
    this.engine.updateUncitedItems(citeIds)
  }

  bibliography({ title } = {}) {
    const [params, data] = this.engine.makeBibliography()
    if (title) {
      let ref =
        typeof title === 'string'
          ? title
          : this.engine.getTerm('reference', null, 1)
      ref = ref[0].toUpperCase() + ref.slice(1)
      if (this.format === 'html') {
        params.bibstart = params.bibstart + '  <h2>' + ref + '</h2>\n'
      } else {
        params.bibstart = ref + '\n' + params.bibstart
      }
    }
    return [params.bibstart, ...data, params.bibend].join('')
  }
}