import { AmplifyOutputsUnknown, LegacyConfig } from '@aws-amplify/core/internals/utils';
import { environment }  from  './environments/environment';
import { ResourcesConfig } from 'aws-amplify';

export const amplifyConfig: ResourcesConfig | LegacyConfig | AmplifyOutputsUnknown = {
    Auth: {
        Cognito: {
            loginWith: {
                oauth: {
                    domain: environment.cognitoLoginDomain,
                    responseType: 'code',
                    scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
                    redirectSignIn: [environment.cognitoCallbackUrl],
                    redirectSignOut: [environment.cognitoCallbackUrl]
                }
            },
            identityPoolId: environment.IdentityPoolId,
            userPoolId: environment.UserPoolId,
            userPoolClientId: environment.cognitoClientId
        }
    },
    API: {
        REST: {
            api: {
                endpoint: environment.apiRoot,
                region: environment.Region
            }
        },
        GraphQL: {
            endpoint: environment.graphqlEndpoint,
            region: environment.Region,
            defaultAuthMode: 'identityPool'
        }
    }
};