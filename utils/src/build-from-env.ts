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

// Open ../behavior/src/index.html
let behaviorIndexHtml = readFileSync('../behavior/src/index.html').toString();

// Replace <base id="baseHref" href="/" /> with the href being BEHAVIOR_DOMAIN
behaviorIndexHtml = behaviorIndexHtml.replace(/<base id="baseHref" href="\/" \>/g, `<base id="baseHref" href="https://${process.env.BEHAVIOR_DOMAIN}/" >`);

// Write the update back to the original file
writeFileSync('../behavior/src/index.html', behaviorIndexHtml);