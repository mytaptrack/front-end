// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: true, /* Used as a flag for development and production capabilities */
  UserPoolId: process.env.USER_POOL_ID, /* The Cognito User Pool Id */
  IdentityPoolId: process.env.IDENTITY_POOL_ID, /* The Congito Identity Pool Id */
  IdentityAppId: process.env.BEHAVIOR_CLIENT_ID, /* The Cognito User Pool App Id */
  Region: process.env.AWS_REGION, /* The AWS Region where the Cognito and API is deployed */
  IdentityAppDomain: process.env.WEB_BEHAVIOR_DOMAIN, /* The domain name for the app (include port number for localhost) */
  apiRoot: process.env.API_DOMAIN, /* The root of the mytaptrack api (example: https://api.mytaptrack-test.com/api/) */
  apiRootCloudfront: process.env.API_DOMAIN, /* The path off of the cdn to use if leveraging a cdn passthrough */
  graphqlEndpoint: process.env.GRAPH_DOMAIN, /* The graphql endpoint for the appsync api */
  forgotPasswordUrl: `https://${process.env.COGNITO_DOMAIN}/forgotPassword?response_type=token&client_id=${process.env.BEHAVIOR_CLIENT_ID}&redirect_uri=https://${process.env.BEHAVIOR_DOMAIN}/dashboard&state=STATE&scope=openid+profile+aws.cognito.signin.user.admin+email`,
  signUpUrl: '', /* The url to redirect to when signing up */
  googleLogin: `https://${process.env.COGNITO_DOMAIN}/oauth2/authorize?identity_provider=Google&redirect_uri=https://${process.env.BEHAVIOR_DOMAIN}/dashboard&response_type=TOKEN&client_id=${process.env.BEHAVIOR_CLIENT_ID}&state=STATE&scope=openid profile aws.cognito.signin.user.admin email`,
  cognitoClientId: process.env.BEHAVIOR_CLIENT_ID,
  cognitoCallbackUrl: `https://${process.env.BEHAVIOR_DOMAIN}/dashboard`, /* The callback url after the user signs in (example: https://localhost:8000 ) */
  cognitoLoginDomain: process.env.COGNITO_DOMAIN, /* The domain for cognito's custom domain for the deployment */
  googleAnalyticsId: '', /* This is no longer used */
  googleClientId: '', /* This is no longer used */
  qrCode: true,
  responseTracking: true,
  responseTrackingUsers: [],
  managementUsers: [],
  reporting: true,
  routes: {
    manage: `https://${process.env.MANAGE_DOMAIN}`,
    behavior: `https://${process.env.MANAGE_DOMAIN}`,
    service: '/',
  }
};
