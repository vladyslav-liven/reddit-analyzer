import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error';

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} → ${status}: ${(exception as any)?.message}`, (exception as any)?.stack);
    }

    response.status(status).json({ statusCode: status, message, timestamp: new Date().toISOString() });
  }
}
