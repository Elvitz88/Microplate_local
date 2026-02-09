class AuthError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number = 400, code: string = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor(message: string = 'Invalid credentials') {
    super(message, 401, 'INVALID_CREDENTIALS');
  }
}
