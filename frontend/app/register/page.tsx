import { AccountLayout } from '../../components/account-layout';
import { AuthForm } from '../../components/auth-form';

export default function RegisterPage() {
  return (
    <AccountLayout mode="register">
      <AuthForm mode="register" />
    </AccountLayout>
  );
}
