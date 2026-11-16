import { useEffect } from 'react';
import { employeesApi } from '../../api/employees.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/toastContext.js';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, FormError, FormGrid, Input, Select } from '../../components/ui/Form.jsx';
import { email as emailRule, minLength, required } from '../../utils/validation.js';

export const EMPLOYEE_INITIAL = {
  employee_code: '',
  full_name: '',
  email: '',
  phone: '',
  designation: '',
  department_id: '',
  date_joined: '',
  createAccount: false,
  username: '',
  role_id: '',
  password: '',
};

export default function EmployeeFormModal({
  open,
  employee,
  departments,
  roles,
  onClose,
  onSaved,
}) {
  const toast = useToast();
  const form = useForm(EMPLOYEE_INITIAL);
  const employeeId = employee?.employee_id ?? null;

  useEffect(() => {
    if (!open) return;
    if (employee) {
      form.setValues({
        employee_code: employee.employee_code ?? '',
        full_name: employee.full_name ?? '',
        email: employee.email ?? '',
        phone: employee.phone ?? '',
        designation: employee.designation ?? '',
        department_id: String(employee.department_id ?? ''),
        date_joined: employee.date_joined ?? '',
        createAccount: false,
        username: '',
        role_id: '',
        password: '',
      });
    } else {
      form.reset(EMPLOYEE_INITIAL);
    }
    // Form setters are stable; re-running on each keystroke would reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employeeId]);

  function onSubmit(event) {
    event.preventDefault();
    const values = form.values;
    const errors = {};

    const codeError = required(values.employee_code, 'Employee code');
    if (codeError) errors.employee_code = codeError;
    else if (!/^[A-Za-z0-9-]{2,20}$/.test(values.employee_code.trim())) {
      errors.employee_code = 'Use 2–20 letters, numbers and hyphens only.';
    }
    const nameError = required(values.full_name, 'Full name');
    if (nameError) errors.full_name = nameError;
    else if (values.full_name.trim().length < 2) {
      errors.full_name = 'Full name must be at least 2 characters.';
    }
    const emailError = required(values.email, 'Email');
    if (emailError) errors.email = emailError;
    else if (emailRule(values.email)) errors.email = emailRule(values.email);
    if (required(values.designation, 'Designation')) {
      errors.designation = required(values.designation, 'Designation');
    }
    if (!values.department_id) errors.department_id = 'Select a department.';

    if (!employee && values.createAccount) {
      const usernameError = required(values.username, 'Username');
      if (usernameError) errors.username = usernameError;
      else if (!/^[A-Za-z0-9._-]{3,50}$/.test(values.username.trim())) {
        errors.username = 'Use 3–50 letters, numbers, dots, underscores or hyphens.';
      }
      if (!values.role_id) errors.role_id = 'Select a role for the account.';
      const passwordError = minLength(values.password, 8, 'Password');
      if (passwordError) errors.password = passwordError;
    }
    if (
      values.date_joined &&
      values.date_joined > new Date().toISOString().slice(0, 10)
    ) {
      errors.date_joined = 'Date joined cannot be in the future.';
    }

    form.handleSubmit(errors, async () => {
      const employeePayload = {
        employee_code: values.employee_code.trim(),
        department_id: Number(values.department_id),
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || null,
        designation: values.designation.trim(),
        date_joined: values.date_joined || null,
      };

      let saved;
      if (employee) {
        saved = await employeesApi.update(employee.employee_id, employeePayload);
        toast.success('Employee updated', `${saved.full_name}'s record has been saved.`);
      } else {
        const payload = { employee: employeePayload };
        if (values.createAccount) {
          payload.account = {
            username: values.username.trim(),
            role_id: Number(values.role_id),
            password: values.password,
          };
        }
        saved = await employeesApi.create(payload);
        toast.success('Employee created', `${saved.full_name} has been added to the directory.`);
      }
      onSaved?.(saved);
    });
  }

  const activeRoles = roles.filter((role) => role.role_name);

  return (
    <Modal
      open={open}
      onClose={form.submitting ? undefined : onClose}
      title={employee ? 'Edit employee' : 'New employee'}
      description={
        employee
          ? 'Update the employee record. Account credentials are managed separately.'
          : 'Create the employee record, optionally with a sign-in account.'
      }
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={form.submitting}>
            Cancel
          </Button>
          <Button type="submit" form="employee-form" loading={form.submitting}>
            {employee ? 'Save changes' : 'Create employee'}
          </Button>
        </div>
      }
    >
      <form id="employee-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        {form.formError && <FormError message={form.formError} />}

        <FormGrid>
          <Field
            label="Employee code"
            htmlFor="employee-code"
            error={form.fieldErrors.employee_code}
            required
          >
            <Input
              id="employee-code"
              value={form.values.employee_code}
              maxLength={20}
              onChange={(event) => form.setValue('employee_code', event.target.value)}
              error={form.fieldErrors.employee_code}
              placeholder="e.g. EMP-1041"
            />
          </Field>
          <Field
            label="Full name"
            htmlFor="employee-name"
            error={form.fieldErrors.full_name}
            required
          >
            <Input
              id="employee-name"
              value={form.values.full_name}
              maxLength={120}
              onChange={(event) => form.setValue('full_name', event.target.value)}
              error={form.fieldErrors.full_name}
            />
          </Field>
          <Field label="Email" htmlFor="employee-email" error={form.fieldErrors.email} required>
            <Input
              id="employee-email"
              type="email"
              value={form.values.email}
              maxLength={150}
              onChange={(event) => form.setValue('email', event.target.value)}
              error={form.fieldErrors.email}
            />
          </Field>
          <Field label="Phone" htmlFor="employee-phone" error={form.fieldErrors.phone} hint="Optional.">
            <Input
              id="employee-phone"
              value={form.values.phone}
              maxLength={20}
              onChange={(event) => form.setValue('phone', event.target.value)}
              error={form.fieldErrors.phone}
            />
          </Field>
          <Field
            label="Designation"
            htmlFor="employee-designation"
            error={form.fieldErrors.designation}
            required
          >
            <Input
              id="employee-designation"
              value={form.values.designation}
              maxLength={80}
              onChange={(event) => form.setValue('designation', event.target.value)}
              error={form.fieldErrors.designation}
            />
          </Field>
          <Field
            label="Department"
            htmlFor="employee-department"
            error={form.fieldErrors.department_id}
            required
          >
            <Select
              id="employee-department"
              value={form.values.department_id}
              onChange={(event) => form.setValue('department_id', event.target.value)}
              error={form.fieldErrors.department_id}
            >
              <option value="">Select a department</option>
              {departments.map((department) => (
                <option
                  key={department.department_id}
                  value={department.department_id}
                  disabled={!department.is_active}
                >
                  {department.name}
                  {!department.is_active ? ' (inactive)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Date joined"
            htmlFor="employee-joined"
            error={form.fieldErrors.date_joined}
            hint="Optional."
          >
            <Input
              id="employee-joined"
              type="date"
              value={form.values.date_joined}
              onChange={(event) => form.setValue('date_joined', event.target.value)}
              error={form.fieldErrors.date_joined}
            />
          </Field>
        </FormGrid>

        {!employee && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={form.values.createAccount}
                onChange={(event) => form.setValue('createAccount', event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  Create a sign-in account now
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  Optional. You can also create an account later from the employee record or the
                  users page.
                </span>
              </span>
            </label>

            {form.values.createAccount && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <FormGrid>
                  <Field
                    label="Username"
                    htmlFor="employee-username"
                    error={form.fieldErrors.username}
                    required
                  >
                    <Input
                      id="employee-username"
                      autoComplete="off"
                      value={form.values.username}
                      maxLength={50}
                      onChange={(event) => form.setValue('username', event.target.value)}
                      error={form.fieldErrors.username}
                    />
                  </Field>
                  <Field
                    label="Role"
                    htmlFor="employee-role"
                    error={form.fieldErrors.role_id}
                    required
                  >
                    <Select
                      id="employee-role"
                      value={form.values.role_id}
                      onChange={(event) => form.setValue('role_id', event.target.value)}
                      error={form.fieldErrors.role_id}
                    >
                      <option value="">Select a role</option>
                      {activeRoles.map((role) => (
                        <option key={role.role_id} value={role.role_id}>
                          {role.role_name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Initial password"
                    htmlFor="employee-password"
                    error={form.fieldErrors.password}
                    hint="At least 8 characters."
                    required
                  >
                    <Input
                      id="employee-password"
                      type="password"
                      autoComplete="new-password"
                      value={form.values.password}
                      maxLength={72}
                      onChange={(event) => form.setValue('password', event.target.value)}
                      error={form.fieldErrors.password}
                    />
                  </Field>
                </FormGrid>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
