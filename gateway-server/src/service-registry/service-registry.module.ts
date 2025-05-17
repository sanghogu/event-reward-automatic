import {Global, Module} from '@nestjs/common';
import {ServiceRegistryService} from "./service-registry.service";

@Global() //글로벌 모듈 설정
@Module({
    providers: [ServiceRegistryService],
    exports: [ServiceRegistryService],
})
export class ServiceRegistryModule {}
