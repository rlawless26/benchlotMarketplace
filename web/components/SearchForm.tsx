/**
 * Plain GET form: works without JavaScript, which matters for a page whose
 * whole audience arrives from a search engine and may leave in two seconds.
 */
export default function SearchForm({
  compact = false, defaultValue = '',
}: { compact?: boolean; defaultValue?: string }) {
  return (
    <form action="/guide/search" method="get" role="search"
          className={compact ? 'flex items-center gap-2' : 'flex flex-col gap-2 sm:flex-row'}>
      <label htmlFor={compact ? 'q-header' : 'q'} className="sr-only">Search the price guide</label>
      <input
        id={compact ? 'q-header' : 'q'}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={compact ? 'Search a brand or tool' : 'Brand or tool, e.g. Stanley No. 5 or Festool Domino'}
        autoComplete="off"
        className={
          compact
            ? 'w-40 rounded border border-bone-dark bg-bone px-2.5 py-1.5 text-sm text-dark-teal placeholder:text-spruce-light focus:border-honey focus:outline-none sm:w-64'
            : 'w-full rounded border border-bone-dark bg-bone px-3 py-2.5 text-dark-teal placeholder:text-spruce-light focus:border-honey focus:outline-none'
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
