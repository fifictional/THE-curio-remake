import { useSpaceContext } from "@/providers";
import { SpaceLibrary } from "../space-library";

export function SpaceLibraryAsTab() {
  const { spaceUuid } = useSpaceContext();
  
  return <SpaceLibrary spaceUuid={spaceUuid || undefined} />;
}