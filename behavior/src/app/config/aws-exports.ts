import { ResourcesConfig } from 'aws-amplify';
import { MytaptrackEnvironment } from './environment';

export function amplifyConfig(environment: MytaptrackEnvironment): ResourcesConfig {
    return {
        Auth: {
            Cognito: {  
                identityPoolId: environment.IdentityPoolId,
                userPoolId: environment.UserPoolId,
                userPoolClientId: environment.cognitoClientId,
                loginWith: {
                    oauth: {
                        domain: environment.cognitoLoginDomain,
                        redirectSignIn: [`https://${environment.IdentityAppDomain}`],
                        redirectSignOut: [`https://${environment.IdentityAppDomain}`],
                        scopes: [
                            'phone',
                            'email',
                            'profile',
                            'openid',
                            'aws.cognito.signin.user.admin'
                        ],
                        responseType: 'code',
                    }
                }
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
        },
    };
}
