export const loginBody = {
  username: { type: 'string', required: true, min: 1, max: 50, nullable: false },
  password: { type: 'string', required: true, min: 1, max: 72, nullable: false },
};

export const changePasswordBody = {
  currentPassword: { type: 'string', required: true, min: 1, max: 72, nullable: false },
  newPassword: { type: 'string', required: true, min: 8, max: 72, nullable: false },
};
