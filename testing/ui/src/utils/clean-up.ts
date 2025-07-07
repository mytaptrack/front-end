// Import dynamodb document client
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
    DeleteCommand, QueryCommand, QueryCommandInput,
    ScanCommand,
    ScanCommandInput
} from '@aws-sdk/lib-dynamodb';

const environment = process.env.STAGE ?? 'dev';
const primaryTable = `mytaptrack-${environment}-primary`;
const dataTable = `mytaptrack-${environment}-data`;
export const license = process.env.License ?? '000000-000000-000000';

// Create document client with default configurations
const ddbClient = new DynamoDBClient({});

async function ddbDelete(key: any, table: string) {
    const command = new DeleteCommand({
        TableName: table,
        Key: key
    });
    await ddbClient.send(command);
}

async function query(params: QueryCommandInput) {
    const command = new QueryCommand(params);
    const result: any[] = [];
    let next: any = undefined;
    do {
        const response = await ddbClient.send(new QueryCommand({
            ...params,
            ExclusiveStartKey: next
        }));
        if(response.Items) {
            result.push(...response.Items);
        }
        next = response.LastEvaluatedKey;
    } while(next);
    return result;
}

async function scan(params: ScanCommandInput) {
    const result: any[] = [];
    let next: any = undefined;
    do {
        const response = await ddbClient.send(new ScanCommand({
            ...params,
            ExclusiveStartKey: next
        }));
        if(response.Items) {
            result.push(...response.Items);
        }
        next = response.LastEvaluatedKey;
    } while(next);
    return result;
}

export async function cleanUp() {
    // Query student id based in the Student index
    const results = await scan({ 
        TableName: dataTable, 
        FilterExpression: 'license = :license', 
        ExpressionAttributeValues: { ':license': license } 
    });

    await Promise.all(results.map(async (result) => {
        if(result.pk == 'L') {
            return;
        }
        await ddbDelete({ pk: result.pk, sk: result.sk }, dataTable);
    }));

    const results2 = await scan({ 
        TableName: primaryTable,
        FilterExpression: 'license = :license',
        ExpressionAttributeValues: { ':license': license } 
    });

    await Promise.all(results2.map(async (result) => {
        await ddbDelete({ pk: result.pk, sk: result.sk }, primaryTable);
    }));
}