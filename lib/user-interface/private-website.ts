import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as cognitoIdentityPool from "@aws-cdk/aws-cognito-identitypool-alpha";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cf from "aws-cdk-lib/aws-cloudfront";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as route53 from "aws-cdk-lib/aws-route53";
import { AwsCustomResource, AwsSdkCall } from "aws-cdk-lib/custom-resources";
import { IpTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import { Construct } from "constructs";
import {
  ExecSyncOptionsWithBufferEncoding,
  execSync,
} from "node:child_process";
import * as path from "node:path";
import { Shared } from "../shared";
import { SystemConfig } from "../shared/types";
import { Utils } from "../shared/utils";
import { ChatBotApi } from "../chatbot-api";

export interface PrivateWebsiteProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  readonly userPoolId: string;
  readonly userPoolClientId: string;
  readonly identityPool: cognitoIdentityPool.IdentityPool;
  readonly api: ChatBotApi;
  readonly chatbotFilesBucket: s3.Bucket;
  readonly crossEncodersEnabled: boolean;
  readonly sagemakerEmbeddingsEnabled: boolean;
  readonly websiteBucket: s3.Bucket;
}

export class PrivateWebsite extends Construct {
  constructor(scope: Construct, id: string, props: PrivateWebsiteProps) {
    super(scope, id);
    
    // PRIVATE WEBSITE 
    // REQUIRES: 
    // 1. Certificate ARN and Domain of website to be added to 'bin/config.json': 
    //    "certificate" : "arn:aws:acm:ap-southeast-2:1234567890:certificate/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXX",
    //    "domain" : "sub.example.com"
    // 2. In Route 53 link the VPC to the Private Hosted Zone (PHZ) 
    // 3. In the PHZ, add an "A Record" that points to the Application Load Balancer Alias 
    
    
    // Website ALB 
    const albSecurityGroup = new ec2.SecurityGroup(this, 'WebsiteApplicationLoadBalancerSG', {
            vpc: props.shared.vpc,
            allowAllOutbound: false
        });

    albSecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(443)
    );

    albSecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(80)
    );

    albSecurityGroup.addEgressRule(
        ec2.Peer.ipv4(props.shared.vpc.vpcCidrBlock),
        ec2.Port.tcp(443)
    );

    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
        vpc: props.shared.vpc,
        internetFacing: false,
        securityGroup: albSecurityGroup,
        vpcSubnets: props.shared.vpc.selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
          }),
    });

    const albLogBucket = new s3.Bucket(this, 'ALBLoggingBucket', {

        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        enforceSSL: true,

    });
    loadBalancer.logAccessLogs(albLogBucket)
    
    // Adding Listener
    // Using ACM certificate ARN passed in through props/config file 
    let albListener: elbv2.ApplicationListener;
    if (props.config.certificate) {
        albListener = loadBalancer.addListener('ALBLHTTPS',
        {
            protocol: elbv2.ApplicationProtocol.HTTPS,
            port: 443,
            certificates: [elbv2.ListenerCertificate.fromArn(props.config.certificate)],
            sslPolicy: elbv2.SslPolicy.RECOMMENDED_TLS
        });
        const albListenerhttp = loadBalancer.addListener('ALBLHTTP',
        {
            protocol: elbv2.ApplicationProtocol.HTTP,
            port: 80,
            defaultAction: elbv2.ListenerAction.redirect({ port: '443', protocol: 'HTTPS' })
        });
    }
    else {
        albListener = loadBalancer.addListener('ALBLHTTP',
            {
                protocol: elbv2.ApplicationProtocol.HTTP,
                port: 80
            });
    }
    
    // The Amazon S3 PrivateLink Endpoint is a REST API Endpoint, which means that trailing slash requests will return XML directory listings by default.
    // To work around this, you’ll create a redirect rule to point all requests ending in a trailing slash to index.html.
   albListener.addAction('privateLinkRedirectPath', {
    priority: 1,
    conditions: [
      elbv2.ListenerCondition.pathPatterns(['*/']),
    ],
    action: elbv2.ListenerAction.redirect({
      port: '#{port}',
      path: '/#{path}index.html',
    })
  });
    
     // Adding Website Target
    const s3EndpointId = props.shared.s3vpcEndpoint.vpcEndpointId
    const vpc = props.shared.vpc

    // First, retrieve the VPC Endpoint
    const vpcEndpointsCall: AwsSdkCall = {
        service: 'EC2',
        action: 'describeVpcEndpoints',
        parameters: {
            VpcEndpointIds: [s3EndpointId]
        },
        physicalResourceId: cdk.custom_resources.PhysicalResourceId.of('describeVpcEndpoints'), // ignore Property does not exist warnings
        outputPaths: ['VpcEndpoints.0.NetworkInterfaceIds']
    }

    const vpcEndpoints = new AwsCustomResource(
        this, 'describeVpcEndpoints', {
        onCreate: vpcEndpointsCall,
        onUpdate: vpcEndpointsCall,
        policy: {
            statements: [
                new cdk.aws_iam.PolicyStatement({ // ignore Property does not exist warnings
                    actions: ["ec2:DescribeVpcEndpoints"],
                    resources: ["*"]
                })]
        }
    })

    // Then, retrieve the Private IP Addresses for each ENI of the VPC Endpoint
    let s3IPs: IpTarget[] = [];
    for (let index = 0; index < vpc.availabilityZones.length; index++) {
        const sdkCall: AwsSdkCall = {
            service: 'EC2',
            action: 'describeNetworkInterfaces',
            outputPaths: [`NetworkInterfaces.0.PrivateIpAddress`],
            parameters: {
                NetworkInterfaceIds: [vpcEndpoints.getResponseField(`VpcEndpoints.0.NetworkInterfaceIds.${index}`)],
                Filters: [
                    { Name: "interface-type", Values: ["vpc_endpoint"] }
                ],
            },
            physicalResourceId: cdk.custom_resources.PhysicalResourceId.of('describeNetworkInterfaces'), // ignore Property does not exist warnings
        }

        const eni = new AwsCustomResource(
            this,
            `DescribeNetworkInterfaces-${index}`,
            {
                onCreate: sdkCall,
                onUpdate: sdkCall,
                policy: {
                    statements: [
                        new cdk.aws_iam.PolicyStatement({ // ignore Property does not exist warnings
                            actions: ["ec2:DescribeNetworkInterfaces"],
                            resources: ["*"],
                        }),
                    ],
                },
            }
        );

        s3IPs.push(new IpTarget(cdk.Token.asString(eni.getResponseField(`NetworkInterfaces.0.PrivateIpAddress`)), 443))
    }

    albListener.addTargets('s3TargetGroup',
        {
            port: 443,
            protocol: elbv2.ApplicationProtocol.HTTPS,
            targets: s3IPs,
            healthCheck: {
                protocol: elbv2.Protocol.HTTPS,
                path: '/',
                healthyHttpCodes: '307,405'
            }
        });
        
  

    props.websiteBucket.policy?.document.addStatements(
        new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:GetObject', "s3:List*"],
            principals: [new iam.AnyPrincipal()], // TODO: restrict to the S3 VPC Endpoints
            resources: [props.websiteBucket.bucketArn, `${props.websiteBucket.bucketArn}/*`],
            conditions: {
                "StringEquals": { "aws:SourceVpce": s3EndpointId }
            }
        })
    );
    
    // // TODO: Update Route 53 Private Hosted Zone with domain -> ALB
    // const zone = new route53.PrivateHostedZone(this, 'HostedZone', {
    //   zoneName: domainName,
    //   vpc: props.shared.vpc,    
    // });
    
    // new route53.ARecord(this, 'ALBRecord', {
    //   zone,
    //   target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(loadBalancer)),
    //   deleteExisting: true,
      
    // });    


    // ###################################################
    // Outputs
    // ###################################################
    new cdk.CfnOutput(this, "UserInterfaceDomainName", {
      value: `https://${props.websiteBucket.bucketName}`,
    });
  }
}
