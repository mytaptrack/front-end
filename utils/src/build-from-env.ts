import { readFileSync, writeFileSync } from 'fs';

function processEnvFile(path: string) {
    // Read behavior/src/environments/environment.ts into memory
    let envFileContent = readFileSync(path).toString();

    const keys = ['USER_POOL_ID','IDENTITY_POOL_ID','COGNITO_CLIENT_ID', 'AWS_REGION','BEHAVIOR_DOMAIN','API_DOMAIN','GRAPH_DOMAIN','COGNITO_DOMAIN','MANAGE_DOMAIN']
     for(let key of keys) {
        console.log(key, process.env[key])

        const codeEnvName = `process\.env\.${key}`;

        // Replace codeEnvName with 'value'
        envFileContent = envFileContent.replace(RegExp(codeEnvName, 'g'), `'${process.env[key]}'`);
    }

    writeFileSync(path, envFileContent);
}

processEnvFile('../behavior/src/environments/environment.ts');
processEnvFile('../behavior/src/environments/environment.prod.ts');
processEnvFile('../manage/src/environments/environment.ts');
processEnvFile('../manage/src/environments/environment.prod.ts');

function updateBaseRef(project: string, domain: string) {
    // Open ../behavior/src/index.html
    const indexFile = `../${project}/src/index.html`;
    let indexHtml = readFileSync(indexFile).toString();

    // Replace <base id="baseHref" href="/" /> with the href being domain
    indexHtml = indexHtml.replace(/<base id="baseHref" href="\/" \>/g, `<base id="baseHref" href="https://${domain}/" >`);

    // Write the 
    // update back to the original file
    writeFileSync(indexFile, indexHtml);

}

updateBaseRef('behavior', process.env.BEHAVIOR_DOMAIN);
updateBaseRef('manage', process.env.MANAGE_DOMAIN);
