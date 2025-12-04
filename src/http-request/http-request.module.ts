import { Global, Module } from '@nestjs/common';
import { HttpRequestService } from './http-request.service';
import { HttpModule } from '@nestjs/axios';

@Global()
@Module({
  imports: [HttpModule],
  providers: [HttpRequestService],
  exports: [HttpRequestService],
})
export class HttpRequestModule {}
