import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export async function lambdaHandler (event, context) {
    return  {
        'statusCode': 200,
        'body': JSON.stringify({
            message: 'hello world',
        })
    }
}