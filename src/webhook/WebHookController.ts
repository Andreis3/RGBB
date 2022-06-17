import { Controller, Inject, Post, Req, Res } from '@nestjs/common';
import { WebHookService } from '../../services/WebHookService';

@Controller()
export class WebHookController {
  @Inject(WebHookService)
  private webhookService: WebHookService;

  @Post('/webhook')
  async listenEvent(@Req() req, @Res() res) {
    const response = await this.webhookService.eventWebHook(req.body);

    if (response) {
      return res.status(200).send('Trigger Successfully');
    }
    return res.status(500).send('Internal Server Error');
  }
}
