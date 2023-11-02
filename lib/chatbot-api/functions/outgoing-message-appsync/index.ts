import {
    BatchProcessor,
    EventType,
    processPartialResponse,
  } from '@aws-lambda-powertools/batch';
  import { Logger } from '@aws-lambda-powertools/logger';
  import type {
    SQSEvent,
    SQSRecord,
    Context,
    SQSBatchResponse,
  } from 'aws-lambda';
  import { mutation } from './graphql';
 
  const processor = new BatchProcessor(EventType.SQS); 
  const logger = new Logger();
 
  const recordHandler = async (record: SQSRecord): Promise<void> => { 
    const payload = record.body;
    if (payload) {
      const item = JSON.parse(payload);
      logger.info('Processed item', { item });
      /*
      payload: str = record.body
      message: dict = json.loads(payload)
      detail: dict = json.loads(message["Message"])
      logger.info(detail)
      user_id = detail["userId"]
      connection_id = detail["connectionId"]
      */
      await mutation(item.Message);
    }
  };
 
  export const handler = async (
    event: SQSEvent,
    context: Context
  ): Promise<SQSBatchResponse> => {
    return processPartialResponse(event, recordHandler, processor, { 
      context,
    });
  };
 