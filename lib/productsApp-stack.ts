import * as lambda from "aws-cdk-lib/aws-lambda"

import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as ssm from "aws-cdk-lib/aws-ssm"

import * as cdk from "aws-cdk-lib"
import * as dynadb from "aws-cdk-lib/aws-dynamodb"

import { Construct } from "constructs"

export class ProductsAppStack extends cdk.Stack{
    readonly productsFetchHandler: lambdaNodeJS.NodejsFunction
    readonly productsAdminHandler: lambdaNodeJS.NodejsFunction
    readonly productsDdb: dynadb.Table

    constructor(scope: Construct, id:string,props?: cdk.StackProps){
        super(scope,id,props)

        this.productsDdb = new dynadb.Table(this, "ProductsDdb", {
            tableName : "products",
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            partitionKey: {
                name: "id",
                type: dynadb.AttributeType.STRING
            },
            billingMode: dynadb.BillingMode.PROVISIONED,
            readCapacity:1,
            writeCapacity:1
            
        })

        //Products Layer
        const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, "ProductsLayerVersionArn")

        const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn" , productsLayerArn)

        this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(this, "ProductsFetchFunction", {
            functionName: "ProductsFetchFunction",
            entry: "lambda/products/ProductsFetchFunction.ts",
            handler: "handler",
            runtime: lambda.Runtime.NODEJS_16_X,
            memorySize: 128,
            timeout: cdk.Duration.seconds(5),
            bundling: {
                minify: true,
                sourceMap: false
            },
            environment: {
                PRODUCTS_DDB : this.productsDdb.tableName
            },
            layers: [productsLayer],
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        })
        this.productsDdb.grantReadData(this.productsFetchHandler)
        this.productsAdminHandler = new lambdaNodeJS.NodejsFunction(this, "ProductsAdminFunction", {
            functionName: "ProductsAdminFunction",
            entry: "lambda/products/ProductsAdminFunction.ts",
            handler: "handler",
            runtime: lambda.Runtime.NODEJS_16_X,
            memorySize: 128,
            timeout: cdk.Duration.seconds(5),
            bundling: {
                minify: true,
                sourceMap: false
            },
            environment: {
                PRODUCTS_DDB : this.productsDdb.tableName
            },
            layers: [productsLayer],
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        })
        this.productsDdb.grantWriteData(this.productsAdminHandler)
    }
}