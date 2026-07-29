import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function Prose({ markdown }: { markdown: string }) {
  return (
    <div
      className={[
        "space-y-4 text-sm leading-relaxed text-neutral-800",
        // links & inline code
        "[&_a]:font-medium [&_a]:text-okta-600 [&_a]:underline",
        "[&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:text-[0.85em]",
        // headings — h2 rarely appears here (spec-sheet promotes them to
        // chapter headers); h3 renders as a small-caps subhead
        "[&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-neutral-900",
        "[&_h3]:mt-6 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-okta-700",
        // lists — okta markers, roomier rhythm
        "[&_li]:ml-5 [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ul]:list-disc [&_ul]:space-y-1.5",
        "[&_li::marker]:text-okta-500 [&_li::marker]:font-semibold",
        // pull-quotes — the Georgia italic accent from the hero
        "[&_blockquote]:border-l-4 [&_blockquote]:border-okta-500 [&_blockquote]:bg-okta-50/60 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-base [&_blockquote]:italic [&_blockquote]:text-neutral-800 [&_blockquote]:[font-family:Georgia,'Times_New_Roman',serif] [&_blockquote]:rounded-r-lg",
        // tables — hairline spec tables
        "[&_table]:w-full [&_table]:text-sm",
        "[&_th]:border-b-2 [&_th]:border-neutral-200 [&_th]:bg-transparent [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-neutral-500",
        "[&_td]:border-b [&_td]:border-neutral-100 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
        // emphasis
        "[&_strong]:font-semibold [&_strong]:text-neutral-900",
        "[&_hr]:border-neutral-200",
      ].join(" ")}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}

export { Prose };
