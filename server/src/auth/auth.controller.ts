import { Controller, Get, UseGuards } from "@nestjs/common";
import { ClerkAuthGuard } from "./clerk-auth.guard";
import { CurrentUser } from "./current-user.decorator";
import type { AuthenticatedUser } from "./auth.types";

@Controller("auth")
export class AuthController {
  @Get("me")
  @UseGuards(ClerkAuthGuard)
  getCurrentUser(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
