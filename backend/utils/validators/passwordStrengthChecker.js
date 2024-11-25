exports.checkPasswordStrength = (password) => {
  // Check if password is strong
  const passwordErrors = [];

  if (password.length < 8 || password.length > 24) {
    passwordErrors.push("Password must be between 8 and 24 characters");
  }
  if (!/[a-z]/.test(password)) {
    passwordErrors.push("Password must contain at least 1 lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    passwordErrors.push("Password must contain at least 1 uppercase letter");
  }
  if (!/\d/.test(password)) {
    passwordErrors.push("Password must contain at least 1 number");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
    passwordErrors.push("Password must contain at least 1 special character");
  }

  return passwordErrors;
};
