import { AccountLayout } from '../../components/account-layout';
import { AuthForm } from '../../components/auth-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const params = await searchParams;
  return (
    <AccountLayout mode="login" registeredSuccess={params?.registered === '1'}>
      <AuthForm mode="login" />
    </AccountLayout>
  );
}
