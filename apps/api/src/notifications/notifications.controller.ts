import { Body, Controller, Post, HttpException, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

class SubscribeDto {
  userId: string;
  fcmToken: string;
  deviceInfo?: Record<string, any>;
}

class UnsubscribeDto {
  userId: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeDto) {
    if (!dto.userId || !dto.fcmToken) {
      throw new HttpException('userId and fcmToken are required', HttpStatus.BAD_REQUEST);
    }

    const success = await this.notificationsService.subscribe(
      dto.userId,
      dto.fcmToken,
      dto.deviceInfo,
    );

    if (!success) {
      throw new HttpException('Failed to subscribe', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return { success: true };
  }

  @Post('unsubscribe')
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    if (!dto.userId) {
      throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
    }

    const success = await this.notificationsService.unsubscribe(dto.userId);

    if (!success) {
      throw new HttpException('Failed to unsubscribe', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return { success: true };
  }
}
