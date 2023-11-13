"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const batch_1 = require("@aws-lambda-powertools/batch");
const logger_1 = require("@aws-lambda-powertools/logger");
const graphql_1 = require("./graphql");
const processor = new batch_1.BatchProcessor(batch_1.EventType.SQS);
const logger = new logger_1.Logger();
const recordHandler = async (record) => {
    const payload = record.body;
    if (payload) {
        const item = JSON.parse(payload);
        logger.info('Processed item', { item });
        const req = JSON.parse(item.Message);
        /*
        payload: str = record.body
        message: dict = json.loads(payload)
        detail: dict = json.loads(message["Message"])
        logger.info(detail)
        user_id = detail["userId"]
        connection_id = detail["connectionId"]
        */
        const query = /* GraphQL */ `
        mutation Mutation {
          publishResponse (data: ${JSON.stringify(item.Message)}, sessionId: "${req.data.sessionId}", userId: "${req.userId}") {
            data
            sessionId
            userId
          }
        }
    `;
        logger.info(query);
        const resp = await (0, graphql_1.graphQlQuery)(query);
        logger.info(resp);
    }
};
const handler = async (event, context) => {
    return (0, batch_1.processPartialResponse)(event, recordHandler, processor, {
        context,
    });
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx3REFJd0M7QUFDdEMsMERBQXVEO0FBT3ZELHVDQUF5QztBQUV6QyxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFjLENBQUMsaUJBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQU0sRUFBRSxDQUFDO0FBRTVCLE1BQU0sYUFBYSxHQUFHLEtBQUssRUFBRSxNQUFpQixFQUFpQixFQUFFO0lBQy9ELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDNUIsSUFBSSxPQUFPLEVBQUU7UUFDWCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JDOzs7Ozs7O1VBT0U7UUFFRixNQUFNLEtBQUssR0FBRyxhQUFhLENBQUM7O21DQUVDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLGVBQWUsR0FBRyxDQUFDLE1BQU07Ozs7OztLQU10SCxDQUFDO1FBQ0EsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsQixNQUFNLElBQUksR0FBRyxNQUFNLElBQUEsc0JBQVksRUFBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQ2xCO0FBQ0gsQ0FBQyxDQUFDO0FBR0ssTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUFlLEVBQ2YsT0FBZ0IsRUFDVyxFQUFFO0lBQzdCLE9BQU8sSUFBQSw4QkFBc0IsRUFBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRTtRQUM3RCxPQUFPO0tBQ1IsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBUFcsUUFBQSxPQUFPLFdBT2xCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgICBCYXRjaFByb2Nlc3NvcixcbiAgICBFdmVudFR5cGUsXG4gICAgcHJvY2Vzc1BhcnRpYWxSZXNwb25zZSxcbiAgfSBmcm9tICdAYXdzLWxhbWJkYS1wb3dlcnRvb2xzL2JhdGNoJztcbiAgaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSAnQGF3cy1sYW1iZGEtcG93ZXJ0b29scy9sb2dnZXInO1xuICBpbXBvcnQgdHlwZSB7XG4gICAgU1FTRXZlbnQsXG4gICAgU1FTUmVjb3JkLFxuICAgIENvbnRleHQsXG4gICAgU1FTQmF0Y2hSZXNwb25zZSxcbiAgfSBmcm9tICdhd3MtbGFtYmRhJztcbiAgaW1wb3J0IHsgZ3JhcGhRbFF1ZXJ5IH0gZnJvbSAnLi9ncmFwaHFsJztcbiBcbiAgY29uc3QgcHJvY2Vzc29yID0gbmV3IEJhdGNoUHJvY2Vzc29yKEV2ZW50VHlwZS5TUVMpOyBcbiAgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuIFxuICBjb25zdCByZWNvcmRIYW5kbGVyID0gYXN5bmMgKHJlY29yZDogU1FTUmVjb3JkKTogUHJvbWlzZTx2b2lkPiA9PiB7IFxuICAgIGNvbnN0IHBheWxvYWQgPSByZWNvcmQuYm9keTtcbiAgICBpZiAocGF5bG9hZCkge1xuICAgICAgY29uc3QgaXRlbSA9IEpTT04ucGFyc2UocGF5bG9hZCk7XG4gICAgICBsb2dnZXIuaW5mbygnUHJvY2Vzc2VkIGl0ZW0nLCB7IGl0ZW0gfSk7XG4gICAgICBjb25zdCByZXEgPSBKU09OLnBhcnNlKGl0ZW0uTWVzc2FnZSk7XG4gICAgICAvKlxuICAgICAgcGF5bG9hZDogc3RyID0gcmVjb3JkLmJvZHlcbiAgICAgIG1lc3NhZ2U6IGRpY3QgPSBqc29uLmxvYWRzKHBheWxvYWQpXG4gICAgICBkZXRhaWw6IGRpY3QgPSBqc29uLmxvYWRzKG1lc3NhZ2VbXCJNZXNzYWdlXCJdKVxuICAgICAgbG9nZ2VyLmluZm8oZGV0YWlsKVxuICAgICAgdXNlcl9pZCA9IGRldGFpbFtcInVzZXJJZFwiXVxuICAgICAgY29ubmVjdGlvbl9pZCA9IGRldGFpbFtcImNvbm5lY3Rpb25JZFwiXVxuICAgICAgKi9cblxuICAgICAgY29uc3QgcXVlcnkgPSAvKiBHcmFwaFFMICovIGBcbiAgICAgICAgbXV0YXRpb24gTXV0YXRpb24ge1xuICAgICAgICAgIHB1Ymxpc2hSZXNwb25zZSAoZGF0YTogJHtKU09OLnN0cmluZ2lmeShpdGVtLk1lc3NhZ2UpfSwgc2Vzc2lvbklkOiBcIiR7cmVxLmRhdGEuc2Vzc2lvbklkfVwiLCB1c2VySWQ6IFwiJHtyZXEudXNlcklkfVwiKSB7XG4gICAgICAgICAgICBkYXRhXG4gICAgICAgICAgICBzZXNzaW9uSWRcbiAgICAgICAgICAgIHVzZXJJZFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIGA7XG4gICAgICBsb2dnZXIuaW5mbyhxdWVyeSlcbiAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCBncmFwaFFsUXVlcnkocXVlcnkpO1xuICAgICAgbG9nZ2VyLmluZm8ocmVzcClcbiAgICB9XG4gIH07XG4gXG5cbiAgZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gICAgZXZlbnQ6IFNRU0V2ZW50LFxuICAgIGNvbnRleHQ6IENvbnRleHRcbiAgKTogUHJvbWlzZTxTUVNCYXRjaFJlc3BvbnNlPiA9PiB7XG4gICAgcmV0dXJuIHByb2Nlc3NQYXJ0aWFsUmVzcG9uc2UoZXZlbnQsIHJlY29yZEhhbmRsZXIsIHByb2Nlc3NvciwgeyBcbiAgICAgIGNvbnRleHQsXG4gICAgfSk7XG4gIH07XG4gIl19