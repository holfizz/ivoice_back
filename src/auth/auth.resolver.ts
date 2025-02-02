import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { AuthService } from "./auth.service";
import { AuthResponse } from "./dto/auth.response";

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse)
  async telegramAuth(@Args("telegramId") telegramId: string): Promise<AuthResponse> {
    const user = await this.authService.getUser(telegramId);
    if (!user) {
      await this.authService.createUser(telegramId);
    }
    return { success: true };
  }
}
