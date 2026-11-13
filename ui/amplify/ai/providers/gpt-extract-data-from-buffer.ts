export interface StreamEvent {
    name: string;
    data: unknown;
    rawData: string;
  }
  
  export function extractDataFromBuffer(buffer: string): { events: StreamEvent[]; remainder: string } {
    const events: StreamEvent[] = [];
    let remainder = '';
  
    // Match blocks like:
    // event: <eventName>\n
    // data: { json }
    // ... up to the next "event:" or end of string
    const pattern = /event:\s*([^\n]+)\s*[\r\n]+data:\s*([\s\S]*?)(?=(?:\r?\n)event:|\s*$)/g;
  
    let match: RegExpExecArray | null;
    let lastProcessedEnd = 0;
  
    while ((match = pattern.exec(buffer)) !== null) {
      const startIndex = match.index;
      const endIndex = pattern.lastIndex;
      const eventName = match[1].trim();
      const rawDataBlock = match[2].trim();
  
      // Try to parse JSON. If it fails, this block is incomplete; leave it in remainder
      try {
        const parsed = JSON.parse(rawDataBlock);
        events.push({ name: eventName, data: parsed, rawData: rawDataBlock });
        lastProcessedEnd = endIndex;
      } catch {
        // Incomplete JSON; everything from this event onward stays in remainder
        remainder = buffer.slice(startIndex);
        return { events, remainder };
      }
    }
  
    // Any trailing data after the last fully parsed block becomes remainder
    remainder = buffer.slice(lastProcessedEnd);
    return { events, remainder };
  }
  
  export default extractDataFromBuffer;

