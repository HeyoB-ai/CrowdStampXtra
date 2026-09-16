import type { Bedrijf, Factuur, Klant, Opdracht } from '../types'
import { totalen } from './factuur'

/**
 * UBL 2.1 Invoice volgens Peppol BIS Billing 3.0 (NL: NLCIUS-compatibel).
 * - CustomizationID/ProfileID zoals voorgeschreven door Peppol BIS 3.0
 * - Btw-categorie S (standaard 21% of 9%) of AE (btw verlegd, art. 12 lid 5 Wet OB)
 * - Bedragen met 2 decimalen, currency EUR
 * - KvK als PartyLegalEntity/CompanyID met schemeID 0106 (NL KvK) – conform NLCIUS
 */
export function maakUbl(f: Factuur, o: Opdracht, k: Klant, b: Bedrijf, opties?: { kostenplaats?: string }): string {
  const t = totalen(f.regels, f.btwVerlegd)
  const cat = f.btwVerlegd ? 'AE' : 'S'
  const btwId = (b.btw || 'NL000000000B00').replace(/\s/g, '')
  const kvk = (x: string) => x.replace(/\s/g, '')
  const klantBtwOfKvk = k.kvk ? `<cac:PartyLegalEntity><cbc:RegistrationName>${esc(k.naam)}</cbc:RegistrationName><cbc:CompanyID schemeID="0106">${kvk(k.kvk)}</cbc:CompanyID></cac:PartyLegalEntity>` : `<cac:PartyLegalEntity><cbc:RegistrationName>${esc(k.naam)}</cbc:RegistrationName></cac:PartyLegalEntity>`

  const taxSubtotals = [...t.perBtw.entries()]
    .map(
      ([pct, g]) => `
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="EUR">${amt(g.grondslag)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="EUR">${amt(g.btw)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID>${cat}</cbc:ID>
          <cbc:Percent>${f.btwVerlegd ? '0' : pct}</cbc:Percent>${
            f.btwVerlegd
              ? `
          <cbc:TaxExemptionReasonCode>VATEX-EU-AE</cbc:TaxExemptionReasonCode>
          <cbc:TaxExemptionReason>Btw verlegd (art. 12 lid 5 Wet OB / reverse charge)</cbc:TaxExemptionReason>`
              : ''
          }
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>`,
    )
    .join('')

  const lines = f.regels
    .map(
      (r, i) => `
  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${unit(r.eenheid)}">${qty(r.aantal)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${amt(r.bedrag)}</cbc:LineExtensionAmount>${
      opties?.kostenplaats
        ? `
    <cbc:AccountingCost>${esc(opties.kostenplaats)}</cbc:AccountingCost>`
        : ''
    }
    <cac:Item>
      <cbc:Name>${esc(r.omschrijving.slice(0, 100))}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${cat}</cbc:ID>
        <cbc:Percent>${f.btwVerlegd ? '0' : r.btwPercentage}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">${amt(r.prijs)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${esc(f.nummer)}</cbc:ID>
  <cbc:IssueDate>${f.datum}</cbc:IssueDate>
  <cbc:DueDate>${f.vervaldatum}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:Note>${esc(f.omschrijving)}${f.btwVerlegd ? ' – Btw verlegd' : ''}</cbc:Note>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>${
    opties?.kostenplaats
      ? `
  <cbc:AccountingCost>${esc(opties.kostenplaats)}</cbc:AccountingCost>`
      : ''
  }
  <cbc:BuyerReference>${esc(o.nummer)}</cbc:BuyerReference>
  <cac:OrderReference><cbc:ID>${esc(o.nummer)}</cbc:ID></cac:OrderReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0106">${kvk(b.kvk)}</cbc:EndpointID>
      <cac:PartyName><cbc:Name>${esc(b.naam)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(b.adres.straat)}</cbc:StreetName>
        <cbc:CityName>${esc(b.adres.plaats)}</cbc:CityName>
        <cbc:PostalZone>${esc(b.adres.postcode)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>NL</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${btwId}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${esc(b.naam)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="0106">${kvk(b.kvk)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>${esc(b.email)}</cbc:ElectronicMail>
        <cbc:Telephone>${esc(b.telefoon)}</cbc:Telephone>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>${
      k.kvk
        ? `
      <cbc:EndpointID schemeID="0106">${kvk(k.kvk)}</cbc:EndpointID>`
        : ''
    }
      <cac:PartyIdentification><cbc:ID>${esc(k.debiteurnummer)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${esc(k.naam)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(k.adres.straat)}</cbc:StreetName>
        <cbc:CityName>${esc(k.adres.plaats)}</cbc:CityName>
        <cbc:PostalZone>${esc(k.adres.postcode)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>NL</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>${
        f.btwVerlegd
          ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>NL${kvk(k.kvk || '000000000')}B01</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>`
          : ''
      }
      ${klantBtwOfKvk}
      <cac:Contact>
        <cbc:Name>${esc(k.contactpersoon)}</cbc:Name>
        <cbc:ElectronicMail>${esc(k.email)}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:Delivery>
    <cbc:ActualDeliveryDate>${f.datum}</cbc:ActualDeliveryDate>
    <cac:DeliveryLocation>
      <cac:Address>
        <cbc:StreetName>${esc(o.locatie.straat)}</cbc:StreetName>
        <cbc:CityName>${esc(o.locatie.plaats)}</cbc:CityName>
        <cbc:PostalZone>${esc(o.locatie.postcode)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>NL</cbc:IdentificationCode></cac:Country>
      </cac:Address>
    </cac:DeliveryLocation>
  </cac:Delivery>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode name="Credit transfer">30</cbc:PaymentMeansCode>
    <cbc:PaymentID>${esc(f.nummer)}</cbc:PaymentID>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${b.iban.replace(/\s/g, '')}</cbc:ID>
      <cbc:Name>${esc(b.naam)}</cbc:Name>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:PaymentTerms><cbc:Note>Betaling binnen 30 dagen na factuurdatum o.v.v. ${esc(f.nummer)}</cbc:Note></cac:PaymentTerms>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${amt(t.btw)}</cbc:TaxAmount>${taxSubtotals}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${amt(t.subtotaal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${amt(t.subtotaal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${amt(t.totaal)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${amt(t.totaal)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${lines}
</Invoice>
`
}

function amt(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2)
}
function qty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}
/** UN/ECE Rec 20 eenheidscodes */
function unit(e: string) {
  const k = e.toLowerCase()
  if (k === 'uur' || k === 'u') return 'HUR'
  if (k === 'm²' || k === 'm2') return 'MTK'
  if (k === 'm') return 'MTR'
  if (k === 'dag') return 'DAY'
  if (k === 'week') return 'WEE'
  if (k === 'kg') return 'KGM'
  if (k === 'l') return 'LTR'
  return 'C62' // stuk / post / set / termijn
}
function esc(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
