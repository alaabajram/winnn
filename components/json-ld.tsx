/**
 * Structured data. This is what actually produces rich results in search;
 * meta tags alone do not. Server component - it just emits a script tag.
 */
export default function JsonLd(props: { data: any }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(props.data) }}
    />
  );
}
