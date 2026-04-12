import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { SendMailDto } from './dto/send-mail.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('contact')
  async sendContactEmail(
    @Body() body: SendMailDto,
  ): Promise<{ message: string }> {
    await this.appService.sendContactEmail(body);

    return {
      message: 'Mensaje recibido. Te responderemos en breve.',
    };
  }
}
