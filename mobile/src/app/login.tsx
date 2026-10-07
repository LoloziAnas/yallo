import { SignIn } from '@/screens/sign-in';

/** Sign-in opened from inside the app: at checkout, from Profile or from Help. */
export default function LoginRoute() {
  return <SignIn mode="login" />;
}
