import { Inject, Injectable } from '@nestjs/common';
import { EVENT_TRIGGER, REDIS_API_KEY_PREFIX, SIXTY_SECONDS, START_TIME, TRIGGER_OPERATION } from '../constant';
import { RedisCacheHelper } from '../helpers/RedisCacheHelper';
import { UserOpenOrderService } from './UserOpenOrderService';
import { UserPositionsService } from './UserPositionsService';
import { UserJoinedCupService } from './UserJoinedCupService';
import { QUEUE_SCHEDULED_JOB_PUSH_NOTIFICAION } from 'config/secret';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class WebHookService {
  @Inject(RedisCacheHelper)
  private redisCacheHelper: RedisCacheHelper;

  @Inject()
  private readonly userOpenOrderService: UserOpenOrderService;

  @Inject()
  private readonly userPositionService: UserPositionsService;

  @Inject()
  private userJoinedCupService: UserJoinedCupService;

  constructor(
    @InjectQueue(`${process.env.REDIS_PREFIX}_COPY_TRADING`)
    private readonly copyTradingQueue: Queue,

    @InjectQueue(QUEUE_SCHEDULED_JOB_PUSH_NOTIFICAION)
    private readonly scheduledPushNotificationQueue: Queue,
  ) {}

  async eventWebHook(params) {
    switch (params.trigger.name) {
      case EVENT_TRIGGER.UPDATE_API_KEY: {
        const event = params.event;
        if (event.op === TRIGGER_OPERATION.INSERT) {
          const data = event.data.new;

          this.redisCacheHelper.set(
            `${REDIS_API_KEY_PREFIX}_${data.key}`,
            JSON.stringify({
              userId: data.user_id,
              exchange_name: data.exchange,
              key: data.key,
              secret_key: data.secret_key,
              last_time_executed: new Date(new Date().getTime() - SIXTY_SECONDS),
              is_leader: data.use_for_leader,
              exchangeKeyId: data.id,
            }),
          );

          const newExchangeKeyData = {
            id: data.id,
            userId: data.user_id,
            exchange: data.exchange,
            key: data.key,
            secretKey: data.secret_key,
            useForLeader: data.use_for_leader,
            isSelected: data.is_selected,
          };

          this.userPositionService.addSingleExchangeKeyToScheduledUpdatePositionQueue(newExchangeKeyData);
          this.userOpenOrderService.addSingleExchangeKeyToScheduledUpdateOpenOrderQueue(newExchangeKeyData);
        }

        if (event.op === TRIGGER_OPERATION.DELETE) {
          const data = event.data.old;
          this.redisCacheHelper.del(`${REDIS_API_KEY_PREFIX}_${data.key}`);
        }

        break;
      }

      case EVENT_TRIGGER.UPDATE_USER_JOINED_CUPS:
        {
          const event = params.event;
          switch (event.op) {
            case TRIGGER_OPERATION.INSERT: {
              const data = event.data.new;
              this.userJoinedCupService.updateFirstTimeUserJoinsCup(data);
            }
          }
        }
        break;

      case EVENT_TRIGGER.USER_FOLLOW_LEADER: {
        const event = params.event;
        if (event.op === TRIGGER_OPERATION.INSERT) {
          const data = event.data.new;

          if (data.start_time === START_TIME.IMMEDIATELY) {
            await this.placeOrderForUser(data);
          }
        }

        break;
      }
      case EVENT_TRIGGER.PUSH_NOTIFICATION: {
        const event = params.event;
        if (event.op === TRIGGER_OPERATION.INSERT) {
          const data = event.data.new;
          this.scheduledPushNotificationQueue.add(data);
        }

        break;
      }
    }

    return true;
  }

  async placeOrderForUser(data: any) {
    /**
     * find open position of leader
     * */
    const leaderOpenPositions = await this.userPositionService.findByExchangeKeyIdAndStatus(data.leader_key_id, 'open');
    leaderOpenPositions.forEach((position) => {
      this.copyTradingQueue.add({
        exchangeKeyId: data.leader_key_id,
        userExchangeKeyId: data.key_id,
        exchange: position.exchange,
        order: {
          ...position,
          type: 'market',
          status: position.exchange === 'ftx' ? 'closed' : 'filled',
          side: position.type,
        },
      });
    });

    /**
     * find open order of leader
     * */
    const leaderOpenOrders = await this.userOpenOrderService.findByExchangeKeyId(data.leader_key_id);
    leaderOpenOrders.forEach((openOrder) => {
      this.copyTradingQueue.add({
        exchangeKeyId: data.leader_key_id,
        userExchangeKeyId: data.key_id,
        exchange: openOrder.exchange,
        order: {
          ...openOrder,
          reduce_only: openOrder.reduceOnly,
          stop_price: openOrder.stopPrice,
          activation_price: openOrder.activationPrice,
          callback_rate: openOrder.callbackRate,
          order_id: openOrder.orderId,
          exchange_key_id: openOrder.exchangeKeyId,
        },
      });
    });
  }
}
