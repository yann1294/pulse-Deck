export interface AuthenticatedUser {
  clerkUserId: string;
  sessionId: string;
}

export interface RequestWithUser {
  headers: {
    authorization?: string | string[];
  };
  user?: AuthenticatedUser;
}
