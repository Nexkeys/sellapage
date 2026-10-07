// src/receipts/ReceiptPdf.jsx
//
// The downloadable PDF for every Sellapage receipt (see receiptModel.js), in
// the receipt design approved by Nex on 2026-10-07: an off-white page with
// soft leaves in the corners, the issuer up top with a PAID pill, the date,
// receipt id and payment reference on the right, then cards for the customer,
// the order or booking, the payment breakdown with the grand total in a
// band, the payment method next to a QR code, the seller's contact, and
// "Powered by Sellapage".
//
// Fonts are bundled (public/fonts/receipt, DM Sans, Bricolage Grotesque and
// Caveat, all open licence) so a receipt looks the same on every phone.
// Their Latin files have no naira sign, so amounts read "NGN 303".
// This file is only loaded when someone downloads a receipt.
import { Document, Page, View, Text, Image, Svg, Path, Circle, Rect, Line, Polyline, Font, StyleSheet } from '@react-pdf/renderer'
import { ngn, fmtDay } from './receiptModel'

// Where the fonts and logo are served from. A test can point this at the
// local public folder with globalThis.__RECEIPT_ASSETS__.
let origin = 'https://sellapage.com.ng'
const readOrigin = () => { origin = globalThis.__RECEIPT_ASSETS__ || (typeof window !== 'undefined' ? window.location.origin : origin) }
let fontsReady = false
function registerFonts() {
  readOrigin()
  if (fontsReady) return
  Font.register({ family: 'DM Sans', fonts: [
    { src: `${origin}/fonts/receipt/dm-sans-400.ttf` },
    { src: `${origin}/fonts/receipt/dm-sans-500.ttf`, fontWeight: 500 },
    { src: `${origin}/fonts/receipt/dm-sans-700.ttf`, fontWeight: 700 },
  ] })
  Font.register({ family: 'Bricolage', fonts: [
    { src: `${origin}/fonts/receipt/bricolage-grotesque-700.ttf`, fontWeight: 700 },
    { src: `${origin}/fonts/receipt/bricolage-grotesque-800.ttf`, fontWeight: 800 },
  ] })
  Font.register({ family: 'Caveat', src: `${origin}/fonts/receipt/caveat-600.ttf` })
  // Never break a reference or a name with a hyphen.
  Font.registerHyphenationCallback((word) => [word])
  fontsReady = true
}

const C = {
  page: '#f7f8f5', ink: '#10291c', body: '#334a3d', muted: '#6b7d72', line: '#e2e9e4', card: '#ffffff',
  green: '#0b6b35', deep: '#034e22', mint: '#e4f2e9', band: '#eaf5ee', leaf: '#dcefe2',
}

