import { Space } from "./space";

export type User = {
  userUuid: string;
  spaces: Space[];
};