#!/usr/bin/env node

/**
 * Builds configurations for the behavior and manage front ends leveraging AWS SSM Parameters
 */
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { writeFileSync } from "fs";
import { MytaptrackEnvironment } from '../../behavior/src/app/config/environment';

// Construct SSMClient with default configurations
const ssm = new SSMClient({});

async function getParameter(name: string) {
    try {
        console.log(`Getting parameter ${name}`);

        const getResponse = await ssm.send(new GetParameterCommand({
            Name: name
        }));

        console.log('Value', getResponse.Parameter.Value);

        return getResponse.Parameter.Value;
    } catch (e) {
        // Check if the resource is not present and return '' if so
        if (e.name === 'ParameterNotFound') {
            return '';
        }
        console.error(`Error getting parameter ${name}: ${e}`);
        throw e;
    }
}

async function buildConfiguration() {
    // Get environment from first parameter
    const STAGE = process.argv[2];
    if (!STAGE) {
        throw new Error('Environment is required as first parameter');
    }

    console.log("Creating configuration");
    const environmentConfig: MytaptrackEnvironment = {
        production: false,
        UserPoolId: await getParameter(`/${STAGE}/regional/calc/cognito/userpoolid`), /* The Cognito User Pool Id */
        IdentityPoolId: await getParameter(`/${STAGE}/regional/calc/cognito/idpoolid`), /* The Congito Identity Pool Id */
        IdentityAppDomain: await getParameter(`/${STAGE}/regional/calc/cognito/login/domain`) + '.auth.us-west-2.amazoncognito.com', /* The domain for cognito's custom domain for the deployment */
        Region: process.env.AWS_REGION ?? 'us-west-2', /* The AWS Region where the Cognito and API is deployed */
        apiRoot: await getParameter(`/${STAGE}/regional/calc/endpoints/api/url`) + 'api/', /* The root of the mytaptrack api (example: https://api.mytaptrack-test.com/api/) */
        apiRootCloudfront: await getParameter(`/${STAGE}/regional/calc/endpoints/api/url`) + 'api/', /* The path off of the cdn to use if leveraging a cdn passthrough */
        graphqlEndpoint: await getParameter(`/${STAGE}/regional/calc/endpoints/appsync/url`), /* The graphql endpoint for the appsync api */
        cognitoClientId: await getParameter(`/${STAGE}/regional/calc/cognito/clientid`), /* The Cognito User Pool App Id */
        cognitoLoginDomain: await getParameter(`/${STAGE}/regional/calc/cognito/login/domain`) + '.auth.us-west-2.amazoncognito.com', /* The domain for cognito's custom domain for the deployment */
        routes: {
          manage: '/manage',
          behavior: '/',
          service: '/services',
        }
      };

      // Construct configuration file contents
      console.log("Constructing configuration file");
      const config = `export const environment = ${JSON.stringify(environmentConfig, null, 2)};`;

      // Write environment file to behavior and manage directories
      console.log("Writing configuration file");
      if(STAGE != 'dev') {
        writeFileSync(`../behavior/src/environments/environment.${STAGE}.ts`, config);
        writeFileSync(`../manage/src/environments/environment.${STAGE}.ts`, config);
      } else {
        writeFileSync(`../behavior/src/environments/environment.ts`, config);
        writeFileSync(`../manage/src/environments/environment.ts`, config);
      }
}

buildConfiguration();