const s = StyleSheet.create({
  page: { backgroundColor: C.page, paddingTop: 28, paddingBottom: 30, paddingHorizontal: 40, fontFamily: 'DM Sans', fontSize: 10, color: C.ink },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  brandLeft: { flexDirection: 'row', alignItems: 'center' },
  brandName: { fontFamily: 'Bricolage', fontWeight: 800, fontSize: 18, color: C.ink, marginLeft: 7 },
  motto: { flexDirection: 'row', alignItems: 'center', fontSize: 9.5, color: C.muted },
  head: { flexDirection: 'row', marginBottom: 14 },
  headLeft: { flexDirection: 'row', flexGrow: 1, flexBasis: 0, paddingRight: 18 },
  logo: { width: 76, height: 76, borderRadius: 14, objectFit: 'cover' },
  logoFallback: { width: 76, height: 76, borderRadius: 14, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  issuer: { fontFamily: 'Bricolage', fontWeight: 800, fontSize: 24, color: C.ink, lineHeight: 1.1 },
  title: { fontSize: 13, color: C.muted, marginTop: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#d8eedf', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9, marginTop: 9 },
  pillText: { fontSize: 10.5, fontWeight: 700, color: C.green, marginLeft: 4, letterSpacing: 0.4 },
  headRight: { width: 190, borderLeftWidth: 1, borderLeftColor: C.line, paddingLeft: 18, justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start' },
  metaLabel: { fontSize: 8.5, color: C.muted },
  metaValue: { fontSize: 10.5, fontWeight: 700, color: C.ink, marginTop: 1.5 },
  metaRule: { borderBottomWidth: 1, borderBottomColor: C.line, marginVertical: 9 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, paddingHorizontal: 14, marginBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardLabel: { fontSize: 9.5, fontWeight: 700, color: C.ink },
  cardTitle: { fontFamily: 'Bricolage', fontWeight: 700, fontSize: 14, color: C.deep, marginTop: 2 },
  cardSub: { fontSize: 9.5, color: C.muted, marginTop: 2 },
  line: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  lineText: { fontSize: 9.5, color: C.body, marginLeft: 5 },
  sectionTitle: { fontFamily: 'Bricolage', fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 8 },
  rule: { borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 7 },
  bRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3.5 },
  bLabel: { fontSize: 10, color: C.body },
  bAmount: { fontSize: 10, color: C.ink },
  band: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.band, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 12, marginTop: 6 },
  bandLabel: { fontFamily: 'Bricolage', fontWeight: 700, fontSize: 13, color: C.deep },
  bandTotal: { fontFamily: 'Bricolage', fontWeight: 800, fontSize: 21, color: C.deep },
  items: { marginTop: 9, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
  itemRow: { flexDirection: 'row', paddingVertical: 3 },
  two: { flexDirection: 'row', marginBottom: 8 },
  half: { flexGrow: 1, flexBasis: 0 },
  secure: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: C.mint, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 7, marginTop: 5 },
  qrBox: { width: 58, height: 58, borderWidth: 1, borderColor: C.line, borderRadius: 9, padding: 4, marginRight: 12, backgroundColor: '#fff' },
  footer: { marginTop: 8, alignItems: 'center' },
  thanksRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 9 },
  thanksRule: { flexGrow: 1, borderBottomWidth: 1, borderBottomColor: C.line },
  thanks: { fontSize: 10.5, color: C.body, marginHorizontal: 10 },
  powered: { fontSize: 8.5, color: C.muted, marginTop: 2 },
  script: { fontFamily: 'Caveat', fontSize: 15, color: C.green, transform: 'rotate(-6deg)' },
})

// Icons (Lucide shapes, the same set the site uses), drawn as PDF vectors.
function Icon({ name, size = 14, color = C.green }) {
  const p = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  const shapes = {
    user: [<Path key="a" d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" {...p} />, <Circle key="b" cx="12" cy="7" r="4" {...p} />],
    calendar: [<Rect key="a" x="3" y="4" width="18" height="18" rx="2" {...p} />, <Line key="b" x1="16" y1="2" x2="16" y2="6" {...p} />, <Line key="c" x1="8" y1="2" x2="8" y2="6" {...p} />, <Line key="d" x1="3" y1="10" x2="21" y2="10" {...p} />],
    pin: [<Path key="a" d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" {...p} />, <Circle key="b" cx="12" cy="10" r="3" {...p} />],
    card: [<Rect key="a" x="2" y="5" width="20" height="14" rx="2" {...p} />, <Line key="b" x1="2" y1="10" x2="22" y2="10" {...p} />],
    chat: [<Path key="a" d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" {...p} />],
    shield: [<Path key="a" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" {...p} />, <Path key="b" d="m9 12 2 2 4-4" {...p} />],
    check: [<Circle key="a" cx="12" cy="12" r="10" fill={color} stroke={color} strokeWidth={2} />, <Path key="b" d="m8 12 3 3 5-6" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />],
    doc: [<Path key="a" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...p} />, <Polyline key="b" points="14 2 14 8 20 8" {...p} />, <Line key="c" x1="8" y1="13" x2="16" y2="13" {...p} />, <Line key="d" x1="8" y1="17" x2="13" y2="17" {...p} />],
    bag: [<Path key="a" d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" {...p} />, <Line key="b" x1="3" y1="6" x2="21" y2="6" {...p} />, <Path key="c" d="M16 10a4 4 0 0 1-8 0" {...p} />],
    sparkles: [<Path key="a" d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" {...p} />],
    clock: [<Circle key="a" cx="12" cy="12" r="10" {...p} />, <Polyline key="b" points="12 6 12 12 16 14" {...p} />],
  }
  return <Svg width={size} height={size} viewBox="0 0 24 24">{shapes[name] || shapes.doc}</Svg>
}

// Soft leaves in the corners, as in the design.
function Leaves() {
  return (
    <>
      <Svg style={{ position: 'absolute', top: 0, right: 0, opacity: 0.75 }} width={90} height={130} viewBox="0 0 120 150" fixed>
        <Path d="M120 0 C70 20 60 70 120 110 Z" fill={C.leaf} />
        <Path d="M120 60 C85 75 80 115 120 150 Z" fill={C.leaf} opacity={0.6} />
      </Svg>
      <Svg style={{ position: 'absolute', bottom: 0, left: 0 }} width={130} height={150} viewBox="0 0 130 150" fixed>
        <Path d="M0 150 C10 90 60 60 110 70 C80 100 55 130 0 150 Z" fill={C.leaf} />
        <Path d="M0 100 C20 60 50 50 70 52 C50 75 30 95 0 112 Z" fill={C.leaf} opacity={0.6} />
      </Svg>
    </>
  )
}

function Brand() {
  return (
    <View style={s.brand}>
      <View style={s.brandLeft}><Image src={`${origin}/receipt/sp-mark.png`} style={{ width: 26, height: 26 }} /><Text style={s.brandName}>Sellapage</Text></View>
      <View style={s.motto}><View style={{ width: 16, borderBottomWidth: 1, borderBottomColor: C.muted, marginRight: 6 }} /><Text>Business made simpler.</Text></View>
    </View>
  )
}

function IssuerLogo({ issuer }) {
  if (issuer.logoUrl) return <Image src={issuer.logoUrl.startsWith('/') ? `${origin}${issuer.logoUrl}` : issuer.logoUrl} style={issuer.isSellapage ? { ...s.logo, objectFit: 'contain', backgroundColor: '#fff', padding: 10 } : s.logo} />
  return <View style={s.logoFallback}><Text style={{ fontFamily: 'Bricolage', fontWeight: 800, fontSize: 24, color: C.green }}>{issuer.initials}</Text></View>
}

function Footer({ thanks }) {
  return (
    <View style={s.footer} wrap={false}>
      <View style={s.thanksRow}><View style={s.thanksRule} /><Text style={s.thanks}>{thanks}</Text><View style={s.thanksRule} /></View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Image src={`${origin}/receipt/sp-mark.png`} style={{ width: 18, height: 18 }} /><Text style={{ fontFamily: 'Bricolage', fontWeight: 800, fontSize: 12, marginLeft: 5 }}>Sellapage</Text></View>
      <Text style={s.powered}>Powered by Sellapage · sellapage.com.ng</Text>
    </View>
  )
}

function Meta({ icon, label, value, extra }) {
  return (
    <View style={s.metaRow}>
      <View style={{ marginTop: 1, marginRight: 8 }}><Icon name={icon} size={13} color={C.muted} /></View>
      <View style={{ flexGrow: 1, flexBasis: 0 }}>
        <Text style={s.metaLabel}>{label}</Text>
        <Text style={s.metaValue}>{value}</Text>
        {extra}
      </View>
    </View>
  )
}

function ReceiptPage({ r, qr }) {
  const idText = r.receiptId ? (r.receiptId.length > 22 ? `${r.receiptId.slice(0, 20)}...` : r.receiptId) : (r.receiptIdNote || '-')
  const detailIcon = r.kind === 'order' ? 'bag' : r.kind === 'credits' ? 'sparkles' : 'calendar'
  // A receipt with an item list is taller: the seller's contact moves into the
  // payment row so a normal order still fits on one page.
  const compact = r.detail.items.length > 0
  return (
    <Page size="A4" style={s.page}>
      <Leaves />
      <Brand />
      <View style={s.head}>
        <View style={s.headLeft}>
          <IssuerLogo issuer={r.issuer} />
          <View style={{ marginLeft: 16, flexGrow: 1, flexBasis: 0, justifyContent: 'center' }}>
            <Text style={s.issuer}>{r.issuer.name}</Text>
            <Text style={s.title}>{r.title}</Text>
            <View style={[s.pill, r.status === 'PAID' ? {} : { backgroundColor: '#fdecc8' }]}>
              {r.status === 'PAID' ? <Icon name="check" size={12} /> : <Icon name="clock" size={12} color="#a15c07" />}
              <Text style={[s.pillText, r.status === 'PAID' ? {} : { color: '#a15c07' }]}>{r.status}</Text>
            </View>
          </View>
        </View>
        <View style={s.headRight}>
          <Meta icon="calendar" label="Receipt date" value={fmtDay(r.date)} />
          <View style={s.metaRule} />
          <Meta icon="doc" label="Receipt ID" value={idText}
            extra={r.paymentRef ? <><Text style={[s.metaLabel, { marginTop: 6 }]}>Payment ref</Text><Text style={s.metaValue}>{r.paymentRef}</Text></> : null} />
        </View>
      </View>

      <View style={s.card} wrap={false}>
        <View style={s.cardRow}>
          <View style={s.iconDot}><Icon name="user" /></View>
          <View style={{ flexGrow: 1, flexBasis: 0 }}>
            <Text style={s.cardLabel}>{r.party.label}</Text>
            <Text style={s.cardTitle}>{r.party.name}</Text>
            {r.party.sub ? <Text style={s.cardSub}>{r.party.sub}</Text> : null}
          </View>
        </View>
      </View>

      <View style={s.card}>
        <View style={s.cardRow}>
          <View style={s.iconDot}><Icon name={detailIcon} /></View>
          <View style={{ flexGrow: 1, flexBasis: 0 }}>
            <Text style={s.cardLabel}>{r.detail.label}</Text>
            <Text style={s.cardTitle}>{r.detail.title}</Text>
            {r.detail.lines.map((l, i) => <View key={i} style={s.line}><Icon name={l.icon} size={10} color={C.muted} /><Text style={s.lineText}>{l.text}</Text></View>)}
            {r.detail.items.length > 0 && (
              <View style={s.items}>
                {r.detail.items.map((it, i) => (
                  <View key={i} style={s.itemRow} wrap={false}>
                    <View style={{ flexGrow: 1, flexBasis: 0, paddingRight: 8 }}><Text style={{ fontSize: 10, color: C.ink }}>{it.name}</Text>{it.note ? <Text style={{ fontSize: 8.5, color: C.muted }}>{it.note}</Text> : null}</View>
                    <Text style={{ width: 34, fontSize: 9.5, color: C.muted, textAlign: 'center' }}>x{it.qty}</Text>
                    <Text style={{ width: 90, fontSize: 10, color: C.ink, textAlign: 'right' }}>{ngn(it.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={s.card} wrap={false}>
        <Text style={s.sectionTitle}>Payment breakdown</Text>
        <View style={s.rule} />
        {r.breakdown.map((b) => <View key={b.label} style={s.bRow}><Text style={s.bLabel}>{b.label}</Text><Text style={s.bAmount}>{ngn(b.amount)}</Text></View>)}
        <View style={s.band}><Text style={s.bandLabel}>Grand total</Text><Text style={s.bandTotal}>{ngn(r.total)}</Text></View>
      </View>

      <View style={s.two} wrap={false}>
        <View style={[s.card, s.half, { marginBottom: 0, marginRight: 10 }]}>
          <View style={s.cardRow}>
            <View style={s.iconDot}><Icon name="card" /></View>
            <View style={{ flexGrow: 1, flexBasis: 0 }}>
              <Text style={{ fontSize: 9, color: C.muted }}>Payment method</Text>
              <Text style={s.cardTitle}>{r.method.name}</Text>
              <View style={s.secure}><Icon name="shield" size={9} /><Text style={{ fontSize: 8.5, color: C.green, marginLeft: 3 }}>{r.method.note}</Text></View>
            </View>
          </View>
        </View>
        <View style={[s.card, s.half, { marginBottom: 0 }, compact && r.contact ? { marginRight: 10 } : {}]}>
          <View style={[s.cardRow, { alignItems: 'center' }]}>
            {qr ? <View style={s.qrBox}><Image src={qr} style={{ width: 48, height: 48 }} /></View> : null}
            <View style={{ flexGrow: 1, flexBasis: 0 }}>
              <Text style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>{r.qr.title}</Text>
              <Text style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{r.qr.text}</Text>
            </View>
          </View>
        </View>
        {compact && r.contact ? (
          <View style={[s.card, s.half, { marginBottom: 0 }]}>
            <View style={s.cardRow}>
              <View style={s.iconDot}><Icon name="chat" /></View>
              <View style={{ flexGrow: 1, flexBasis: 0 }}>
                <Text style={{ fontSize: 9, color: C.muted }}>{r.contact.label}</Text>
                <Text style={{ fontSize: 11.5, fontWeight: 700, color: C.ink, marginTop: 1 }}>{r.contact.channel}</Text>
                <Text style={{ fontSize: 9.5, color: C.body, marginTop: 1 }}>{r.contact.value}</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {compact && r.note ? <Text style={[s.script, { textAlign: 'center', marginBottom: 8 }]}>{r.note}</Text> : null}
      {!compact && !!(r.contact || r.note) && (
        <View style={[s.card, { flexDirection: 'row', alignItems: 'center' }]} wrap={false}>
          {r.contact && (
            <View style={[s.cardRow, { flexGrow: 1, flexBasis: 0 }]}>
              <View style={s.iconDot}><Icon name="chat" /></View>
              <View>
                <Text style={{ fontSize: 9, color: C.muted }}>{r.contact.label}</Text>
                <Text style={{ fontSize: 11.5, fontWeight: 700, color: C.ink, marginTop: 1 }}>{r.contact.channel}</Text>
                <Text style={{ fontSize: 10, color: C.body, marginTop: 1 }}>{r.contact.value}</Text>
              </View>
            </View>
          )}
          {r.contact && r.note ? <View style={{ width: 1, height: 40, backgroundColor: C.line, marginHorizontal: 14 }} /> : null}
          {r.note ? <View style={{ flexGrow: 1, flexBasis: 0, alignItems: 'center' }}><Text style={s.script}>{r.note}</Text></View> : null}
        </View>
      )}

      <Footer thanks={r.thanks} />
    </Page>
  )
}

function StatementPage({ r }) {
  return (
    <Page size="A4" style={s.page}>
      <Leaves />
      <Brand />
      <View style={s.head}>
        <View style={s.headLeft}>
          <IssuerLogo issuer={r.issuer} />
          <View style={{ marginLeft: 16, flexGrow: 1, flexBasis: 0, justifyContent: 'center' }}>
            <Text style={s.issuer}>{r.party.name}</Text>
            <Text style={s.title}>{r.title}</Text>
          </View>
        </View>
        <View style={s.headRight}>
          <Meta icon="calendar" label="Statement date" value={fmtDay(r.date)} />
          <View style={s.metaRule} />
          <Meta icon="doc" label="Period" value={r.rows.length ? `${fmtDay(r.from)} to ${fmtDay(r.to)}` : '-'} />
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.sectionTitle}>{r.rows.length} payment{r.rows.length === 1 ? '' : 's'}</Text>
        <View style={s.rule} />
        <View style={[s.bRow, { paddingBottom: 6 }]} fixed>
          <Text style={{ width: 78, fontSize: 8.5, fontWeight: 700, color: C.muted }}>DATE</Text>
          <Text style={{ flexGrow: 1, flexBasis: 0, fontSize: 8.5, fontWeight: 700, color: C.muted }}>DESCRIPTION</Text>
          <Text style={{ width: 90, fontSize: 8.5, fontWeight: 700, color: C.muted, textAlign: 'right' }}>AMOUNT</Text>
        </View>
        {r.rows.map((row, i) => (
          <View key={i} style={[s.bRow, { borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 6 }]} wrap={false}>
            <Text style={{ width: 78, fontSize: 9.5, color: C.body }}>{fmtDay(row.date)}</Text>
            <View style={{ flexGrow: 1, flexBasis: 0, paddingRight: 8 }}><Text style={{ fontSize: 10, color: C.ink }}>{row.description}</Text>{row.ref ? <Text style={{ fontSize: 8, color: C.muted }}>Ref {row.ref}</Text> : null}</View>
            <Text style={{ width: 90, fontSize: 10, color: C.ink, textAlign: 'right' }}>{ngn(row.amount)}</Text>
          </View>
        ))}
        <View style={s.band}><Text style={s.bandLabel}>Total paid</Text><Text style={s.bandTotal}>{ngn(r.total)}</Text></View>
      </View>
      <Footer thanks={r.thanks} />
    </Page>
  )
}

export function ReceiptDocument({ receipts, qrs = [] }) {
  registerFonts()
  return (
    <Document title={receipts[0]?.title || 'Receipt'} author="Sellapage" creator="Sellapage">
      {receipts.map((r, i) => (r.kind === 'statement' ? <StatementPage key={i} r={r} /> : <ReceiptPage key={i} r={r} qr={qrs[i]} />))}
    </Document>
  )
}
