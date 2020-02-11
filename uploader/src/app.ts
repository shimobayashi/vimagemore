export async function lambdaHandler (event:any, context:any) {
    return  {
        'statusCode': 200,
        'body': JSON.stringify({
            message: 'hello world',
        })
    }
}