import { useSessionContext } from "@/providers";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export const RateLimits = () => {
  const rpdLimit = process.env.NEXT_PUBLIC_RPD_LIMIT;
  const rpmLimit = process.env.NEXT_PUBLIC_RPM_LIMIT;
  const tpmLimit = process.env.NEXT_PUBLIC_TPM_LIMIT;
  const tpdLimit = process.env.NEXT_PUBLIC_TPD_LIMIT;

  const dpdLimit = process.env.NEXT_PUBLIC_DPD_LIMIT;
  const tdpdLimit = process.env.NEXT_PUBLIC_TDPD_LIMIT;

  const [isOpen, setIsOpen] = useState(false);
  const { userRequestsToday, userRequestsLastMinute, tokenCountToday, tokenCountLastMinute, documentCountToday, documentTokenCountToday } = useSessionContext();

  return (
    <div className="flex flex-col gap-3 w-full bg-white p-4 rounded-lg">
      <div 
        className="flex items-center cursor-pointer justify-between" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <h1 className="text-lg font-medium text-gray-500">Rate Limits</h1>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 mr-2" />
        ) : (
          <ChevronDown className="h-4 w-4 mr-2" />
        )}
      </div>

      {isOpen && (
        <>
          <h3 className="text-sm font-semibold">Chat</h3>
          <Limit title="Requests (pd)" value={userRequestsToday} maxValue={rpdLimit ? parseInt(rpdLimit) : 0} />
          <Limit title="Request (pm)" value={userRequestsLastMinute} maxValue={rpmLimit ? parseInt(rpmLimit) : 0} />
          <Limit title="Tokens (pd)" value={tokenCountToday} maxValue={tpdLimit ? parseInt(tpdLimit) : 0} />
          <Limit title="Tokens (pm)" value={tokenCountLastMinute} maxValue={tpmLimit ? parseInt(tpmLimit) : 0} />

          <h3 className="text-sm font-semibold">Document Analysis</h3>
          <Limit title="Documents (pd)" value={documentCountToday} maxValue={dpdLimit ? parseInt(dpdLimit) : 0} />
          <Limit title="Tokens (pd)" value={documentTokenCountToday} maxValue={tdpdLimit ? parseInt(tdpdLimit) : 0} />
        </>
      )}
    </div>
  );
};

const Limit = ({ title, value, maxValue }: { title: string, value: number, maxValue: number }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2 items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-sm">{value} / {maxValue}</p>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full">
        <div className="h-full bg-gray-500 rounded-full max-w-full transition-all duration-300" style={{ width: `${(value / maxValue) * 100}%` }}></div>
      </div>
    </div>
  );
};