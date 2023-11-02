import boto3
import os
import json
from datetime import datetime

sns = boto3.client("sns")
TOPIC_ARN=os.environ.get("SNS_TOPIC_ARN", "")


def handler(event, context): 
    print(event["arguments"]["data"])
    print(event["identity"])
    request = json.loads(event["arguments"]["data"])
    message = {
        "action": request["action"],
        "modelInterface": request["modelInterface"],
        "direction": "IN",
        "connectionId": "connection_id",
        "timestamp": str(int(round(datetime.now().timestamp()))),
        "userId": "user_id",
        "data": request["data"],
    }
    print(message)

    response = sns.publish(
        TopicArn=TOPIC_ARN, Message=json.dumps(message)
        )
    
    return response
    