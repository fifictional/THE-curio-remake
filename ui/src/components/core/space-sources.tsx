import { ChatCitation } from "@/lib/types";
import { CurioLoading } from "../ui/curio-loading";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface SpaceSourcesProps {
  isChatCitationsLoading: boolean;
  citations: ChatCitation[];
}

export function SpaceSources({ isChatCitationsLoading, citations }: SpaceSourcesProps) {
  if (isChatCitationsLoading) {
    return <div className="p-4"><CurioLoading /></div>;
  }

  if (citations?.length === 0) {
    return <div className="p-6 text-center text-sm text-gray-600">No sources available.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 py-4">
      {citations!.map((src) => (
        <SourceCard
          key={src.chatCitationUuid}
          title={src.title}
          url={src.url}
          startIndex={src.startIndex}
          endIndex={src.endIndex}
          messageUuid={src.messageUuid}
        />
      ))}
    </div>
  );
}

function SourceCard({ title, url, startIndex, endIndex, messageUuid }: { title: string; url: string; startIndex?: number; endIndex?: number; messageUuid: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`).then(r => r.json()).then(d => {
      if (!active) return;
      if (d?.imageUrl) setImageUrl(d.imageUrl);
    }).catch(() => {});
    return () => { active = false; };
  }, [url]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-lg border border-chat-panel-border bg-white p-3 shadow-sm cursor-pointer flex items-center gap-3"
      onClick={() => {
        const ev = new CustomEvent('chat-highlight', { detail: { startIndex, endIndex, messageUuid } });
        window.dispatchEvent(ev);
      }}
    >
      <div className="h-12 w-12 flex-shrink-0 rounded bg-gray-100 overflow-hidden flex items-center justify-center">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="preview" className="h-full w-full object-cover" />
        ) : (
          <div className="text-xs text-gray-400">No image</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{title}</div>
        <Link href={url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs underline">
          Follow up on Source <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </motion.div>
  );
}
