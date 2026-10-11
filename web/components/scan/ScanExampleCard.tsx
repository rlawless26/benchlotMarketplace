/**
 * A static, server-rendered example of a scan result. Lives on the landing
 * section of /scan so a crawler (and a visitor who has not uploaded anything)
 * can see what the page produces.
 */
export default function ScanExampleCard() {
  const field = (label: string, value: string, wide = false) => (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-spruce-light">{label}</dt>
      <dd className="rounded border border-bone-dark bg-bone px-3 py-2 text-dark-teal">{value}</dd>
    </div>
  );
  return (
    <div className="rounded-xl border border-bone-dark bg-bone-light shadow-sm">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-bone-dark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/toolscan-example-stanley-no5.jpg" alt="Stanley No. 5 jack plane" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl font-semibold text-spruce">
              Stanley No. 5 Jack Plane — Type 11, c. 1910–1918
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-spruce-light">
              <span><strong className="text-dark-teal">Maker:</strong> Stanley</span>
              <span><strong className="text-dark-teal">Model:</strong> No. 5</span>
              <span><strong className="text-dark-teal">Era:</strong> 1910–1918</span>
              <span className="tnum font-semibold text-honey-dark">Recent sales $75–$110</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 font-medium text-success">High confidence</span>
              <span className="rounded-full bg-info/10 px-2.5 py-0.5 font-medium text-info">Good condition</span>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-bone-dark px-5 pb-5 pt-4">
        <h4 className="font-display text-base font-semibold uppercase tracking-wide text-spruce">What you get back</h4>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {field('Tool type', 'Bench plane')}
          {field('Maker', 'Stanley')}
          {field('Model', 'No. 5')}
          {field('Condition', 'Good')}
          {field('Condition notes', 'Tote has a minor chip at the top but is solid. Knob is original with light wear. Iron has been sharpened but retains good length. Japanning about 60% intact. Frog mates well to the bed.', true)}
          {field('How it was identified', 'Type 11 identified by the "STANLEY" lateral lever marking, kidney-shaped lever cap hole, and rosewood handles. Patent dates behind the frog are consistent with 1910–1918 production.', true)}
        </dl>
      </div>
    </div>
  );
}
