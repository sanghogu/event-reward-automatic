import {Global, Module} from '@nestjs/common';
import {GatewayStrategy} from "./gateway.strategy";
import {UserModule} from "../user/user.module";
import {PassportModule} from "@nestjs/passport";

@Module({
    providers: [
        GatewayStrategy
    ],
    imports: [UserModule],
})
export class GatewayModule {}
