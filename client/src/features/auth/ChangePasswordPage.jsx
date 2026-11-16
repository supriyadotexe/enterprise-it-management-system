import { useForm } from '../../hooks/useForm.js';
import { authApi } from '../../api/auth.js';
import { useToast } from '../../context/toastContext.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, FormError, Input } from '../../components/ui/Form.jsx';
import { InlineAlert } from '../../components/ui/States.jsx';
import { minLength, required } from '../../utils/validation.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

const INITIAL = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function ChangePasswordPage() {
  useDocumentTitle('Change password');
  const { logout } = useAuth();
  const toast = useToast();
  const form = useForm(INITIAL);

  function onSubmit(event) {
    event.preventDefault();
    const values = form.values;
    const clientErrors = {};
    if (required(values.currentPassword, 'Current password')) {
      clientErrors.currentPassword = required(values.currentPassword, 'Current password');
    }
    if (minLength(values.newPassword, 8, 'New password')) {
      clientErrors.newPassword = minLength(values.newPassword, 8, 'New password');
    }
    if (values.newPassword !== values.confirmPassword) {
      clientErrors.confirmPassword = 'The new password and confirmation do not match.';
    }
    if (values.currentPassword && values.newPassword === values.currentPassword) {
      clientErrors.newPassword = 'Choose a password different from the current one.';
    }

    form.handleSubmit(clientErrors, async () => {
      const result = await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password changed', result.message);
      form.reset(INITIAL);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Change password"
        description="Enter your current password, then choose a new password of at least eight characters."
      />

      <Card>
        <CardHeader
          title="Account credentials"
          description="Changing the password updates your login immediately. Existing sessions remain valid until their token expires."
        />
        <form onSubmit={onSubmit} noValidate>
          <CardBody className="space-y-4">
            {form.formError && <FormError message={form.formError} />}

            <Field
              label="Current password"
              htmlFor="current-password"
              error={form.fieldErrors.currentPassword}
              required
            >
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={form.values.currentPassword}
                onChange={(event) => form.setValue('currentPassword', event.target.value)}
                error={form.fieldErrors.currentPassword}
              />
            </Field>

            <Field
              label="New password"
              htmlFor="new-password"
              error={form.fieldErrors.newPassword}
              hint="At least 8 characters. Use a password you do not use elsewhere."
              required
            >
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={form.values.newPassword}
                onChange={(event) => form.setValue('newPassword', event.target.value)}
                error={form.fieldErrors.newPassword}
              />
            </Field>

            <Field
              label="Confirm new password"
              htmlFor="confirm-password"
              error={form.fieldErrors.confirmPassword}
              required
            >
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={form.values.confirmPassword}
                onChange={(event) => form.setValue('confirmPassword', event.target.value)}
                error={form.fieldErrors.confirmPassword}
              />
            </Field>

            <InlineAlert tone="neutral">
              For this prototype, the token is not revoked when the password changes. Sign out
              afterwards if you are using a shared device.
            </InlineAlert>
          </CardBody>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-between">
            <Button variant="secondary" onClick={() => logout()}>
              Sign out instead
            </Button>
            <Button type="submit" loading={form.submitting}>
              Update password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
