import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import {AuthGuard} from "@nestjs/passport";

@Injectable()
export class GatewayGuard extends AuthGuard("gateway") {
  constructor() {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ) {
    return super.canActivate(context);
  }


}
