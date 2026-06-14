import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const validKey = this.config.get<string>("API_KEY");
    if (!validKey) {
      throw new InternalServerErrorException("API_KEY is not configured");
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-api-key"];
    if (apiKey !== validKey) {
      throw new UnauthorizedException("Unauthorized");
    }

    return true;
  }
}
