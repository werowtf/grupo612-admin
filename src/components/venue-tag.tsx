export function VenueTag({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-500 px-2 py-0.5 text-xs font-medium text-white">
      {name}
    </span>
  );
}
