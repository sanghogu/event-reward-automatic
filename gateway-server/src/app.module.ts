import { Module } from '@nestjs/common';
import { JwtAuthModule } from './jwt-auth/jwt-auth.module';
import { ConfigModule } from "@nestjs/config";
import { ProxyModule } from './proxy/proxy.module';
import { ServiceRegistryModule } from './service-registry/service-registry.module';
import * as Joi from "joi";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development'],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validationSchema: Joi.object({
        JWT_SECRET: Joi.string().required(),
        PROXY_HTTP_TIMEOUT_MS: Joi.number().required(),
        DEFAULT_AUTH_SERVICE_URL: Joi.string().required(),
        DEFAULT_EVENT_SERVICE_URL: Joi.string().required(),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
      }),
    }),
    JwtAuthModule,
    ProxyModule,
    ServiceRegistryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
