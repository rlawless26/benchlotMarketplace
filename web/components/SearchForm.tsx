/**
 * Plain GET form: works without JavaScript, which matters for a page whose
 * whole audience arrives from a search engine and may leave in two seconds.
 *
 * `action` defaults to the price-guide search. The homepage points it at the
 * CRA listings grid (/search), which reads the same `q` parameter.
 *
 * The field is bone-light with a spruce border: a bone field on the bone
 * page (and on the bone-light header) disappeared into the background, so
 * only the honey button read as a control.
 */
export default function SearchForm({
  compact = false, defaultValue = '', action = '/guide/search', placeholder, label, id,
}: {
  compact?: boolean;
  defaultValue?: string;
  action?: string;
  placeholder?: string;
  label?: string;
  id?: string;
}) {
  const inputId = id ?? (compact ? 'q-header' : 'q');
  return (
    <form action={action} method="get" role="search"
          className={compact ? 'flex items-center gap-2' : 'flex flex-col gap-2 sm:flex-row'}>
      <label htmlFor={inputId} className="sr-only">{label ?? 'Search the price guide'}</label>
      <input
        id={inputId}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder ?? (compact ? 'Search a brand or tool' : 'Brand or tool, e.g. Stanley No. 5 or Festool Domino')}
        autoComplete="off"
        className={
          compact
            ? 'w-40 rounded border border-spruce/35 bg-bone-light px-2.5 py-1.5 text-sm text-dark-teal shadow-[inset_0_1px_2px_rgba(26,48,48,0.08)] placeholder:text-spruce-light focus:border-honey focus:outline-none sm:w-64'
            : 'w-full rounded border border-spruce/35 bg-bone-light px-3 py-2.5 text-dark-teal shadow-[inset_0_1px_2px_rgba(26,48,48,0.08)] placeholder:text-spruce-light focus:border-honey focus:outline-none'
        }
      />
      <button type="submit"
              className={
                compact
                  ? 'rounded bg-honey px-3 py-1.5 text-sm font-medium text-dark-teal hover:bg-honey-light'
                  : 'rounded bg-honey px-5 py-2.5 font-medium text-dark-teal hover:bg-honey-light'
              }>
        Search
      </button>
    </form>
  );
}
