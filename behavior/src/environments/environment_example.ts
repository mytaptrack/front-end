// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false, /* Used as a flag for development and production capabilities */
  UserPoolId: '', /* The Cognito User Pool Id */
  IdentityPoolId: '', /* The Congito Identity Pool Id */
  IdentityAppId: '', /* The Cognito User Pool App Id */
  Region: '', /* The AWS Region where the Cognito and API is deployed */
  IdentityAppDomain: 'localhost:8000', /* The domain name for the app (include port number for localhost) */
  apiRoot: '', /* The root of the mytaptrack api (example: https://api.mytaptrack-test.com/api/) */
  apiRootCloudfront: '', /* The path off of the cdn to use if leveraging a cdn passthrough */
  graphqlEndpoint: '', /* The graphql endpoint for the appsync api */
  forgotPasswordUrl: ``, /* The URL to use for the forgot password */
  signUpUrl: '', /* The url to redirect to when signing up */
  googleLogin: '', /* The url to redirect to when logging in with google */
  cognitoClientId: '', /* The Cognito User Pool App Id */
  cognitoCallbackUrl: '', /* The callback url after the user signs in (example: https://localhost:8000 ) */
  cognitoLoginDomain: '', /* The domain for cognito's custom domain for the deployment */
  googleAnalyticsId: '', /* This is no longer used */
  googleClientId: '', /* This is no longer used */
  qrCode: true,
  responseTracking: true,
  responseTrackingUsers: [],
  managementUsers: [],
  reporting: true,
  routes: {
    manage: '/manage',
    behavior: '/',
    service: '/services',
  }
};
