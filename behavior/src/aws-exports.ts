import { environment }  from  './environments/environment';
import { Auth } from 'aws-amplify';

export const amplifyConfig = {
    aws_cognito_region: environment.Region,
    aws_user_pools_id: environment.UserPoolId,
    aws_user_pools_web_client_id: environment.cognitoClientId,
    aws_cognito_identity_pool_id: environment.IdentityPoolId,
    aws_mandatory_sign_in: 'enable',
    oauth: {
        domain: environment.cognitoLoginDomain,
        scope: [
            'email',
            'profile',
            'openid',
            'aws.cognito.signin.user.admin'
          ],
          redirectSignIn: `https://${environment.IdentityAppDomain}`,
          redirectSignOut: `https://${environment.IdentityAppDomain}`,
          clientId: environment.cognitoClientId,
          responseType: 'code'
    },
    Auth: {
        identityPoolId: environment.IdentityPoolId,
        region: environment.Region,
        userPoolId: environment.UserPoolId,
        userPoolWebClientId: environment.cognitoClientId,
    },
    API: {
        endpoints: [
            {
                name: 'api',
                endpoint: environment.apiRoot,
                custom_header: async () => {
                    const token = (await Auth.currentSession())?.getIdToken()?.getJwtToken();
                    if(!token) {
                        return {};
                    }
                    return { Authorization: `Bearer ${token}` };
                }
            }
        ]
    }
};