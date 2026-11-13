import Cookies from 'js-cookie'

export function getUserIdCookie(): string | undefined {
  return Cookies.get('userId');
}

export function setUserIdCookie(userId: string) {
  Cookies.set('userId', userId, {
    path: '/',
    expires: 30,
    secure: true,
    sameSite: 'strict',
  });
}