export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string | null;
  isGuest?: boolean;
  is_online?: boolean;
}

export interface AuthEvent {
  type:
  | "LOGIN"
  | "REGISTER"
  | "LOGOUT"
  | "GUEST_LOGIN"
  | "PROFILE_UPDATE"
  | "DATA_CLEARED";
  user?: User | null;
  previousUser?: User | null;
}

export type AuthListener = (event: AuthEvent) => void;

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  message?: string;
  forced?: boolean;
}