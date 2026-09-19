import type {
  AuthEvent,
  AuthListener,
  AuthResponse,
  User,
} from "@/app/dev/types/auth.types";
import { getCurrentUserAction, loginAction, logoutAction, registerAction } from "../actions/auth.actions";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/users";

export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3001";

class AuthService {
  private currentUser: User | null = null;
  private isAuthenticated = false;
  private authListeners: AuthListener[] = [];

  async initialize(): Promise<User | null> {
    try {
      const user = await getCurrentUserAction();

      if (!user) {
        this.currentUser = null;
        this.isAuthenticated = false;
        return null;
      }

      this.currentUser = user;
      this.isAuthenticated = true;

      this.notifyListeners({ type: "LOGIN", user });

      return user;
    } catch (error) {
      console.error("Erreur lors de l'initialisation de l'auth:", error);
      this.currentUser = null;
      this.isAuthenticated = false;
      return null;
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const result = await loginAction(email, password);

    if (!result.success || !result.user) {
      return result;
    }

    this.currentUser = result.user;
    this.isAuthenticated = true;
    this.notifyListeners({ type: "LOGIN", user: result.user });

    return result;
  }

  async register(userData: Record<string, unknown>): Promise<AuthResponse> {
    const result = await registerAction(userData);

    if (!result.success || !result.user) {
      return result;
    }

    this.currentUser = result.user;
    this.isAuthenticated = true;
    this.notifyListeners({ type: "REGISTER", user: result.user });

    return result;
  }

  async logout(): Promise<AuthResponse> {
    const result = await logoutAction();
    await this.performLocalLogout();
    return result;
  }

  async performLocalLogout(): Promise<AuthResponse> {
    const previousUser = this.currentUser;

    this.currentUser = null;
    this.isAuthenticated = false;

    this.notifyListeners({
      type: "LOGOUT",
      previousUser,
    });

    return {
      success: true,
    };
  }

  async forceLogout(): Promise<AuthResponse> {
    await this.performLocalLogout();

    return {
      success: true,
      message: "Déconnexion locale réussie",
      forced: true,
    };
  }

  async loginAsGuest(): Promise<AuthResponse> {
    const guestUser: User = {
      _id: `guest_${Date.now()}`,
      name: "Invité",
      email: "guest@example.com",
      avatar: null,
      isGuest: true,
    };

    this.currentUser = guestUser;
    this.isAuthenticated = true;

    this.notifyListeners({
      type: "GUEST_LOGIN",
      user: guestUser,
    });

    return {
      success: true,
      user: guestUser,
    };
  }

  async updateProfile(
    updates: Partial<User>
  ): Promise<AuthResponse> {
    try {
      if (!this.currentUser) {
        return {
          success: false,
          error: "Utilisateur non connecté",
        };
      }

      const res = await fetch(
        `${BASE_URL}/${this.currentUser._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(updates),
        }
      );

      const data: AuthResponse = await res.json();

      if (!res.ok || !data.success || !data.user) {
        return {
          success: false,
          error:
            data.error ??
            "Erreur lors de la mise à jour du profil",
        };
      }

      this.currentUser = data.user;

      this.notifyListeners({
        type: "PROFILE_UPDATE",
        user: data.user,
      });

      return {
        success: true,
        user: data.user,
      };
    } catch (error) {
      console.error(
        "Erreur de mise à jour du profil:",
        error
      );

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      };
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  addAuthListener(listener: AuthListener): () => void {
    this.authListeners.push(listener);

    return () => {
      this.authListeners = this.authListeners.filter(
        (item) => item !== listener
      );
    };
  }

  private notifyListeners(event: AuthEvent): void {
    this.authListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error(
          "Erreur dans le listener auth:",
          error
        );
      }
    });
  }

  async clearAllData(): Promise<AuthResponse> {
    await this.performLocalLogout();

    this.notifyListeners({
      type: "DATA_CLEARED",
    });

    return {
      success: true,
    };
  }
}

export default new AuthService();