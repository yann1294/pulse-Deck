import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { verifyToken } from "@clerk/backend";
import type { AuthenticatedUser, RequestWithUser } from "./auth.types";

interface ClerkSessionClaims {
  sub?: unknown;
  sid?: unknown;
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.getBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const secretKey = this.configService.get<string>("CLERK_SECRET_KEY");
    const jwtKey = this.configService.get<string>("CLERK_JWT_KEY");
    const authorizedParties = this.getAuthorizedParties();

    if (!secretKey && !jwtKey) {
      throw new UnauthorizedException("Clerk authentication is not configured");
    }

    try {
      const claims = (await verifyToken(token, {
        secretKey,
        jwtKey,
        authorizedParties
      })) as ClerkSessionClaims;

      request.user = this.toAuthenticatedUser(claims);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid bearer token");
    }
  }

  private getBearerToken(authorizationHeader: string | string[] | undefined): string | undefined {
    const header = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;

    if (!header) {
      return undefined;
    }

    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return undefined;
    }

    return token;
  }

  private getAuthorizedParties(): string[] | undefined {
    const authorizedParty = this.configService.get<string>("CLERK_AUTHORIZED_PARTY");

    if (!authorizedParty) {
      return undefined;
    }

    return authorizedParty
      .split(",")
      .map((party) => party.trim())
      .filter(Boolean);
  }

  private toAuthenticatedUser(claims: ClerkSessionClaims): AuthenticatedUser {
    if (typeof claims.sub !== "string" || typeof claims.sid !== "string") {
      throw new UnauthorizedException("Invalid Clerk session claims");
    }

    return {
      clerkUserId: claims.sub,
      sessionId: claims.sid
    };
  }
}
