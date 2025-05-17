import {Global, Module} from '@nestjs/common';
import {GatewayStrategy} from "./gateway.strategy";

@Module({
    providers: [
        GatewayStrategy
    ]
})
export class GatewayModule {}
