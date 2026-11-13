import { cookieBasedClient } from "@ssr/utils";
import { v4 as uuidv4 } from 'uuid';

export async function getSpace(spaceUuid: string) {
  const space = await cookieBasedClient.models.Space.get({ spaceUuid });

  if (space.errors) {
    throw new Error(space.errors[0].message);
  }

  return space.data;
}

export async function getSpaceWithEverything(spaceUuid: string) {
  const space = await cookieBasedClient.models.Space.get({ spaceUuid }, { selectionSet: ['documents.*'] });

  if (space.errors) {
    throw new Error(space.errors[0].message);
  }

  return space.data;
}

export async function createSpace(userId: string) {
  const space = await cookieBasedClient.models.Space.create({
    spaceUuid: uuidv4(),
    userUuid: userId,
    name: 'My Space',
  });

  if (space.errors) {
    throw new Error(space.errors[0].message);
  }

  if (!space.data) {
    throw new Error('Failed to create space');
  }

  return space.data;
}
