
export interface MytaptrackEnvironment {
    apiRootCloudfront: string;
    apiRoot: string;
    production: boolean;
    Region: string;
    UserPoolId: string;
    cognitoClientId: string;
    cognitoLoginDomain: string;
    IdentityPoolId: string;
    IdentityAppDomain: string;
    routes: {
        manage: string;
        behavior: string;
        service: string;
    }
    graphqlEndpoint: string;
}
