import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Lambda } from 'aws-cdk-lib/aws-ses-actions';
import { Construct } from 'constructs';

const sendMessageResolverCode = `
import boto3
import os

sns = boto3.client("sns")
TOPIC_ARN=os.environ.get("SNS_TOPIC_ARN", "")

def handler(event, context): 
    
    if event["field"] == "sendMessage":
        sendMessage(event["arguments"])
    

`

export class GraphqlApi extends Construct {
    public readonly apiKey: string | undefined;
    public readonly graphQLUrl: string | undefined;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id);

        // makes a GraphQL API
        const api = new appsync.GraphqlApi(this, 'chatbot-ws-apis', {
            name: 'chatbot-ws-api',
            schema: appsync.SchemaFile.fromAsset('lib/chatbot-api/schema/schema-ws.graphql'),
        });


        const resolverFunction = new Function(this, "lambda-resolver", {
            code: Code.fromInline(sendMessageResolverCode),
            handler: 'lambda.handler',
            runtime: Runtime.PYTHON_3_11,
        })

        resolverFunction.addToRolePolicy(new PolicyStatement({
            actions: ["sns:*", "sqs:*"],
            effect: Effect.ALLOW,
            resources: ["*"]
        }))
        const functionDataSource = api.addLambdaDataSource('resolver-function', resolverFunction)

        // api.createResolver('send-message-resolver', {
        //     typeName: 'Mutation',
        //     fieldName: 'sendMessage', 
        //     code: appsync.Code.fromInline(`
        //     export function request(ctx) {
        //         return {
        //             operation: 'Invoke',
        //             payload: {  field: ctx.info.fieldName, arguments: args, source },
        //         };
        //     }
      
        //     export function response(ctx) {
        //         return ctx.result;
        //     }
        //     `),
        //     runtime: appsync.FunctionRuntime.JS_1_0_0,
        //     dataSource: functionDataSource,
        // })

        api.grantMutation(resolverFunction)

        // api.createResolver('publish-response-resolver', {
        //     typeName: 'Mutation',
        //     fieldName: 'publishResponse', 
        //     code: appsync.Code.fromInline(`
        //     export function request(ctx) {
        //         return {
        //             operation: 'Invoke',
        //             payload: {  field: ctx.info.fieldName, arguments: args, source },
        //           };
        //         }
      
        //         export function response(ctx) {
        //             return ctx.result;
        //         }
        //     `),
        //     runtime: appsync.FunctionRuntime.JS_1_0_0,
        //     dataSource: new appsync.NoneDataSource(this, "none-data-source", {
        //         api
        //     }),
        // })

        // Prints out URL
        new cdk.CfnOutput(this, "GraphqlWSAPIURL", {
            value: api.graphqlUrl
        });

        // Prints out the AppSync GraphQL API key to the terminal
        new cdk.CfnOutput(this, "GraphqlWSAPIKey", {
            value: api.apiKey || ''
        });

        this.apiKey = api.apiKey;
        this.graphQLUrl = api.graphqlUrl;
    }
}