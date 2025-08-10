import { Module } from '@nestjs/common';
import { Provider1Service } from './provider1/provider1.service';
import { Provider2Service } from './provider2/provider2.service';
import { HttpModule } from '@nestjs/axios';
import { ProvidersService } from './providers.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 1,
    }),
  ],
  providers: [Provider1Service, Provider2Service, ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
